"""Configuration centrale (variables d'environnement préfixées FC_)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="FC_", env_file=BASE_DIR / ".env", extra="ignore")

    app_name: str = "Centre de Fusion National"
    environment: str = "dev"
    database_url: str = f"sqlite:///{BASE_DIR / 'data' / 'fusion.db'}"
    secret_key: str = "change-me-in-production-use-a-64-char-random-string"
    access_token_minutes: int = 480
    admin_username: str = "admin"
    admin_password: str = "admin123"
    seed_demo: bool = True
    cors_origins: list[str] = ["http://localhost:5173"]
    max_upload_mb: int = 50


settings = Settings()
