"""app/models/message.py — AgentMessage ORM model."""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class AgentMessage(UUIDMixin, TimestampMixin, Base):
    """
    A message in the agent chat log for a run.
    Mirrors the frontend ChatMessage interface (role, content, actionType).
    """
    __tablename__ = "agent_messages"

    run_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("design_runs.id", ondelete="CASCADE"), index=True
    )
    # Role: user | agent | system | suggestion
    role: Mapped[str] = mapped_column(String(32), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Optional structured action metadata
    action_type: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    action_data: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Pipeline step this message belongs to (for timeline grouping)
    pipeline_step: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    run: Mapped["DesignRun"] = relationship("DesignRun", back_populates="messages")  # noqa: F821
