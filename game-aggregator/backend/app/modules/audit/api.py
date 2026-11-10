from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ...core.db import get_db
from ...core.security import require_admin
from . import service
from .models import AuditEntry

router = APIRouter(prefix="/api/audit", tags=["Journal d'audit"])


@router.get("", dependencies=[Depends(require_admin)])
def list_entries(limit: int = 100, db: Session = Depends(get_db)):
    rows = db.scalars(select(AuditEntry).order_by(AuditEntry.id.desc()).limit(min(limit, 5000))).all()
    return [{"id": e.id, "created_at": e.created_at, "actor": e.actor, "action": e.action, "target_type": e.target_type,
             "target_id": e.target_id, "detail": e.detail, "hash": e.hash, "prev_hash": e.prev_hash} for e in rows]


@router.get("/verify", dependencies=[Depends(require_admin)])
def verify_chain(db: Session = Depends(get_db)):
    return service.verify(db)
