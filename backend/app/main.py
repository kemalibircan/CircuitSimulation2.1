"""
app/main.py — FastAPI application factory.
Creates the app, registers middleware, mounts routers, and sets up startup events.
"""
from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.router import api_router
from app.core.config import settings
from app.core.errors import register_exception_handlers
from app.core.logging import configure_logging, get_logger

logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    configure_logging()
    logger.info("circuitai_api_starting", env=settings.app_env)

    # Ensure artifact directories exist
    import os
    os.makedirs(settings.artifact_storage_path, exist_ok=True)
    os.makedirs(settings.xyce_workspace_base, exist_ok=True)

    # Auto-create DB tables in development
    if settings.app_env in ("development", "test"):
        from app.db.session import create_tables
        await create_tables()
        logger.info("database_tables_created")

    yield  # ← app runs here

    logger.info("circuitai_api_shutdown")


def create_app() -> FastAPI:
    app = FastAPI(
        title="CircuitAI Backend API",
        description="AI-powered analog circuit design platform backend.",
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
    )

    # ── CORS ──────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["X-Run-Id", "X-Correlation-Id"],
    )

    # ── Exception handlers ────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ───────────────────────────────────────────────
    app.include_router(api_router)

    # ── Health check ──────────────────────────────────────────
    @app.get("/api/v1/health", tags=["health"])
    async def health() -> JSONResponse:
        return JSONResponse({"status": "ok", "version": "0.1.0"})

    return app


app = create_app()
