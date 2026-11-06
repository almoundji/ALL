from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models import User
from ..schemas import GraphOut
from ..services import audit
from ..services.access import get_visible_entity
from ..services.graph import centrality, ego_subgraph, shortest_path
from .deps import client_ip, get_current_user

router = APIRouter(prefix="/api/graph", tags=["graph"])


@router.get("/expand", response_model=GraphOut)
def expand(ids: str = Query(..., description="identifiants séparés par des virgules"), depth: int = Query(1, ge=1, le=4),
           limit: int = Query(300, le=1000), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    try:
        roots = [int(x) for x in ids.split(",") if x.strip()]
    except ValueError:
        raise HTTPException(422, "ids invalides")
    roots = [r for r in roots if get_visible_entity(db, user, r)]
    if not roots:
        raise HTTPException(404, "Aucune entité racine accessible")
    return ego_subgraph(db, user, roots, depth=depth, limit=limit)


@router.get("/path")
def path(a: int, b: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not get_visible_entity(db, user, a) or not get_visible_entity(db, user, b):
        raise HTTPException(404, "Entité introuvable")
    p = shortest_path(db, user, a, b)
    audit.record(db, user.username, "GRAPH_PATH", "entity", f"{a}->{b}", {"found": p is not None}, client_ip(request))
    db.commit()
    if p is None:
        return {"found": False, "path": [], "graph": {"nodes": [], "edges": []}}
    sub = ego_subgraph(db, user, p, depth=0)
    return {"found": True, "path": p, "graph": GraphOut.model_validate(sub).model_dump()}


@router.get("/analytics")
def analytics(top: int = Query(10, le=50), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return centrality(db, user, top=top)
