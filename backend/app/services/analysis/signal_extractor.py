"""
app/services/analysis/signal_extractor.py — Extract circuit topology, nodes,
branches, and signals from a SPICE netlist string.

This is the first layer of the dynamic simulation system: it analyses what the
circuit *is* so downstream layers can decide what to measure and display.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal


# ── Data classes ──────────────────────────────────────────────────────────────

@dataclass
class NodeInfo:
    name: str
    role: str  # "input", "output", "supply", "ground", "internal", "bias"
    label: str  # Human-friendly label, e.g. "Output Node"

@dataclass
class BranchInfo:
    name: str            # e.g. "I(R1)", "I(C1)", "I(M1:drain)"
    component: str       # e.g. "R1", "C1", "M1"
    component_type: str  # "resistor", "capacitor", "mosfet", etc.
    label: str           # Human friendly

@dataclass
class AnalysisInfo:
    type: str            # "op", "ac", "tran", "dc", "noise"
    parameters: dict     # e.g. {"start_freq": 1, "end_freq": 1e9}

@dataclass
class CircuitSignalMap:
    nodes: list[NodeInfo] = field(default_factory=list)
    branches: list[BranchInfo] = field(default_factory=list)
    topology_type: str = "unknown"
    component_types: list[str] = field(default_factory=list)
    analysis_types: list[AnalysisInfo] = field(default_factory=list)
    has_feedback: bool = False
    has_active_devices: bool = False
    component_count: int = 0


# ── Regex patterns ────────────────────────────────────────────────────────────

_MOSFET_RE  = re.compile(r"^[Mm]\S+\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)", re.MULTILINE)
_RESISTOR_RE = re.compile(r"^[Rr]\S+\s+(\S+)\s+(\S+)", re.MULTILINE)
_CAPACITOR_RE = re.compile(r"^[Cc]\S+\s+(\S+)\s+(\S+)", re.MULTILINE)
_INDUCTOR_RE  = re.compile(r"^[Ll]\S+\s+(\S+)\s+(\S+)", re.MULTILINE)
_VSOURCE_RE   = re.compile(r"^[Vv]\S+\s+(\S+)\s+(\S+)", re.MULTILINE)
_ISOURCE_RE   = re.compile(r"^[Ii]\S+\s+(\S+)\s+(\S+)", re.MULTILINE)
_DIODE_RE     = re.compile(r"^[Dd]\S+\s+(\S+)\s+(\S+)", re.MULTILINE)
_BJT_RE       = re.compile(r"^[Qq]\S+\s+(\S+)\s+(\S+)\s+(\S+)", re.MULTILINE)

_COMPONENT_NAME_RE = re.compile(r"^([A-Za-z]\S*)\s", re.MULTILINE)

_AC_RE   = re.compile(r"^\.(ac|AC)\s+(\w+)\s+(\S+)\s+(\S+)\s+(\S+)", re.MULTILINE)
_TRAN_RE = re.compile(r"^\.(tran|TRAN)\s+(\S+)\s+(\S+)", re.MULTILINE)
_DC_RE   = re.compile(r"^\.(dc|DC)\s+", re.MULTILINE)
_OP_RE   = re.compile(r"^\.(op|OP)\b", re.MULTILINE)
_NOISE_RE = re.compile(r"^\.(noise|NOISE)\s+", re.MULTILINE)

_MEASURE_RE = re.compile(r"^\.(measure|MEASURE|meas|MEAS)\s+\w+\s+(\w+)", re.MULTILINE)

# ── Known supply/ground names ────────────────────────────────────────────────

_SUPPLY_NAMES = {"vdd", "vcc", "avdd", "dvdd", "v+", "vdd!"}
_GROUND_NAMES = {"0", "gnd", "vss", "gnd!", "avss", "dvss"}
_OUTPUT_HINTS = {"out", "vout", "output", "vo", "v_out"}
_INPUT_HINTS  = {"in", "vin", "input", "vi", "v_in", "inp", "inn", "vinp", "vinn"}
_BIAS_HINTS   = {"bias", "vbias", "ibias", "vb", "vref", "ref"}


class SignalExtractor:
    """Extract topology information and available signals from a SPICE netlist."""

    def extract_signals(self, netlist: str, category: str = "") -> CircuitSignalMap:
        """Main entry: parse netlist and return full signal map."""
        result = CircuitSignalMap()

        # 1. Extract all unique net names (nodes)
        all_nets = self._extract_all_nets(netlist)

        # 2. Extract components and branches
        components = self._extract_components(netlist)
        result.component_count = len(components)
        result.component_types = list({c["type"] for c in components})

        # 3. Build branches
        result.branches = self._build_branches(components)

        # 4. Build nodes with role classification
        result.nodes = self._classify_nodes(all_nets, netlist)

        # 5. Detect analysis types
        result.analysis_types = self._detect_analyses(netlist)

        # 6. Classify topology
        result.topology_type = self._classify_topology(netlist, category, components, result.nodes)

        # 7. Check for active devices
        active_types = {"nmos", "pmos", "mosfet", "npn", "pnp", "bjt", "opamp"}
        result.has_active_devices = bool(active_types & set(result.component_types))

        # 8. Check for feedback
        result.has_feedback = self._detect_feedback(netlist, components, result.nodes)

        return result

    # ── Internal helpers ──────────────────────────────────────────────────────

    def _extract_all_nets(self, netlist: str) -> set[str]:
        """Collect all net names mentioned in component lines."""
        nets: set[str] = set()
        for line in netlist.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("*") or stripped.startswith("."):
                continue
            tokens = stripped.split()
            if len(tokens) < 3:
                continue
            prefix = tokens[0][0].upper()
            if prefix in "MRCLVIDEQX":
                # Nets start from index 1
                for tok in tokens[1:]:
                    # Stop at model names, param assignments
                    if "=" in tok or tok.upper() in ("DC", "AC", "PULSE", "SIN", "PWL"):
                        break
                    # Filter out pure numbers used as values
                    if re.match(r"^[\d.eE+\-]+[a-zA-Z]*$", tok) and prefix in "RCL":
                        # Likely a component value, not a net
                        if tokens.index(tok) > 2 and prefix == "R":
                            break
                        if tokens.index(tok) > 2 and prefix in "CL":
                            break
                    nets.add(tok)
        # Remove '0' as it's always ground
        nets.discard("0")
        return nets

    def _extract_components(self, netlist: str) -> list[dict]:
        """Extract component name + type from each line."""
        components = []
        for line in netlist.splitlines():
            stripped = line.strip()
            if not stripped or stripped.startswith("*") or stripped.startswith("."):
                continue
            tokens = stripped.split()
            name = tokens[0]
            prefix = name[0].upper()

            type_map = {
                "M": "mosfet", "R": "resistor", "C": "capacitor",
                "L": "inductor", "V": "vsource", "I": "isource",
                "D": "diode", "Q": "bjt", "X": "subcircuit",
            }
            ctype = type_map.get(prefix)
            # Detect opamp subcircuits (X instances with opamp-related model names)
            if prefix == "X" and ctype:
                raw_lower = stripped.lower()
                if "opamp" in raw_lower or "op_amp" in raw_lower or "oa" in raw_lower:
                    ctype = "opamp"
            if ctype:
                nets = []
                for tok in tokens[1:]:
                    if "=" in tok or tok.upper() in ("DC", "AC", "PULSE", "SIN", "PWL", "NMOS", "PMOS"):
                        break
                    nets.append(tok)
                components.append({
                    "name": name,
                    "type": ctype,
                    "nets": nets,
                    "raw": stripped,
                })
        return components

    def _build_branches(self, components: list[dict]) -> list[BranchInfo]:
        """Create BranchInfo for each measurable component."""
        branches = []
        for c in components:
            cname = c["name"]
            ctype = c["type"]
            if ctype == "vsource":
                # Skip supply sources for branch measurement
                if any(s in cname.lower() for s in ("vdd", "vcc", "supply")):
                    continue
            if ctype == "mosfet":
                branches.append(BranchInfo(
                    name=f"I({cname}:drain)",
                    component=cname, component_type=ctype,
                    label=f"Drain current of {cname}",
                ))
            else:
                branches.append(BranchInfo(
                    name=f"I({cname})",
                    component=cname, component_type=ctype,
                    label=f"Current through {cname}",
                ))
        return branches

    def _classify_nodes(self, nets: set[str], netlist: str) -> list[NodeInfo]:
        """Classify each net as input/output/supply/internal."""
        nodes = []
        for net in sorted(nets):
            nl = net.lower()
            if nl in _GROUND_NAMES:
                continue
            elif nl in _SUPPLY_NAMES:
                nodes.append(NodeInfo(name=net, role="supply", label=f"Supply ({net})"))
            elif any(h in nl for h in _OUTPUT_HINTS):
                nodes.append(NodeInfo(name=net, role="output", label=f"Output ({net})"))
            elif any(h in nl for h in _INPUT_HINTS):
                nodes.append(NodeInfo(name=net, role="input", label=f"Input ({net})"))
            elif any(h in nl for h in _BIAS_HINTS):
                nodes.append(NodeInfo(name=net, role="bias", label=f"Bias ({net})"))
            else:
                nodes.append(NodeInfo(name=net, role="internal", label=f"Node {net}"))
        return nodes

    def _detect_analyses(self, netlist: str) -> list[AnalysisInfo]:
        """Detect .ac, .tran, .dc, .op, .noise analysis commands."""
        analyses = []
        if _OP_RE.search(netlist):
            analyses.append(AnalysisInfo(type="op", parameters={}))

        m = _AC_RE.search(netlist)
        if m:
            analyses.append(AnalysisInfo(type="ac", parameters={
                "sweep_type": m.group(2),
                "n_points": m.group(3),
                "start_freq": m.group(4),
                "end_freq": m.group(5),
            }))

        m = _TRAN_RE.search(netlist)
        if m:
            analyses.append(AnalysisInfo(type="tran", parameters={
                "step": m.group(2),
                "stop_time": m.group(3),
            }))

        if _DC_RE.search(netlist):
            analyses.append(AnalysisInfo(type="dc", parameters={}))

        if _NOISE_RE.search(netlist):
            analyses.append(AnalysisInfo(type="noise", parameters={}))

        return analyses

    def _classify_topology(
        self, netlist: str, category: str,
        components: list[dict], nodes: list[NodeInfo],
    ) -> str:
        """Determine the circuit topology type."""
        ctypes = [c["type"] for c in components]
        has_mosfet = "mosfet" in ctypes
        has_bjt = "bjt" in ctypes
        has_resistor = "resistor" in ctypes
        has_capacitor = "capacitor" in ctypes
        has_inductor = "inductor" in ctypes
        has_opamp = "opamp" in ctypes or "subcircuit" in ctypes  # opamps as subcircuit or opamp type
        has_active = has_mosfet or has_bjt or has_opamp

        # Category hint from user
        cat = category.lower().replace("-", "_") if category else ""

        if cat in ("op_amp", "differential_pair"):
            return "amplifier"
        if cat == "lna":
            return "amplifier"
        if cat == "filter":
            return "filter"
        if cat == "oscillator":
            return "oscillator"
        if cat == "comparator":
            return "comparator"
        if cat == "voltage_regulator":
            return "voltage_regulator"
        if cat == "bandgap":
            return "bandgap_reference"
        if cat == "current_mirror":
            return "current_mirror"
        if cat == "charge_pump":
            return "charge_pump"

        # Heuristic detection
        mosfet_count = ctypes.count("mosfet")
        resistor_count = ctypes.count("resistor")
        capacitor_count = ctypes.count("capacitor")

        if has_opamp:
            return "amplifier"

        if not has_active and has_resistor and not has_capacitor and not has_inductor:
            if resistor_count <= 3:
                return "voltage_divider"
            return "resistor_network"

        if not has_active and has_resistor and has_capacitor and not has_inductor:
            return "rc_filter"

        if not has_active and has_inductor:
            if has_capacitor:
                return "lc_filter"
            return "rl_circuit"

        if has_active and mosfet_count >= 2:
            return "amplifier"

        if has_active and mosfet_count == 1 and has_resistor:
            return "common_source"  # single-transistor amp

        if has_bjt:
            return "bjt_amplifier"

        return "general"

    def _detect_feedback(
        self, netlist: str, components: list[dict], nodes: list[NodeInfo],
    ) -> bool:
        """Simple heuristic: check if output node is connected back to input."""
        output_nets = {n.name for n in nodes if n.role == "output"}
        input_nets = {n.name for n in nodes if n.role == "input"}

        if not output_nets or not input_nets:
            return False

        # Check if any component connects an output net to an input net
        for c in components:
            c_nets = set(c.get("nets", []))
            if c_nets & output_nets and c_nets & input_nets:
                return True
        return False
