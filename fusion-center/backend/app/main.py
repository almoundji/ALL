"""Point d'entrée FastAPI : API + interface web compilée (dossier static)."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .api import admin, alerts, auth, cases, entities, graph, ingest
from .core.config import settings
from .core.db import Base, SessionLocal, engine
from .seed import ensure_admin, seed_demo

STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.database_url.replace("sqlite:///", "")).parent.mkdir(parents=True, exist_ok=True) if settings.database_url.startswith("sqlite") else None
    Base.metadata.create_all(engine)
    with SessionLocal() as db:
        ensure_admin(db)
        if settings.seed_demo:
            seed_demo(db)
    yield


app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan,
              description="Plateforme de fusion de données pour le renseignement : graphe d'entités, résolution d'identité, "
                          "dossiers d'enquête, veille, journal d'audit chaîné.")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for r in (auth.router, entities.router, graph.router, cases.router, ingest.router, alerts.router, admin.router):
    app.include_router(r)


@app.get("/api/health")
def health():
    return {"status": "ok", "app": settings.app_name, "environment": settings.environment}


if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
