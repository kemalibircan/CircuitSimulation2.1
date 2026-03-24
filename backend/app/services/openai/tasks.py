"""
app/services/openai/tasks.py — High-level task dispatch for all LLM calls.
The backend orchestrator calls these; they abstract all prompt/response plumbing.
"""
from __future__ import annotations

from typing import Any

from app.core.errors import LLMError
from app.core.logging import get_logger
from app.services.openai.client import chat_completion_json
from app.services.openai.prompts import (
    fix_netlist_messages,
    generate_netlist_messages,
    interpret_chat_command_messages,
    parse_requirements_messages,
    propose_topology_messages,
    suggest_optimization_messages,
    recommend_graphs_messages,
)

logger = get_logger(__name__)


async def parse_requirements(
    prompt: str,
    category: str,
    supply_voltage: float,
    technology: str,
    temperature: float,
    constraints: list[dict[str, Any]],
) -> dict[str, Any]:
    messages = parse_requirements_messages(
        prompt, category, supply_voltage, technology, temperature, constraints
    )
    result = await chat_completion_json(messages)
    logger.info("requirements_parsed", topology_hints=result.get("topology_hints"))
    return result


async def propose_topology(
    parsed_requirement: dict[str, Any],
    constraints: list[dict[str, Any]],
) -> dict[str, Any]:
    messages = propose_topology_messages(parsed_requirement, constraints)
    result = await chat_completion_json(messages, max_tokens=6000)
    logger.info("topology_proposed", name=result.get("selected_topology", {}).get("name"))
    return result


async def generate_netlist(
    topology: dict[str, Any],
    constraints: list[dict[str, Any]],
    technology: str,
    supply_voltage: float,
) -> dict[str, Any]:
    messages = generate_netlist_messages(topology, constraints, technology, supply_voltage)
    result = await chat_completion_json(messages, max_tokens=8000)
    if not result.get("netlist"):
        raise LLMError("OpenAI did not return a netlist in the response.")
    logger.info("netlist_generated", format=result.get("format"))
    return result


async def fix_netlist(
    netlist: str,
    errors: list[dict[str, Any]],
) -> dict[str, Any]:
    messages = fix_netlist_messages(netlist, errors)
    result = await chat_completion_json(messages, max_tokens=8000)
    if not result.get("netlist"):
        raise LLMError("OpenAI did not return a fixed netlist.")
    logger.info("netlist_fixed", n_changes=len(result.get("changes_made", [])))
    return result


async def suggest_optimization(
    current_metrics: list[dict[str, Any]],
    target_constraints: list[dict[str, Any]],
    iteration_number: int,
    previous_changes: list[dict[str, Any]],
    netlist: str,
) -> dict[str, Any]:
    messages = suggest_optimization_messages(
        current_metrics, target_constraints, iteration_number, previous_changes, netlist
    )
    result = await chat_completion_json(messages, max_tokens=8000)
    logger.info("optimization_suggested", n_changes=len(result.get("parameter_changes", [])))
    return result


async def interpret_chat_command(
    user_message: str,
    canvas_state: dict[str, Any] | None = None,
) -> dict[str, Any]:
    messages = interpret_chat_command_messages(user_message, canvas_state)
    result = await chat_completion_json(messages, max_tokens=4000)
    logger.info("chat_command_interpreted", verb=result.get("verb"))
    return result


async def recommend_graphs(
    topology_type: str,
    component_types: list[str],
    node_names: list[str],
    branch_names: list[str],
    analysis_types: list[str],
    current_waveforms: list[str],
    current_metrics: list[str],
    category: str,
) -> dict[str, Any]:
    messages = recommend_graphs_messages(
        topology_type, component_types, node_names, branch_names,
        analysis_types, current_waveforms, current_metrics, category,
    )
    result = await chat_completion_json(messages, max_tokens=2000)
    logger.info("graphs_recommended", reasoning=result.get("reasoning", "")[:100])
    return result
