"""
app/api/v1/playground.py — Endpoints for the visual circuit playground.
Supports canvas validation, graph→netlist, chat commands, and session management.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.security import require_api_key
from app.db.session import get_db
from app.models.playground import PlaygroundSession, PlaygroundCommand
from app.schemas.playground import (
    PlaygroundValidateRequest, PlaygroundValidateResponse,
    PlaygroundNetlistRequest, PlaygroundNetlistResponse,
    PlaygroundSimulateRequest, PlaygroundSimulateResponse,
    ChatCommandRequest, ChatCommandResponse,
    ApplyCommandRequest, ApplyCommandResponse,
    PlaygroundSessionPatch, PlaygroundSessionOut,
    ValidationIssueOut, CanvasPatch, InterpretedCommand, CanvasStateIn,
)
from app.schemas.common import NetlistFormat
from app.services.netlist.validator import NetlistValidator, ValidationResult
from app.services.playground.canvas_to_netlist import CanvasToNetlistConverter
from app.services.openai.tasks import interpret_chat_command

router = APIRouter(prefix="/playground", tags=["playground"])

_validator = NetlistValidator()
_converter = CanvasToNetlistConverter()


# ── Validate canvas circuit ───────────────────────────────────

@router.post("/validate", response_model=PlaygroundValidateResponse)
async def validate_canvas(body: PlaygroundValidateRequest) -> PlaygroundValidateResponse:
    # Convert nodes+edges to a minimal netlist for structural validation
    nodes = [n.model_dump() for n in body.nodes]
    edges = [e.model_dump() for e in body.edges]

    try:
        netlist, _ = _converter.convert(nodes, edges)
        result: ValidationResult = _validator.validate(netlist)
    except Exception as exc:  # noqa: BLE001
        return PlaygroundValidateResponse(
            valid=False,
            issues=[ValidationIssueOut(severity="error", message=str(exc))],
        )

    issues = [
        ValidationIssueOut(severity=i.severity, message=i.message,
                           line_number=i.line_number, node_id=i.node_id)
        for i in result.issues
    ]
    warnings = [
        ValidationIssueOut(severity=w.severity, message=w.message,
                           line_number=w.line_number, node_id=w.node_id)
        for w in result.warnings
    ]
    return PlaygroundValidateResponse(valid=result.valid, issues=issues, warnings=warnings)


# ── Canvas → Netlist ──────────────────────────────────────────

@router.post("/netlist", response_model=PlaygroundNetlistResponse)
async def canvas_to_netlist(body: PlaygroundNetlistRequest) -> PlaygroundNetlistResponse:
    nodes = [n.model_dump() for n in body.nodes]
    edges = [e.model_dump() for e in body.edges]

    try:
        netlist, node_map = _converter.convert(nodes, edges)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(500, f"Netlist conversion failed: {exc}") from exc

    return PlaygroundNetlistResponse(
        netlist=netlist,
        format=NetlistFormat.SPICE,
        node_map=node_map,
    )


# ── Quick simulate from canvas ────────────────────────────────

@router.post("/simulate", response_model=PlaygroundSimulateResponse)
async def simulate_canvas(
    body: PlaygroundSimulateRequest,
    db: AsyncSession = Depends(get_db),
) -> PlaygroundSimulateResponse:
    """Converts canvas to netlist and queues a simulation run."""
    import uuid as _uuid
    nodes = [n.model_dump() for n in body.nodes]
    edges = [e.model_dump() for e in body.edges]
    netlist, _ = _converter.convert(nodes, edges)

    run_id = str(_uuid.uuid4())

    # Import here to avoid circular at module load
    from app.models.run import DesignRun
    from app.models.run import RunStatus
    from app.schemas.common import RunStatus as RunStatusEnum
    run = DesignRun(
        id=run_id,
        status=RunStatus.QUEUED.value,
        correlation_id=str(_uuid.uuid4()),
        requirement={
            "id": str(_uuid.uuid4()),
            "naturalLanguagePrompt": "Playground simulation",
            "category": "op-amp",
            "supplyVoltage": 1.8,
            "technology": "TSMC 180nm",
            "temperature": 27,
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "constraints": [],
        },
        steps=[],
    )
    db.add(run)
    await db.commit()

    from app.tasks.orchestration import run_design_pipeline
    run_design_pipeline.apply_async(args=[run_id])

    return PlaygroundSimulateResponse(run_id=run_id)


# ── Chat command interpretation ───────────────────────────────

@router.post("/chat-command", response_model=ChatCommandResponse)
async def chat_command(body: ChatCommandRequest) -> ChatCommandResponse:
    canvas_dict = body.canvas_state.model_dump() if body.canvas_state else None

    try:
        result = await interpret_chat_command(body.message, canvas_dict)
    except Exception as exc:  # noqa: BLE001
        # Return a graceful failure so the frontend always gets a structured response
        return ChatCommandResponse(
            interpreted_command=InterpretedCommand(verb="query", raw=body.message),
            canvas_patches=[],
            agent_message=f"I couldn't interpret that command: {exc}. Try rephrasing.",
        )

    patches = [
        CanvasPatch(**p) if isinstance(p, dict) else p
        for p in result.get("canvas_patches", [])
    ]

    return ChatCommandResponse(
        interpreted_command=InterpretedCommand(
            verb=result.get("verb", "query"),
            target=result.get("target"),
            parameter=result.get("parameter"),
            value=result.get("value"),
            raw=result.get("raw", body.message),
        ),
        canvas_patches=patches,
        agent_message=result.get("agent_message", "Done."),
    )


# ── Apply patches to canvas ───────────────────────────────────

@router.post("/apply-command", response_model=ApplyCommandResponse)
async def apply_command(body: ApplyCommandRequest) -> ApplyCommandResponse:
    """
    Applies a list of canvas patches and returns the updated canvas.
    Pure in-memory operation — the frontend owns the authoritative canvas state;
    this endpoint validates and applies patches server-side.
    """
    canvas = body.canvas_state.model_dump()
    nodes = {n["id"]: n for n in canvas.get("nodes", [])}
    edges = {e["id"]: e for e in canvas.get("edges", [])}
    warnings: list[ValidationIssueOut] = []

    for patch in body.patches:
        op = patch.op
        if op == "add_node" and patch.node:
            nodes[patch.node["id"]] = patch.node
        elif op == "update_node" and patch.node_id and patch.properties:
            if patch.node_id in nodes:
                nodes[patch.node_id]["data"]["props"].update(patch.properties)
            else:
                warnings.append(ValidationIssueOut(severity="warning", message=f"Node {patch.node_id} not found"))
        elif op == "remove_node" and patch.node_id:
            nodes.pop(patch.node_id, None)
            edges = {eid: e for eid, e in edges.items()
                     if e.get("source") != patch.node_id and e.get("target") != patch.node_id}
        elif op == "add_edge" and patch.edge:
            edges[patch.edge["id"]] = patch.edge
        elif op == "remove_edge" and patch.edge_id:
            edges.pop(patch.edge_id, None)

    updated_canvas = CanvasStateIn(
        nodes=list(nodes.values()),
        edges=list(edges.values()),
        selected_node_id=canvas.get("selected_node_id"),
        selected_edge_id=canvas.get("selected_edge_id"),
        viewport=canvas.get("viewport"),
    )
    return ApplyCommandResponse(success=True, updated_canvas=updated_canvas, warnings=warnings)


# ── Session GET ───────────────────────────────────────────────

@router.get("/{session_id}", response_model=PlaygroundSessionOut)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)) -> PlaygroundSessionOut:
    session = await _get_session_or_404(session_id, db)
    return _session_to_out(session)


# ── Session PATCH ─────────────────────────────────────────────

@router.patch("/{session_id}", response_model=PlaygroundSessionOut)
async def update_session(
    session_id: str,
    body: PlaygroundSessionPatch,
    db: AsyncSession = Depends(get_db),
) -> PlaygroundSessionOut:
    session = await _get_session_or_404(session_id, db)
    if body.canvas_state:
        session.canvas_state = body.canvas_state.model_dump()
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    return _session_to_out(session)


# ── Helpers ───────────────────────────────────────────────────

async def _get_session_or_404(session_id: str, db: AsyncSession) -> PlaygroundSession:
    sess = (await db.execute(
        select(PlaygroundSession).where(PlaygroundSession.id == session_id)
    )).scalar_one_or_none()
    if not sess:
        raise HTTPException(404, "Playground session not found")
    return sess


def _session_to_out(s: PlaygroundSession) -> PlaygroundSessionOut:
    cs = s.canvas_state or {"nodes": [], "edges": []}
    return PlaygroundSessionOut(
        id=s.id,
        user_session_id=s.user_session_id,
        canvas_state=CanvasStateIn(**cs) if isinstance(cs, dict) else cs,
        command_history=s.command_history or [],
        linked_run_id=s.linked_run_id,
        created_at=s.created_at.isoformat(),
        updated_at=s.updated_at.isoformat(),
    )
