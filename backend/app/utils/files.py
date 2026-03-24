"""app/utils/files.py — Artifact file storage helpers."""
from __future__ import annotations

import os
from pathlib import Path

from app.core.config import settings


def artifact_path(run_id: str, filename: str) -> Path:
    """Returns the absolute path for a run artifact file."""
    run_dir = Path(settings.artifact_storage_path) / run_id
    run_dir.mkdir(parents=True, exist_ok=True)
    return run_dir / filename


def write_artifact(run_id: str, filename: str, content: str | bytes) -> Path:
    path = artifact_path(run_id, filename)
    mode = "wb" if isinstance(content, bytes) else "w"
    with open(path, mode) as f:
        f.write(content)
    return path


def read_artifact(run_id: str, filename: str) -> str:
    path = artifact_path(run_id, filename)
    if not path.exists():
        raise FileNotFoundError(f"Artifact not found: {path}")
    return path.read_text(encoding="utf-8")
