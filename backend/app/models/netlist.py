from __future__ import annotations
from typing import Optional, Any
"""app/models/netlist.py — GeneratedNetlist and ValidationIssue ORM models."""

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class GeneratedNetlist(UUIDMixin, TimestampMixin, Base):
    """A SPICE netlist generated or revised during a run."""
    __tablename__ = "generated_netlists"

    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("design_runs.id", ondelete="CASCADE"), index=True
    )
    iteration_id: Mapped[Optional[str]] = mapped_column(
        String(36), ForeignKey("design_iterations.id", ondelete="SET NULL"), nullable=True
    )

    # Netlist content
    raw_spice: Mapped[str] = mapped_column(Text, nullable=False)
    format: Mapped[str] = mapped_column(String(32), default="spice")  # spice | ngspice | spectre
    generated_at: Mapped[str] = mapped_column(String(32), nullable=False, default="")

    # Which generation attempt produced this (1=first, 2=after correction, etc.)
    generation_attempt: Mapped[int] = mapped_column(Integer, default=1)

    # Relationships
    run: Mapped["DesignRun"] = relationship("DesignRun", back_populates="netlists")  # noqa: F821
    validation_issues: Mapped[list["ValidationIssue"]] = relationship(
        "ValidationIssue", back_populates="netlist", cascade="all, delete-orphan"
    )


class ValidationIssue(UUIDMixin, Base):
    """A single validation error or warning on a netlist."""
    __tablename__ = "validation_issues"

    netlist_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("generated_netlists.id", ondelete="CASCADE"), index=True
    )
    severity: Mapped[str] = mapped_column(String(16), nullable=False)  # error | warning | info
    message: Mapped[str] = mapped_column(Text, nullable=False)
    line_number: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    node_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    netlist: Mapped[GeneratedNetlist] = relationship("GeneratedNetlist", back_populates="validation_issues")
