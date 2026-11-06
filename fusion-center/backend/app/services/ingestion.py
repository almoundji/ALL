"""Ingestion : transforme des lignes tabulaires en entités + relations via un mapping déclaratif.

Mapping (JSON) :
{
  "entities": [
    {"ref": "p", "type": "PERSON", "label": "{prenom} {nom}", "attributes": {"birth_date": "{naissance}"},
     "classification": 1, "lat": "{lat}", "lon": "{lon}"}
  ],
  "relations": [
    {"source": "p", "target": "t", "type": "USES", "attributes": {"since": "{depuis}"}}
  ]
}
Les accolades référencent les colonnes de la ligne.
"""
import csv
import io
import json
import re
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import Entity, EntitySource, IngestJob, Relation, Source
from . import alerts as alert_engine
from .resolution import build_key, find_match, merge_attributes

PLACEHOLDER = re.compile(r"\{([^{}]+)\}")


def render(template: Any, row: dict) -> Any:
    if not isinstance(template, str):
        return template
    def sub(m):
        return str(row.get(m.group(1), "") or "")
    out = PLACEHOLDER.sub(sub, template).strip()
    return out


def parse_rows(filename: str, content: bytes) -> list[dict]:
    text = content.decode("utf-8-sig", errors="replace")
    if filename.lower().endswith(".json"):
        data = json.loads(text)
        if isinstance(data, dict):
            data = data.get("rows") or data.get("data") or [data]
        return [dict(r) for r in data]
    sample = text[:4096]
    try:
        dialect = csv.Sniffer().sniff(sample, delimiters=",;\t|")
    except csv.Error:
        dialect = csv.excel
    reader = csv.DictReader(io.StringIO(text), dialect=dialect)
    return [{(k or "").strip(): (v or "").strip() for k, v in r.items()} for r in reader]


def upsert_entity(db: Session, *, type_: str, label: str, attributes: dict, classification: int = 1,
                  compartment: str | None = None, lat: float | None = None, lon: float | None = None,
                  source: Source | None = None, external_ref: str = "", created_by: str = "system",
                  confidence: float = 0.6) -> tuple[Entity, bool]:
    """Crée ou fusionne. Renvoie (entité, created)."""
    attributes = {k: v for k, v in (attributes or {}).items() if v not in ("", None)}
    match, score, method = find_match(db, type_, label, attributes)
    if match:
        match.attributes = merge_attributes(match.attributes, attributes)
        if lat is not None and match.lat is None:
            match.lat, match.lon = lat, lon
        # Une nouvelle source indépendante augmente la confiance.
        match.confidence = min(0.99, match.confidence + 0.1)
        # Le niveau de classification le plus protecteur l'emporte.
        match.classification = max(match.classification, classification)
        if source:
            db.add(EntitySource(entity=match, source=source, external_ref=external_ref,
                                asserted={"label": label, **attributes}, match_score=score))
        db.flush()
        return match, False
    ent = Entity(type=type_, label=label, normalized_key=build_key(type_, label, attributes), attributes=attributes,
                 classification=classification, compartment=compartment or None, lat=lat, lon=lon,
                 created_by=created_by, confidence=confidence)
    db.add(ent)
    db.flush()
    if source:
        db.add(EntitySource(entity=ent, source=source, external_ref=external_ref,
                            asserted={"label": label, **attributes}, match_score=100.0))
    db.flush()
    return ent, True


def upsert_relation(db: Session, source_id: int, target_id: int, type_: str, attributes: dict | None = None,
                    weight: float = 1.0, classification: int = 1, compartment: str | None = None,
                    data_source: Source | None = None) -> tuple[Relation, bool]:
    if source_id == target_id:
        raise ValueError("relation réflexive refusée")
    existing = db.execute(select(Relation).where(Relation.source_id == source_id, Relation.target_id == target_id,
                                                 Relation.type == type_)).scalars().first()
    if existing:
        existing.weight += weight
        existing.attributes = merge_attributes(existing.attributes, attributes or {})
        existing.classification = max(existing.classification, classification)
        db.flush()
        return existing, False
    rel = Relation(source_id=source_id, target_id=target_id, type=type_, attributes=attributes or {}, weight=weight,
                   classification=classification, compartment=compartment or None,
                   data_source_id=data_source.id if data_source else None)
    db.add(rel)
    db.flush()
    return rel, True


def _to_float(v):
    try:
        return float(str(v).replace(",", ".")) if v not in ("", None) else None
    except ValueError:
        return None


def run_ingestion(db: Session, *, source: Source, filename: str, content: bytes, mapping: dict, username: str,
                  default_classification: int = 1, compartment: str | None = None) -> IngestJob:
    job = IngestJob(source_id=source.id, filename=filename, mapping=mapping, started_by=username, status="RUNNING")
    db.add(job)
    db.flush()
    try:
        rows = parse_rows(filename, content)
    except Exception as exc:  # fichier illisible
        job.status, job.errors = "FAILED", [f"lecture impossible : {exc}"]
        db.flush()
        return job
    job.rows_total = len(rows)
    errors: list[str] = []
    for idx, row in enumerate(rows, start=1):
        refs: dict[str, Entity] = {}
        try:
            for spec in mapping.get("entities", []):
                label = render(spec.get("label", ""), row)
                if not label:
                    continue
                attrs = {k: render(v, row) for k, v in (spec.get("attributes") or {}).items()}
                lat, lon = _to_float(render(spec.get("lat"), row)), _to_float(render(spec.get("lon"), row))
                ent, created = upsert_entity(
                    db, type_=spec["type"], label=label, attributes=attrs,
                    classification=int(spec.get("classification", default_classification)),
                    compartment=spec.get("compartment") or compartment, lat=lat, lon=lon, source=source,
                    external_ref=f"{filename}#{idx}", created_by=username,
                )
                refs[spec["ref"]] = ent
                if created:
                    job.entities_created += 1
                else:
                    job.entities_merged += 1
                job.alerts_raised += len(alert_engine.evaluate(db, ent))
            for spec in mapping.get("relations", []):
                s, t = refs.get(spec["source"]), refs.get(spec["target"])
                if not s or not t or s.id == t.id:
                    continue
                attrs = {k: render(v, row) for k, v in (spec.get("attributes") or {}).items()}
                _, created = upsert_relation(
                    db, s.id, t.id, spec["type"], attrs, weight=float(spec.get("weight", 1.0)),
                    classification=int(spec.get("classification", default_classification)),
                    compartment=spec.get("compartment") or compartment, data_source=source,
                )
                if created:
                    job.relations_created += 1
        except Exception as exc:  # une ligne en erreur n'interrompt pas le lot
            errors.append(f"ligne {idx} : {exc}")
    job.errors = errors[:200]
    job.status = "DONE" if not errors else ("PARTIAL" if len(errors) < len(rows) else "FAILED")
    db.flush()
    return job
