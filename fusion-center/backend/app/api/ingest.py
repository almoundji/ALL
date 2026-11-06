import json

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..core.config import settings
from ..core.db import get_db
from ..models import IngestJob, Source, User
from ..schemas import IngestJobOut, SourceCreate, SourceOut
from ..services import audit
from ..services.ingestion import parse_rows, run_ingestion
from .deps import client_ip, get_current_user, require_role

router = APIRouter(prefix="/api/ingest", tags=["ingest"])

# Modèles de mapping prêts à l'emploi (cas d'usage DRN typiques).
TEMPLATES = {
    "annuaire_personnes": {
        "description": "Personnes avec téléphone et adresse (colonnes : nom, prenom, naissance, telephone, ville, lat, lon)",
        "mapping": {
            "entities": [
                {"ref": "p", "type": "PERSON", "label": "{prenom} {nom}", "attributes": {"birth_date": "{naissance}", "city": "{ville}"}},
                {"ref": "t", "type": "PHONE", "label": "{telephone}", "attributes": {"number": "{telephone}"}},
                {"ref": "l", "type": "LOCATION", "label": "{ville}", "lat": "{lat}", "lon": "{lon}"},
            ],
            "relations": [
                {"source": "p", "target": "t", "type": "USES"},
                {"source": "p", "target": "l", "type": "LOCATED_AT"},
            ],
        },
    },
    "cdr_appels": {
        "description": "Relevés d'appels (colonnes : appelant, appele, date, duree)",
        "mapping": {
            "entities": [
                {"ref": "a", "type": "PHONE", "label": "{appelant}", "attributes": {"number": "{appelant}"}},
                {"ref": "b", "type": "PHONE", "label": "{appele}", "attributes": {"number": "{appele}"}},
            ],
            "relations": [{"source": "a", "target": "b", "type": "CALLED", "attributes": {"date": "{date}", "duration": "{duree}"}}],
        },
    },
    "vehicules": {
        "description": "Immatriculations et propriétaires (colonnes : plaque, marque, proprietaire)",
        "mapping": {
            "entities": [
                {"ref": "v", "type": "VEHICLE", "label": "{plaque}", "attributes": {"plate": "{plaque}", "brand": "{marque}"}},
                {"ref": "p", "type": "PERSON", "label": "{proprietaire}"},
            ],
            "relations": [{"source": "p", "target": "v", "type": "OWNS"}],
        },
    },
    "transactions": {
        "description": "Virements (colonnes : emetteur, beneficiaire, montant, date)",
        "mapping": {
            "entities": [
                {"ref": "a", "type": "ACCOUNT", "label": "{emetteur}", "attributes": {"iban": "{emetteur}"}},
                {"ref": "b", "type": "ACCOUNT", "label": "{beneficiaire}", "attributes": {"iban": "{beneficiaire}"}},
            ],
            "relations": [{"source": "a", "target": "b", "type": "TRANSFERRED_TO", "attributes": {"amount": "{montant}", "date": "{date}"}}],
        },
    },
}


@router.get("/sources", response_model=list[SourceOut])
def list_sources(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.execute(select(Source).where(Source.classification <= user.clearance).order_by(Source.name)).scalars().all()


@router.post("/sources", response_model=SourceOut, status_code=201)
def create_source(body: SourceCreate, request: Request, db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    if db.execute(select(Source).where(Source.name == body.name)).scalar_one_or_none():
        raise HTTPException(409, "Source déjà existante")
    src = Source(**body.model_dump())
    db.add(src)
    db.flush()
    audit.record(db, user.username, "SOURCE_CREATE", "source", src.id, {"name": src.name}, client_ip(request))
    db.commit()
    db.refresh(src)
    return src


@router.get("/templates")
def templates(user: User = Depends(get_current_user)):
    return TEMPLATES


@router.post("/preview")
async def preview(file: UploadFile = File(...), user: User = Depends(get_current_user)):
    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, "Fichier trop volumineux")
    try:
        rows = parse_rows(file.filename or "upload.csv", content)
    except Exception as exc:
        raise HTTPException(422, f"Fichier illisible : {exc}")
    return {"columns": list(rows[0].keys()) if rows else [], "rows": rows[:10], "total": len(rows)}


@router.post("/upload", response_model=IngestJobOut, status_code=201)
async def upload(request: Request, file: UploadFile = File(...), source_id: int = Form(...), mapping: str = Form(...),
                 classification: int = Form(1), compartment: str | None = Form(None),
                 db: Session = Depends(get_db), user: User = Depends(require_role("admin", "analyst"))):
    source = db.get(Source, source_id)
    if not source:
        raise HTTPException(404, "Source introuvable")
    if classification > user.clearance:
        raise HTTPException(403, "Classification au-dessus de votre habilitation")
    try:
        mapping_obj = json.loads(mapping)
    except json.JSONDecodeError:
        raise HTTPException(422, "Mapping JSON invalide")
    content = await file.read()
    if len(content) > settings.max_upload_mb * 1024 * 1024:
        raise HTTPException(413, "Fichier trop volumineux")
    job = run_ingestion(db, source=source, filename=file.filename or "upload.csv", content=content, mapping=mapping_obj,
                        username=user.username, default_classification=classification, compartment=compartment)
    audit.record(db, user.username, "INGEST", "ingest_job", job.id,
                 {"file": job.filename, "rows": job.rows_total, "created": job.entities_created, "merged": job.entities_merged,
                  "relations": job.relations_created, "status": job.status}, client_ip(request))
    db.commit()
    db.refresh(job)
    return job


@router.get("/jobs", response_model=list[IngestJobOut])
def jobs(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.execute(select(IngestJob).order_by(IngestJob.created_at.desc()).limit(100)).scalars().all()
