"""
app/tasks/simulation.py — Celery task for running Xyce simulations.
"""
from __future__ import annotations

from app.workers.celery_app import celery_app


@celery_app.task(name="app.tasks.simulation.run_xyce_simulation")
def run_xyce_simulation(job_id: str) -> dict:
    """Run a Xyce simulation job queued from the orchestration pipeline."""
    # Actual simulation is handled inline within run_design_pipeline.
    # This task stub allows the queue route to be defined without import errors.
    return {"status": "done", "job_id": job_id}
