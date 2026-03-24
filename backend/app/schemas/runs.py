"""
app/schemas/runs.py — Request/response schemas for the /runs endpoints.
Shapes mirror the TypeScript AgentRun, AgentRunSummary, DesignRequirement interfaces.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import Field

from app.schemas.common import (
    APIModel,
    AgentStepStatus,
    CircuitCategory,
    RunStatus,
    PipelineStep,
    CandidateStatus,
    NetlistFormat,
)


# ── Design Constraints (mirror DesignConstraint TS type) ──────

class DesignConstraintIn(APIModel):
    metric: str
    target: float
    unit: str
    tolerance: float | None = None
    priority: Literal["hard", "soft"] = "hard"


class DesignConstraintOut(DesignConstraintIn):
    id: str


# ── Create Run Request ────────────────────────────────────────

class CreateRunRequest(APIModel):
    natural_language_prompt: str = Field(..., min_length=10)
    category: CircuitCategory
    supply_voltage: float = Field(default=1.8, gt=0)
    technology: str = Field(default="TSMC 180nm")
    temperature: float = Field(default=27)
    constraints: list[DesignConstraintIn] = Field(default_factory=list)


# ── Agent Step (matches AgentStep TS type) ───────────────────

class AgentStepLog(APIModel):
    timestamp: str
    message: str
    type: Literal["info", "warning", "reasoning", "result"]


class AgentStepOut(APIModel):
    id: str
    label: str
    description: str
    status: AgentStepStatus
    started_at: str | None = None
    completed_at: str | None = None
    duration_ms: int | None = None
    logs: list[AgentStepLog] = Field(default_factory=list)
    reasoning: str | None = None


# ── Design Summary (matches DesignSummary TS type) ────────────

class TransistorSizingOut(APIModel):
    name: str
    type: Literal["NMOS", "PMOS"]
    W: float
    L: float
    fingers: int | None = None
    role: str


class DesignSummaryOut(APIModel):
    topology_name: str
    topology_description: str
    rationale: str
    transistor_sizing: list[TransistorSizingOut] = Field(default_factory=list)
    operating_assumptions: list[str] = Field(default_factory=list)
    confidence_score: float
    bias_current_ua: float | None = None
    power_estimate_uw: float | None = None


# ── Netlist (matches NetlistOutput TS type) ───────────────────

class NetlistOut(APIModel):
    raw: str
    format: NetlistFormat
    generated_at: str


# ── Simulation Metric (matches SimulationMetric TS type) ──────

class SimulationMetricOut(APIModel):
    id: str
    label: str
    value: float
    unit: str
    target: float | None = None
    pass_fail: Literal["pass", "fail", "warning"] | None = None


class ChartPoint(APIModel):
    x: float
    y: float
    label: str | None = None


class MonteCarloPoint(APIModel):
    value: float
    count: int


class WaveformOut(APIModel):
    id: str
    title: str
    chart_type: str  # time_domain, bode_magnitude, bode_phase, dc_sweep, bar
    x_label: str
    x_unit: str
    y_label: str
    y_unit: str
    signals: list[str] = Field(default_factory=list)
    data: list[ChartPoint] = Field(default_factory=list)
    is_recommended: bool = True
    priority: int = 5


class SignalInfoOut(APIModel):
    name: str       # V(out), I(R1)
    type: str       # voltage | current
    unit: str       # V | A
    node_or_branch: str


class SimulationResultOut(APIModel):
    id: str
    run_id: str
    metrics: list[SimulationMetricOut] = Field(default_factory=list)
    waveforms: list[WaveformOut] = Field(default_factory=list)
    available_signals: list[SignalInfoOut] = Field(default_factory=list)
    topology_type: str | None = None
    # Legacy fields for backwards compat
    ac_response: list[ChartPoint] = Field(default_factory=list)
    phase_response: list[ChartPoint] = Field(default_factory=list)
    transient_response: list[ChartPoint] = Field(default_factory=list)
    monte_carlo_gain: list[MonteCarloPoint] | None = None
    monte_carlo_phase_margin: list[MonteCarloPoint] | None = None
    simulated_at: str


# ── Iteration (matches IterationResult TS type) ───────────────

class ParameterChangeOut(APIModel):
    parameter: str
    from_: str = Field(alias="from")
    to: str


class MetricDeltaOut(APIModel):
    metric: str
    delta: float
    unit: str


class IterationOut(APIModel):
    id: str
    iteration: int
    parameter_changes: list[ParameterChangeOut] = Field(default_factory=list)
    metric_deltas: list[MetricDeltaOut] = Field(default_factory=list)
    targets_met_count: int
    total_targets: int
    all_targets_met: bool
    notes: str | None = None
    simulation_result: SimulationResultOut | None = None


# ── Candidate (matches CircuitCandidate TS type) ──────────────

class CandidateOut(APIModel):
    id: str
    rank: int
    topology_name: str
    status: CandidateStatus
    gain_db: float | None = None
    bandwidth_mhz: float | None = None
    phase_margin_deg: float | None = None
    power_mw: float | None = None
    noise_nv_sqrt_hz: float | None = None
    score: float | None = None
    rejection_reason: str | None = None
    selection_reason: str | None = None


# ── Full Run Detail (matches AgentRun TS type) ────────────────

class DesignRequirementOut(APIModel):
    id: str
    natural_language_prompt: str
    category: CircuitCategory
    constraints: list[DesignConstraintOut] = Field(default_factory=list)
    supply_voltage: float
    technology: str
    temperature: float
    created_at: str


class RunDetailOut(APIModel):
    id: str
    status: RunStatus
    requirement: DesignRequirementOut
    steps: list[AgentStepOut] = Field(default_factory=list)
    design_summary: DesignSummaryOut | None = None
    netlist: NetlistOut | None = None
    simulation_result: SimulationResultOut | None = None
    iterations: list[IterationOut] = Field(default_factory=list)
    candidates: list[CandidateOut] = Field(default_factory=list)
    started_at: str | None = None
    completed_at: str | None = None
    total_duration_ms: int | None = None
    error_message: str | None = None


# ── Run Summary (for list view / matches AgentRunSummary TS type) ──

class RunSummaryOut(APIModel):
    id: str
    status: RunStatus
    category: CircuitCategory
    prompt: str
    topology_name: str | None = None
    gain_db: float | None = None
    bandwidth_mhz: float | None = None
    started_at: str | None = None
    completed_at: str | None = None


class RunListOut(APIModel):
    runs: list[RunSummaryOut]
    total: int


# ── Create Run Response ───────────────────────────────────────

class CreateRunResponse(APIModel):
    id: str
    status: RunStatus
    created_at: str


# ── Lightweight status poll ───────────────────────────────────

class RunStatusOut(APIModel):
    id: str
    status: RunStatus
    current_step: PipelineStep | None = None
    progress_percent: int = 0
    error_message: str | None = None


# ── Timeline response ─────────────────────────────────────────

class TimelineStepOut(APIModel):
    key: PipelineStep
    label: str
    status: AgentStepStatus
    duration_ms: int | None = None
    started_at: str | None = None
    completed_at: str | None = None
    reasoning: str | None = None


class TimelineOut(APIModel):
    run_id: str
    current_step: PipelineStep | None = None
    steps: list[TimelineStepOut] = Field(default_factory=list)


# ── Agent Messages response ───────────────────────────────────

class AgentMessageOut(APIModel):
    id: str
    role: str
    content: str
    timestamp: str
    action_type: str | None = None
    action_data: dict[str, Any] | None = None


class MessagesOut(APIModel):
    run_id: str
    messages: list[AgentMessageOut] = Field(default_factory=list)
