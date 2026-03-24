/**
 * lib/api.ts — Typed API client for the CircuitAI FastAPI backend.
 * NEXT_PUBLIC_API_URL set in .env.local → http://localhost:8000/api/v1
 */
import type {
  AgentRun,
  AgentRunSummary,
  SimulationResult,
  IterationResult,
} from "@/types/circuit";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json", ...init?.headers },
    ...init,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err?.error?.message ?? err?.message ?? `API error ${res.status}`);
  }
  return res.json() as Promise<T>;
}

// ── Types ─────────────────────────────────────────────────────

export interface CreateRunPayload {
  natural_language_prompt: string;
  category: string;
  supply_voltage?: number;
  technology?: string;
  temperature?: number;
  constraints?: { metric: string; target: number; unit: string; priority: string }[];
}

export interface RunStatusResponse {
  id: string;
  status: string;
  current_step: string | null;
  progress_percent: number;
  error_message: string | null;
}

export interface RunListResponse {
  runs: ApiRunSummary[];
  total: number;
}

export interface ApiRunSummary {
  id: string;
  status: string;
  category: string;
  prompt: string;
  topology_name: string | null;
  gain_db: number | null;
  bandwidth_mhz: number | null;
  started_at: string | null;
  completed_at: string | null;
}

// ── Client ────────────────────────────────────────────────────

export const api = {
  createRun: (payload: CreateRunPayload) =>
    apiFetch<{ id: string; status: string; created_at: string }>("/runs", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  listRuns: (page = 1, pageSize = 20) =>
    apiFetch<RunListResponse>(`/runs?page=${page}&page_size=${pageSize}`),

  getRun: (id: string) => apiFetch<AgentRun>(`/runs/${id}`),

  getRunStatus: (id: string) =>
    apiFetch<RunStatusResponse>(`/runs/${id}/status`),

  getRunNetlist: (id: string) =>
    apiFetch<{ raw: string; format: string; generated_at: string }>(`/runs/${id}/netlist`),

  getRunResults: (id: string) =>
    apiFetch<SimulationResult>(`/runs/${id}/results`),

  getRunIterations: (id: string) =>
    apiFetch<IterationResult[]>(`/runs/${id}/iterations`),

  retryRun: (id: string) =>
    apiFetch<{ id: string; status: string }>(`/runs/${id}/retry`, { method: "POST" }),

  validateCanvas: (nodes: unknown[], edges: unknown[]) =>
    apiFetch<{ valid: boolean; issues: unknown[]; warnings: unknown[] }>("/playground/validate", {
      method: "POST",
      body: JSON.stringify({ nodes, edges }),
    }),

  canvasToNetlist: (nodes: unknown[], edges: unknown[]) =>
    apiFetch<{ netlist: string; format: string; node_map: Record<string, string> }>(
      "/playground/netlist",
      { method: "POST", body: JSON.stringify({ nodes, edges }) }
    ),

  chatCommand: (session_id: string, message: string, canvas_state?: unknown) =>
    apiFetch<{ interpreted_command: unknown; canvas_patches: unknown[]; agent_message: string }>(
      "/playground/chat-command",
      { method: "POST", body: JSON.stringify({ session_id, message, canvas_state }) }
    ),

  sendChatMessage: (runId: string, message: string) =>
    apiFetch<{ id: string; role: string; content: string; timestamp: string; action_type?: string; action_data?: any }>(
      `/runs/${runId}/chat`,
      { method: "POST", body: JSON.stringify({ message }) }
    ),

  health: () =>
    apiFetch<{ status: string; version: string }>("/health"),
};

// ── Mappers: backend snake_case → frontend camelCase ─────────

export function mapApiRunSummaryToFrontend(r: ApiRunSummary): AgentRunSummary {
  return {
    id: r.id,
    status: r.status as AgentRunSummary["status"],
    category: r.category as AgentRunSummary["category"],
    prompt: r.prompt,
    topologyName: r.topology_name ?? undefined,
    gainDB: r.gain_db ?? undefined,
    bandwidthMHz: r.bandwidth_mhz ?? undefined,
    startedAt: r.started_at ?? "",
    completedAt: r.completed_at ?? undefined,
  };
}


export function mapApiRunToFrontend(raw: any): AgentRun {
  const req = raw.requirement ?? {};
  const ds = raw.design_summary;
  return {
    id: raw.id,
    status: raw.status,
    requirement: {
      id: req.id ?? raw.id,
      naturalLanguagePrompt: req.natural_language_prompt ?? req.naturalLanguagePrompt ?? "",
      category: req.category,
      constraints: (req.constraints ?? []).map((c: any) => ({
        id: c.id,
        metric: c.metric,
        target: c.target,
        unit: c.unit,
        tolerance: c.tolerance,
        priority: c.priority,
      })),
      supplyVoltage: req.supply_voltage ?? req.supplyVoltage ?? 1.8,
      technology: req.technology ?? "TSMC 180nm",
      temperature: req.temperature ?? 27,
      createdAt: req.created_at ?? req.createdAt ?? "",
    },
    steps: (raw.steps ?? []).map((s: any) => ({
      id: `step-${s.id}`,
      label: s.label,
      description: s.description ?? "",
      status: s.status,
      startedAt: s.started_at ?? s.startedAt,
      completedAt: s.completed_at ?? s.completedAt,
      durationMs: s.duration_ms ?? s.durationMs,
      logs: (s.logs ?? []).map((l: any) => ({
        timestamp: l.timestamp,
        message: l.message,
        type: l.type,
      })),
      reasoning: s.reasoning,
    })),
    designSummary: ds
      ? {
          topologyName: ds.topology_name ?? ds.topologyName ?? "",
          topologyDescription: ds.topology_description ?? ds.topologyDescription ?? "",
          rationale: ds.rationale ?? "",
          transistorSizing: (ds.transistor_sizing ?? ds.transistorSizing ?? []).map((t: any) => ({
            name: t.name,
            type: t.type,
            W: t.W,
            L: t.L,
            fingers: t.fingers,
            role: t.role,
          })),
          operatingAssumptions: ds.operating_assumptions ?? ds.operatingAssumptions ?? [],
          confidenceScore: ds.confidence_score ?? ds.confidenceScore ?? 0,
          biasCurrentUA: ds.bias_current_ua ?? ds.biasCurrentUA ?? 0,
          powerEstimateUW: ds.power_estimate_uw ?? ds.powerEstimateUW ?? 0,
        }
      : undefined,
    netlist: raw.netlist
      ? { raw: raw.netlist.raw, format: raw.netlist.format, generatedAt: raw.netlist.generated_at ?? raw.netlist.generatedAt }
      : undefined,
    simulationResult: raw.simulation_result ? _mapSim(raw.simulation_result) : undefined,
    iterations: (raw.iterations ?? []).map(_mapIter),
    candidates: (raw.candidates ?? []).map((c: any) => ({
      id: c.id,
      rank: c.rank,
      topologyName: c.topology_name ?? c.topologyName ?? "",
      status: c.status,
      gainDB: c.gain_db ?? c.gainDB,
      bandwidthMHz: c.bandwidth_mhz ?? c.bandwidthMHz,
      phaseMarginDeg: c.phase_margin_deg ?? c.phaseMarginDeg,
      powerMW: c.power_mw ?? c.powerMW,
      noiseNVSqrtHz: c.noise_nv_sqrt_hz ?? c.noiseNVSqrtHz,
      score: c.score,
      rejectionReason: c.rejection_reason ?? c.rejectionReason,
      selectionReason: c.selection_reason ?? c.selectionReason,
    })),
    startedAt: raw.started_at ?? raw.startedAt ?? "",
    completedAt: raw.completed_at ?? raw.completedAt,
    totalDurationMs: raw.total_duration_ms ?? raw.totalDurationMs,
  };
}

function _mapSim(sr: any): SimulationResult {
  return {
    id: sr.id,
    runId: sr.run_id ?? sr.runId,
    metrics: (sr.metrics ?? []).map((m: any) => ({
      id: m.id,
      label: m.label,
      value: m.value,
      unit: m.unit,
      target: m.target,
      passFail: m.pass_fail ?? m.passFail,
    })),
    waveforms: (sr.waveforms ?? []).map((w: any) => ({
      id: w.id,
      title: w.title,
      chartType: w.chart_type ?? w.chartType ?? "time_domain",
      xLabel: w.x_label ?? w.xLabel ?? "",
      xUnit: w.x_unit ?? w.xUnit ?? "",
      yLabel: w.y_label ?? w.yLabel ?? "",
      yUnit: w.y_unit ?? w.yUnit ?? "",
      signals: w.signals ?? [],
      data: w.data ?? [],
      isRecommended: w.is_recommended ?? w.isRecommended ?? true,
      priority: w.priority ?? 5,
    })),
    availableSignals: (sr.available_signals ?? sr.availableSignals ?? []).map((s: any) => ({
      name: s.name,
      type: s.type,
      unit: s.unit,
      nodeOrBranch: s.node_or_branch ?? s.nodeOrBranch ?? "",
    })),
    topologyType: sr.topology_type ?? sr.topologyType,
    acResponse: sr.ac_response ?? sr.acResponse ?? [],
    phaseResponse: sr.phase_response ?? sr.phaseResponse ?? [],
    transientResponse: sr.transient_response ?? sr.transientResponse ?? [],
    monteCarloGain: sr.monte_carlo_gain ?? sr.monteCarloGain,
    monteCarloPhaseMargin: sr.monte_carlo_phase_margin ?? sr.monteCarloPhaseMargin,
    simulatedAt: sr.simulated_at ?? sr.simulatedAt,
  };
}

function _mapIter(it: any): IterationResult {
  return {
    id: it.id,
    iteration: it.iteration,
    parameterChanges: (it.parameter_changes ?? it.parameterChanges ?? []).map((c: any) => ({
      parameter: c.parameter,
      from: c.from ?? c.from_,
      to: c.to,
    })),
    metricDeltas: (it.metric_deltas ?? it.metricDeltas ?? []).map((d: any) => ({
      metric: d.metric,
      delta: d.delta,
      unit: d.unit,
    })),
    targetsMetCount: it.targets_met_count ?? it.targetsMetCount ?? 0,
    totalTargets: it.total_targets ?? it.totalTargets ?? 0,
    allTargetsMet: it.all_targets_met ?? it.allTargetsMet ?? false,
    notes: it.notes ?? "",
    simulationResult: it.simulation_result ? _mapSim(it.simulation_result) : ({} as SimulationResult),
  };
}
// ...

// ── Legacy compatibility exports (used by existing files) ─────

export async function submitDesignRun(payload: {
  prompt: string;
  category: string;
  constraints: Record<string, number | string>;
  supplyVoltage: number;
  technology: string;
}): Promise<{ runId: string }> {
  const constraints = Object.entries(payload.constraints).map(([metric, target]) => ({
    metric,
    target: Number(target),
    unit: "",
    priority: "hard",
  }));
  const resp = await api.createRun({
    natural_language_prompt: payload.prompt,
    category: payload.category,
    supply_voltage: payload.supplyVoltage,
    technology: payload.technology,
    constraints,
  });
  return { runId: resp.id };
}

export async function getAgentRun(id: string): Promise<AgentRun> {
  const raw = await api.getRun(id);
  return mapApiRunToFrontend(raw);
}

export async function getAgentRuns(): Promise<AgentRunSummary[]> {
  const { runs } = await api.listRuns();
  return runs.map(mapApiRunSummaryToFrontend);
}

export async function getComparisons() {
  const raw = await api.getRun("latest");
  return mapApiRunToFrontend(raw).candidates ?? [];
}

export async function getHistory(): Promise<AgentRunSummary[]> {
  return getAgentRuns();
}
