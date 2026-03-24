"""app/models/iteration.py — DesignIteration ORM model."""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import Boolean, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class DesignIteration(UUIDMixin, TimestampMixin, Base):
    """One optimization iteration within a DesignRun."""
    __tablename__ = "design_iterations"

    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("design_runs.id", ondelete="CASCADE"), index=True
    )
    iteration_number: Mapped[int] = mapped_column(Integer, nullable=False)
    status: Mapped[str] = mapped_column(String(32), default="pending")

    # Parameter changes made in this iteration (list of {parameter, from, to})
    parameter_changes: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)
    # Metric deltas vs previous iteration (list of {metric, delta, unit})
    metric_deltas: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    targets_met_count: Mapped[int] = mapped_column(Integer, default=0)
    total_targets: Mapped[int] = mapped_column(Integer, default=0)
    all_targets_met: Mapped[bool] = mapped_column(Boolean, default=False)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # AI reasoning logged for this iteration
    reasoning: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Timing
    started_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    completed_at: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)

    # Relationships
    run: Mapped["DesignRun"] = relationship("DesignRun", back_populates="iterations")  # noqa: F821
    simulation_result: Mapped[Optional["SimulationResult"]] = relationship(  # noqa: F821
        "SimulationResult",
        back_populates="iteration",
        uselist=False,
        primaryjoin="DesignIteration.id == foreign(SimulationResult.iteration_id)",
        foreign_keys="[SimulationResult.iteration_id]",
    )
