# app/core/config.py
import os
from pathlib import Path
from dotenv import load_dotenv
from pydantic_settings import BaseSettings  # ab Pydantic v2 korrekt!
# (falls du noch Pydantic v1 nutzt, stattdessen: from pydantic import BaseSettings)

# Explicitly load .env file from project root
# This ensures environment variables are loaded regardless of working directory
# Path: config.py -> core -> app -> backend -> src -> CaffeineCode (repo root)
env_path = Path(__file__).parent.parent.parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)


class Settings(BaseSettings):
    # Basisinformationen
    app_name: str = "CodeDoc Backend"
    debug: bool = True

    # Datenbank / Celery-Konfiguration
    DATABASE_URL: str
    CELERY_BROKER_URL: str | None = None
    CELERY_RESULT_BACKEND: str | None = None

    class Config:
        env_file = ".env"        # Damit FastAPI sie beim Start lädt
        env_file_encoding = "utf-8"
        extra = "ignore"         # Ignore extra fields from .env that aren't defined in Settings


# Globale Settings-Instanz
settings = Settings()
