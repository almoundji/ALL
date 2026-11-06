"""Filtrage systématique par habilitation : aucune requête ne contourne cette couche."""
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from ..core.security import can_access, parse_compartments
from ..models import Entity, Relation, User


def visible_entities_stmt(user: User):
    """Statement SQLAlchemy ne retournant que les entités accessibles à l'utilisateur."""
    comps = parse_compartments(user.compartments)
    stmt = select(Entity).where(Entity.classification <= user.clearance)
    if comps:
        stmt = stmt.where(or_(Entity.compartment.is_(None), Entity.compartment == "", Entity.compartment.in_(comps)))
    else:
        stmt = stmt.where(or_(Entity.compartment.is_(None), Entity.compartment == ""))
    return stmt


def visible_relations_stmt(user: User):
    comps = parse_compartments(user.compartments)
    stmt = select(Relation).where(Relation.classification <= user.clearance)
    if comps:
        stmt = stmt.where(or_(Relation.compartment.is_(None), Relation.compartment == "", Relation.compartment.in_(comps)))
    else:
        stmt = stmt.where(or_(Relation.compartment.is_(None), Relation.compartment == ""))
    return stmt


def get_visible_entity(db: Session, user: User, entity_id: int) -> Entity | None:
    ent = db.get(Entity, entity_id)
    if not ent:
        return None
    if not can_access(user.clearance, parse_compartments(user.compartments), ent.classification, ent.compartment):
        return None  # 404 volontaire : ne pas révéler l'existence de l'objet
    return ent


def user_can_see(user: User, classification: int, compartment: str | None) -> bool:
    return can_access(user.clearance, parse_compartments(user.compartments), classification, compartment)
