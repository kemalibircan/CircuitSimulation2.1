"""
app/services/optimization/loop.py — Iterative optimization loop coordinator.
The Python backend (not OpenAI) is the orchestrator that decides:
- when to call OpenAI for a suggestion
- when to validate / simulate
- when to accept or reject the new design
- when to stop
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from app.core.config import settings
from app.core.logging import get_logger
from app.services.openai import tasks as llm_tasks

logger = get_logger(__name__)


@dataclass
class IterationRecord:
    iteration_number: int
    parameter_changes: list[dict[str, Any]]
    metric_deltas: list[dict[str, Any]]
    targets_met_count: int
    total_targets: int
    all_targets_met: bool
    notes: str
    revised_netlist: str
    reasoning: str


@dataclass
class OptimizationResult:
    converged: bool
    final_netlist: str
    iterations: list[IterationRecord] = field(default_factory=list)
    best_metrics: list[dict[str, Any]] = field(default_factory=list)
    stop_reason: str = ""


class OptimizationLoop:
    """
    Coordinates iterative netlist improvement.
    Calls LLM for suggestions, then validates + simulates each revision.
    The caller (Celery task) handles DB persistence between iterations.
    """

    def __init__(self, max_iterations: int | None = None):
        self.max_iterations = max_iterations or settings.max_optimization_iterations

    def _all_targets_met(
        self, metrics: list[dict[str, Any]], constraints: list[dict[str, Any]]
    ) -> tuple[int, int, bool]:
        """Check metrics against constraints. Returns (met, total, all_met)."""
        hard = [c for c in constraints if c.get("priority") == "hard"]
        if not hard:
            return 0, 0, True

        met = 0
        for c in hard:
            for m in metrics:
                if c["metric"].lower() in m["label"].lower():
                    target = c.get("target")
                    value = m.get("value", 0)
                    # For "lower is better" metrics
                    lower_better = any(kw in m["label"].lower() for kw in ("power", "noise"))
                    if target is None:
                        met += 1
                    elif lower_better and value <= target:
                        met += 1
                    elif not lower_better and value >= target:
                        met += 1
                    break

        return met, len(hard), met == len(hard)

    async def run(
        self,
        initial_netlist: str,
        initial_metrics: list[dict[str, Any]],
        constraints: list[dict[str, Any]],
        on_iteration_complete: Any = None,  # async callback(record: IterationRecord)
    ) -> OptimizationResult:
        """
        Main loop. Calls LLM and the provided simulation+parse callback.
        on_iteration_complete is an async callable that:
          1. Takes the revised_netlist
          2. Runs Xyce simulation
          3. Returns parsed metrics list
        """
        current_netlist = initial_netlist
        current_metrics = initial_metrics
        all_iterations: list[IterationRecord] = []
        previous_changes: list[dict] = []
        best_metrics = initial_metrics

        for iteration in range(1, self.max_iterations + 1):
            met, total, done = self._all_targets_met(current_metrics, constraints)
            if done:
                logger.info("optimization_converged", iteration=iteration, met=met, total=total)
                return OptimizationResult(
                    converged=True,
                    final_netlist=current_netlist,
                    iterations=all_iterations,
                    best_metrics=best_metrics,
                    stop_reason="all_targets_met",
                )

            logger.info("optimization_iteration_start",
                        iteration=iteration, targets_met=f"{met}/{total}")

            try:
                suggestion = await llm_tasks.suggest_optimization(
                    current_metrics=current_metrics,
                    target_constraints=constraints,
                    iteration_number=iteration,
                    previous_changes=previous_changes,
                    netlist=current_netlist,
                )
            except Exception as exc:  # noqa: BLE001
                logger.error("llm_suggestion_failed", iteration=iteration, error=str(exc))
                return OptimizationResult(
                    converged=False,
                    final_netlist=current_netlist,
                    iterations=all_iterations,
                    best_metrics=best_metrics,
                    stop_reason=f"llm_error: {exc}",
                )

            revised_netlist = suggestion.get("revised_netlist", current_netlist)
            param_changes = suggestion.get("parameter_changes", [])

            # Run simulation via callback
            new_metrics: list[dict[str, Any]] = current_metrics  # fallback
            if on_iteration_complete is not None:
                try:
                    new_metrics = await on_iteration_complete(revised_netlist)
                except Exception as exc:  # noqa: BLE001
                    logger.error("simulation_in_loop_failed", iteration=iteration, error=str(exc))
                    new_metrics = current_metrics

            # Compute metric deltas
            metric_deltas = self._compute_deltas(current_metrics, new_metrics)
            new_met, new_total, new_done = self._all_targets_met(new_metrics, constraints)

            record = IterationRecord(
                iteration_number=iteration,
                parameter_changes=[
                    {"parameter": c.get("parameter", ""), "from": c.get("current", ""), "to": c.get("new", "")}
                    for c in param_changes
                ],
                metric_deltas=metric_deltas,
                targets_met_count=new_met,
                total_targets=new_total,
                all_targets_met=new_done,
                notes=suggestion.get("reasoning", ""),
                revised_netlist=revised_netlist,
                reasoning=suggestion.get("reasoning", ""),
            )
            all_iterations.append(record)
            previous_changes = [c.get("parameter", "") for c in param_changes]

            current_netlist = revised_netlist
            current_metrics = new_metrics
            best_metrics = new_metrics

            logger.info("optimization_iteration_complete",
                        iteration=iteration, targets_met=f"{new_met}/{new_total}")

        # Exhausted iterations
        return OptimizationResult(
            converged=False,
            final_netlist=current_netlist,
            iterations=all_iterations,
            best_metrics=best_metrics,
            stop_reason="max_iterations_reached",
        )

    @staticmethod
    def _compute_deltas(
        old: list[dict[str, Any]],
        new: list[dict[str, Any]],
    ) -> list[dict[str, Any]]:
        old_map = {m["id"]: m["value"] for m in old}
        deltas = []
        for m in new:
            old_val = old_map.get(m["id"])
            if old_val is not None:
                deltas.append({
                    "metric": m["label"],
                    "delta": round(m["value"] - old_val, 4),
                    "unit": m["unit"],
                })
        return deltas
