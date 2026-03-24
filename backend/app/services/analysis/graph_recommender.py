"""
app/services/analysis/graph_recommender.py — Hybrid rule-based + LLM graph
recommendation engine.

Determines which waveforms, metrics, and signals are most relevant for a
given circuit topology, analysis type, and user constraints.
"""
from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Any

from app.core.logging import get_logger
from app.services.analysis.signal_extractor import CircuitSignalMap, NodeInfo

logger = get_logger(__name__)


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class WaveformSpec:
    id: str
    title: str
    chart_type: str  # "time_domain", "bode_magnitude", "bode_phase", "dc_sweep", "bar"
    x_label: str
    x_unit: str
    y_label: str
    y_unit: str
    signals: list[str]  # signal names: ["V(out)", "V(in)"]
    is_recommended: bool = True
    priority: int = 5  # 1 = highest

@dataclass
class MetricSpec:
    id: str
    label: str
    metric_key: str  # key in measure_results
    unit: str
    format_fn: str  # "dB", "Hz", "deg", "V", "A", "mW", etc.
    is_recommended: bool = True
    priority: int = 5

@dataclass
class SignalSpec:
    name: str       # "V(out)", "I(R1)"
    type: str       # "voltage" | "current"
    unit: str       # "V" | "A"
    node_or_branch: str  # node/branch name

@dataclass
class GraphRecommendation:
    recommended_waveforms: list[WaveformSpec] = field(default_factory=list)
    recommended_metrics: list[MetricSpec] = field(default_factory=list)
    available_signals: list[SignalSpec] = field(default_factory=list)
    optional_waveforms: list[WaveformSpec] = field(default_factory=list)
    topology_type: str = "unknown"


# ── Topology → default rules ─────────────────────────────────────────────────

_TOPOLOGY_RULES: dict[str, dict[str, Any]] = {
    "voltage_divider": {
        "waveforms": [
            {"title": "Node Voltages", "chart_type": "dc_sweep", "y_label": "Voltage", "y_unit": "V",
             "signals": ["output", "input"], "priority": 1},
        ],
        "metrics": [
            {"label": "Output Voltage", "key": "vout_dc", "unit": "V", "format": "V", "priority": 1},
            {"label": "Voltage Ratio", "key": "voltage_ratio", "unit": "", "format": "ratio", "priority": 2},
        ],
        "exclude_charts": ["bode_magnitude", "bode_phase"],
    },
    "resistor_network": {
        "waveforms": [
            {"title": "Node Voltages", "chart_type": "dc_sweep", "y_label": "Voltage", "y_unit": "V",
             "signals": ["all_nodes"], "priority": 1},
        ],
        "metrics": [
            {"label": "Output Voltage", "key": "vout_dc", "unit": "V", "format": "V", "priority": 1},
        ],
        "exclude_charts": ["bode_magnitude", "bode_phase"],
    },
    "rc_filter": {
        "waveforms": [
            {"title": "Transient Response", "chart_type": "time_domain", "y_label": "Voltage", "y_unit": "V",
             "signals": ["output", "input"], "priority": 1},
            {"title": "Frequency Response", "chart_type": "bode_magnitude", "y_label": "Gain", "y_unit": "dB",
             "signals": ["output"], "priority": 2},
        ],
        "metrics": [
            {"label": "Cutoff Frequency", "key": "cutoff_freq", "unit": "Hz", "format": "Hz", "priority": 1},
            {"label": "Rise Time", "key": "rise_time", "unit": "s", "format": "time", "priority": 2},
            {"label": "Settling Time", "key": "settling_time", "unit": "s", "format": "time", "priority": 3},
        ],
        "exclude_charts": [],
    },
    "lc_filter": {
        "waveforms": [
            {"title": "Frequency Response", "chart_type": "bode_magnitude", "y_label": "Gain", "y_unit": "dB",
             "signals": ["output"], "priority": 1},
            {"title": "Phase Response", "chart_type": "bode_phase", "y_label": "Phase", "y_unit": "°",
             "signals": ["output"], "priority": 2},
            {"title": "Transient Response", "chart_type": "time_domain", "y_label": "Voltage", "y_unit": "V",
             "signals": ["output"], "priority": 3},
        ],
        "metrics": [
            {"label": "Resonant Frequency", "key": "resonant_freq", "unit": "Hz", "format": "Hz", "priority": 1},
            {"label": "Quality Factor", "key": "q_factor", "unit": "", "format": "ratio", "priority": 2},
            {"label": "Bandwidth", "key": "bandwidth", "unit": "Hz", "format": "Hz", "priority": 3},
        ],
        "exclude_charts": [],
    },
    "amplifier": {
        "waveforms": [
            {"title": "AC Response (Bode)", "chart_type": "bode_magnitude", "y_label": "Gain", "y_unit": "dB",
             "signals": ["output"], "priority": 1},
            {"title": "Phase Response", "chart_type": "bode_phase", "y_label": "Phase", "y_unit": "°",
             "signals": ["output"], "priority": 2},
            {"title": "Transient Response", "chart_type": "time_domain", "y_label": "Voltage", "y_unit": "V",
             "signals": ["output"], "priority": 3},
        ],
        "metrics": [
            {"label": "DC Gain", "key": "gain_dc", "unit": "dB", "format": "dB", "priority": 1},
            {"label": "GBW", "key": "ugbw", "unit": "MHz", "format": "Hz", "priority": 2},
            {"label": "Phase Margin", "key": "pm", "unit": "°", "format": "deg", "priority": 3},
            {"label": "Power", "key": "power_vdd", "unit": "mW", "format": "mW", "priority": 4},
        ],
        "exclude_charts": [],
    },
    "common_source": {
        "waveforms": [
            {"title": "AC Response", "chart_type": "bode_magnitude", "y_label": "Gain", "y_unit": "dB",
             "signals": ["output"], "priority": 1},
            {"title": "Transient Response", "chart_type": "time_domain", "y_label": "Voltage", "y_unit": "V",
             "signals": ["output", "input"], "priority": 2},
        ],
        "metrics": [
            {"label": "Voltage Gain", "key": "gain_dc", "unit": "dB", "format": "dB", "priority": 1},
            {"label": "Bandwidth", "key": "ugbw", "unit": "MHz", "format": "Hz", "priority": 2},
            {"label": "Power", "key": "power_vdd", "unit": "mW", "format": "mW", "priority": 3},
        ],
        "exclude_charts": [],
    },
    "bjt_amplifier": {
        "waveforms": [
            {"title": "AC Response", "chart_type": "bode_magnitude", "y_label": "Gain", "y_unit": "dB",
             "signals": ["output"], "priority": 1},
            {"title": "Transient Response", "chart_type": "time_domain", "y_label": "Voltage", "y_unit": "V",
             "signals": ["output", "input"], "priority": 2},
        ],
        "metrics": [
            {"label": "Voltage Gain", "key": "gain_dc", "unit": "dB", "format": "dB", "priority": 1},
            {"label": "Bandwidth", "key": "ugbw", "unit": "MHz", "format": "Hz", "priority": 2},
        ],
        "exclude_charts": [],
    },
    "current_mirror": {
        "waveforms": [
            {"title": "Output Current vs Input", "chart_type": "dc_sweep", "y_label": "Current", "y_unit": "A",
             "signals": ["output_branch"], "priority": 1},
        ],
        "metrics": [
            {"label": "Mirror Ratio", "key": "mirror_ratio", "unit": "", "format": "ratio", "priority": 1},
            {"label": "Output Current", "key": "iout_dc", "unit": "µA", "format": "A", "priority": 2},
            {"label": "Output Resistance", "key": "rout", "unit": "kΩ", "format": "ohm", "priority": 3},
        ],
        "exclude_charts": ["bode_magnitude", "bode_phase"],
    },
    "comparator": {
        "waveforms": [
            {"title": "Transient Response", "chart_type": "time_domain", "y_label": "Voltage", "y_unit": "V",
             "signals": ["output", "input"], "priority": 1},
        ],
        "metrics": [
            {"label": "Propagation Delay", "key": "prop_delay", "unit": "ns", "format": "time", "priority": 1},
            {"label": "Input Offset", "key": "vos", "unit": "mV", "format": "V", "priority": 2},
        ],
        "exclude_charts": ["bode_magnitude", "bode_phase"],
    },
    "voltage_regulator": {
        "waveforms": [
            {"title": "Output Voltage", "chart_type": "time_domain", "y_label": "Voltage", "y_unit": "V",
             "signals": ["output"], "priority": 1},
            {"title": "Load Regulation", "chart_type": "dc_sweep", "y_label": "Voltage", "y_unit": "V",
             "signals": ["output"], "priority": 2},
        ],
        "metrics": [
            {"label": "Output Voltage", "key": "vout_dc", "unit": "V", "format": "V", "priority": 1},
            {"label": "Dropout Voltage", "key": "dropout", "unit": "mV", "format": "V", "priority": 2},
            {"label": "Load Regulation", "key": "load_reg", "unit": "%", "format": "percent", "priority": 3},
            {"label": "PSRR", "key": "psrr", "unit": "dB", "format": "dB", "priority": 4},
        ],
        "exclude_charts": [],
    },
    "oscillator": {
        "waveforms": [
            {"title": "Oscillation Output", "chart_type": "time_domain", "y_label": "Voltage", "y_unit": "V",
             "signals": ["output"], "priority": 1},
        ],
        "metrics": [
            {"label": "Frequency", "key": "osc_freq", "unit": "MHz", "format": "Hz", "priority": 1},
            {"label": "Amplitude", "key": "osc_amplitude", "unit": "V", "format": "V", "priority": 2},
            {"label": "Phase Noise", "key": "phase_noise", "unit": "dBc/Hz", "format": "dB", "priority": 3},
        ],
        "exclude_charts": ["bode_magnitude", "bode_phase"],
    },
}

# Default for unknown topologies
_DEFAULT_RULES = {
    "waveforms": [
        {"title": "Transient Response", "chart_type": "time_domain", "y_label": "Voltage", "y_unit": "V",
         "signals": ["output"], "priority": 2},
    ],
    "metrics": [],
    "exclude_charts": [],
}


class GraphRecommender:
    """Hybrid rule-based + LLM graph recommendation engine."""

    async def recommend(
        self,
        signal_map: CircuitSignalMap,
        user_constraints: list[dict[str, Any]] | None = None,
        measure_results: dict[str, float] | None = None,
    ) -> GraphRecommendation:
        """
        Generate a graph recommendation based on circuit analysis.

        1. Rule-based filtering by topology
        2. Constraint-aware metric selection
        3. LLM enhancement (optional, called separately)
        4. Build available signals list
        """
        topology = signal_map.topology_type
        rules = _TOPOLOGY_RULES.get(topology, _DEFAULT_RULES)
        user_constraints = user_constraints or []
        measure_results = measure_results or {}

        rec = GraphRecommendation(topology_type=topology)

        # ── 1. Build available signals ────────────────────────
        rec.available_signals = self._build_available_signals(signal_map)

        # ── 2. Rule-based waveforms ───────────────────────────
        output_nodes = [n for n in signal_map.nodes if n.role == "output"]
        input_nodes = [n for n in signal_map.nodes if n.role == "input"]
        all_nodes = [n for n in signal_map.nodes if n.role not in ("supply", "ground")]

        excluded = set(rules.get("exclude_charts", []))

        for wf_rule in rules.get("waveforms", []):
            chart_type = wf_rule["chart_type"]
            if chart_type in excluded:
                continue

            # Resolve signal placeholders
            signals = self._resolve_signals(
                wf_rule["signals"], output_nodes, input_nodes, all_nodes, signal_map.branches
            )
            if not signals:
                continue

            rec.recommended_waveforms.append(WaveformSpec(
                id=f"wf-{uuid.uuid4().hex[:8]}",
                title=wf_rule["title"],
                chart_type=chart_type,
                x_label=self._x_label_for(chart_type),
                x_unit=self._x_unit_for(chart_type),
                y_label=wf_rule["y_label"],
                y_unit=wf_rule["y_unit"],
                signals=signals,
                is_recommended=True,
                priority=wf_rule["priority"],
            ))

        # ── 3. Add analysis-driven waveforms ──────────────────
        analysis_types = {a.type for a in signal_map.analysis_types}

        if "ac" in analysis_types and "bode_magnitude" not in excluded:
            has_bode = any(w.chart_type == "bode_magnitude" for w in rec.recommended_waveforms)
            if not has_bode and output_nodes:
                out_signals = [f"V({n.name})" for n in output_nodes]
                rec.recommended_waveforms.append(WaveformSpec(
                    id=f"wf-{uuid.uuid4().hex[:8]}",
                    title="AC Response",
                    chart_type="bode_magnitude",
                    x_label="Frequency", x_unit="Hz",
                    y_label="Gain", y_unit="dB",
                    signals=out_signals,
                    is_recommended=True, priority=3,
                ))

        if "tran" in analysis_types:
            has_tran = any(w.chart_type == "time_domain" for w in rec.recommended_waveforms)
            if not has_tran and output_nodes:
                out_signals = [f"V({n.name})" for n in output_nodes]
                rec.recommended_waveforms.append(WaveformSpec(
                    id=f"wf-{uuid.uuid4().hex[:8]}",
                    title="Transient Response",
                    chart_type="time_domain",
                    x_label="Time", x_unit="s",
                    y_label="Voltage", y_unit="V",
                    signals=out_signals,
                    is_recommended=True, priority=4,
                ))

        # ── 4. Rule-based metrics ─────────────────────────────
        for m_rule in rules.get("metrics", []):
            key = m_rule["key"]
            # Only recommend if the metric actually exists or is likely computable
            if measure_results and key in measure_results:
                rec.recommended_metrics.append(MetricSpec(
                    id=f"m-{uuid.uuid4().hex[:8]}",
                    label=m_rule["label"],
                    metric_key=key,
                    unit=m_rule["unit"],
                    format_fn=m_rule["format"],
                    is_recommended=True,
                    priority=m_rule["priority"],
                ))
            elif not measure_results:
                # No results yet, recommend the metric anyway
                rec.recommended_metrics.append(MetricSpec(
                    id=f"m-{uuid.uuid4().hex[:8]}",
                    label=m_rule["label"],
                    metric_key=key,
                    unit=m_rule["unit"],
                    format_fn=m_rule["format"],
                    is_recommended=True,
                    priority=m_rule["priority"],
                ))

        # ── 5. Constraint-driven metrics ──────────────────────
        existing_keys = {m.metric_key for m in rec.recommended_metrics}
        for constraint in user_constraints:
            metric_name = constraint.get("metric", "").lower().replace(" ", "_")
            if metric_name not in existing_keys:
                rec.recommended_metrics.append(MetricSpec(
                    id=f"m-{uuid.uuid4().hex[:8]}",
                    label=constraint.get("metric", metric_name),
                    metric_key=metric_name,
                    unit=constraint.get("unit", ""),
                    format_fn=self._guess_format(constraint.get("unit", "")),
                    is_recommended=True,
                    priority=2,
                ))

        # ── 6. Optional waveforms (node/branch exploration) ───
        for node in signal_map.nodes:
            if node.role in ("supply", "ground"):
                continue
            sig_name = f"V({node.name})"
            already = any(sig_name in w.signals for w in rec.recommended_waveforms)
            if not already:
                rec.optional_waveforms.append(WaveformSpec(
                    id=f"wf-opt-{uuid.uuid4().hex[:8]}",
                    title=f"Voltage at {node.name}",
                    chart_type="time_domain",
                    x_label="Time", x_unit="s",
                    y_label="Voltage", y_unit="V",
                    signals=[sig_name],
                    is_recommended=False, priority=10,
                ))

        for branch in signal_map.branches:
            rec.optional_waveforms.append(WaveformSpec(
                id=f"wf-opt-{uuid.uuid4().hex[:8]}",
                title=branch.label,
                chart_type="time_domain",
                x_label="Time", x_unit="s",
                y_label="Current", y_unit="A",
                signals=[branch.name],
                is_recommended=False, priority=10,
            ))

        # Sort by priority
        rec.recommended_waveforms.sort(key=lambda w: w.priority)
        rec.recommended_metrics.sort(key=lambda m: m.priority)

        logger.info(
            "graph_recommendation_complete",
            topology=topology,
            n_waveforms=len(rec.recommended_waveforms),
            n_metrics=len(rec.recommended_metrics),
            n_optional=len(rec.optional_waveforms),
            n_signals=len(rec.available_signals),
        )

        return rec

    # ── LLM enhancement ───────────────────────────────────────────────────────

    async def enhance_with_llm(
        self,
        recommendation: GraphRecommendation,
        signal_map: CircuitSignalMap,
        netlist: str,
        category: str,
    ) -> GraphRecommendation:
        """
        Optionally enhance the rule-based recommendation with LLM input.
        The LLM can add/remove waveforms or reorder priorities.
        """
        try:
            from app.services.openai.tasks import recommend_graphs as llm_recommend
            llm_result = await llm_recommend(
                topology_type=signal_map.topology_type,
                component_types=signal_map.component_types,
                node_names=[n.name for n in signal_map.nodes],
                branch_names=[b.name for b in signal_map.branches],
                analysis_types=[a.type for a in signal_map.analysis_types],
                current_waveforms=[w.title for w in recommendation.recommended_waveforms],
                current_metrics=[m.label for m in recommendation.recommended_metrics],
                category=category,
            )

            # Apply LLM suggestions
            if llm_result.get("remove_waveforms"):
                titles_to_remove = set(llm_result["remove_waveforms"])
                recommendation.recommended_waveforms = [
                    w for w in recommendation.recommended_waveforms
                    if w.title not in titles_to_remove
                ]

            if llm_result.get("additional_metrics"):
                for am in llm_result["additional_metrics"]:
                    recommendation.recommended_metrics.append(MetricSpec(
                        id=f"m-llm-{uuid.uuid4().hex[:8]}",
                        label=am.get("label", ""),
                        metric_key=am.get("key", ""),
                        unit=am.get("unit", ""),
                        format_fn=am.get("format", ""),
                        is_recommended=True,
                        priority=am.get("priority", 5),
                    ))

            logger.info("llm_enhancement_applied", changes=llm_result.get("reasoning", ""))
        except Exception as exc:
            logger.warning("llm_enhancement_failed", error=str(exc))
            # Fall back to rule-based only

        return recommendation

    # ── Private helpers ───────────────────────────────────────────────────────

    def _build_available_signals(self, signal_map: CircuitSignalMap) -> list[SignalSpec]:
        """Build the full list of observable signals."""
        signals = []
        for node in signal_map.nodes:
            if node.role == "ground":
                continue
            signals.append(SignalSpec(
                name=f"V({node.name})",
                type="voltage", unit="V",
                node_or_branch=node.name,
            ))
        for branch in signal_map.branches:
            signals.append(SignalSpec(
                name=branch.name,
                type="current", unit="A",
                node_or_branch=branch.component,
            ))
        return signals

    def _resolve_signals(
        self,
        signal_refs: list[str],
        output_nodes: list[NodeInfo],
        input_nodes: list[NodeInfo],
        all_nodes: list[NodeInfo],
        branches: list,
    ) -> list[str]:
        """Resolve signal placeholders like 'output', 'input' to actual V(name)."""
        resolved = []
        for ref in signal_refs:
            if ref == "output":
                resolved.extend(f"V({n.name})" for n in output_nodes)
            elif ref == "input":
                resolved.extend(f"V({n.name})" for n in input_nodes)
            elif ref == "all_nodes":
                resolved.extend(f"V({n.name})" for n in all_nodes[:8])  # cap at 8
            elif ref == "output_branch":
                if output_nodes:
                    resolved.append(f"I({output_nodes[0].name})")
            elif ref.startswith("V(") or ref.startswith("I("):
                resolved.append(ref)
            else:
                resolved.append(ref)
        return resolved

    @staticmethod
    def _x_label_for(chart_type: str) -> str:
        return {
            "time_domain": "Time",
            "bode_magnitude": "Frequency",
            "bode_phase": "Frequency",
            "dc_sweep": "Input",
            "bar": "",
        }.get(chart_type, "")

    @staticmethod
    def _x_unit_for(chart_type: str) -> str:
        return {
            "time_domain": "s",
            "bode_magnitude": "Hz",
            "bode_phase": "Hz",
            "dc_sweep": "V",
            "bar": "",
        }.get(chart_type, "")

    @staticmethod
    def _guess_format(unit: str) -> str:
        u = unit.lower()
        if "db" in u:
            return "dB"
        if "hz" in u or "mhz" in u:
            return "Hz"
        if "deg" in u or "°" in u:
            return "deg"
        if u in ("v", "mv"):
            return "V"
        if u in ("a", "ma", "ua"):
            return "A"
        if "w" in u:
            return "mW"
        return ""
