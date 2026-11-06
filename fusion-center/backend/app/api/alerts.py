from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models import Alert, Entity, User, Watchlist
from ..schemas import AlertOut, AlertUpdate, WatchlistCreate, WatchlistOut
from ..services import alerts as alert_engine
from ..services import audit
from ..services.access import get_visible_entity, visible_entities_stmt
from .deps import client_ip, get_current_user, require_role

router = APIRouter(prefix="/api", tags=["alerts"])


@router.get("/watchlists", response_model=list[WatchlistOut])
def list_watchlists(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.execute(select(Watchlist).order_by(Watchlist.created_at.desc())).scalars().all()


@router.post("/watchlists", response_model=WatchlistOut, status_code=201)
def create_watchlist(body: WatchlistCreate, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    wl = Watchlist(created_by=user.username, **body.model_dump())
    db.add(wl)
    db.flush()
    # Évaluation rétroactive sur le graphe visible : la règle s'applique aussi à l'existant.
    raised = 0
    for ent in db.execute(visible_entities_stmt(user)).scalars():
        raised += len(alert_engine.evaluate(db, ent))
    audit.record(db, user.username, "WATCHLIST_CREATE", "watchlist", wl.id, {"name": wl.name, "alerts": raised}, client_ip(request))
    db.commit()
    db.refresh(wl)
    return wl


@router.patch("/watchlists/{wl_id}/toggle", response_model=WatchlistOut)
def toggle_watchlist(wl_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    wl = db.get(Watchlist, wl_id)
    if not wl:
        raise HTTPException(404, "Règle introuvable")
    wl.is_active = not wl.is_active
    audit.record(db, user.username, "WATCHLIST_TOGGLE", "watchlist", wl.id, {"active": wl.is_active}, client_ip(request))
    db.commit()
    db.refresh(wl)
    return wl


@router.delete("/watchlists/{wl_id}", status_code=204)
def delete_watchlist(wl_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    wl = db.get(Watchlist, wl_id)
    if wl:
        audit.record(db, user.username, "WATCHLIST_DELETE", "watchlist", wl.id, {"name": wl.name}, client_ip(request))
        db.delete(wl)
        db.commit()


@router.get("/alerts", response_model=list[AlertOut])
def list_alerts(status: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Alert).order_by(Alert.created_at.desc()).limit(500)
    if status:
        stmt = stmt.where(Alert.status == status)
    out = []
    for a in db.execute(stmt).scalars():
        if a.entity_id and not get_visible_entity(db, user, a.entity_id):
            continue  # l'alerte porte sur un objet hors habilitation
        out.append(a)
    return out


@router.patch("/alerts/{alert_id}", response_model=AlertOut)
def update_alert(alert_id: int, body: AlertUpdate, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    alert = db.get(Alert, alert_id)
    if not alert or (alert.entity_id and not get_visible_entity(db, user, alert.entity_id)):
        raise HTTPException(404, "Alerte introuvable")
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(alert, k, v)
    audit.record(db, user.username, "ALERT_UPDATE", "alert", alert.id, changes, client_ip(request))
    db.commit()
    db.refresh(alert)
    return alert
