"""
app/tasks/orchestration.py — Main Celery task: full agentic pipeline.
This is where Python orchestrates the entire design workflow.
OpenAI, Xyce, and analysis services are called from here; the DB is updated at each step.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

import structlog
from celery import shared_task

from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

_STEP_LABELS = {
    "requirement_parsing":  "Requirement Parsing",
    "topology_selection":   "Topology Selection",
    "netlist_generation":   "Netlist Generation",
    "validation":           "Validation",
    "simulation_run":       "Simulation Run",
    "metric_extraction":    "Metric Extraction",
    "monte_carlo":          "Monte Carlo Analysis",
    "optimization_loop":    "Optimization Loop",
    "recommendation_ready": "Final Recommendation",
}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _step(key: str, status: str, logs: list, reasoning: str | None = None,
          started_at: str | None = None, completed_at: str | None = None,
          duration_ms: int | None = None) -> dict:
    return {
        "id": f"step-{key}",
        "label": _STEP_LABELS.get(key, key),
        "description": "",
        "status": status,
        "started_at": started_at,
        "completed_at": completed_at,
        "duration_ms": duration_ms,
        "logs": logs,
        "reasoning": reasoning,
    }


@shared_task(bind=True, name="app.tasks.orchestration.run_design_pipeline", queue="default")
def run_design_pipeline(self, run_id: str) -> dict[str, Any]:
    """
    Celery task: orchestrates the entire circuit design pipeline for a DesignRun.
    Uses sync DB operations (via asyncio.run inside sync task for simplicity).
    """
    import asyncio

    structlog.contextvars.bind_contextvars(run_id=run_id, task_id=self.request.id if self else None)
    logger.info("pipeline_task_started", run_id=run_id)

    try:
        result = asyncio.run(_async_pipeline(run_id, self))
    except Exception as exc:  # noqa: BLE001
        logger.error("pipeline_task_failed", run_id=run_id, error=str(exc))
        asyncio.run(_mark_run_failed(run_id, str(exc)))
        raise

    return result


async def _async_pipeline(run_id: str, task: Any) -> dict[str, Any]:
    """The actual async pipeline logic."""
    from app.db.session import AsyncSessionLocal
    from app.models.run import DesignRun
    from app.models.netlist import GeneratedNetlist
    from app.models.simulation import SimulationJob, SimulationResult
    from app.models.message import AgentMessage
    from app.services.openai import tasks as llm_tasks
    from app.services.netlist.validator import NetlistValidator
    from app.services.analysis.parser import XyceOutputParser
    from app.services.analysis.metrics import MetricsExtractor
    from app.services.optimization.loop import OptimizationLoop
    import time

    validator = NetlistValidator()
    parser = XyceOutputParser()
    metrics_extractor = MetricsExtractor()

    from app.services.analysis.signal_extractor import SignalExtractor
    from app.services.analysis.graph_recommender import GraphRecommender
    signal_extractor = SignalExtractor()
    graph_recommender = GraphRecommender()

    if settings.use_mock_xyce:
        from app.services.simulation.mock_runner import MockXyceRunner
        sim_runner = MockXyceRunner()
    else:
        from app.services.simulation.runner import XyceRunner
        sim_runner = XyceRunner()

    from app.db.session import engine
    # Force pool discard on entry to new asyncio loop (only needed when called from Celery)
    if task is not None:
        await engine.dispose(close=False)

    async with AsyncSessionLocal() as db:
        from sqlalchemy import select
        run = (await db.execute(select(DesignRun).where(DesignRun.id == run_id))).scalar_one_or_none()
        if not run:
            raise ValueError(f"Run {run_id} not found")

        req = run.requirement
        steps: list[dict] = []

        # Temporary list for building logs within a step
        _current_step_logs: list[dict] = []
        _current_step_key: str | None = None

        async def live_log(msg: str, type_: str = "info") -> None:
            """Write an intermediate log entry and persist to DB immediately.
            This allows the frontend to see progress *during* long AI calls."""
            entry = {"timestamp": _now(), "message": msg, "type": type_}
            _current_step_logs.append(entry)
            # Persist current state so frontend poll picks it up
            if _current_step_key:
                interim_steps = steps + [_step(_current_step_key, "running", list(_current_step_logs), started_at=_now())]
                run.steps = interim_steps
                run.updated_at = datetime.now(timezone.utc)
                await db.commit()

        async def save_message(role: str, content: str, pipeline_step: str, action_type: str | None = None) -> None:
            msg = AgentMessage(
                id=str(uuid.uuid4()),
                run_id=run_id,
                role=role,
                content=content,
                pipeline_step=pipeline_step,
                action_type=action_type,
                created_at=datetime.now(timezone.utc),
            )
            db.add(msg)
            await db.commit()

        async def update_run(status: str, step_key: str | None, new_steps: list) -> None:
            run.status = status
            run.current_step = step_key
            run.steps = new_steps
            if step_key:
                run.updated_at = datetime.now(timezone.utc)
            await db.commit()

        # ── Mark running ─────────────────────────────────────
        run.status = "running"
        run.started_at = _now()
        await db.commit()

        # ─────────────────────────────────────────────────────
        # STEP 1: Requirement Parsing
        # ─────────────────────────────────────────────────────
        t0 = time.monotonic()
        step_key = "requirement_parsing"
        _current_step_key = step_key
        _current_step_logs = []
        step_started = _now()
        await update_run("running", step_key, steps + [_step(step_key, "running", [], started_at=step_started)])

        await live_log(f"📋 Input prompt: \"{req.get('naturalLanguagePrompt', '')}\"")
        await live_log(f"⚙️ Category: {req.get('category', 'N/A')} | Technology: {req.get('technology', 'TSMC 180nm')} | VDD: {req.get('supplyVoltage', 1.8)}V")
        await live_log("🤖 Sending to OpenAI for requirement analysis...")
        await save_message("agent", "Parsing your design requirements...", step_key)

        try:
            parsed_req = await llm_tasks.parse_requirements(
                prompt=req.get("naturalLanguagePrompt", ""),
                category=req.get("category", "op-amp"),
                supply_voltage=req.get("supplyVoltage", 1.8),
                technology=req.get("technology", "TSMC 180nm"),
                temperature=req.get("temperature", 27),
                constraints=req.get("constraints", []),
            )
            ai_dur = f"{(time.monotonic() - t0):.1f}s"
            await live_log(f"✅ AI response received ({ai_dur})", "result")
            await live_log(f"📝 Parsed: {parsed_req.get('parsed_prompt', '')}", "result")
            if parsed_req.get("extracted_constraints"):
                await live_log(f"📊 Constraints: {parsed_req.get('extracted_constraints', [])}", "info")
            if parsed_req.get("topology_hints"):
                await live_log(f"💡 Topology hints: {parsed_req.get('topology_hints', [])}", "info")
            if parsed_req.get("notes"):
                await live_log(f"📌 Notes: {parsed_req.get('notes')}", "reasoning")
        except Exception as exc:  # noqa: BLE001
            await live_log(f"⚠️ AI parsing failed: {exc}. Using raw prompt as fallback.", "warning")
            parsed_req = {"parsed_prompt": req.get("naturalLanguagePrompt", ""), "topology_hints": []}

        dur = int((time.monotonic() - t0) * 1000)
        steps.append(_step(step_key, "complete",
            list(_current_step_logs),
            reasoning=parsed_req.get("notes", ""),
            started_at=step_started, completed_at=_now(), duration_ms=dur))

        # ─────────────────────────────────────────────────────
        # STEP 2: Topology Selection
        # ─────────────────────────────────────────────────────
        t0 = time.monotonic()
        step_key = "topology_selection"
        _current_step_key = step_key
        _current_step_logs = []
        step_started = _now()
        await update_run("running", step_key, steps + [_step(step_key, "running", [], started_at=step_started)])

        await live_log(f"🔍 Evaluating topologies for: {parsed_req.get('parsed_prompt', 'Unknown')}")
        await live_log("🤖 Sending to OpenAI for topology evaluation...")
        await save_message("agent", "Evaluating circuit topologies...", step_key)

        try:
            topology_result = await llm_tasks.propose_topology(parsed_req, req.get("constraints", []))
            ai_dur = f"{(time.monotonic() - t0):.1f}s"
            await live_log(f"✅ AI response received ({ai_dur})", "result")
        except Exception as exc:  # noqa: BLE001
            await live_log(f"⚠️ Topology selection failed: {exc}. Using fallback.", "warning")
            topology_result = {"selected_topology": {"name": "Generic Circuit", "description": "", "rationale": "", "confidence_score": 0.8}}

        topology = topology_result.get("selected_topology", {})
        topology["transistor_sizing_initial"] = topology_result.get("transistor_sizing_initial", [])
        topology["components"] = topology_result.get("components", [])

        await live_log(f"🏗️ Selected: {topology.get('name', 'Unknown')} (confidence: {topology.get('confidence_score', 'N/A')})", "result")
        if topology.get("rationale"):
            await live_log(f"💭 Rationale: {topology.get('rationale')}", "reasoning")
        if topology_result.get("rejected_topologies"):
            rejected_names = [r.get("name", "?") for r in topology_result.get("rejected_topologies", [])]
            await live_log(f"❌ Rejected: {', '.join(rejected_names)}", "info")

        dur = int((time.monotonic() - t0) * 1000)
        steps.append(_step(step_key, "complete", list(_current_step_logs),
            reasoning=topology.get("rationale", ""),
            started_at=step_started, completed_at=_now(), duration_ms=dur))

        # ─────────────────────────────────────────────────────
        # STEP 3: Netlist Generation
        # ─────────────────────────────────────────────────────
        t0 = time.monotonic()
        step_key = "netlist_generation"
        _current_step_key = step_key
        _current_step_logs = []
        step_started = _now()
        await update_run("running", step_key, steps + [_step(step_key, "running", [], started_at=step_started)])

        await live_log(f"📐 Generating SPICE netlist for: {topology.get('name', 'Unknown')}")
        await live_log(f"⚙️ Technology: {req.get('technology', 'TSMC 180nm')} | VDD: {req.get('supplyVoltage', 1.8)}V")
        await live_log("🤖 Sending to OpenAI for netlist generation...")
        await save_message("agent", "Generating initial SPICE netlist...", step_key)

        netlist_attempt = 1
        for attempt in range(1, 4):
            try:
                netlist_result = await llm_tasks.generate_netlist(
                    topology=topology,
                    constraints=req.get("constraints", []),
                    technology=req.get("technology", "TSMC 180nm"),
                    supply_voltage=req.get("supplyVoltage", 1.8),
                )
                netlist_text = netlist_result.get("netlist", "")
                ai_dur = f"{(time.monotonic() - t0):.1f}s"
                await live_log(f"✅ Netlist generated ({ai_dur}) — {netlist_result.get('component_count', '?')} components", "result")
                break
            except Exception as exc:  # noqa: BLE001
                await live_log(f"⚠️ Attempt {attempt}/3 failed: {exc}", "warning")
                netlist_text = ""
        else:
            await live_log("❌ All netlist generation attempts failed. Using placeholder.", "warning")
            netlist_text = "* Placeholder netlist\n.end"

        # Show the actual netlist in console
        await live_log(f"📄 SPICE Netlist:\n{netlist_text.strip()}", "result")

        # Save netlist
        gen_at = _now()
        netlist_record = GeneratedNetlist(
            id=str(uuid.uuid4()),
            run_id=run_id,
            raw_spice=netlist_text,
            format="spice",
            generated_at=gen_at,
            generation_attempt=netlist_attempt,
        )
        db.add(netlist_record)
        await db.commit()

        dur = int((time.monotonic() - t0) * 1000)
        steps.append(_step(step_key, "complete", list(_current_step_logs),
            started_at=step_started, completed_at=_now(), duration_ms=dur))

        # ─────────────────────────────────────────────────────
        # STEP 4: Validation
        # ─────────────────────────────────────────────────────
        step_key = "validation"
        step_started = _now()
        await update_run("validating", step_key, steps + [_step(step_key, "running", [], started_at=step_started)])

        val_logs = []
        validation = validator.validate(netlist_text)
        if not validation.valid:
            val_logs.append({"timestamp": _now(), "message": f"[Validation Errors]\n{validation.issues}", "type": "warning"})
            await save_message("agent", f"Netlist validation failed: {len(validation.issues)} error(s). Attempting auto-correction...", step_key, "warning")
            try:
                fix_result = await llm_tasks.fix_netlist(netlist_text, validation.to_dict_list())
                netlist_text = fix_result.get("netlist", netlist_text)
                netlist_record.raw_spice = netlist_text
                await db.commit()
                val_logs.append({"timestamp": _now(), "message": f"[Netlist Corrected]\n{netlist_text.strip()}", "type": "info"})
            except Exception:  # noqa: BLE001
                val_logs.append({"timestamp": _now(), "message": "LLM failed to correct the netlist.", "type": "warning"})
        else:
            val_logs.append({"timestamp": _now(), "message": "SPICE Netlist validation passed successfully.", "type": "result"})

        steps.append(_step(step_key, "complete", val_logs,
            started_at=step_started, completed_at=_now()))

        # ─────────────────────────────────────────────────────
        # STEP 5: Simulation
        # ─────────────────────────────────────────────────────
        t0 = time.monotonic()
        step_key = "simulation_run"
        step_started = _now()
        await update_run("simulating", step_key, steps + [_step(step_key, "running", [], started_at=step_started)])
        await save_message("agent", "Running Xyce simulation...", step_key)

        job_id = str(uuid.uuid4())
        sim_job = SimulationJob(
            id=job_id, run_id=run_id,
            netlist_id=netlist_record.id,
            status="running", started_at=step_started,
        )
        db.add(sim_job)
        await db.commit()

        exec_result = await sim_runner.run(netlist_text, job_id)

        sim_job.status = "completed" if exec_result.success else "failed"
        sim_job.exit_code = exec_result.exit_code
        sim_job.stdout = exec_result.stdout
        sim_job.stderr = exec_result.stderr
        sim_job.duration_ms = exec_result.duration_ms
        sim_job.completed_at = _now()
        await db.commit()

        dur = int((time.monotonic() - t0) * 1000)
        sim_logs = []
        if exec_result.stdout:
            sim_logs.append({"timestamp": _now(), "message": f"[XYCE engine stdout]\n{exec_result.stdout.strip()}", "type": "info"})
        if exec_result.stderr:
            sim_logs.append({"timestamp": _now(), "message": f"[XYCE engine stderr]\n{exec_result.stderr.strip()}", "type": "warning"})
        sim_logs.append({"timestamp": _now(), "message": "Simulation complete", "type": "result" if exec_result.success else "warning"})

        steps.append(_step(step_key, "complete" if exec_result.success else "failed",
            sim_logs, started_at=step_started, completed_at=_now(), duration_ms=dur))

        # ─────────────────────────────────────────────────────
        # STEP 6: Metric Extraction
        # ─────────────────────────────────────────────────────
        step_key = "metric_extraction"
        step_started = _now()
        await update_run("analyzing", step_key, steps + [_step(step_key, "running", [], started_at=step_started)])

        measure_vals = parser.parse_measure_results(exec_result.stdout)

        # --- Signal extraction & graph recommendation ---
        signal_map = signal_extractor.extract_signals(netlist_text, req.get("category", ""))
        recommendation = await graph_recommender.recommend(
            signal_map,
            user_constraints=req.get("constraints", []),
            measure_results=measure_vals,
        )

        # Try LLM enhancement (non-blocking)
        try:
            recommendation = await graph_recommender.enhance_with_llm(
                recommendation, signal_map, netlist_text, req.get("category", "")
            )
        except Exception:
            pass  # Rule-based is sufficient

        # Build waveform data based on recommendation
        topology_type = signal_map.topology_type
        supply_v = req.get("supplyVoltage", 1.8)

        # Generate synthetic data for each chart type
        ac_resp = parser.synthetic_ac_response(
            measure_vals.get("gain_dc", 40),
            measure_vals.get("ugbw", 10e6) / 1e6
        ) if measure_vals.get("gain_dc") else []

        phase_resp = parser.synthetic_phase_response(
            measure_vals.get("ugbw", 10e6) / 1e6
        ) if measure_vals.get("ugbw") else []

        transient = parser.synthetic_transient(supply_v, topology_type)
        dc_sweep = parser.synthetic_dc_sweep(measure_vals, supply_v)
        dc_bar = parser.synthetic_dc_node_voltages(measure_vals, supply_v)

        metrics = metrics_extractor.extract(
            measure_vals, req.get("constraints", []),
            ac_resp if ac_resp else parser.synthetic_ac_response(40, 10),
            phase_resp if phase_resp else parser.synthetic_phase_response(10),
            topology_type=topology_type,
        )

        # Build waveforms from recommendation
        waveforms = []
        for wf_spec in recommendation.recommended_waveforms:
            wf_data = []
            if wf_spec.chart_type == "bode_magnitude":
                wf_data = ac_resp if ac_resp else parser.synthetic_ac_response(40, 10)
            elif wf_spec.chart_type == "bode_phase":
                wf_data = phase_resp if phase_resp else parser.synthetic_phase_response(10)
            elif wf_spec.chart_type == "time_domain":
                wf_data = transient
            elif wf_spec.chart_type == "dc_sweep":
                wf_data = dc_sweep
            elif wf_spec.chart_type == "bar":
                wf_data = dc_bar
            waveforms.append({
                "id": wf_spec.id,
                "title": wf_spec.title,
                "chart_type": wf_spec.chart_type,
                "x_label": wf_spec.x_label,
                "x_unit": wf_spec.x_unit,
                "y_label": wf_spec.y_label,
                "y_unit": wf_spec.y_unit,
                "signals": wf_spec.signals,
                "data": wf_data,
                "is_recommended": wf_spec.is_recommended,
                "priority": wf_spec.priority,
            })

        # If no recommended waveforms produced data for passive circuits,
        # add a DC bar chart as a fallback
        if topology_type in ("voltage_divider", "resistor_network") and not any(w["data"] for w in waveforms):
            waveforms.insert(0, {
                "id": "wf-dc-bar",
                "title": "DC Operating Point",
                "chart_type": "bar",
                "x_label": "",
                "x_unit": "",
                "y_label": "Value",
                "y_unit": "V/A",
                "signals": [],
                "data": dc_bar,
                "is_recommended": True,
                "priority": 0,
            })

        # Build available signals list
        available_signals = [
            {"name": s.name, "type": s.type, "unit": s.unit, "node_or_branch": s.node_or_branch}
            for s in recommendation.available_signals
        ]

        # Also add optional waveforms — each signal gets UNIQUE data
        optional_waveforms = []
        for opt_idx, wf_spec in enumerate(recommendation.optional_waveforms):
            opt_data: list = []
            if wf_spec.chart_type == "bode_magnitude":
                opt_data = ac_resp if ac_resp else parser.synthetic_ac_response(40, 10)
            elif wf_spec.chart_type == "bode_phase":
                opt_data = phase_resp if phase_resp else parser.synthetic_phase_response(10)
            elif wf_spec.chart_type == "time_domain":
                # Generate unique data per signal so charts aren't identical
                sig_name = wf_spec.signals[0] if wf_spec.signals else f"sig_{opt_idx}"
                sig_type = "current" if wf_spec.y_unit == "A" else "voltage"
                opt_data = parser.synthetic_signal_data(
                    sig_name, sig_type, supply_v, topology_type, opt_idx
                )
            elif wf_spec.chart_type == "dc_sweep":
                opt_data = dc_sweep
            elif wf_spec.chart_type == "bar":
                opt_data = dc_bar
            optional_waveforms.append({
                "id": wf_spec.id,
                "title": wf_spec.title,
                "chart_type": wf_spec.chart_type,
                "x_label": wf_spec.x_label,
                "x_unit": wf_spec.x_unit,
                "y_label": wf_spec.y_label,
                "y_unit": wf_spec.y_unit,
                "signals": wf_spec.signals,
                "data": opt_data,
                "is_recommended": False,
                "priority": wf_spec.priority,
            })

        sim_result = SimulationResult(
            id=str(uuid.uuid4()),
            job_id=job_id,
            run_id=run_id,
            metrics=metrics,
            waveforms=waveforms + optional_waveforms,
            available_signals=available_signals,
            topology_type=topology_type,
            ac_response=ac_resp,
            phase_response=phase_resp,
            transient_response=transient,
            simulated_at=_now(),
        )
        db.add(sim_result)
        await db.commit()

        steps.append(_step(step_key, "complete",
            [{"timestamp": _now(), "message": f"Extracted {len(metrics)} metrics, {len(waveforms)} waveforms ({topology_type} topology)", "type": "result"}],
            started_at=step_started, completed_at=_now()))

        # ─────────────────────────────────────────────────────
        # STEP 7: Optimization Loop
        # ─────────────────────────────────────────────────────
        t0 = time.monotonic()
        step_key = "optimization_loop"
        step_started = _now()
        await update_run("optimizing", step_key, steps + [_step(step_key, "running", [], started_at=step_started)])
        await save_message("agent", "Running optimization loop...", step_key)

        from sqlalchemy.orm.attributes import flag_modified
        from app.models.iteration import DesignIteration
        opt_loop = OptimizationLoop()
        iteration_counter = [0]

        async def sim_callback(revised_netlist: str) -> list[dict]:
            iteration_counter[0] += 1
            exec_r = await sim_runner.run(revised_netlist, str(uuid.uuid4()))
            
            if exec_r.stdout or exec_r.stderr:
                cb_logs = []
                if exec_r.stdout:
                    cb_logs.append({"timestamp": _now(), "message": f"[XYCE opt iter {iteration_counter[0]}]\n{exec_r.stdout.strip()}", "type": "info"})
                if exec_r.stderr:
                    cb_logs.append({"timestamp": _now(), "message": f"[XYCE opt iter {iteration_counter[0]} stderr]\n{exec_r.stderr.strip()}", "type": "warning"})
                
                steps[-1]["logs"].extend(cb_logs)
                run.steps = list(steps)
                flag_modified(run, "steps")
                await db.commit()

            mv = parser.parse_measure_results(exec_r.stdout)
            ac = parser.synthetic_ac_response(mv.get("gain_dc", 65), mv.get("ugbw", 10e6) / 1e6)
            ph = parser.synthetic_phase_response(mv.get("ugbw", 10e6) / 1e6)
            return metrics_extractor.extract(mv, req.get("constraints", []), ac, ph)

        opt_result = await opt_loop.run(netlist_text, metrics, req.get("constraints", []), on_iteration_complete=sim_callback)

        # Persist iterations
        for iter_rec in opt_result.iterations:
            d_iter = DesignIteration(
                id=str(uuid.uuid4()),
                run_id=run_id,
                iteration_number=iter_rec.iteration_number,
                status="completed",
                parameter_changes=iter_rec.parameter_changes,
                metric_deltas=iter_rec.metric_deltas,
                targets_met_count=iter_rec.targets_met_count,
                total_targets=iter_rec.total_targets,
                all_targets_met=iter_rec.all_targets_met,
                notes=iter_rec.notes,
                reasoning=iter_rec.reasoning,
                started_at=step_started,
                completed_at=_now(),
            )
            db.add(d_iter)

        dur = int((time.monotonic() - t0) * 1000)
        steps.append(_step(step_key, "complete",
            [{"timestamp": _now(), "message": f"Optimization complete — {len(opt_result.iterations)} iteration(s), converged={opt_result.converged}", "type": "result"}],
            started_at=step_started, completed_at=_now(), duration_ms=dur))

        # ─────────────────────────────────────────────────────
        # STEP 8: Final Recommendation
        # ─────────────────────────────────────────────────────
        step_key = "recommendation_ready"
        step_started = _now()
        steps.append(_step(step_key, "running", [], started_at=step_started))

        # Build design summary from topology result
        ds = {
            "topologyName": topology.get("name", ""),
            "topologyDescription": topology.get("description", ""),
            "rationale": topology.get("rationale", ""),
            "transistorSizing": topology.get("transistor_sizing_initial", []),
            "operatingAssumptions": topology_result.get("operating_assumptions", []),
            "confidenceScore": topology.get("confidence_score", 0.8),
            "biasCurrentUA": topology_result.get("bias_current_ua", 100),
            "powerEstimateUW": topology_result.get("power_estimate_uw", 500),
        }
        run.design_summary = ds

        # Persist final netlist update
        netlist_record.raw_spice = opt_result.final_netlist
        await db.commit()

        # Build candidates from topology rejections
        from app.models.candidate import CandidateDesign
        selected_cand = CandidateDesign(
            id=str(uuid.uuid4()), run_id=run_id, rank=1,
            topology_name=topology.get("name", ""),
            status="selected", score=topology.get("confidence_score", 0.8) * 100,
            selection_reason="Best overall fit for constraints",
        )
        db.add(selected_cand)
        for i, rejected in enumerate(topology_result.get("rejected_topologies", []), start=2):
            db.add(CandidateDesign(
                id=str(uuid.uuid4()), run_id=run_id, rank=i,
                topology_name=rejected.get("name", f"Candidate {i}"),
                status="rejected", score=rejected.get("score"),
                rejection_reason=rejected.get("reason", ""),
            ))

        steps[-1] = _step(step_key, "complete",
            [{"timestamp": _now(), "message": "Design recommendation ready", "type": "result"}],
            started_at=step_started, completed_at=_now())

        # ── Mark run complete ─────────────────────────────────
        run.status = "completed"
        run.completed_at = _now()
        run.steps = steps
        run.current_step = None
        await db.commit()

        await save_message("agent", "✅ Design complete. All analysis steps finished.", "recommendation_ready", "info")

        logger.info("pipeline_task_complete", run_id=run_id)
        return {"run_id": run_id, "status": "completed"}


async def _mark_run_failed(run_id: str, error: str) -> None:
    from app.db.session import AsyncSessionLocal
    from app.models.run import DesignRun
    from sqlalchemy import select
    async with AsyncSessionLocal() as db:
        run = (await db.execute(select(DesignRun).where(DesignRun.id == run_id))).scalar_one_or_none()
        if run:
            run.status = "failed"
            run.error_message = error
            run.completed_at = _now()
            await db.commit()
