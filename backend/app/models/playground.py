"""app/models/playground.py — PlaygroundSession and PlaygroundCircuitState models."""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import ForeignKey, JSON, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDMixin


class PlaygroundSession(UUIDMixin, TimestampMixin, Base):
    """
    A user's interactive playground session.
    Stores canvas state and command history.
    """
    __tablename__ = "playground_sessions"

    # Opaque user session identifier (from frontend cookie/localStorage)
    user_session_id: Mapped[str] = mapped_column(String(128), index=True, nullable=False)

    # Current canvas state: { nodes[], edges[], viewport, selectedNodeId }
    canvas_state: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    # Ordered list of all commands applied to this session
    command_history: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    # Optional link to a design run if the user launched a simulation
    linked_run_id: Mapped[Optional[str]] = mapped_column(String(36), nullable=True)

    # Relationships
    commands: Mapped[list["PlaygroundCommand"]] = relationship(
        "PlaygroundCommand", back_populates="session", cascade="all, delete-orphan",
        order_by="PlaygroundCommand.created_at"
    )


class PlaygroundCommand(UUIDMixin, TimestampMixin, Base):
    """
    A single chat command issued in the playground.
    Tracks raw input, interpreted command, and canvas patches applied.
    """
    __tablename__ = "playground_commands"

    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("playground_sessions.id", ondelete="CASCADE"), index=True
    )

    # Raw text from the user
    raw_input: Mapped[str] = mapped_column(Text, nullable=False)

    # Interpreted command: {verb, target, parameter, value}
    interpreted_command: Mapped[dict[str, Any] | None] = mapped_column(JSON, nullable=True)

    # Canvas patches returned to the frontend: [{op, node/edge}]
    canvas_patches: Mapped[list[dict[str, Any]]] = mapped_column(JSON, default=list)

    # Agent's text response
    agent_response: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    session: Mapped[PlaygroundSession] = relationship("PlaygroundSession", back_populates="commands")
