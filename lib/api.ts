import type { AgentRun, AgentRunSummary } from "@/types/circuit";
import { mockRun } from "@/data/mockRun";
import { mockRunsList } from "@/data/mockRunsList";

// ──────────────────────────────────────────────────────────────────────────────
// API abstraction layer
// Replace mock returns with real fetch() calls when backend is ready.
// ──────────────────────────────────────────────────────────────────────────────

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "";

// Simulate network delay for realistic loading states
function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────────────────────────────────────
// POST /api/design/run
// Submit a new design requirement and start an agent run
// ──────────────────────────────────────────────────────────────────────────────

export interface SubmitRunPayload {
  prompt: string;
  category: string;
  constraints: Record<string, number | string>;
  supplyVoltage: number;
  technology: string;
}

export async function submitDesignRun(
  payload: SubmitRunPayload
): Promise<{ runId: string }> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/design/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to submit run");
    return res.json();
  }
  // Mock: simulate submission delay
  await delay(800);
  return { runId: "run-001" };
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/design/run/:id
// ──────────────────────────────────────────────────────────────────────────────

export async function getAgentRun(id: string): Promise<AgentRun> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/design/run/${id}`);
    if (!res.ok) throw new Error(`Run ${id} not found`);
    return res.json();
  }
  await delay(300);
  return mockRun;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/design/runs
// ──────────────────────────────────────────────────────────────────────────────

export async function getAgentRuns(): Promise<AgentRunSummary[]> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/design/runs`);
    if (!res.ok) throw new Error("Failed to fetch runs");
    return res.json();
  }
  await delay(200);
  return mockRunsList;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/design/compare
// ──────────────────────────────────────────────────────────────────────────────

export async function getComparisons() {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/design/compare`);
    if (!res.ok) throw new Error("Failed to fetch comparisons");
    return res.json();
  }
  await delay(200);
  return mockRun.candidates;
}

// ──────────────────────────────────────────────────────────────────────────────
// GET /api/design/history
// ──────────────────────────────────────────────────────────────────────────────

export async function getHistory(): Promise<AgentRunSummary[]> {
  if (BASE_URL) {
    const res = await fetch(`${BASE_URL}/api/design/history`);
    if (!res.ok) throw new Error("Failed to fetch history");
    return res.json();
  }
  await delay(200);
  return mockRunsList;
}
