// ──────────────────────────────────────────────────────────────────────────────
// CircuitAI — Core TypeScript Interfaces
// ──────────────────────────────────────────────────────────────────────────────

export type CircuitCategory =
  | "blank"
  | "op-amp"
  | "current-mirror"
  | "differential-pair"
  | "lna"
  | "bandgap"
  | "oscillator"
  | "filter"
  | "comparator"
  | "voltage-regulator"
  | "charge-pump";

export type AgentStepStatus = "pending" | "running" | "complete" | "failed";

export type RunStatus = "idle" | "running" | "complete" | "failed";

export type CandidateStatus = "selected" | "rejected" | "pending";

// ──────────────────────────────────────────────────────────────────────────────
// Design Input
// ──────────────────────────────────────────────────────────────────────────────

export interface DesignConstraint {
  id: string;
  metric: string;
  target: number;
  unit: string;
  tolerance?: number; // ± percentage
  priority: "hard" | "soft";
}

export interface DesignRequirement {
  id: string;
  naturalLanguagePrompt: string;
  category: CircuitCategory;
  constraints: DesignConstraint[];
  supplyVoltage: number; // Volts
  technology: string; // e.g. "TSMC 180nm", "TSMC 65nm"
  temperature: number; // Celsius
  createdAt: string; // ISO
}

// ──────────────────────────────────────────────────────────────────────────────
// Agent Workflow
// ──────────────────────────────────────────────────────────────────────────────

export interface AgentStepLog {
  timestamp: string;
  message: string;
  type: "info" | "warning" | "reasoning" | "result";
}

export interface AgentStep {
  id: string;
  label: string;
  description: string;
  status: AgentStepStatus;
  startedAt?: string;
  completedAt?: string;
  durationMs?: number;
  logs: AgentStepLog[];
  reasoning?: string; // AI's brief shown to user
}

// ──────────────────────────────────────────────────────────────────────────────
// Design Output
// ──────────────────────────────────────────────────────────────────────────────

export interface TransistorSizing {
  name: string; // e.g. "M1", "M2"
  type: "NMOS" | "PMOS";
  W: number; // width in µm
  L: number; // length in µm
  fingers?: number;
  role: string; // e.g. "input differential pair"
}

export interface DesignSummary {
  topologyName: string;
  topologyDescription: string;
  rationale: string;
  transistorSizing: TransistorSizing[];
  operatingAssumptions: string[];
  confidenceScore: number; // 0–1
  biasCurrentUA: number;
  powerEstimateUW: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Netlist
// ──────────────────────────────────────────────────────────────────────────────

export interface NetlistOutput {
  raw: string; // full SPICE text
  format: "spice" | "spectre" | "ngspice";
  generatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Simulation
// ──────────────────────────────────────────────────────────────────────────────

export interface SimulationMetric {
  id: string;
  label: string;
  value: number;
  unit: string;
  target?: number;
  passFail?: "pass" | "fail" | "warning";
  formatFn?: "dB" | "Hz" | "deg" | "mW" | "uW" | "V" | "mV" | "nV/√Hz";
}

export interface ChartDataPoint {
  x: number;
  y: number;
  label?: string;
}

export interface MonteCarloDataPoint {
  value: number;
  count: number;
}

// ──────────────────────────────────────────────────────────────────────────────
// Dynamic Waveforms & Signals
// ──────────────────────────────────────────────────────────────────────────────

export type ChartType = "time_domain" | "bode_magnitude" | "bode_phase" | "dc_sweep" | "bar" | "histogram";

export interface WaveformData {
  id: string;
  title: string;
  chartType: ChartType;
  xLabel: string;
  xUnit: string;
  yLabel: string;
  yUnit: string;
  signals: string[];
  data: ChartDataPoint[];
  isRecommended: boolean;
  priority: number;
}

export interface SignalInfo {
  name: string;
  type: "voltage" | "current";
  unit: string;
  nodeOrBranch: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Simulation Results
// ──────────────────────────────────────────────────────────────────────────────

export interface SimulationResult {
  id: string;
  runId: string;
  metrics: SimulationMetric[];
  waveforms: WaveformData[];
  availableSignals: SignalInfo[];
  topologyType?: string;
  // Legacy fields
  acResponse: ChartDataPoint[];
  phaseResponse: ChartDataPoint[];
  transientResponse: ChartDataPoint[];
  monteCarloGain?: MonteCarloDataPoint[];
  monteCarloPhaseMargin?: MonteCarloDataPoint[];
  simulatedAt: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Optimization Iterations
// ──────────────────────────────────────────────────────────────────────────────

export interface ParameterChange {
  parameter: string;
  from: string;
  to: string;
}

export interface IterationResult {
  id: string;
  iteration: number;
  parameterChanges: ParameterChange[];
  metricDeltas: { metric: string; delta: number; unit: string }[];
  targetsMetCount: number;
  totalTargets: number;
  allTargetsMet: boolean;
  notes: string;
  simulationResult: SimulationResult;
}

// ──────────────────────────────────────────────────────────────────────────────
// Candidate Circuits
// ──────────────────────────────────────────────────────────────────────────────

export interface CircuitCandidate {
  id: string;
  rank: number;
  topologyName: string;
  status: CandidateStatus;
  gainDB: number;
  bandwidthMHz: number;
  phaseMarginDeg: number;
  powerMW: number;
  noiseNVSqrtHz: number;
  score: number; // 0–100
  rejectionReason?: string;
  selectionReason?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Top-Level Agent Run
// ──────────────────────────────────────────────────────────────────────────────

export interface AgentRun {
  id: string;
  status: RunStatus;
  requirement: DesignRequirement;
  steps: AgentStep[];
  designSummary?: DesignSummary;
  netlist?: NetlistOutput;
  simulationResult?: SimulationResult;
  iterations: IterationResult[];
  candidates: CircuitCandidate[];
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
}

export interface AgentRunSummary {
  id: string;
  status: RunStatus;
  category: CircuitCategory;
  prompt: string;
  topologyName?: string;
  gainDB?: number;
  bandwidthMHz?: number;
  startedAt: string;
  completedAt?: string;
}
