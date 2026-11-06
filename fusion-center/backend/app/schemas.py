from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ORM(BaseModel):
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(ORM):
    id: int
    username: str
    full_name: str
    role: str
    clearance: int
    compartments: str
    unit: str
    is_active: bool


class UserCreate(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    password: str = Field(min_length=8)
    full_name: str = ""
    role: str = "analyst"
    clearance: int = Field(default=1, ge=0, le=3)
    compartments: str = ""
    unit: str = ""


class UserUpdate(BaseModel):
    full_name: str | None = None
    role: str | None = None
    clearance: int | None = Field(default=None, ge=0, le=3)
    compartments: str | None = None
    unit: str | None = None
    is_active: bool | None = None
    password: str | None = Field(default=None, min_length=8)


class SourceOut(ORM):
    id: int
    name: str
    type: str
    reliability: str
    description: str
    classification: int


class SourceCreate(BaseModel):
    name: str
    type: str = "CSV"
    reliability: str = "C"
    description: str = ""
    classification: int = 1


class ProvenanceOut(ORM):
    id: int
    source: SourceOut
    external_ref: str
    asserted: dict
    match_score: float
    observed_at: datetime


class EntityOut(ORM):
    id: int
    type: str
    label: str
    attributes: dict
    classification: int
    compartment: str | None
    confidence: float
    lat: float | None
    lon: float | None
    created_by: str
    created_at: datetime
    updated_at: datetime


class EntityDetail(EntityOut):
    provenance: list[ProvenanceOut] = []
    degree: int = 0


class EntityCreate(BaseModel):
    type: str
    label: str = Field(min_length=1, max_length=256)
    attributes: dict[str, Any] = {}
    classification: int = Field(default=1, ge=0, le=3)
    compartment: str | None = None
    lat: float | None = None
    lon: float | None = None
    source_id: int | None = None
    confidence: float = Field(default=0.6, ge=0, le=1)


class EntityUpdate(BaseModel):
    label: str | None = None
    attributes: dict[str, Any] | None = None
    classification: int | None = Field(default=None, ge=0, le=3)
    compartment: str | None = None
    lat: float | None = None
    lon: float | None = None
    confidence: float | None = None


class RelationOut(ORM):
    id: int
    source_id: int
    target_id: int
    type: str
    attributes: dict
    weight: float
    classification: int
    valid_from: datetime | None
    valid_to: datetime | None


class RelationCreate(BaseModel):
    source_id: int
    target_id: int
    type: str
    attributes: dict[str, Any] = {}
    weight: float = 1.0
    classification: int = Field(default=1, ge=0, le=3)
    compartment: str | None = None
    valid_from: datetime | None = None
    valid_to: datetime | None = None


class GraphOut(BaseModel):
    nodes: list[EntityOut]
    edges: list[RelationOut]


class Page(BaseModel):
    total: int
    items: list[EntityOut]


class CaseNoteOut(ORM):
    id: int
    author: str
    content: str
    kind: str
    created_at: datetime


class CaseEntityOut(ORM):
    id: int
    entity_id: int
    role: str
    added_by: str
    added_at: datetime
    entity: EntityOut | None = None


class CaseOut(ORM):
    id: int
    reference: str
    title: str
    description: str
    status: str
    priority: str
    classification: int
    compartment: str | None
    owner: str
    created_at: datetime
    updated_at: datetime
    entity_count: int = 0


class CaseDetail(CaseOut):
    notes: list[CaseNoteOut] = []
    entities: list[CaseEntityOut] = []


class CaseCreate(BaseModel):
    title: str
    description: str = ""
    priority: str = "P2"
    classification: int = Field(default=2, ge=0, le=3)
    compartment: str | None = None


class CaseUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    status: str | None = None
    priority: str | None = None
    owner: str | None = None


class CaseNoteCreate(BaseModel):
    content: str = Field(min_length=1)
    kind: str = "NOTE"


class CaseEntityAdd(BaseModel):
    entity_id: int
    role: str = "SUBJECT"


class WatchlistOut(ORM):
    id: int
    name: str
    entity_type: str | None
    field: str
    operator: str
    value: str
    severity: str
    is_active: bool
    created_by: str
    created_at: datetime


class WatchlistCreate(BaseModel):
    name: str
    entity_type: str | None = None
    field: str = "label"
    operator: str = "contains"
    value: str
    severity: str = "MEDIUM"


class AlertOut(ORM):
    id: int
    watchlist_id: int | None
    entity_id: int | None
    title: str
    message: str
    severity: str
    status: str
    assigned_to: str | None
    created_at: datetime


class AlertUpdate(BaseModel):
    status: str | None = None
    assigned_to: str | None = None


class IngestJobOut(ORM):
    id: int
    source_id: int
    filename: str
    status: str
    rows_total: int
    entities_created: int
    entities_merged: int
    relations_created: int
    alerts_raised: int
    errors: list
    mapping: dict
    started_by: str
    created_at: datetime


class AuditOut(ORM):
    id: int
    ts: datetime
    username: str
    action: str
    resource_type: str
    resource_id: str
    details: dict
    ip: str
    prev_hash: str
    hash: str
