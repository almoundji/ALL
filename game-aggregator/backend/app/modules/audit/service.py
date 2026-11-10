"""Journal d'audit chaîné (M10). Chaque entrée inclut le hash de la précédente ; `verify` recalcule la chaîne."""
import hashlib
import json
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from .models import AuditEntry

GENESIS = "0" * 64


def _canonical(created_at: datetime, actor: str, action: str, target_type: str, target_id: str, detail: dict, prev_hash: str) -> str:
    payload = {"t": created_at.isoformat(), "actor": actor, "action": action, "tt": target_type, "tid": target_id, "d": detail, "p": prev_hash}
    return json.dumps(payload, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def record(db: Session, actor: str, action: str, target_type: str, target_id, detail: dict | None = None) -> AuditEntry:
    last = db.scalar(select(AuditEntry).order_by(AuditEntry.id.desc()).limit(1))
    prev = last.hash if last else GENESIS
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    detail = detail or {}
    h = hashlib.sha256(_canonical(now, actor, action, target_type, str(target_id), detail, prev).encode()).hexdigest()
    e = AuditEntry(created_at=now, actor=actor, action=action, target_type=target_type, target_id=str(target_id), detail=detail, prev_hash=prev, hash=h)
    db.add(e)
    db.flush()
    return e


def verify(db: Session) -> dict:
    prev = GENESIS
    for e in db.scalars(select(AuditEntry).order_by(AuditEntry.id)):
        expected = hashlib.sha256(_canonical(e.created_at, e.actor, e.action, e.target_type, e.target_id, e.detail, prev).encode()).hexdigest()
        if e.prev_hash != prev or e.hash != expected:
            return {"status": "corrupted", "first_bad_id": e.id}
        prev = e.hash
    count = db.scalar(select(AuditEntry.id).order_by(AuditEntry.id.desc()).limit(1))
    return {"status": "ok", "entries": count or 0, "head": prev}
