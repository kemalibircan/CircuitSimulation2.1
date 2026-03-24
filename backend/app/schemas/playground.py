"""
app/schemas/playground.py — Schemas for playground canvas, validation, and chat commands.
Mirrors the TypeScript types in types/playground.ts.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import Field

from app.schemas.common import APIModel, NetlistFormat


# ── Canvas node/edge (mirrors ReactFlow Node<CircuitNodeData>) ─

class CircuitNodeData(APIModel):
    label: str
    type: str  # CircuitComponentType
    props: dict[str, Any] = Field(default_factory=dict)
    selected: bool = False
    has_warning: bool = False
    warning_message: str | None = None


class CircuitEdgeData(APIModel):
    label: str | None = None
    net_name: str | None = None
    animated: bool = False


class CanvasNodeIn(APIModel):
    id: str
    type: str | None = None
    position: dict[str, float] = Field(default_factory=dict)
    data: CircuitNodeData


class CanvasEdgeIn(APIModel):
    id: str
    source: str
    target: str
    source_handle: str | None = None
    target_handle: str | None = None
    data: CircuitEdgeData | None = None


# ── Full canvas state ─────────────────────────────────────────

class CanvasStateIn(APIModel):
    nodes: list[CanvasNodeIn] = Field(default_factory=list)
    edges: list[CanvasEdgeIn] = Field(default_factory=list)
    selected_node_id: str | None = None
    selected_edge_id: str | None = None
    viewport: dict[str, float] | None = None
    metadata: dict[str, Any] | None = None


# ── Playground Validate ───────────────────────────────────────

class ValidationIssueOut(APIModel):
    severity: Literal["error", "warning", "info"]
    message: str
    node_id: str | None = None
    edge_id: str | None = None
    line_number: int | None = None


class PlaygroundValidateRequest(APIModel):
    nodes: list[CanvasNodeIn] = Field(default_factory=list)
    edges: list[CanvasEdgeIn] = Field(default_factory=list)


class PlaygroundValidateResponse(APIModel):
    valid: bool
    issues: list[ValidationIssueOut] = Field(default_factory=list)
    warnings: list[ValidationIssueOut] = Field(default_factory=list)


# ── Canvas → Netlist ──────────────────────────────────────────

class PlaygroundNetlistRequest(PlaygroundValidateRequest):
    """Same canvas state as validate."""


class PlaygroundNetlistResponse(APIModel):
    netlist: str
    format: NetlistFormat = NetlistFormat.SPICE
    node_map: dict[str, str] = Field(default_factory=dict)  # node_id → net_name


# ── Playground Simulate ───────────────────────────────────────

class PlaygroundSimulateRequest(PlaygroundValidateRequest):
    run_analyses: list[Literal["ac", "tran", "dc", "noise"]] = Field(
        default=["ac", "tran"]
    )


class PlaygroundSimulateResponse(APIModel):
    run_id: str          # queued simulation run
    status: str = "queued"
    message: str = "Simulation queued. Poll /api/v1/runs/{run_id}/status for updates."


# ── Chat Command ──────────────────────────────────────────────

class ChatCommandRequest(APIModel):
    session_id: str
    message: str = Field(..., min_length=1)
    canvas_state: CanvasStateIn | None = None


# ── Canvas Patch operations returned to the frontend ──────────

class CanvasPatch(APIModel):
    op: Literal["add_node", "update_node", "remove_node",
                "add_edge", "remove_edge", "warning", "suggestion"]
    node: dict[str, Any] | None = None
    edge: dict[str, Any] | None = None
    node_id: str | None = None
    edge_id: str | None = None
    message: str | None = None
    properties: dict[str, Any] | None = None


class InterpretedCommand(APIModel):
    verb: str   # add | connect | remove | modify | optimize | explain | simulate | query
    target: str | None = None
    parameter: str | None = None
    value: Any = None
    raw: str


class ChatCommandResponse(APIModel):
    interpreted_command: InterpretedCommand
    canvas_patches: list[CanvasPatch] = Field(default_factory=list)
    agent_message: str


# ── Apply Command (apply pre-interpreted patches) ─────────────

class ApplyCommandRequest(APIModel):
    session_id: str
    patches: list[CanvasPatch]
    canvas_state: CanvasStateIn


class ApplyCommandResponse(APIModel):
    success: bool
    updated_canvas: CanvasStateIn    # full updated canvas returned to frontend
    warnings: list[ValidationIssueOut] = Field(default_factory=list)


# ── Session PATCH ─────────────────────────────────────────────

class PlaygroundSessionPatch(APIModel):
    canvas_state: CanvasStateIn | None = None


class PlaygroundSessionOut(APIModel):
    id: str
    user_session_id: str
    canvas_state: CanvasStateIn
    command_history: list[dict[str, Any]] = Field(default_factory=list)
    linked_run_id: str | None = None
    created_at: str
    updated_at: str
