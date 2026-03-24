"""
app/workers/celery_app.py — Celery application factory and configuration.
"""
from __future__ import annotations

from celery import Celery
from celery.signals import worker_process_init
from app.core.config import settings

@worker_process_init.connect
def dispose_asyncpg_pool(**kwargs):
    """
    Called when a Celery worker process forks.
    Disposes of the SQLAlchemy connection pool so that inherited asyncpg 
    connections are discarded and properly recreated in the child's event loop.
    """
    from app.db.session import engine
    # In async context, sync_engine.dispose(close=False) safely drops the pool
    engine.sync_engine.dispose(close=False)


celery_app = Celery(
    "circuitai",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=[
        "app.tasks.orchestration",
        "app.tasks.simulation",
        "app.tasks.monte_carlo",
    ],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,           # re-queue on worker crash
    worker_prefetch_multiplier=1,  # fair scheduling for long tasks
    task_soft_time_limit=600,      # 10 min soft limit
    task_time_limit=900,           # 15 min hard kill
    task_routes={
        "app.tasks.orchestration.run_design_pipeline": {"queue": "default"},
        "app.tasks.simulation.run_xyce_simulation": {"queue": "simulation"},
        "app.tasks.monte_carlo.run_monte_carlo": {"queue": "monte_carlo"},
    },
    broker_connection_retry_on_startup=True,
)
