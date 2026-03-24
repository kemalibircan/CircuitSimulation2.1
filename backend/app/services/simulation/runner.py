"""
app/services/simulation/runner.py — Xyce simulation execution via Docker.
Designs:
- Writes netlist to an isolated temp directory
- Runs Xyce inside Docker with timeout + memory limits
- Collects stdout, stderr, artifacts, exit code
- Returns SimulationExecutionResult
"""
from __future__ import annotations

import asyncio
import os
import shutil
import tempfile
import uuid
from dataclasses import dataclass, field
from pathlib import Path

from app.core.config import settings
from app.core.errors import SimulationError
from app.core.logging import get_logger

logger = get_logger(__name__)


@dataclass
class SimulationExecutionResult:
    job_id: str
    success: bool
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: int
    workspace_path: str
    output_files: list[str] = field(default_factory=list)
    container_id: str | None = None


class XyceRunner:
    """
    Runs Xyce inside a Docker container with a per-job isolated workspace.
    Requires Docker Engine accessible on the host (or via Docker socket mount).
    """

    def __init__(self) -> None:
        import docker  # lazy import — only needed when actually running
        self._docker = docker.from_env()

    async def run(self, netlist: str, job_id: str | None = None) -> SimulationExecutionResult:
        job_id = job_id or str(uuid.uuid4())
        workspace = Path(settings.xyce_workspace_base) / job_id
        workspace.mkdir(parents=True, exist_ok=True)
        netlist_path = workspace / "circuit.sp"
        netlist_path.write_text(netlist, encoding="utf-8")

        logger.info("xyce_run_start", job_id=job_id, workspace=str(workspace))
        import time
        t0 = time.monotonic()

        try:
            container = await asyncio.to_thread(
                self._docker.containers.run,
                image=settings.xyce_docker_image,
                command=["Xyce", "circuit.sp"],
                volumes={str(workspace): {"bind": "/work", "mode": "rw"}},
                working_dir="/work",
                detach=False,
                stdout=True,
                stderr=True,
                remove=True,
                mem_limit=settings.xyce_memory_limit,
                cpu_quota=settings.xyce_cpu_quota,
                network_mode="none",  # no network access for isolation
                read_only=False,
                timeout=settings.xyce_timeout_seconds,
            )
            stdout_text = container.decode("utf-8") if isinstance(container, bytes) else str(container)
            stderr_text = ""
            exit_code = 0
        except Exception as exc:  # noqa: BLE001
            logger.error("xyce_run_failed", job_id=job_id, error=str(exc))
            stdout_text = ""
            stderr_text = str(exc)
            exit_code = 1

        duration_ms = int((time.monotonic() - t0) * 1000)

        # Collect output artifacts
        output_files = [
            str(workspace / f)
            for f in os.listdir(workspace)
            if f != "circuit.sp"
        ]

        result = SimulationExecutionResult(
            job_id=job_id,
            success=(exit_code == 0),
            exit_code=exit_code,
            stdout=stdout_text,
            stderr=stderr_text,
            duration_ms=duration_ms,
            workspace_path=str(workspace),
            output_files=output_files,
        )
        logger.info("xyce_run_complete", job_id=job_id, success=result.success, duration_ms=duration_ms)
        return result

    def cleanup(self, workspace_path: str) -> None:
        """Remove the job workspace directory."""
        try:
            shutil.rmtree(workspace_path, ignore_errors=True)
        except Exception as exc:  # noqa: BLE001
            logger.warning("cleanup_failed", path=workspace_path, error=str(exc))
