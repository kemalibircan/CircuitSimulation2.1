"""
app/tasks/monte_carlo.py — Celery task for Monte Carlo analysis.
"""
from __future__ import annotations

from app.workers.celery_app import celery_app


@celery_app.task(name="app.tasks.monte_carlo.run_monte_carlo")
def run_monte_carlo(run_id: str, netlist: str, n_samples: int = 200) -> dict:
    """Run a Monte Carlo analysis. Stub — actual MC is invoked inline for now."""
    return {"status": "done", "run_id": run_id}
