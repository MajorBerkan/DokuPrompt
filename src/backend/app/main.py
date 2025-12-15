# app/main.py
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.db.init_db import init_db
from app.db.session import SessionLocal
from sqlalchemy import text

from app.api.routes_health import router as health_router
from app.api.routes_repo import router as repo_router
from app.api.routes_auth import router as auth_router

from app.api.routes_ai import router as ai_router
from app.api.routes_prompts import router as prompts_router
from app.api.routes_docs import router as docs_router
from app.api.routes_templates import router as templates_router
from app.api.routes_settings import router as settings_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        debug=settings.debug,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:3000",
            "http://127.0.0.1:3000",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    # --- Healthcheck-Routen ---
    @app.get("/")
    def root():
        return {
            "message": "CaffeineCode API",
            "status": "running",
            "docs": "/docs",
            "health": "/health"
        }

    @app.get("/health/db")
    def health_db():
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
        return {"db": "ok"}

    @app.get("/health")
    def health_root():
        return {"status": "ok"}

    # --- Weitere API-Routen ---
    app.include_router(health_router, prefix="")
    app.include_router(repo_router)
    app.include_router(auth_router)
    app.include_router(ai_router)
    app.include_router(prompts_router)
    app.include_router(docs_router)
    app.include_router(templates_router)
    app.include_router(settings_router)

    return app


app = create_app()
