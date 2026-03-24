"""
app/core/config.py — Application settings via Pydantic BaseSettings.
All values can be overridden via environment variables or a .env file.
"""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ───────────────────────────────────────────
    app_env: Literal["development", "production", "test"] = "development"
    app_debug: bool = True
    app_secret_key: str = "change-me"
    cors_origins: str = "http://localhost:3000,http://localhost:3001"

    @property
    def cors_origins_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    # ── Database ──────────────────────────────────────────────
    database_url: str = "postgresql+asyncpg://circuitai:circuitai@localhost:5432/circuitai_db"

    # ── Redis / Celery ────────────────────────────────────────
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/1"
    celery_result_backend: str = "redis://localhost:6379/2"

    # ── OpenAI ────────────────────────────────────────────────
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_temperature: float = 0.2
    openai_timeout: int = 60
    openai_max_retries: int = 3

    # ── Xyce Simulation ───────────────────────────────────────
    xyce_docker_image: str = "xyce:latest"
    xyce_workspace_base: str = "/tmp/xyce_jobs"
    xyce_timeout_seconds: int = 300
    xyce_memory_limit: str = "2g"
    xyce_cpu_quota: int = 100_000
    use_mock_xyce: bool = True  # set False when real Xyce image is available

    # ── Artifact Storage ──────────────────────────────────────
    artifact_storage_path: str = "/tmp/circuitai_artifacts"

    # ── Optimization ──────────────────────────────────────────
    max_optimization_iterations: int = 5
    mc_sample_count: int = 200

    # ── API Auth ──────────────────────────────────────────────
    api_key_enabled: bool = False
    api_key: str = ""


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
