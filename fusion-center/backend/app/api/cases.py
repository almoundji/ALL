from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models import Case, CaseEntity, CaseNote, User
from ..schemas import CaseCreate, CaseDetail, CaseEntityAdd, CaseEntityOut, CaseNoteCreate, CaseOut, CaseUpdate, EntityOut
from ..services import audit
from ..services.access import get_visible_entity, user_can_see
from .deps import client_ip, get_current_user, require_role

router = APIRouter(prefix="/api/cases", tags=["cases"])


def _visible_case(db: Session, user: User, case_id: int) -> Case:
    case = db.get(Case, case_id)
    if not case or not user_can_see(user, case.classification, case.compartment):
        raise HTTPException(404, "Dossier introuvable")
    return case


def _with_count(db: Session, case: Case) -> CaseOut:
    out = CaseOut.model_validate(case)
    out.entity_count = db.execute(select(func.count()).select_from(CaseEntity).where(CaseEntity.case_id == case.id)).scalar_one()
    return out


def next_reference(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    n = db.execute(select(func.count()).select_from(Case)).scalar_one() + 1
    return f"DRN-{year}-{n:04d}"


@router.get("", response_model=list[CaseOut])
def list_cases(status: str | None = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    stmt = select(Case).where(Case.classification <= user.clearance).order_by(Case.updated_at.desc())
    if status:
        stmt = stmt.where(Case.status == status)
    return [_with_count(db, c) for c in db.execute(stmt).scalars() if user_can_see(user, c.classification, c.compartment)]


@router.post("", response_model=CaseOut, status_code=201)
def create_case(body: CaseCreate, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    if body.classification > user.clearance:
        raise HTTPException(403, "Classification au-dessus de votre habilitation")
    case = Case(reference=next_reference(db), owner=user.username, **body.model_dump())
    db.add(case)
    db.flush()
    audit.record(db, user.username, "CASE_CREATE", "case", case.id, {"reference": case.reference}, client_ip(request))
    db.commit()
    db.refresh(case)
    return _with_count(db, case)


@router.get("/{case_id}", response_model=CaseDetail)
def get_case(case_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    case = _visible_case(db, user, case_id)
    audit.record(db, user.username, "CASE_VIEW", "case", case.id, {"reference": case.reference}, client_ip(request))
    db.commit()
    out = CaseDetail.model_validate(case)
    out.entity_count = len(case.entities)
    out.entities = []
    for ce in case.entities:
        ent = get_visible_entity(db, user, ce.entity_id)
        item = CaseEntityOut.model_validate(ce)
        item.entity = EntityOut.model_validate(ent) if ent else None
        out.entities.append(item)
    return out


@router.patch("/{case_id}", response_model=CaseOut)
def update_case(case_id: int, body: CaseUpdate, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    case = _visible_case(db, user, case_id)
    changes = body.model_dump(exclude_unset=True)
    for k, v in changes.items():
        setattr(case, k, v)
    audit.record(db, user.username, "CASE_UPDATE", "case", case.id, {"changes": changes}, client_ip(request))
    db.commit()
    db.refresh(case)
    return _with_count(db, case)


@router.post("/{case_id}/entities", response_model=CaseDetail, status_code=201)
def add_entity(case_id: int, body: CaseEntityAdd, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    case = _visible_case(db, user, case_id)
    if not get_visible_entity(db, user, body.entity_id):
        raise HTTPException(404, "Entité introuvable")
    exists = db.execute(select(CaseEntity).where(CaseEntity.case_id == case.id, CaseEntity.entity_id == body.entity_id)).scalar_one_or_none()
    if not exists:
        db.add(CaseEntity(case_id=case.id, entity_id=body.entity_id, role=body.role, added_by=user.username))
        audit.record(db, user.username, "CASE_ADD_ENTITY", "case", case.id, {"entity_id": body.entity_id}, client_ip(request))
        db.commit()
    return get_case(case_id, request, db, user)


@router.delete("/{case_id}/entities/{entity_id}", status_code=204)
def remove_entity(case_id: int, entity_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    case = _visible_case(db, user, case_id)
    link = db.execute(select(CaseEntity).where(CaseEntity.case_id == case.id, CaseEntity.entity_id == entity_id)).scalar_one_or_none()
    if link:
        db.delete(link)
        audit.record(db, user.username, "CASE_REMOVE_ENTITY", "case", case.id, {"entity_id": entity_id}, client_ip(request))
        db.commit()


@router.post("/{case_id}/notes", response_model=CaseDetail, status_code=201)
def add_note(case_id: int, body: CaseNoteCreate, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    case = _visible_case(db, user, case_id)
    db.add(CaseNote(case_id=case.id, author=user.username, content=body.content, kind=body.kind))
    audit.record(db, user.username, "CASE_NOTE", "case", case.id, {"kind": body.kind}, client_ip(request))
    db.commit()
    return get_case(case_id, request, db, user)
