"""tests/test_playground_api.py — Tests for the playground endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient


SAMPLE_NODES = [
    {"id": "vdd1", "type": "default", "position": {"x": 100, "y": 0}, "data": {"type": "vdd", "label": "VDD", "props": {"VDD": 1.8}}},
    {"id": "m1", "type": "default", "position": {"x": 200, "y": 100}, "data": {"type": "nmos", "label": "M1", "props": {"W": 10, "L": 0.5}}},
    {"id": "gnd1", "type": "default", "position": {"x": 200, "y": 300}, "data": {"type": "ground", "label": "GND", "props": {}}},
    {"id": "out1", "type": "default", "position": {"x": 400, "y": 100}, "data": {"type": "output_node", "label": "OUT", "props": {}}},
]

SAMPLE_EDGES = [
    {"id": "e1", "source": "vdd1", "target": "m1"},
    {"id": "e2", "source": "m1", "target": "gnd1"},
    {"id": "e3", "source": "m1", "target": "out1"},
]


@pytest.mark.asyncio
async def test_playground_validate(client: AsyncClient):
    resp = await client.post("/api/v1/playground/validate", json={
        "nodes": SAMPLE_NODES,
        "edges": SAMPLE_EDGES,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "valid" in data
    assert "issues" in data
    assert "warnings" in data


@pytest.mark.asyncio
async def test_playground_netlist(client: AsyncClient):
    resp = await client.post("/api/v1/playground/netlist", json={
        "nodes": SAMPLE_NODES,
        "edges": SAMPLE_EDGES,
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "netlist" in data
    assert "format" in data
    assert len(data["netlist"]) > 0


@pytest.mark.asyncio
async def test_apply_command_add_node(client: AsyncClient):
    resp = await client.post("/api/v1/playground/apply-command", json={
        "session_id": "test-session",
        "patches": [
            {
                "op": "add_node",
                "node": {
                    "id": "r_new",
                    "type": "default",
                    "position": {"x": 300, "y": 200},
                    "data": {"type": "resistor", "label": "R1", "props": {"R": "10k"}},
                },
            }
        ],
        "canvas_state": {
            "nodes": SAMPLE_NODES,
            "edges": SAMPLE_EDGES,
        },
    })
    assert resp.status_code == 200
    data = resp.json()
    assert data["success"] is True
    node_ids = [n["id"] for n in data["updated_canvas"]["nodes"]]
    assert "r_new" in node_ids
