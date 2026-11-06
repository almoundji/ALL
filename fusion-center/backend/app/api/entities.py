from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..models import ENTITY_TYPES, RELATION_TYPES, Entity, Relation, Source, User
from ..schemas import EntityCreate, EntityDetail, EntityOut, EntityUpdate, GraphOut, Page, RelationCreate, RelationOut
from ..services import alerts as alert_engine
from ..services import audit
from ..services.access import get_visible_entity, user_can_see, visible_entities_stmt, visible_relations_stmt
from ..services.graph import ego_subgraph
from ..services.ingestion import upsert_entity, upsert_relation
from ..services.resolution import build_key
from .deps import client_ip, get_current_user, require_role

router = APIRouter(prefix="/api", tags=["entities"])


@router.get("/entities", response_model=Page)
def search_entities(
    q: str = "", type: str | None = None, classification: int | None = None, has_geo: bool = False,
    limit: int = Query(50, le=500), offset: int = 0, db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    stmt = visible_entities_stmt(user)
    if type:
        stmt = stmt.where(Entity.type == type)
    if classification is not None:
        stmt = stmt.where(Entity.classification == classification)
    if has_geo:
        stmt = stmt.where(Entity.lat.is_not(None))
    if q:
        like = f"%{q.lower()}%"
        stmt = stmt.where(or_(func.lower(Entity.label).like(like), func.lower(cast(Entity.attributes, String)).like(like)))
    total = db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one()
    items = db.execute(stmt.order_by(Entity.updated_at.desc()).limit(limit).offset(offset)).scalars().all()
    return Page(total=total, items=items)


@router.post("/entities", response_model=EntityOut, status_code=201)
def create_entity(body: EntityCreate, request: Request, db: Session = Depends(get_db),
                  user: User = Depends(require_role("admin", "analyst"))):
    if body.type not in ENTITY_TYPES:
        raise HTTPException(422, f"type inconnu : {body.type}")
    if body.classification > user.clearance:
        raise HTTPException(403, "Impossible de créer un objet au-dessus de votre habilitation")
    source = db.get(Source, body.source_id) if body.source_id else None
    ent, created = upsert_entity(db, type_=body.type, label=body.label, attributes=body.attributes,
                                 classification=body.classification, compartment=body.compartment, lat=body.lat,
                                 lon=body.lon, source=source, created_by=user.username, confidence=body.confidence)
    raised = alert_engine.evaluate(db, ent)
    audit.record(db, user.username, "ENTITY_CREATE" if created else "ENTITY_MERGE", "entity", ent.id,
                 {"label": ent.label, "type": ent.type, "alerts": len(raised)}, client_ip(request))
    db.commit()
    db.refresh(ent)
    return ent


@router.get("/entities/{entity_id}", response_model=EntityDetail)
def get_entity(entity_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    ent = get_visible_entity(db, user, entity_id)
    if not ent:
        raise HTTPException(404, "Entité introuvable")
    degree = db.execute(select(func.count()).select_from(
        visible_relations_stmt(user).where(or_(Relation.source_id == ent.id, Relation.target_id == ent.id)).subquery()
    )).scalar_one()
    audit.record(db, user.username, "ENTITY_VIEW", "entity", ent.id, {"label": ent.label}, client_ip(request))
    db.commit()
    out = EntityDetail.model_validate(ent)
    out.degree = degree
    return out


@router.patch("/entities/{entity_id}", response_model=EntityOut)
def update_entity(entity_id: int, body: EntityUpdate, request: Request, db: Session = Depends(get_db),
                  user: User = Depends(require_role("admin", "analyst"))):
    ent = get_visible_entity(db, user, entity_id)
    if not ent:
        raise HTTPException(404, "Entité introuvable")
    changes = body.model_dump(exclude_unset=True)
    if "classification" in changes and changes["classification"] > user.clearance:
        raise HTTPException(403, "Classification au-dessus de votre habilitation")
    for k, v in changes.items():
        setattr(ent, k, v)
    ent.normalized_key = build_key(ent.type, ent.label, ent.attributes)
    audit.record(db, user.username, "ENTITY_UPDATE", "entity", ent.id, {"changes": list(changes)}, client_ip(request))
    db.commit()
    db.refresh(ent)
    return ent


@router.delete("/entities/{entity_id}", status_code=204)
def delete_entity(entity_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin"))):
    ent = get_visible_entity(db, user, entity_id)
    if not ent:
        raise HTTPException(404, "Entité introuvable")
    audit.record(db, user.username, "ENTITY_DELETE", "entity", ent.id, {"label": ent.label}, client_ip(request))
    db.delete(ent)
    db.commit()


@router.get("/entities/{entity_id}/relations", response_model=list[RelationOut])
def entity_relations(entity_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not get_visible_entity(db, user, entity_id):
        raise HTTPException(404, "Entité introuvable")
    visible_ids = select(visible_entities_stmt(user).subquery().c.id)
    stmt = visible_relations_stmt(user).where(
        or_(Relation.source_id == entity_id, Relation.target_id == entity_id),
        Relation.source_id.in_(visible_ids), Relation.target_id.in_(visible_ids),
    )
    return db.execute(stmt).scalars().all()


@router.get("/entities/{entity_id}/graph", response_model=GraphOut)
def entity_graph(entity_id: int, depth: int = Query(1, ge=1, le=4), limit: int = Query(200, le=1000),
                 request: Request = None, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if not get_visible_entity(db, user, entity_id):
        raise HTTPException(404, "Entité introuvable")
    sub = ego_subgraph(db, user, [entity_id], depth=depth, limit=limit)
    audit.record(db, user.username, "GRAPH_EXPAND", "entity", entity_id, {"depth": depth, "nodes": len(sub["nodes"])},
                 client_ip(request) if request else "")
    db.commit()
    return sub


@router.post("/relations", response_model=RelationOut, status_code=201)
def create_relation(body: RelationCreate, request: Request, db: Session = Depends(get_db),
                    user: User = Depends(require_role("admin", "analyst"))):
    if body.type not in RELATION_TYPES:
        raise HTTPException(422, f"type de relation inconnu : {body.type}")
    if not get_visible_entity(db, user, body.source_id) or not get_visible_entity(db, user, body.target_id):
        raise HTTPException(404, "Entité source ou cible introuvable")
    try:
        rel, created = upsert_relation(db, body.source_id, body.target_id, body.type, body.attributes, body.weight,
                                       body.classification, body.compartment)
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    rel.valid_from, rel.valid_to = body.valid_from, body.valid_to
    audit.record(db, user.username, "RELATION_CREATE" if created else "RELATION_MERGE", "relation", rel.id,
                 {"type": rel.type, "source": rel.source_id, "target": rel.target_id}, client_ip(request))
    db.commit()
    db.refresh(rel)
    return rel


@router.delete("/relations/{relation_id}", status_code=204)
def delete_relation(relation_id: int, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    rel = db.get(Relation, relation_id)
    if not rel or not user_can_see(user, rel.classification, rel.compartment):
        raise HTTPException(404, "Relation introuvable")
    audit.record(db, user.username, "RELATION_DELETE", "relation", rel.id, {"type": rel.type}, client_ip(request))
    db.delete(rel)
    db.commit()
