"""Journal d'audit chaîné : toute lecture ou écriture sensible est tracée et vérifiable."""
import hashlib
import json
from datetime import timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AuditLog, utcnow

GENESIS = "0" * 64


def _ts_str(ts) -> str:
    """Horodatage canonique (UTC naïf, microsecondes) : stable quel que soit le SGBD."""
    if ts.tzinfo is not None:
        ts = ts.astimezone(timezone.utc).replace(tzinfo=None)
    return ts.isoformat(timespec="microseconds")


def _digest(prev_hash: str, ts: str, username: str, action: str, rtype: str, rid: str, details: dict, ip: str) -> str:
    payload = json.dumps(
        {"prev": prev_hash, "ts": ts, "user": username, "action": action, "rtype": rtype, "rid": rid,
         "details": details, "ip": ip},
        sort_keys=True, ensure_ascii=False, default=str,
    )
    return hashlib.sha256(payload.encode()).hexdigest()


def record(db: Session, username: str, action: str, resource_type: str = "", resource_id: str | int = "",
           details: dict | None = None, ip: str = "") -> AuditLog:
    last = db.execute(select(AuditLog).order_by(AuditLog.id.desc()).limit(1)).scalar_one_or_none()
    prev_hash = last.hash if last else GENESIS
    ts = utcnow()
    details = details or {}
    entry = AuditLog(
        ts=ts, username=username, action=action, resource_type=resource_type, resource_id=str(resource_id),
        details=details, ip=ip, prev_hash=prev_hash,
        hash=_digest(prev_hash, _ts_str(ts), username, action, resource_type, str(resource_id), details, ip),
    )
    db.add(entry)
    db.flush()
    return entry


def verify_chain(db: Session) -> dict:
    """Recalcule la chaîne complète ; renvoie la première rupture éventuelle."""
    prev = GENESIS
    count = 0
    for row in db.execute(select(AuditLog).order_by(AuditLog.id)).scalars():
        expected = _digest(prev, _ts_str(row.ts), row.username, row.action, row.resource_type, row.resource_id,
                           row.details, row.ip)
        if row.prev_hash != prev or row.hash != expected:
            return {"valid": False, "checked": count, "broken_at": row.id}
        prev = row.hash
        count += 1
    return {"valid": True, "checked": count, "broken_at": None}
