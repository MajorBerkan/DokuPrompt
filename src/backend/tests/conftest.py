"""
Test configuration and fixtures for pytest
"""

from app.db.base import Base
from app.main import create_app
import os
import sys
from pathlib import Path

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from fastapi.testclient import TestClient
from sqlalchemy.dialects.postgresql import CITEXT, JSONB
from sqlalchemy.ext.compiler import compiles

# ---------------------------------------------------------------------------
# Pfad so setzen, dass unser lokales "app"-Paket benutzt wird
# (und nicht das fremde Flask-"app" aus site-packages)
# ---------------------------------------------------------------------------
backend_dir = Path(__file__).resolve().parent.parent  # .../src/backend
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

# ---------------------------------------------------------------------------
# Test-Umgebung vorbereiten
# ---------------------------------------------------------------------------
os.environ.setdefault("TESTING", "true")
os.environ.setdefault("DATABASE_URL", "sqlite:///./test.db")
# Dummy-Key, damit ChatOpenAI / langchain beim Import nicht meckert
os.environ.setdefault("OPENAI_API_KEY", "test")


# ---------------------------------------------------------------------------
# CITEXT und JSONB auf SQLite als TEXT behandeln
# ---------------------------------------------------------------------------
@compiles(CITEXT, "sqlite")
def compile_citext_sqlite(element, compiler, **kw):
    return "TEXT"


@compiles(JSONB, "sqlite")
def compile_jsonb_sqlite(element, compiler, **kw):
    # SQLite kennt JSONB nicht, aber der Typname ist bei SQLite eh nur Deko
    # TEXT reicht völlig für unsere Tests
    return "TEXT"


SQLALCHEMY_DATABASE_URL = os.environ["DATABASE_URL"]

# check_same_thread is only needed for SQLite, not PostgreSQL
connect_args = {}
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args=connect_args,
    future=True,
)

TestingSessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
    future=True,
)


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    """Erstellt das Schema einmal für alle Tests und räumt am Ende auf."""
    # Create PostgreSQL extensions if using PostgreSQL
    if not SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
        from sqlalchemy import text
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS citext"))
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()

    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="function")
def db_session():
    """Pro Test eine frische Session."""
    session = TestingSessionLocal()
    try:
        yield session
        session.commit()
    finally:
        session.close()
        # Tabellen nach jedem Test leeren, damit Tests unabhängig sind
        with engine.begin() as conn:
            for table in reversed(Base.metadata.sorted_tables):
                conn.execute(table.delete())


@pytest.fixture(scope="function")
def client(db_session):
    """
    FastAPI TestClient mit überschriebenem get_db.
    """
    app = create_app()

    def override_get_db():
        try:
            yield db_session
        finally:
            pass

    from app.api import routes_ai, routes_prompts, routes_docs, routes_repo, routes_templates

    for route_module in (routes_ai, routes_prompts, routes_docs, routes_repo, routes_templates):
        if hasattr(route_module, "get_db"):
            app.dependency_overrides[route_module.get_db] = override_get_db

    with TestClient(app) as test_client:
        yield test_client

    app.dependency_overrides.clear()
