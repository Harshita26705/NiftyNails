"""Application settings loaded from environment variables / .env file."""

from functools import lru_cache
from pathlib import Path
from typing import Annotated

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict

BACKEND_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=BACKEND_ROOT / ".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Nifty Nails API"
    environment: str = Field(default="development", description="development | test | production")
    debug: bool = False

    database_url: str = "postgresql+psycopg://nifty:nifty@localhost:5432/nifty"

    # Security
    secret_key: str = Field(default="dev-only-change-me", min_length=16)
    access_token_minutes: int = 60 * 24 * 7
    session_cookie_name: str = "nifty_session"
    cookie_secure: bool = False
    cors_origins: Annotated[list[str], NoDecode] = ["http://localhost:3000"]
    # True when the API is only reachable through our own proxy (Next.js rewrites / load balancer).
    trust_forwarded_for: bool = True

    # Bootstrap admin (created by the seed command if missing)
    admin_email: str = "admin@niftynails.in"
    admin_password: str = "ChangeMe!2026"

    # Uploads
    media_dir: Path = BACKEND_ROOT / "media"
    media_url_prefix: str = "/media"
    max_upload_mb: int = 8
    max_image_pixels: int = 40_000_000

    # AI / ML
    embedding_provider: str = "hashing"  # hashing | sentence-transformers
    hand_landmarker_model: Path = BACKEND_ROOT / "models" / "hand_landmarker.task"

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_origins(cls, value: object) -> object:
        if isinstance(value, str) and not value.strip().startswith("["):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @property
    def is_production(self) -> bool:
        return self.environment == "production"


@lru_cache
def get_settings() -> Settings:
    settings = Settings()
    if settings.is_production and settings.secret_key.startswith("dev-only"):
        raise RuntimeError("SECRET_KEY must be set in production")
    if settings.is_production and settings.admin_password in {"ChangeMe!2026", "choose-a-strong-password"}:
        raise RuntimeError("ADMIN_PASSWORD must be changed from the default in production")
    return settings
