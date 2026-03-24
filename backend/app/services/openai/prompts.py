"""
app/services/openai/prompts.py — All prompt templates in one place.
Each function returns a messages list ready for the OpenAI API.
"""
from __future__ import annotations

from typing import Any


SYSTEM_CIRCUIT_EXPERT = """\
You are an expert analog/digital circuit design assistant with deep knowledge of
passive components, CMOS technology, SPICE simulation, and EDA tools.

CRITICAL RULES:
1. ALWAYS match the complexity of the user's request. If they ask for a simple
   voltage divider with resistors, do NOT add transistors, bias networks or
   compensation networks.  Keep it simple.
2. Only include components the user explicitly asks for or that are strictly
   required by the requested circuit topology.
3. Produce technically accurate, industry-standard responses.
4. When asked for JSON, respond ONLY with valid JSON — no markdown, no comments,
   no extra text.
"""


def parse_requirements_messages(
    prompt: str,
    category: str,
    supply_voltage: float,
    technology: str,
    temperature: float,
    constraints: list[dict[str, Any]],
) -> list[dict[str, str]]:
    user_content = f"""
Parse this circuit design requirement and return a structured JSON object.

Circuit category: {category}
Technology: {technology}
Supply voltage: {supply_voltage}V
Temperature: {temperature}°C

Raw requirement:
{prompt}

Existing constraints provided by user (may be empty):
{constraints}

IMPORTANT:
- Extract ONLY the constraints the user actually mentions or that the provided
  constraints list already contains.  Do not invent extra metrics.
- If the user asks for a simple passive circuit (voltage divider, RC filter…),
  do NOT add transistor-level constraints (DC Gain, GBW, Phase Margin) unless
  they explicitly asked for them.
- Keep the parsed_prompt faithful to the user's original words.

Return JSON with this exact structure:
{{
  "parsed_prompt": "<cleaned one-sentence summary that stays faithful to the user's request>",
  "topology_hints": ["<hint1>", "<hint2>"],
  "extracted_constraints": [
    {{"metric": "<name>", "target": <number>, "unit": "<unit>", "priority": "hard|soft"}}
  ],
  "notes": "<any important observations>"
}}
"""
    return [
        {"role": "system", "content": SYSTEM_CIRCUIT_EXPERT},
        {"role": "user", "content": user_content},
    ]


def propose_topology_messages(
    parsed_requirement: dict[str, Any],
    constraints: list[dict[str, Any]],
) -> list[dict[str, str]]:
    user_content = f"""
Propose the best circuit topology for this requirement.

Requirement summary: {parsed_requirement.get('parsed_prompt', '')}
Topology hints: {parsed_requirement.get('topology_hints', [])}
Target constraints: {constraints}

IMPORTANT:
- Match the complexity to the request. A voltage divider needs only resistors,
  an RC filter needs a resistor and capacitor, etc.
- Only include transistors if the design genuinely requires them.
- If the circuit is purely passive, omit transistor_sizing_initial and set
  bias_current_ua and power_estimate_uw to null.

Evaluate 2-3 candidate topologies and select the best one.

Return JSON:
{{
  "selected_topology": {{
    "name": "<topology name>",
    "description": "<detailed description of the circuit>",
    "rationale": "<why this topology was chosen>",
    "confidence_score": 0.91
  }},
  "rejected_topologies": [
    {{"name": "<name>", "reason": "<why rejected>", "score": 71}}
  ],
  "components": [
    {{"name": "R1", "type": "resistor", "value": "10k", "role": "Upper divider arm"}}
  ],
  "transistor_sizing_initial": [],
  "operating_assumptions": ["VDD = 1.8V", "Temperature = 27°C"],
  "bias_current_ua": null,
  "power_estimate_uw": null
}}
"""
    return [
        {"role": "system", "content": SYSTEM_CIRCUIT_EXPERT},
        {"role": "user", "content": user_content},
    ]


def generate_netlist_messages(
    topology: dict[str, Any],
    constraints: list[dict[str, Any]],
    technology: str,
    supply_voltage: float,
) -> list[dict[str, str]]:
    user_content = f"""
Generate a complete SPICE netlist for this topology.

Topology: {topology.get('name', '')}
Description: {topology.get('description', '')}
Technology: {technology}
Supply voltage: {supply_voltage}V
Constraints: {constraints}
Components: {topology.get('components', topology.get('transistor_sizing_initial', []))}

Requirements:
- Valid SPICE syntax
- Include appropriate analyses (.op, .ac, .tran — pick only what makes sense)
- Include .measure statements for each constraint metric
- Add comments explaining each section
- ONLY include components that the topology description requires.
  Do NOT add bias networks, compensation capacitors, or extra transistors
  unless the topology explicitly needs them.
- If this is a simple passive circuit, use ideal components (resistors,
  capacitors, ideal voltage/current sources).

Return JSON:
{{
  "netlist": "<full SPICE netlist text>",
  "format": "spice",
  "component_count": <integer>,
  "analysis_types": ["op"]
}}
"""
    return [
        {"role": "system", "content": SYSTEM_CIRCUIT_EXPERT},
        {"role": "user", "content": user_content},
    ]


def fix_netlist_messages(
    netlist: str,
    errors: list[dict[str, Any]],
) -> list[dict[str, str]]:
    error_text = "\n".join(f"- [{e.get('severity', 'error')}] {e.get('message', '')}" for e in errors)
    user_content = f"""
Fix the following SPICE netlist errors:

Errors:
{error_text}

Original netlist:
{netlist}

Return JSON:
{{
  "netlist": "<corrected full SPICE netlist>",
  "changes_made": ["<description of each fix>"]
}}
"""
    return [
        {"role": "system", "content": SYSTEM_CIRCUIT_EXPERT},
        {"role": "user", "content": user_content},
    ]


def suggest_optimization_messages(
    current_metrics: list[dict[str, Any]],
    target_constraints: list[dict[str, Any]],
    iteration_number: int,
    previous_changes: list[dict[str, Any]],
    netlist: str,
) -> list[dict[str, str]]:
    gaps = []
    for c in target_constraints:
        for m in current_metrics:
            if c.get("metric", "").lower() in m.get("label", "").lower():
                if m.get("pass_fail") in ("fail", "warning"):
                    gaps.append(f"{c['metric']}: current={m['value']}{m['unit']}, target={c['target']}{c['unit']}")

    user_content = f"""
Suggest specific parameter changes to improve this circuit.

Iteration: {iteration_number}
Failing targets:
{chr(10).join(gaps) if gaps else "None — re-checking convergence"}

Previous changes: {previous_changes}

Current netlist:
{netlist}

Return JSON with specific, actionable changes:
{{
  "parameter_changes": [
    {{"parameter": "<component/param>", "current": "<value>", "new": "<value>", "rationale": "..."}}
  ],
  "expected_improvements": [
    {{"metric": "<name>", "expected_delta": "+...", "confidence": "high"}}
  ],
  "revised_netlist": "<full updated SPICE netlist>",
  "reasoning": "<brief engineering explanation>"
}}
"""
    return [
        {"role": "system", "content": SYSTEM_CIRCUIT_EXPERT},
        {"role": "user", "content": user_content},
    ]


def interpret_chat_command_messages(
    user_message: str,
    canvas_state: dict[str, Any] | None = None,
) -> list[dict[str, str]]:
    canvas_desc = ""
    if canvas_state:
        n = len(canvas_state.get("nodes", []))
        e = len(canvas_state.get("edges", []))
        node_list = ", ".join(
            f"{nd.get('data',{}).get('label','?')} ({nd.get('data',{}).get('type','?')})"
            for nd in canvas_state.get("nodes", [])[:20]
        )
        canvas_desc = f"Current canvas: {n} nodes, {e} edges.\nExisting nodes: {node_list}"

    user_content = f"""
Interpret this circuit design command and return a structured action plan.

{canvas_desc}
User command: "{user_message}"

AVAILABLE COMPONENT TYPES (use these exact strings for "data.type"):
- nmos, pmos, npn, pnp       (transistors)
- resistor, capacitor, inductor, diode  (passive)
- vsource, isource            (sources)
- opamp                       (op-amp)
- ground                      (GND node — ALWAYS include for complete circuits)
- vdd                         (power supply rail)
- input_node, output_node     (I/O terminals)
- probe                       (test point)

CRITICAL RULES:
1. Every real circuit MUST have a ground node. Always add one if the circuit needs it.
2. Use "add_edge" to create wire connections between components.
3. Edges need "source" (node id), "sourceHandle" (port id), "target" (node id), "targetHandle" (port id).
4. Port IDs vary by component type:
   - resistor: "p" (left), "n" (right)
   - capacitor: "p" (left), "n" (right)
   - vsource/isource: "p" (top/+), "n" (bottom/-)
   - nmos: "gate", "drain", "source"
   - pmos: "gate", "drain", "source"
   - ground: "gnd" (top connection)
   - vdd: "vdd" (bottom connection)
   - opamp: "inp", "inn", "out", "vdd", "vss"
5. Position nodes with sensible layout (spaced 150-200px apart).

Return JSON:
{{
  "verb": "add|connect|remove|modify|optimize|explain|simulate|query",
  "target": "<component type or node id>",
  "parameter": "<property to change>",
  "value": "<new value>",
  "canvas_patches": [
    {{"op": "add_node", "node": {{"id": "V1", "type": "customCircuitNode", "data": {{"type": "vsource", "label": "V1", "props": {{"V": "5"}}}}, "position": {{"x": 100, "y": 200}}}}}},
    {{"op": "add_node", "node": {{"id": "R1", "type": "customCircuitNode", "data": {{"type": "resistor", "label": "R1", "props": {{"resistance": "10k"}}}}, "position": {{"x": 300, "y": 150}}}}}},
    {{"op": "add_node", "node": {{"id": "GND1", "type": "customCircuitNode", "data": {{"type": "ground", "label": "GND", "props": {{}}}}, "position": {{"x": 100, "y": 400}}}}}},
    {{"op": "add_edge", "edge": {{"id": "e1", "source": "V1", "sourceHandle": "p", "target": "R1", "targetHandle": "p", "type": "customWireEdge", "data": {{"netName": "VIN"}}}}}}
  ],
  "agent_message": "<friendly explanation of what was done>",
  "raw": "{user_message}"
}}

Important: The "op" field in canvas_patches MUST be exactly one of: "add_node", "update_node", "remove_node", "add_edge", "remove_edge", "warning", "suggestion". DO NOT USE "connect" or any other string for "op".
"""
    return [
        {"role": "system", "content": SYSTEM_CIRCUIT_EXPERT},
        {"role": "user", "content": user_content},
    ]


def recommend_graphs_messages(
    topology_type: str,
    component_types: list[str],
    node_names: list[str],
    branch_names: list[str],
    analysis_types: list[str],
    current_waveforms: list[str],
    current_metrics: list[str],
    category: str,
) -> list[dict[str, str]]:
    user_content = f"""
Review the following simulation graph recommendations for a circuit and suggest improvements.

Circuit Info:
- Topology type: {topology_type}
- Category: {category}
- Component types: {component_types}
- Available nodes: {node_names}
- Available branches: {branch_names}
- Analysis types: {analysis_types}

Current recommended waveforms: {current_waveforms}
Current recommended metrics: {current_metrics}

Your task:
1. Check if any waveform is irrelevant for this circuit type and should be removed
2. Check if any important metric is missing
3. Add at most 1-2 additional metrics if critical ones are missing
4. Do NOT add metrics that cannot realistically be computed from the available analysis types

Return JSON:
{{{{
  "remove_waveforms": ["<title to remove>"],
  "additional_metrics": [
    {{"label": "<name>", "key": "<measure_key>", "unit": "<unit>", "format": "<dB|Hz|V|etc>", "priority": 3}}
  ],
  "reasoning": "<brief explanation of changes>"
}}}}

If no changes needed, return empty arrays with reasoning "No changes needed."
"""
    return [
        {"role": "system", "content": SYSTEM_CIRCUIT_EXPERT},
        {"role": "user", "content": user_content},
    ]
