"""
app/api/v1/runs.py — REST endpoints for DesignRun lifecycle.
All responses are shaped to match the frontend TypeScript AgentRun interfaces.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc

from app.core.errors import RunNotFoundError
from app.core.security import require_api_key
from app.db.session import get_db
from app.models.run import DesignRun
from app.models.iteration import DesignIteration
from app.models.netlist import GeneratedNetlist
from app.models.simulation import SimulationResult
from app.models.message import AgentMessage
from app.schemas.runs import (
    CreateRunRequest, CreateRunResponse,
    RunDetailOut, RunListOut, RunSummaryOut,
    RunStatusOut, TimelineOut, TimelineStepOut,
    MessagesOut, AgentMessageOut,
    DesignRequirementOut, DesignConstraintOut,
    AgentStepOut, AgentStepLog,
    NetlistOut, SimulationResultOut,
    IterationOut, CandidateOut,
    ParameterChangeOut, MetricDeltaOut,
    SimulationMetricOut, ChartPoint, MonteCarloPoint, DesignSummaryOut, TransistorSizingOut,
    WaveformOut, SignalInfoOut,
)
from app.schemas.common import RunStatus, PipelineStep, AgentStepStatus, CircuitCategory, NetlistFormat, CandidateStatus

router = APIRouter(prefix="/runs", tags=["runs"])

_PIPELINE_STEPS = [
    ("requirement_parsing",  "Requirement Parsing"),
    ("topology_selection",   "Topology Selection"),
    ("netlist_generation",   "Netlist Generation"),
    ("validation",           "Validation"),
    ("simulation_run",       "Simulation Run"),
    ("metric_extraction",    "Metric Extraction"),
    ("monte_carlo",          "Monte Carlo Analysis"),
    ("optimization_loop",    "Optimization Loop"),
    ("recommendation_ready", "Final Recommendation"),
]

def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Create Run ────────────────────────────────────────────────

@router.post("", response_model=CreateRunResponse, status_code=201)
async def create_run(
    body: CreateRunRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    _: None = Depends(require_api_key),
) -> CreateRunResponse:
    run_id = str(uuid.uuid4())
    requirement = {
        "id": str(uuid.uuid4()),
        "naturalLanguagePrompt": body.natural_language_prompt,
        "category": body.category.value,
        "supplyVoltage": body.supply_voltage,
        "technology": body.technology,
        "temperature": body.temperature,
        "createdAt": _now_iso(),
        "constraints": [
            {
                "id": str(uuid.uuid4()),
                "metric": c.metric,
                "target": c.target,
                "unit": c.unit,
                "tolerance": c.tolerance,
                "priority": c.priority,
            }
            for c in body.constraints
        ],
    }

    run = DesignRun(
        id=run_id,
        status=RunStatus.QUEUED.value,
        correlation_id=str(uuid.uuid4()),
        requirement=requirement,
        steps=[],
    )
    db.add(run)
    await db.commit()

    # In development mode, run the pipeline directly via asyncio.
    # In production, dispatch to Celery worker queue.
    from app.core.config import settings
    if settings.app_env == "development":
        import asyncio
        from app.tasks.orchestration import _async_pipeline, _mark_run_failed
        async def _run_pipeline_bg():
            try:
                await _async_pipeline(run_id, None)
            except Exception as exc:
                import traceback
                traceback.print_exc()
                await _mark_run_failed(run_id, str(exc))
        asyncio.ensure_future(_run_pipeline_bg())
    else:
        from app.workers.celery_app import celery_app
        celery_app.send_task(
            "app.tasks.orchestration.run_design_pipeline",
            args=[run_id],
            task_id=str(uuid.uuid4())
        )

    return CreateRunResponse(id=run_id, status=RunStatus.QUEUED, created_at=_now_iso())


# ── List Runs ─────────────────────────────────────────────────

@router.get("", response_model=RunListOut)
async def list_runs(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> RunListOut:
    offset = (page - 1) * page_size
    total_result = await db.execute(select(func.count()).select_from(DesignRun))
    total = total_result.scalar() or 0

    rows = (await db.execute(
        select(DesignRun).order_by(desc(DesignRun.created_at)).offset(offset).limit(page_size)
    )).scalars().all()

    summaries = []
    for r in rows:
        req = r.requirement or {}
        ds = r.design_summary or {}
        summaries.append(RunSummaryOut(
            id=r.id,
            status=RunStatus(r.status),
            category=req.get("category", "op-amp"),
            prompt=req.get("naturalLanguagePrompt", "")[:200],
            topology_name=ds.get("topologyName"),
            started_at=r.started_at,
            completed_at=r.completed_at,
        ))

    return RunListOut(runs=summaries, total=total)


# ── Get Run Detail ────────────────────────────────────────────

@router.get("/{run_id}", response_model=RunDetailOut)
async def get_run(run_id: str, db: AsyncSession = Depends(get_db)) -> RunDetailOut:
    run = await _get_run_or_404(run_id, db)
    return await _build_run_detail(run, db)


# ── Lightweight Status Poll ───────────────────────────────────

@router.get("/{run_id}/status", response_model=RunStatusOut)
async def get_run_status(run_id: str, db: AsyncSession = Depends(get_db)) -> RunStatusOut:
    run = await _get_run_or_404(run_id, db)
    progress = _compute_progress(run)
    return RunStatusOut(
        id=run.id,
        status=RunStatus(run.status),
        current_step=PipelineStep(run.current_step) if run.current_step else None,
        progress_percent=progress,
        error_message=run.error_message,
    )


# ── Timeline ──────────────────────────────────────────────────

@router.get("/{run_id}/timeline", response_model=TimelineOut)
async def get_run_timeline(run_id: str, db: AsyncSession = Depends(get_db)) -> TimelineOut:
    run = await _get_run_or_404(run_id, db)
    step_map = {s["id"].replace("step-", ""): s for s in (run.steps or [])}

    timeline_steps = []
    for key, label in _PIPELINE_STEPS:
        raw = step_map.get(key, {})
        status_str = raw.get("status", "pending")
        timeline_steps.append(TimelineStepOut(
            key=PipelineStep(key),
            label=label,
            status=AgentStepStatus(status_str) if status_str in ("pending","running","complete","failed") else AgentStepStatus.PENDING,
            duration_ms=raw.get("duration_ms"),
            started_at=raw.get("started_at"),
            completed_at=raw.get("completed_at"),
            reasoning=raw.get("reasoning"),
        ))

    return TimelineOut(
        run_id=run_id,
        current_step=PipelineStep(run.current_step) if run.current_step else None,
        steps=timeline_steps,
    )


# ── Iterations ────────────────────────────────────────────────

@router.get("/{run_id}/iterations", response_model=list[IterationOut])
async def list_iterations(run_id: str, db: AsyncSession = Depends(get_db)) -> list[IterationOut]:
    await _get_run_or_404(run_id, db)
    rows = (await db.execute(
        select(DesignIteration)
        .where(DesignIteration.run_id == run_id)
        .order_by(DesignIteration.iteration_number)
    )).scalars().all()
    return [_iter_to_out(r) for r in rows]


@router.get("/{run_id}/iterations/{iteration_id}", response_model=IterationOut)
async def get_iteration(run_id: str, iteration_id: str, db: AsyncSession = Depends(get_db)) -> IterationOut:
    row = (await db.execute(
        select(DesignIteration)
        .where(DesignIteration.run_id == run_id, DesignIteration.id == iteration_id)
    )).scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Iteration not found")
    return _iter_to_out(row)


# ── Netlist ───────────────────────────────────────────────────

@router.get("/{run_id}/netlist", response_model=NetlistOut)
async def get_netlist(run_id: str, db: AsyncSession = Depends(get_db)) -> NetlistOut:
    await _get_run_or_404(run_id, db)
    nl = (await db.execute(
        select(GeneratedNetlist)
        .where(GeneratedNetlist.run_id == run_id)
        .order_by(desc(GeneratedNetlist.created_at))
        .limit(1)
    )).scalar_one_or_none()
    if not nl:
        raise HTTPException(404, "No netlist found for this run")
    return NetlistOut(raw=nl.raw_spice, format=NetlistFormat(nl.format), generated_at=nl.generated_at)


# ── Results ───────────────────────────────────────────────────

@router.get("/{run_id}/results", response_model=SimulationResultOut)
async def get_results(run_id: str, db: AsyncSession = Depends(get_db)) -> SimulationResultOut:
    await _get_run_or_404(run_id, db)
    sr = (await db.execute(
        select(SimulationResult)
        .where(SimulationResult.run_id == run_id)
        .order_by(desc(SimulationResult.created_at))
        .limit(1)
    )).scalar_one_or_none()
    if not sr:
        raise HTTPException(404, "No simulation results found")
    return _sim_result_to_out(sr)


# ── Agent Messages ────────────────────────────────────────────

@router.get("/{run_id}/messages", response_model=MessagesOut)
async def get_messages(run_id: str, db: AsyncSession = Depends(get_db)) -> MessagesOut:
    await _get_run_or_404(run_id, db)
    rows = (await db.execute(
        select(AgentMessage)
        .where(AgentMessage.run_id == run_id)
        .order_by(AgentMessage.created_at)
    )).scalars().all()
    return MessagesOut(
        run_id=run_id,
        messages=[
            AgentMessageOut(
                id=m.id, role=m.role, content=m.content,
                timestamp=m.created_at.isoformat() if hasattr(m.created_at, "isoformat") else str(m.created_at),
                action_type=m.action_type, action_data=m.action_data,
            )
            for m in rows
        ],
    )

@router.post("/{run_id}/chat", response_model=AgentMessageOut)
async def send_chat_message(run_id: str, payload: dict, db: AsyncSession = Depends(get_db)) -> AgentMessageOut:
    """Send a chat message to the CircuitAgent for a specific run."""
    run = await _get_run_or_404(run_id, db)
    user_text = payload.get("message", "").strip()
    if not user_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
        
    from app.services.openai.chat import handle_agent_chat
    
    agent_msg = await handle_agent_chat(run_id, user_text, db)
    
    return AgentMessageOut(
        id=agent_msg.id,
        role=agent_msg.role,
        content=agent_msg.content,
        timestamp=agent_msg.created_at.isoformat() if hasattr(agent_msg.created_at, "isoformat") else str(agent_msg.created_at),
        action_type=agent_msg.action_type,
        action_data=agent_msg.action_data,
    )



# ── Retry ─────────────────────────────────────────────────────

@router.post("/{run_id}/retry", response_model=CreateRunResponse)
async def retry_run(run_id: str, db: AsyncSession = Depends(get_db)) -> CreateRunResponse:
    run = await _get_run_or_404(run_id, db)
    if run.status not in ("failed", "cancelled"):
        raise HTTPException(400, "Can only retry failed or cancelled runs")
    run.status = RunStatus.QUEUED.value
    run.error_message = None
    run.steps = []
    await db.commit()

    from app.workers.celery_app import celery_app
    celery_app.send_task("app.tasks.orchestration.run_design_pipeline", args=[run_id])
    return CreateRunResponse(id=run_id, status=RunStatus.QUEUED, created_at=_now_iso())


# ── SSE Stream ────────────────────────────────────────────────

@router.get("/{run_id}/stream")
async def stream_run_status(run_id: str, db: AsyncSession = Depends(get_db)) -> StreamingResponse:
    """Server-Sent Events endpoint for real-time status updates."""
    import asyncio, json
    from app.core.config import settings
    import redis.asyncio as aioredis

    async def event_generator():
        r = aioredis.from_url(settings.redis_url)
        channel = f"run:{run_id}:events"
        pubsub = r.pubsub()
        await pubsub.subscribe(channel)
        try:
            for _ in range(300):  # max 5 minutes at 1s interval
                message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                if message and message["type"] == "message":
                    data = message["data"]
                    if isinstance(data, bytes):
                        data = data.decode()
                    yield f"data: {data}\n\n"

                # Also poll DB status
                run = await _get_run_or_404(run_id, db)
                status_data = json.dumps({"run_id": run_id, "status": run.status, "current_step": run.current_step})
                yield f"data: {status_data}\n\n"

                if run.status in ("completed", "failed", "cancelled"):
                    break
                await asyncio.sleep(1)
        finally:
            await pubsub.unsubscribe(channel)
            await r.aclose()

    return StreamingResponse(event_generator(), media_type="text/event-stream")


# ── Helpers ───────────────────────────────────────────────────

async def _get_run_or_404(run_id: str, db: AsyncSession) -> DesignRun:
    run = (await db.execute(select(DesignRun).where(DesignRun.id == run_id))).scalar_one_or_none()
    if not run:
        raise RunNotFoundError(run_id)
    return run


def _compute_progress(run: DesignRun) -> int:
    total = len(_PIPELINE_STEPS)
    completed = sum(1 for s in (run.steps or []) if s.get("status") == "complete")
    return int(completed / total * 100) if total > 0 else 0


async def _build_run_detail(run: DesignRun, db: AsyncSession) -> RunDetailOut:
    req_raw = run.requirement or {}
    constraints_out = [
        DesignConstraintOut(id=c.get("id",""), metric=c["metric"], target=c["target"],
                            unit=c["unit"], tolerance=c.get("tolerance"), priority=c.get("priority","hard"))
        for c in req_raw.get("constraints", [])
    ]
    req_out = DesignRequirementOut(
        id=req_raw.get("id", ""),
        natural_language_prompt=req_raw.get("naturalLanguagePrompt", ""),
        category=req_raw.get("category", "op-amp"),
        constraints=constraints_out,
        supply_voltage=req_raw.get("supplyVoltage", 1.8),
        technology=req_raw.get("technology", ""),
        temperature=req_raw.get("temperature", 27),
        created_at=req_raw.get("createdAt", ""),
    )

    steps_out = [_raw_step_to_out(s) for s in (run.steps or [])]
    ds_raw = run.design_summary or {}
    design_summary_out = None
    if ds_raw:
        sizing_raw = ds_raw.get("transistorSizing", [])
        design_summary_out = DesignSummaryOut(
            topology_name=ds_raw.get("topologyName",""),
            topology_description=ds_raw.get("topologyDescription",""),
            rationale=ds_raw.get("rationale",""),
            transistor_sizing=[
                TransistorSizingOut(name=t.get("name",""),type=t.get("type","NMOS"),
                                    W=t.get("W",1),L=t.get("L",0.5),role=t.get("role",""))
                for t in sizing_raw
            ],
            operating_assumptions=ds_raw.get("operatingAssumptions",[]),
            confidence_score=ds_raw.get("confidenceScore",0.8),
            bias_current_ua=ds_raw.get("biasCurrentUA",100),
            power_estimate_uw=ds_raw.get("powerEstimateUW",500),
        )

    # Latest netlist
    nl = (await db.execute(
        select(GeneratedNetlist).where(GeneratedNetlist.run_id==run.id).order_by(desc(GeneratedNetlist.created_at)).limit(1)
    )).scalar_one_or_none()
    netlist_out = NetlistOut(raw=nl.raw_spice, format=NetlistFormat(nl.format), generated_at=nl.generated_at) if nl else None

    # Latest sim result
    sr = (await db.execute(
        select(SimulationResult).where(SimulationResult.run_id==run.id).order_by(desc(SimulationResult.created_at)).limit(1)
    )).scalar_one_or_none()
    sim_out = _sim_result_to_out(sr) if sr else None

    # Iterations
    iters = (await db.execute(
        select(DesignIteration).where(DesignIteration.run_id==run.id).order_by(DesignIteration.iteration_number)
    )).scalars().all()

    # Candidates
    from app.models.candidate import CandidateDesign
    cands = (await db.execute(
        select(CandidateDesign).where(CandidateDesign.run_id==run.id).order_by(CandidateDesign.rank)
    )).scalars().all()

    return RunDetailOut(
        id=run.id,
        status=RunStatus(run.status),
        requirement=req_out,
        steps=steps_out,
        design_summary=design_summary_out,
        netlist=netlist_out,
        simulation_result=sim_out,
        iterations=[_iter_to_out(i) for i in iters],
        candidates=[
            CandidateOut(
                id=c.id, rank=c.rank, topology_name=c.topology_name,
                status=CandidateStatus(c.status),
                gain_db=c.gain_db, bandwidth_mhz=c.bandwidth_mhz,
                phase_margin_deg=c.phase_margin_deg, power_mw=c.power_mw,
                noise_nv_sqrt_hz=c.noise_nv_sqrt_hz, score=c.score,
                rejection_reason=c.rejection_reason, selection_reason=c.selection_reason,
            )
            for c in cands
        ],
        started_at=run.started_at,
        completed_at=run.completed_at,
        total_duration_ms=run.total_duration_ms,
        error_message=run.error_message,
    )


def _raw_step_to_out(s: dict) -> AgentStepOut:
    status_val = s.get("status", "pending")
    return AgentStepOut(
        id=s.get("id",""),
        label=s.get("label",""),
        description=s.get("description",""),
        status=AgentStepStatus(status_val) if status_val in ("pending","running","complete","failed") else AgentStepStatus.PENDING,
        started_at=s.get("started_at"),
        completed_at=s.get("completed_at"),
        duration_ms=s.get("duration_ms"),
        logs=[AgentStepLog(timestamp=l["timestamp"],message=l["message"],type=l["type"]) for l in s.get("logs",[])],
        reasoning=s.get("reasoning"),
    )


def _iter_to_out(r: DesignIteration) -> IterationOut:
    return IterationOut(
        id=r.id,
        iteration=r.iteration_number,
        parameter_changes=[
            ParameterChangeOut(**{"from": c.get("from",""), "to": c.get("to",""), "parameter": c.get("parameter","")})
            for c in (r.parameter_changes or [])
        ],
        metric_deltas=[
            MetricDeltaOut(metric=d.get("metric",""), delta=d.get("delta",0), unit=d.get("unit",""))
            for d in (r.metric_deltas or [])
        ],
        targets_met_count=r.targets_met_count or 0,
        total_targets=r.total_targets or 0,
        all_targets_met=r.all_targets_met or False,
        notes=r.notes,
    )


def _sim_result_to_out(sr: SimulationResult) -> SimulationResultOut:
    return SimulationResultOut(
        id=sr.id,
        run_id=sr.run_id,
        metrics=[SimulationMetricOut(**m) for m in (sr.metrics or [])],
        waveforms=[
            WaveformOut(
                id=w.get("id", ""), title=w.get("title", ""),
                chart_type=w.get("chart_type", "time_domain"),
                x_label=w.get("x_label", ""), x_unit=w.get("x_unit", ""),
                y_label=w.get("y_label", ""), y_unit=w.get("y_unit", ""),
                signals=w.get("signals", []),
                data=[ChartPoint(**p) for p in w.get("data", [])],
                is_recommended=w.get("is_recommended", True),
                priority=w.get("priority", 5),
            )
            for w in (sr.waveforms or [])
        ],
        available_signals=[
            SignalInfoOut(
                name=s.get("name", ""), type=s.get("type", "voltage"),
                unit=s.get("unit", "V"), node_or_branch=s.get("node_or_branch", ""),
            )
            for s in (sr.available_signals or [])
        ],
        topology_type=sr.topology_type,
        ac_response=[ChartPoint(**p) for p in (sr.ac_response or [])],
        phase_response=[ChartPoint(**p) for p in (sr.phase_response or [])],
        transient_response=[ChartPoint(**p) for p in (sr.transient_response or [])],
        monte_carlo_gain=[MonteCarloPoint(**p) for p in sr.monte_carlo_gain] if sr.monte_carlo_gain else None,
        monte_carlo_phase_margin=[MonteCarloPoint(**p) for p in sr.monte_carlo_phase_margin] if sr.monte_carlo_phase_margin else None,
        simulated_at=sr.simulated_at,
    )
