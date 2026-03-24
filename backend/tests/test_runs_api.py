"""tests/test_runs_api.py — Integration tests for the /runs endpoints."""
from __future__ import annotations

import pytest
from httpx import AsyncClient
from unittest.mock import AsyncMock, patch


@pytest.mark.asyncio
async def test_health(client: AsyncClient):
    resp = await client.get("/api/v1/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


@pytest.mark.asyncio
@patch("app.tasks.orchestration.run_design_pipeline.apply_async")
async def test_create_run(mock_apply, client: AsyncClient):
    mock_apply.return_value = None

    payload = {
        "natural_language_prompt": "Design a two-stage CMOS op-amp with 60dB gain",
        "category": "op-amp",
        "supply_voltage": 1.8,
        "technology": "TSMC 180nm",
        "temperature": 27,
        "constraints": [
            {"metric": "DC Gain", "target": 60, "unit": "dB", "priority": "hard"}
        ],
    }
    resp = await client.post("/api/v1/runs", json=payload)
    assert resp.status_code == 201
    data = resp.json()
    assert "id" in data
    assert data["status"] == "queued"
    return data["id"]


@pytest.mark.asyncio
@patch("app.tasks.orchestration.run_design_pipeline.apply_async")
async def test_get_run_not_found(mock_apply, client: AsyncClient):
    resp = await client.get("/api/v1/runs/nonexistent-id")
    assert resp.status_code == 404
    assert resp.json()["error"]["code"] == "run_not_found"


@pytest.mark.asyncio
@patch("app.tasks.orchestration.run_design_pipeline.apply_async")
async def test_list_runs(mock_apply, client: AsyncClient):
    mock_apply.return_value = None
    resp = await client.get("/api/v1/runs")
    assert resp.status_code == 200
    data = resp.json()
    assert "runs" in data
    assert "total" in data


@pytest.mark.asyncio
@patch("app.tasks.orchestration.run_design_pipeline.apply_async")
async def test_run_status(mock_apply, client: AsyncClient):
    mock_apply.return_value = None
    # Create a run first
    payload = {
        "natural_language_prompt": "Test prompt",
        "category": "op-amp",
        "supply_voltage": 1.8,
        "technology": "TSMC 180nm",
        "temperature": 27,
        "constraints": [],
    }
    create_resp = await client.post("/api/v1/runs", json=payload)
    run_id = create_resp.json()["id"]

    status_resp = await client.get(f"/api/v1/runs/{run_id}/status")
    assert status_resp.status_code == 200
    data = status_resp.json()
    assert data["id"] == run_id
    assert "status" in data
    assert "progress_percent" in data
