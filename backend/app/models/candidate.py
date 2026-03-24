"""app/models/candidate.py — CandidateDesign and MonteCarloRun ORM models."""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import Boolean, Float, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class CandidateDesign(UUIDMixin, TimestampMixin, Base):
    """
    A circuit topology candidate evaluated during a run.
    Mirrors the frontend CircuitCandidate TypeScript interface.
    """
    __tablename__ = "candidate_designs"

    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("design_runs.id", ondelete="CASCADE"), index=True
    )
    rank: Mapped[int] = mapped_column(Integer, nullable=False)
    topology_name: Mapped[str] = mapped_column(String(128), nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending")  # selected | rejected | pending

    # Key metrics for comparison table
    gain_db: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    bandwidth_mhz: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    phase_margin_deg: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    power_mw: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    noise_nv_sqrt_hz: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)  # 0–100

    rejection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    selection_reason: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Full scores breakdown
    scores_detail: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    # Relationships
    run: Mapped["DesignRun"] = relationship("DesignRun", back_populates="candidates")  # noqa: F821


class MonteCarloRun(UUIDMixin, TimestampMixin, Base):
    """Monte Carlo analysis run — multiple randomized simulations."""
    __tablename__ = "monte_carlo_runs"

    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("design_runs.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(32), default="pending")
    sample_count: Mapped[int] = mapped_column(Integer, default=200)

    # Parameter variation config
    parameter_variations: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    # Aggregated results
    results: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    yield_percent: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    failed_samples: Mapped[int] = mapped_column(Integer, default=0)

    started_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    completed_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    run: Mapped["DesignRun"] = relationship("DesignRun", back_populates="monte_carlo_runs")  # noqa: F821
