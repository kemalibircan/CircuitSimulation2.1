"""
app/services/simulation/mock_runner.py — Deterministic mock Xyce runner.
Returns realistic-looking simulation data without Docker or Xyce.
Use when USE_MOCK_XYCE=true in settings.
"""
from __future__ import annotations

import math
import uuid
from app.services.simulation.runner import SimulationExecutionResult


def _generate_fake_prn(workspace_path: str) -> str:
    """Generate a realistic .prn output file and return its path."""
    import os
    lines = ["INDEX TIME V(vout) V(vout1) I(VDD)"]
    for i in range(501):
        t = i * 1e-9
        vout = 0.9 * (1 - math.exp(-t / 18e-9)) if t > 50e-9 else 0.0
        lines.append(f"{i} {t:.6e} {vout:.6f} {vout * 0.5:.6f} {100e-6:.6e}")
    path = os.path.join(workspace_path, "circuit.prn")
    with open(path, "w") as f:
        f.write("\n".join(lines))
    return path


class MockXyceRunner:
    """
    Returns programmatically generated realistic Xyce output.
    Used in development when USE_MOCK_XYCE=true.
    """

    async def run(self, netlist: str, job_id: str | None = None) -> SimulationExecutionResult:
        import asyncio, os, tempfile
        job_id = job_id or str(uuid.uuid4())

        workspace = tempfile.mkdtemp(prefix=f"xyce_mock_{job_id}_")
        prn_path = _generate_fake_prn(workspace)

        # Write back the input netlist
        with open(os.path.join(workspace, "circuit.sp"), "w") as f:
            f.write(netlist)

        # Simulate a short delay (realistic processing time: 2–6 s)
        await asyncio.sleep(2)

        stdout = self._fake_stdout()
        return SimulationExecutionResult(
            job_id=job_id,
            success=True,
            exit_code=0,
            stdout=stdout,
            stderr="",
            duration_ms=2100,
            workspace_path=workspace,
            output_files=[prn_path, os.path.join(workspace, "circuit.sp")],
        )

    def cleanup(self, workspace_path: str) -> None:
        import shutil
        shutil.rmtree(workspace_path, ignore_errors=True)

    @staticmethod
    def _fake_stdout() -> str:
        return """\
Xyce(TM) Parallel Electronic Simulator
Copyright 2002-2023 National Technology & Engineering Solutions of Sandia, LLC
Version 7.6 (Serial) Dec 12 2023 ...

Device count: op 1, tran 1, ac 1
Netlist summary:  14 devices, 9 nets

Time-domain simulation complete: 500 ns elapsed, 1 CPU second
AC analysis complete: 100 frequency points
Operating point solution converged

Measure Results:
  gain_dc   = 6.81e+01 (dB)
  ugbw      = 1.23e+07 (Hz)
  pm        = 6.20e+01 (deg)
"""
