from __future__ import annotations
from typing import Optional, Any
"""app/models/artifact.py — ArtifactFile ORM model."""

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class ArtifactFile(UUIDMixin, TimestampMixin, Base):
    """
    Stores metadata for files produced by a run (netlists, .prn outputs, logs).
    Actual file content is on disk or in S3; this table holds paths and metadata.
    """
    __tablename__ = "artifact_files"

    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("design_runs.id", ondelete="CASCADE"), index=True
    )

    # Type: netlist | simulation_output | log | report | monte_carlo_data
    file_type: Mapped[str] = mapped_column(String(64), nullable=False)
    file_name: Mapped[str] = mapped_column(String(256), nullable=False)
    storage_path: Mapped[str] = mapped_column(String(1024), nullable=False)
    size_bytes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    mime_type: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    run: Mapped["DesignRun"] = relationship("DesignRun", back_populates="artifacts")  # noqa: F821
