"""Configuration centrale (variables d'environnement préfixées YOON_)."""
from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="YOON_", env_file=BASE_DIR / ".env", extra="ignore")

    app_name: str = "Yoon"
    version: str = "0.0.1-sprint0"
    environment: str = "dev"
    database_url: str = f"sqlite:///{BASE_DIR / 'data' / 'yoon.db'}"
    secret_key: str = "change-me-in-production-use-a-64-char-random-string"
    cors_origins: list[str] = ["http://localhost:5173"]
    default_currency: str = "XOF"


settings = Settings()
