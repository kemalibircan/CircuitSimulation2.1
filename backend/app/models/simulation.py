"""app/models/simulation.py — SimulationJob and SimulationResult ORM models."""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class SimulationJob(UUIDMixin, TimestampMixin, Base):
    """Tracks a single Xyce simulation execution."""
    __tablename__ = "simulation_jobs"

    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("design_runs.id", ondelete="CASCADE"), index=True
    )
    iteration_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("design_iterations.id", ondelete="SET NULL"), nullable=True
    )
    netlist_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("generated_netlists.id", ondelete="SET NULL"), nullable=True
    )

    status: Mapped[str] = mapped_column(String(32), default="queued", index=True)
    exit_code: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    stdout: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    stderr: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    started_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    completed_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    # Docker container details for audit
    container_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    docker_image: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    workspace_path: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)

    # Relationships
    run: Mapped["DesignRun"] = relationship("DesignRun", back_populates="simulation_jobs")  # noqa: F821
    result: Mapped["SimulationResult | None"] = relationship(
        "SimulationResult", back_populates="job", uselist=False
    )


class SimulationResult(UUIDMixin, TimestampMixin, Base):
    """
    Parsed metrics and chart data from a completed simulation.
    Mirrors the frontend SimulationResult TypeScript interface.
    """
    __tablename__ = "simulation_results"

    job_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("simulation_jobs.id", ondelete="CASCADE"), unique=True
    )
    run_id: Mapped[str] = mapped_column(String(36), index=True)
    iteration_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True, index=True)

    # Structured metrics (list of SimulationMetric-shaped dicts)
    metrics: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    # Dynamic waveforms (list of WaveformOut-shaped dicts)
    waveforms: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    # Available signals for the circuit (list of SignalInfoOut-shaped dicts)
    available_signals: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    # Circuit topology type detected by signal extractor
    topology_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Chart data  (list of {x, y} points) — legacy fields
    ac_response: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    phase_response: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    transient_response: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    # Monte Carlo histograms  {value: float, count: int}[]
    monte_carlo_gain: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)
    monte_carlo_phase_margin: Mapped[list[dict[str, Any]] | None] = mapped_column(JSON, nullable=True)

    simulated_at: Mapped[str] = mapped_column(String(32), nullable=False, default="")

    # Relationships
    job: Mapped[SimulationJob] = relationship("SimulationJob", back_populates="result")
    iteration: Mapped["DesignIteration | None"] = relationship(  # noqa: F821
        "DesignIteration", back_populates="simulation_result", foreign_keys=[iteration_id],
        primaryjoin="SimulationResult.iteration_id == DesignIteration.id"
    )
