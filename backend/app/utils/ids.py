"""app/utils/ids.py — UUID and correlation ID helpers."""
from __future__ import annotations
import uuid


def new_id() -> str:
    return str(uuid.uuid4())


def new_correlation_id() -> str:
    return str(uuid.uuid4())
