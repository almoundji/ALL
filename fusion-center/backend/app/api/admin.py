from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import ROLES, hash_password
from ..models import Alert, AuditLog, Case, Entity, IngestJob, Relation, User
from ..schemas import AuditOut, UserCreate, UserOut, UserUpdate
from ..services import audit
from ..services.access import visible_entities_stmt, visible_relations_stmt
from ..services.graph import centrality
from .deps import client_ip, get_current_user, require_role

router = APIRouter(prefix="/api", tags=["admin"])


@router.get("/dashboard")
def dashboard(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ent_sub = visible_entities_stmt(user).subquery()
    by_type = db.execute(select(ent_sub.c.type, func.count()).group_by(ent_sub.c.type)).all()
    by_class = db.execute(select(ent_sub.c.classification, func.count()).group_by(ent_sub.c.classification)).all()
    total_entities = db.execute(select(func.count()).select_from(ent_sub)).scalar_one()
    total_relations = db.execute(select(func.count()).select_from(visible_relations_stmt(user).subquery())).scalar_one()
    alerts_by_sev = db.execute(select(Alert.severity, func.count()).where(Alert.status != "CLOSED").group_by(Alert.severity)).all()
    cases_by_status = db.execute(select(Case.status, func.count()).where(Case.classification <= user.clearance).group_by(Case.status)).all()
    since = datetime.now(timezone.utc) - timedelta(days=30)
    recent_jobs = db.execute(select(IngestJob).where(IngestJob.created_at >= since).order_by(IngestJob.created_at.desc()).limit(10)).scalars().all()
    recent_alerts = db.execute(select(Alert).where(Alert.status == "NEW").order_by(Alert.created_at.desc()).limit(8)).scalars().all()
    # Activité d'ingestion par jour (30 derniers jours).
    day = func.date(IngestJob.created_at)
    ingest_days = db.execute(select(day, func.sum(IngestJob.entities_created + IngestJob.entities_merged)).where(IngestJob.created_at >= since).group_by(day).order_by(day)).all()
    analytics = centrality(db, user, top=5)
    return {
        "entities": total_entities, "relations": total_relations,
        "by_type": [{"type": t, "count": c} for t, c in by_type],
        "by_classification": [{"level": l, "count": c} for l, c in by_class],
        "alerts_by_severity": [{"severity": s, "count": c} for s, c in alerts_by_sev],
        "cases_by_status": [{"status": s, "count": c} for s, c in cases_by_status],
        "open_alerts": sum(c for _, c in alerts_by_sev),
        "ingest_timeline": [{"day": d, "count": int(c or 0)} for d, c in ingest_days],
        "recent_jobs": [{"id": j.id, "filename": j.filename, "status": j.status, "rows": j.rows_total, "created_at": j.created_at} for j in recent_jobs],
        "recent_alerts": [{"id": a.id, "title": a.title, "severity": a.severity, "entity_id": a.entity_id, "created_at": a.created_at} for a in recent_alerts],
        "top_pagerank": analytics["pagerank"], "top_betweenness": analytics["betweenness"],
        "communities": len(analytics["communities"]),
    }


@router.get("/audit", response_model=list[AuditOut])
def audit_log(username: str | None = None, action: str | None = None, limit: int = Query(200, le=2000), offset: int = 0,
              db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    stmt = select(AuditLog).order_by(AuditLog.id.desc()).limit(limit).offset(offset)
    if username:
        stmt = stmt.where(AuditLog.username == username)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    return db.execute(stmt).scalars().all()


@router.get("/audit/verify")
def audit_verify(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    return audit.verify_chain(db)


@router.get("/audit/mine", response_model=list[AuditOut])
def my_audit(limit: int = Query(50, le=500), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.execute(select(AuditLog).where(AuditLog.username == user.username).order_by(AuditLog.id.desc()).limit(limit)).scalars().all()


@router.get("/users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    return db.execute(select(User).order_by(User.username)).scalars().all()


@router.post("/users", response_model=UserOut, status_code=201)
def create_user(body: UserCreate, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    if body.role not in ROLES:
        raise HTTPException(422, "rôle inconnu")
    if db.execute(select(User).where(User.username == body.username)).scalar_one_or_none():
        raise HTTPException(409, "Nom d'utilisateur déjà pris")
    data = body.model_dump()
    pwd = data.pop("password")
    u = User(hashed_password=hash_password(pwd), **data)
    db.add(u)
    db.flush()
    audit.record(db, user.username, "USER_CREATE", "user", u.id, {"username": u.username, "role": u.role, "clearance": u.clearance}, client_ip(request))
    db.commit()
    db.refresh(u)
    return u


@router.patch("/users/{user_id}", response_model=UserOut)
def update_user(user_id: int, body: UserUpdate, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    u = db.get(User, user_id)
    if not u:
        raise HTTPException(404, "Utilisateur introuvable")
    changes = body.model_dump(exclude_unset=True)
    if "password" in changes:
        u.hashed_password = hash_password(changes.pop("password"))
        changes["password"] = "***"
    if "role" in changes and changes["role"] not in ROLES:
        raise HTTPException(422, "rôle inconnu")
    for k, v in changes.items():
        if k != "password":
            setattr(u, k, v)
    audit.record(db, user.username, "USER_UPDATE", "user", u.id, changes, client_ip(request))
    db.commit()
    db.refresh(u)
    return u
