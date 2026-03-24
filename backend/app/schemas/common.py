"""
app/schemas/common.py — Shared enums and base types used across all schemas.
These mirror the TypeScript types in types/circuit.ts exactly.
"""
from __future__ import annotations

import enum
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict


# ── Enums (matching TypeScript union types) ───────────────────

class CircuitCategory(str, enum.Enum):
    BLANK = "blank"
    OP_AMP = "op-amp"
    CURRENT_MIRROR = "current-mirror"
    DIFFERENTIAL_PAIR = "differential-pair"
    LNA = "lna"
    BANDGAP = "bandgap"
    OSCILLATOR = "oscillator"
    FILTER = "filter"
    COMPARATOR = "comparator"
    VOLTAGE_REGULATOR = "voltage-regulator"
    CHARGE_PUMP = "charge-pump"


class RunStatus(str, enum.Enum):
    PENDING = "pending"
    QUEUED = "queued"
    RUNNING = "running"
    VALIDATING = "validating"
    SIMULATING = "simulating"
    ANALYZING = "analyzing"
    OPTIMIZING = "optimizing"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"


class AgentStepStatus(str, enum.Enum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETE = "complete"
    FAILED = "failed"


class PipelineStep(str, enum.Enum):
    REQUIREMENT_PARSING = "requirement_parsing"
    TOPOLOGY_SELECTION = "topology_selection"
    NETLIST_GENERATION = "netlist_generation"
    VALIDATION = "validation"
    SIMULATION_RUN = "simulation_run"
    METRIC_EXTRACTION = "metric_extraction"
    MONTE_CARLO = "monte_carlo"
    OPTIMIZATION_LOOP = "optimization_loop"
    RECOMMENDATION_READY = "recommendation_ready"


class CandidateStatus(str, enum.Enum):
    SELECTED = "selected"
    REJECTED = "rejected"
    PENDING = "pending"


class MessageRole(str, enum.Enum):
    USER = "user"
    AGENT = "agent"
    SYSTEM = "system"
    SUGGESTION = "suggestion"


class NetlistFormat(str, enum.Enum):
    SPICE = "spice"
    NGSPICE = "ngspice"
    SPECTRE = "spectre"


# ── Shared base ───────────────────────────────────────────────

class APIModel(BaseModel):
    model_config = ConfigDict(
        from_attributes=True,
        populate_by_name=True,
    )
