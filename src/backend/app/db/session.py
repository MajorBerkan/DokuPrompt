from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings

# Fail-fast mit klarer Meldung
if not getattr(settings, "DATABASE_URL", None):
    raise RuntimeError("DATABASE_URL ist nicht gesetzt. Prüfe .env und docker-compose.yml")

engine = create_engine(
    settings.DATABASE_URL,
    pool_pre_ping=True,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)
