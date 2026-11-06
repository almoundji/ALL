"""Modèle de données du centre de fusion (ontologie entités / relations / dossiers)."""
from datetime import datetime, timezone

from sqlalchemy import JSON, Boolean, DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from ..core.db import Base

ENTITY_TYPES = (
    "PERSON", "ORGANIZATION", "VEHICLE", "PHONE", "LOCATION", "EVENT",
    "ACCOUNT", "DEVICE", "DOCUMENT", "VESSEL",
)
RELATION_TYPES = (
    "KNOWS", "MEMBER_OF", "OWNS", "USES", "CALLED", "LOCATED_AT", "PARTICIPATED_IN",
    "TRANSFERRED_TO", "TRAVELLED_TO", "MENTIONS", "RELATED_TO", "FAMILY_OF", "EMPLOYED_BY",
)
SOURCE_TYPES = ("HUMINT", "OSINT", "SIGINT", "FININT", "GEOINT", "ADMIN", "PARTNER", "CSV", "API")


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    id: Mapped[int] = mapped_column(primary_key=True)
    username: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    full_name: Mapped[str] = mapped_column(String(128), default="")
    hashed_password: Mapped[str] = mapped_column(String(128))
    role: Mapped[str] = mapped_column(String(16), default="analyst")
    clearance: Mapped[int] = mapped_column(Integer, default=1)
    compartments: Mapped[str] = mapped_column(String(256), default="")
    unit: Mapped[str] = mapped_column(String(128), default="")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Source(Base):
    __tablename__ = "sources"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128), unique=True)
    type: Mapped[str] = mapped_column(String(16), default="CSV")
    reliability: Mapped[str] = mapped_column(String(1), default="C")  # Cotation OTAN A-F
    description: Mapped[str] = mapped_column(Text, default="")
    classification: Mapped[int] = mapped_column(Integer, default=1)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Entity(Base):
    __tablename__ = "entities"
    id: Mapped[int] = mapped_column(primary_key=True)
    type: Mapped[str] = mapped_column(String(32), index=True)
    label: Mapped[str] = mapped_column(String(256), index=True)
    normalized_key: Mapped[str] = mapped_column(String(256), index=True, default="")
    attributes: Mapped[dict] = mapped_column(JSON, default=dict)
    classification: Mapped[int] = mapped_column(Integer, default=1, index=True)
    compartment: Mapped[str | None] = mapped_column(String(32), nullable=True)
    confidence: Mapped[float] = mapped_column(Float, default=0.5)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lon: Mapped[float | None] = mapped_column(Float, nullable=True)
    created_by: Mapped[str] = mapped_column(String(64), default="system")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    provenance: Mapped[list["EntitySource"]] = relationship(back_populates="entity", cascade="all, delete-orphan")


class EntitySource(Base):
    """Provenance : quelle source a affirmé quoi, quand (traçabilité par attribut)."""
    __tablename__ = "entity_sources"
    id: Mapped[int] = mapped_column(primary_key=True)
    entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"), index=True)
    external_ref: Mapped[str] = mapped_column(String(256), default="")
    asserted: Mapped[dict] = mapped_column(JSON, default=dict)
    match_score: Mapped[float] = mapped_column(Float, default=100.0)
    observed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    entity: Mapped[Entity] = relationship(back_populates="provenance")
    source: Mapped[Source] = relationship()


class Relation(Base):
    __tablename__ = "relations"
    __table_args__ = (UniqueConstraint("source_id", "target_id", "type", name="uq_relation"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    target_id: Mapped[int] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    type: Mapped[str] = mapped_column(String(32), index=True)
    attributes: Mapped[dict] = mapped_column(JSON, default=dict)
    weight: Mapped[float] = mapped_column(Float, default=1.0)
    classification: Mapped[int] = mapped_column(Integer, default=1)
    compartment: Mapped[str | None] = mapped_column(String(32), nullable=True)
    valid_from: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    valid_to: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    data_source_id: Mapped[int | None] = mapped_column(ForeignKey("sources.id"), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Case(Base):
    __tablename__ = "cases"
    id: Mapped[int] = mapped_column(primary_key=True)
    reference: Mapped[str] = mapped_column(String(32), unique=True)
    title: Mapped[str] = mapped_column(String(256))
    description: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[str] = mapped_column(String(16), default="OPEN")  # OPEN, IN_PROGRESS, CLOSED
    priority: Mapped[str] = mapped_column(String(8), default="P2")  # P0..P3
    classification: Mapped[int] = mapped_column(Integer, default=2)
    compartment: Mapped[str | None] = mapped_column(String(32), nullable=True)
    owner: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    entities: Mapped[list["CaseEntity"]] = relationship(cascade="all, delete-orphan")
    notes: Mapped[list["CaseNote"]] = relationship(cascade="all, delete-orphan", order_by="CaseNote.created_at")


class CaseEntity(Base):
    __tablename__ = "case_entities"
    __table_args__ = (UniqueConstraint("case_id", "entity_id", name="uq_case_entity"),)
    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    entity_id: Mapped[int] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"), index=True)
    role: Mapped[str] = mapped_column(String(32), default="SUBJECT")  # SUBJECT, WITNESS, ASSOCIATE, ASSET
    added_by: Mapped[str] = mapped_column(String(64))
    added_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class CaseNote(Base):
    __tablename__ = "case_notes"
    id: Mapped[int] = mapped_column(primary_key=True)
    case_id: Mapped[int] = mapped_column(ForeignKey("cases.id", ondelete="CASCADE"), index=True)
    author: Mapped[str] = mapped_column(String(64))
    content: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(16), default="NOTE")  # NOTE, HYPOTHESIS, DECISION, ACTION
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Watchlist(Base):
    """Règle de veille : déclenche une alerte quand une entité ingérée correspond."""
    __tablename__ = "watchlists"
    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(128))
    entity_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    field: Mapped[str] = mapped_column(String(64), default="label")  # label ou attributes.<clé>
    operator: Mapped[str] = mapped_column(String(16), default="contains")  # equals, contains, fuzzy, regex
    value: Mapped[str] = mapped_column(String(256))
    severity: Mapped[str] = mapped_column(String(8), default="MEDIUM")  # LOW, MEDIUM, HIGH, CRITICAL
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class Alert(Base):
    __tablename__ = "alerts"
    id: Mapped[int] = mapped_column(primary_key=True)
    watchlist_id: Mapped[int | None] = mapped_column(ForeignKey("watchlists.id", ondelete="SET NULL"), nullable=True)
    entity_id: Mapped[int | None] = mapped_column(ForeignKey("entities.id", ondelete="CASCADE"), nullable=True)
    title: Mapped[str] = mapped_column(String(256))
    message: Mapped[str] = mapped_column(Text, default="")
    severity: Mapped[str] = mapped_column(String(8), default="MEDIUM")
    status: Mapped[str] = mapped_column(String(8), default="NEW", index=True)  # NEW, ACK, CLOSED
    assigned_to: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class IngestJob(Base):
    __tablename__ = "ingest_jobs"
    id: Mapped[int] = mapped_column(primary_key=True)
    source_id: Mapped[int] = mapped_column(ForeignKey("sources.id"))
    filename: Mapped[str] = mapped_column(String(256))
    status: Mapped[str] = mapped_column(String(16), default="DONE")
    rows_total: Mapped[int] = mapped_column(Integer, default=0)
    entities_created: Mapped[int] = mapped_column(Integer, default=0)
    entities_merged: Mapped[int] = mapped_column(Integer, default=0)
    relations_created: Mapped[int] = mapped_column(Integer, default=0)
    alerts_raised: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[list] = mapped_column(JSON, default=list)
    mapping: Mapped[dict] = mapped_column(JSON, default=dict)
    started_by: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


class AuditLog(Base):
    """Journal inviolable : chaque ligne contient le hachage de la précédente (chaîne)."""
    __tablename__ = "audit_log"
    id: Mapped[int] = mapped_column(primary_key=True)
    ts: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    username: Mapped[str] = mapped_column(String(64), index=True)
    action: Mapped[str] = mapped_column(String(64), index=True)
    resource_type: Mapped[str] = mapped_column(String(32), default="")
    resource_id: Mapped[str] = mapped_column(String(64), default="")
    details: Mapped[dict] = mapped_column(JSON, default=dict)
    ip: Mapped[str] = mapped_column(String(64), default="")
    prev_hash: Mapped[str] = mapped_column(String(64), default="")
    hash: Mapped[str] = mapped_column(String(64), default="")
