"""
app/services/netlist/validator.py — SPICE netlist syntax and structure validator.
Checks for common errors before sending to Xyce.
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Literal


@dataclass
class Issue:
    severity: Literal["error", "warning", "info"]
    message: str
    line_number: int | None = None
    node_id: str | None = None


@dataclass
class ValidationResult:
    valid: bool
    issues: list[Issue] = field(default_factory=list)
    warnings: list[Issue] = field(default_factory=list)

    def to_dict_list(self) -> list[dict]:
        return [
            {
                "severity": i.severity,
                "message": i.message,
                "line_number": i.line_number,
                "node_id": i.node_id,
            }
            for i in self.issues + self.warnings
        ]


class NetlistValidator:
    """
    Validates SPICE netlists for common structural and syntax errors.
    Does NOT require Xyce — this is a static analysis pass.
    """

    # Component prefixes and expected token counts
    COMPONENT_PREFIXES = {
        "M": 5,   # MOSFET: name D G S B model
        "R": 4,   # Resistor: name N+ N- value
        "C": 4,   # Capacitor: name N+ N- value
        "L": 4,   # Inductor: name N+ N- value
        "V": 4,   # Voltage source: name N+ N- value
        "I": 4,   # Current source: name N+ N- value
        "D": 4,   # Diode: name A K model
        "Q": 5,   # BJT: name C B E model
        "X": 3,   # Subcircuit: name nodes... model
        "E": 4,   # VCVS
        "G": 4,   # VCCS
        "H": 4,   # CCVS
        "F": 4,   # CCCS
    }

    def validate(self, netlist: str) -> ValidationResult:
        issues: list[Issue] = []
        warnings: list[Issue] = []

        lines = netlist.splitlines()
        if not lines:
            issues.append(Issue("error", "Netlist is empty."))
            return ValidationResult(valid=False, issues=issues)

        # Check for title line
        if lines[0].startswith("."):
            warnings.append(Issue("warning", "First line should be a title comment, not a dot directive.", line_number=1))

        # Check for .end
        has_end = any(line.strip().lower() == ".end" for line in lines)
        if not has_end:
            issues.append(Issue("error", "Netlist is missing '.end' terminator."))

        # Collect nodes
        all_nodes: set[str] = {"0"}  # ground is always present
        component_nodes: dict[str, list[str]] = {}

        for lineno, line in enumerate(lines, start=1):
            stripped = line.strip()
            if not stripped or stripped.startswith("*") or stripped.startswith("+"):
                continue
            if stripped.startswith("."):
                self._validate_directive(stripped, lineno, issues, warnings)
                continue

            tokens = stripped.split()
            if not tokens:
                continue

            name = tokens[0].upper()
            prefix = name[0]

            if prefix not in self.COMPONENT_PREFIXES:
                warnings.append(Issue("warning", f"Unknown component prefix '{prefix}' in '{name}'.", line_number=lineno))
                continue

            min_tokens = self.COMPONENT_PREFIXES[prefix]
            if len(tokens) < min_tokens:
                issues.append(Issue(
                    "error",
                    f"Component '{name}' has too few fields (expected ≥{min_tokens}, got {len(tokens)}).",
                    line_number=lineno,
                ))
                continue

            # Collect nodes for connectivity check
            node_candidates = self._extract_nodes(prefix, tokens)
            for n in node_candidates:
                all_nodes.add(n.lower())
            component_nodes[name] = node_candidates

        # Floating node detection (nodes connected to only one component)
        node_connection_count: dict[str, int] = {}
        for nodes in component_nodes.values():
            for n in nodes:
                key = n.lower()
                node_connection_count[key] = node_connection_count.get(key, 0) + 1

        for node, count in node_connection_count.items():
            if count == 1 and node != "0":
                warnings.append(Issue("warning", f"Possible floating node: '{node}' connected to only one component."))

        # Check for duplicate component names
        names = list(component_nodes.keys())
        seen: set[str] = set()
        for name in names:
            if name in seen:
                issues.append(Issue("error", f"Duplicate component name: '{name}'."))
            seen.add(name)

        valid = len(issues) == 0
        return ValidationResult(valid=valid, issues=issues, warnings=warnings)

    def _extract_nodes(self, prefix: str, tokens: list[str]) -> list[str]:
        """Extract the node names from a component line based on its type."""
        if prefix == "M":
            return tokens[1:5]   # D G S B
        elif prefix in ("R", "C", "L", "V", "I", "E", "G", "H", "F"):
            return tokens[1:3]   # N+ N-
        elif prefix == "D":
            return tokens[1:3]   # A K
        elif prefix == "Q":
            return tokens[1:4]   # C B E
        else:
            return tokens[1:-1]  # X: all middle tokens are nodes

    def _validate_directive(self, line: str, lineno: int, issues: list, warnings: list) -> None:
        """Light validation of dot directives."""
        lower = line.lower()
        if lower.startswith(".model") and len(line.split()) < 3:
            issues.append(Issue("error", f"Malformed .model directive: '{line}'", line_number=lineno))
        elif lower.startswith(".include") and len(line.split()) < 2:
            issues.append(Issue("error", f"Malformed .include directive: '{line}'", line_number=lineno))
        elif lower.startswith(".param") and "=" not in lower:
            warnings.append(Issue("warning", f".param directive missing '=': '{line}'", line_number=lineno))
