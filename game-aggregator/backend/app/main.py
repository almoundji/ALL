"""Point d'entrée FastAPI de Yoon : API + interface compilée (dossier static)."""
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from .core.config import settings
from .core.db import Base, engine
from .modules import MODULES

STATIC_DIR = Path(__file__).resolve().parent / "static"


@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(engine)
    yield


app = FastAPI(
    title=settings.app_name, version=settings.version, lifespan=lifespan,
    description="Agrégateur de jeux de hasard : un seul chemin entre les opérateurs et tous les fournisseurs de jeux.",
)
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])

for module in MODULES:
    app.include_router(module.router)


@app.get("/api/health", tags=["socle"])
def health():
    return {"status": "ok", "app": settings.app_name, "version": settings.version, "environment": settings.environment}


@app.get("/api/modules", tags=["socle"])
def modules():
    """Liste des modules et de leur état d'avancement (feuille de route Scrum)."""
    return [{"key": m.key, "name": m.name, "sprint": m.sprint, "status": m.status} for m in MODULES]


if STATIC_DIR.exists():
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def spa(full_path: str):
        candidate = STATIC_DIR / full_path
        if full_path and candidate.is_file():
            return FileResponse(candidate)
        return FileResponse(STATIC_DIR / "index.html")
