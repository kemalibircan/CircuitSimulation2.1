import type {
  AgentRun,
  SimulationResult,
  IterationResult,
} from "@/types/circuit";

// ──────────────────────────────────────────────────────────────────────────────
// Shared Simulation Data helpers
// ──────────────────────────────────────────────────────────────────────────────

function generateACResponse(
  peakGainDB: number,
  gbwMHz: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let exp = 1; exp <= 9; exp += 0.05) {
    const freq = Math.pow(10, exp);
    const freqMHz = freq / 1e6;
    const gain =
      peakGainDB - 20 * Math.log10(Math.sqrt(1 + (freqMHz / gbwMHz) ** 2));
    points.push({ x: freq, y: Math.max(gain, -20) });
  }
  return points;
}

function generatePhaseResponse(
  gbwMHz: number,
  secondPoleGHz: number
): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let exp = 1; exp <= 9; exp += 0.05) {
    const freq = Math.pow(10, exp);
    const freqMHz = freq / 1e6;
    const phase =
      -90 -
      (Math.atan(freqMHz / gbwMHz) * 180) / Math.PI -
      (Math.atan(freqMHz / (secondPoleGHz * 1000)) * 180) / Math.PI;
    points.push({ x: freq, y: phase });
  }
  return points;
}

function generateTransient(): { x: number; y: number }[] {
  const points: { x: number; y: number }[] = [];
  for (let t = 0; t <= 500; t += 2) {
    const vin = t < 50 ? 0 : 0.9;
    const tau = 18;
    const vout =
      t < 50 ? 0 : 0.9 * (1 - Math.exp(-(t - 50) / tau)) + 0.003 * Math.sin(t / 5) * Math.exp(-(t - 50) / 40);
    points.push({ x: t, y: vout });
  }
  return points;
}

function generateMonteCarlo(
  mean: number,
  std: number,
  bins = 25
): { value: number; count: number }[] {
  const data: { value: number; count: number }[] = [];
  for (let i = 0; i < bins; i++) {
    const value = mean - 3 * std + (i * 6 * std) / bins;
    const z = (value - mean) / std;
    const count = Math.round(200 * Math.exp(-0.5 * z * z));
    data.push({ value: parseFloat(value.toFixed(2)), count });
  }
  return data;
}

// ──────────────────────────────────────────────────────────────────────────────
// Iteration 1 simulation
// ──────────────────────────────────────────────────────────────────────────────

const sim1: SimulationResult = {
  id: "sim-iter1",
  runId: "run-001",
  metrics: [
    { id: "gain", label: "DC Gain", value: 61.2, unit: "dB", target: 60, passFail: "pass" },
    { id: "bw", label: "GBW", value: 8.4, unit: "MHz", target: 10, passFail: "fail" },
    { id: "pm", label: "Phase Margin", value: 54, unit: "°", target: 60, passFail: "fail" },
    { id: "power", label: "Power", value: 0.48, unit: "mW", target: 1.0, passFail: "pass" },
    { id: "noise", label: "Input Noise", value: 14.2, unit: "nV/√Hz", passFail: "pass" },
    { id: "swing", label: "Output Swing", value: 1.5, unit: "V", passFail: "pass" },
  ],
  acResponse: generateACResponse(61.2, 8.4),
  phaseResponse: generatePhaseResponse(8.4, 0.8),
  transientResponse: generateTransient(),
  simulatedAt: "2025-10-15T09:14:22Z",
};

// ──────────────────────────────────────────────────────────────────────────────
// Iteration 2 simulation
// ──────────────────────────────────────────────────────────────────────────────

const sim2: SimulationResult = {
  id: "sim-iter2",
  runId: "run-001",
  metrics: [
    { id: "gain", label: "DC Gain", value: 64.7, unit: "dB", target: 60, passFail: "pass" },
    { id: "bw", label: "GBW", value: 10.2, unit: "MHz", target: 10, passFail: "pass" },
    { id: "pm", label: "Phase Margin", value: 58, unit: "°", target: 60, passFail: "fail" },
    { id: "power", label: "Power", value: 0.61, unit: "mW", target: 1.0, passFail: "pass" },
    { id: "noise", label: "Input Noise", value: 12.8, unit: "nV/√Hz", passFail: "pass" },
    { id: "swing", label: "Output Swing", value: 1.6, unit: "V", passFail: "pass" },
  ],
  acResponse: generateACResponse(64.7, 10.2),
  phaseResponse: generatePhaseResponse(10.2, 1.0),
  transientResponse: generateTransient(),
  simulatedAt: "2025-10-15T09:21:44Z",
};

// ──────────────────────────────────────────────────────────────────────────────
// Iteration 3 (final) simulation
// ──────────────────────────────────────────────────────────────────────────────

const sim3: SimulationResult = {
  id: "sim-iter3",
  runId: "run-001",
  metrics: [
    { id: "gain", label: "DC Gain", value: 68.1, unit: "dB", target: 60, passFail: "pass" },
    { id: "bw", label: "GBW", value: 12.3, unit: "MHz", target: 10, passFail: "pass" },
    { id: "pm", label: "Phase Margin", value: 62, unit: "°", target: 60, passFail: "pass" },
    { id: "power", label: "Power", value: 0.74, unit: "mW", target: 1.0, passFail: "pass" },
    { id: "noise", label: "Input Noise", value: 11.4, unit: "nV/√Hz", passFail: "pass" },
    { id: "swing", label: "Output Swing", value: 1.65, unit: "V", passFail: "pass" },
  ],
  acResponse: generateACResponse(68.1, 12.3),
  phaseResponse: generatePhaseResponse(12.3, 1.2),
  transientResponse: generateTransient(),
  monteCarloGain: generateMonteCarlo(68.1, 2.4),
  monteCarloPhaseMargin: generateMonteCarlo(62, 3.8),
  simulatedAt: "2025-10-15T09:31:07Z",
};

// ──────────────────────────────────────────────────────────────────────────────
// Iterations
// ──────────────────────────────────────────────────────────────────────────────

const iterations: IterationResult[] = [
  {
    id: "iter-1",
    iteration: 1,
    parameterChanges: [
      { parameter: "M1/M2 W/L", from: "10µm/0.5µm", to: "12µm/0.5µm" },
      { parameter: "M5 bias current", from: "80µA", to: "100µA" },
      { parameter: "Cc (Miller cap)", from: "1.5pF", to: "2.0pF" },
    ],
    metricDeltas: [
      { metric: "DC Gain", delta: +2.1, unit: "dB" },
      { metric: "GBW", delta: -1.2, unit: "MHz" },
      { metric: "Phase Margin", delta: +4, unit: "°" },
      { metric: "Power", delta: +0.12, unit: "mW" },
    ],
    targetsMetCount: 2,
    totalTargets: 4,
    allTargetsMet: false,
    notes:
      "Gain target met. GBW improved slightly but below target. Increasing tail current and widening input pair next.",
    simulationResult: sim1,
  },
  {
    id: "iter-2",
    iteration: 2,
    parameterChanges: [
      { parameter: "M1/M2 W/L", from: "12µm/0.5µm", to: "16µm/0.45µm" },
      { parameter: "M7 W/L (cascode)", from: "8µm/0.5µm", to: "12µm/0.5µm" },
      { parameter: "Cc (Miller cap)", from: "2.0pF", to: "2.8pF" },
      { parameter: "Rc (zero resistor)", from: "0Ω", to: "500Ω" },
    ],
    metricDeltas: [
      { metric: "DC Gain", delta: +3.5, unit: "dB" },
      { metric: "GBW", delta: +1.8, unit: "MHz" },
      { metric: "Phase Margin", delta: +4, unit: "°" },
      { metric: "Power", delta: +0.13, unit: "mW" },
    ],
    targetsMetCount: 3,
    totalTargets: 4,
    allTargetsMet: false,
    notes:
      "GBW now exceeds target. Phase margin still 2° short — right-half-plane zero partially controlled by Rc. Minor cascode ratio adjustment needed.",
    simulationResult: sim2,
  },
  {
    id: "iter-3",
    iteration: 3,
    parameterChanges: [
      { parameter: "Rc (zero resistor)", from: "500Ω", to: "720Ω" },
      { parameter: "M3/M4 W/L (load)", from: "10µm/0.5µm", to: "12µm/0.5µm" },
      { parameter: "Bias network Vb2", from: "0.85V", to: "0.90V" },
    ],
    metricDeltas: [
      { metric: "DC Gain", delta: +3.4, unit: "dB" },
      { metric: "GBW", delta: +2.1, unit: "MHz" },
      { metric: "Phase Margin", delta: +4, unit: "°" },
      { metric: "Power", delta: +0.13, unit: "mW" },
    ],
    targetsMetCount: 4,
    totalTargets: 4,
    allTargetsMet: true,
    notes:
      "All targets met. Right-half-plane zero fully controlled. Cascode current mirror balanced. Design accepted.",
    simulationResult: sim3,
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Full Agent Run
// ──────────────────────────────────────────────────────────────────────────────

export const mockRun: AgentRun = {
  id: "run-001",
  status: "complete",
  startedAt: "2025-10-15T09:05:00Z",
  completedAt: "2025-10-15T09:31:07Z",
  totalDurationMs: 1567000,

  requirement: {
    id: "req-001",
    createdAt: "2025-10-15T09:05:00Z",
    naturalLanguagePrompt:
      "Design a two-stage CMOS operational amplifier in TSMC 180nm with at least 60 dB open-loop gain and 10 MHz unity-gain bandwidth. Phase margin should exceed 60° for stability. Keep power consumption below 1 mW with a 1.8V supply.",
    category: "op-amp",
    supplyVoltage: 1.8,
    technology: "TSMC 180nm CMOS",
    temperature: 27,
    constraints: [
      { id: "c1", metric: "DC Gain", target: 60, unit: "dB", priority: "hard" },
      { id: "c2", metric: "GBW", target: 10, unit: "MHz", priority: "hard" },
      { id: "c3", metric: "Phase Margin", target: 60, unit: "°", priority: "hard" },
      { id: "c4", metric: "Power", target: 1.0, unit: "mW", priority: "soft" },
      { id: "c5", metric: "Supply Voltage", target: 1.8, unit: "V", priority: "hard" },
      { id: "c6", metric: "Load Capacitance", target: 10, unit: "pF", priority: "hard" },
    ],
  },

  steps: [
    {
      id: "step-1",
      label: "Requirement Parsing",
      description: "Extracting structured constraints from natural language",
      status: "complete",
      startedAt: "2025-10-15T09:05:01Z",
      completedAt: "2025-10-15T09:05:04Z",
      durationMs: 3200,
      reasoning:
        "Identified 6 design constraints. Category classified as 'op-amp'. Technology inferred as TSMC 180nm. Hard constraints: gain ≥60dB, GBW ≥10MHz, PM ≥60°.",
      logs: [
        { timestamp: "09:05:01", message: "Parsing NL prompt with constraint extractor", type: "info" },
        { timestamp: "09:05:02", message: "Identified topology hint: two-stage CMOS", type: "reasoning" },
        { timestamp: "09:05:03", message: "Extracted 6 constraints (3 hard, 2 soft)", type: "result" },
      ],
    },
    {
      id: "step-2",
      label: "Topology Selection",
      description: "Evaluating candidate topologies against constraints",
      status: "complete",
      startedAt: "2025-10-15T09:05:05Z",
      completedAt: "2025-10-15T09:07:20Z",
      durationMs: 135000,
      reasoning:
        "Evaluated 3 candidates: folded-cascode (rejected: complexity vs gain target), telescopic (rejected: output swing), two-stage Miller-compensated (selected: optimal gain-bandwidth-stability tradeoff).",
      logs: [
        { timestamp: "09:05:05", message: "Initializing topology search space", type: "info" },
        { timestamp: "09:05:40", message: "Scored folded-cascode: 71/100 — swing margin tight", type: "reasoning" },
        { timestamp: "09:06:10", message: "Scored telescopic: 64/100 — insufficient output swing", type: "reasoning" },
        { timestamp: "09:06:55", message: "Scored two-stage Miller: 88/100 — best overall fit", type: "result" },
        { timestamp: "09:07:20", message: "Selected: Two-Stage Miller-Compensated CMOS Op-Amp", type: "result" },
      ],
    },
    {
      id: "step-3",
      label: "Netlist Generation",
      description: "Generating initial SPICE netlist with nominal sizing",
      status: "complete",
      startedAt: "2025-10-15T09:07:21Z",
      completedAt: "2025-10-15T09:08:10Z",
      durationMs: 49000,
      reasoning:
        "Generated 14-transistor SPICE netlist. Initial sizing uses design equations: gm = 2π·GBW·Cc, W/L derived from target gm and process parameters (µnCox = 210 µA/V²).",
      logs: [
        { timestamp: "09:07:21", message: "Loading TSMC 180nm process parameters", type: "info" },
        { timestamp: "09:07:45", message: "Calculating initial W/L ratios via gm/Id methodology", type: "reasoning" },
        { timestamp: "09:08:05", message: "Netlist generated — 14 transistors, Cc=2pF, Rc=0Ω", type: "result" },
      ],
    },
    {
      id: "step-4",
      label: "Simulation Run",
      description: "Running AC, transient, and DC operating point analysis",
      status: "complete",
      startedAt: "2025-10-15T09:08:11Z",
      completedAt: "2025-10-15T09:14:22Z",
      durationMs: 371000,
      reasoning:
        "NGSPICE simulations completed. AC sweep 10Hz–1GHz, 100 points/decade. Transient 0–500ns, step=1ns. DC bias verified all transistors in saturation.",
      logs: [
        { timestamp: "09:08:11", message: "Launching NGSPICE: .ac dec 100 10 1G", type: "info" },
        { timestamp: "09:10:32", message: "AC simulation complete", type: "result" },
        { timestamp: "09:12:50", message: "Transient simulation complete (0–500ns)", type: "result" },
        { timestamp: "09:14:22", message: "All operating points verified in saturation", type: "result" },
      ],
    },
    {
      id: "step-5",
      label: "Metric Extraction",
      description: "Extracting gain, bandwidth, phase margin, and power",
      status: "complete",
      startedAt: "2025-10-15T09:14:23Z",
      completedAt: "2025-10-15T09:14:55Z",
      durationMs: 32000,
      reasoning:
        "Gain=61.2dB ✓, GBW=8.4MHz ✗ (target 10MHz), PM=54° ✗ (target 60°), Power=0.48mW ✓. 2 of 4 hard targets met. Initiating optimization loop.",
      logs: [
        { timestamp: "09:14:23", message: "Extracting DC gain from AC curve", type: "info" },
        { timestamp: "09:14:35", message: "Phase margin at 0dB crossing: 54°", type: "warning" },
        { timestamp: "09:14:55", message: "GBW = 8.4 MHz — below 10 MHz target", type: "warning" },
      ],
    },
    {
      id: "step-6",
      label: "Monte Carlo Analysis",
      description: "Running 200-point Monte Carlo for process variation",
      status: "complete",
      startedAt: "2025-10-15T09:28:00Z",
      completedAt: "2025-10-15T09:29:30Z",
      durationMs: 90000,
      reasoning:
        "200 Monte Carlo samples. Gain σ=2.4dB (3σ band: 61–81dB, all above 60dB target). Phase margin σ=3.8° (3σ lower bound: 50.6° — marginal but acceptable for prototype).",
      logs: [
        { timestamp: "09:28:00", message: "Launching 200-point Monte Carlo simulation", type: "info" },
        { timestamp: "09:29:00", message: "Gain: mean=68.1dB, σ=2.4dB, yield=100%", type: "result" },
        { timestamp: "09:29:30", message: "Phase margin: mean=62°, σ=3.8°, yield=94.2%", type: "result" },
      ],
    },
    {
      id: "step-7",
      label: "Optimization Loop",
      description: "Iterative sizing refinement to meet all targets",
      status: "complete",
      startedAt: "2025-10-15T09:14:56Z",
      completedAt: "2025-10-15T09:28:00Z",
      durationMs: 784000,
      reasoning:
        "3 optimization iterations completed. W/L ratios tuned via gradient-guided search. Miller capacitor and zero-cancellation resistor optimized. All 4 hard targets met at iteration 3.",
      logs: [
        { timestamp: "09:14:56", message: "Starting optimization: 4 targets unmet (2/4)", type: "info" },
        { timestamp: "09:18:10", message: "Iter 1 complete — 2/4 targets met", type: "warning" },
        { timestamp: "09:22:30", message: "Iter 2 complete — 3/4 targets met", type: "warning" },
        { timestamp: "09:27:58", message: "Iter 3 complete — 4/4 targets met ✓", type: "result" },
      ],
    },
    {
      id: "step-8",
      label: "Final Recommendation",
      description: "Generating design summary and final report",
      status: "complete",
      startedAt: "2025-10-15T09:29:31Z",
      completedAt: "2025-10-15T09:31:07Z",
      durationMs: 96000,
      reasoning:
        "Design finalized. Confidence score: 91%. All hard constraints satisfied. Phase margin at 62° provides adequate stability margin. Recommended for layout.",
      logs: [
        { timestamp: "09:29:31", message: "Generating design summary report", type: "info" },
        { timestamp: "09:30:45", message: "Confidence score computed: 91%", type: "result" },
        { timestamp: "09:31:07", message: "Design ready for layout — all targets met", type: "result" },
      ],
    },
  ],

  designSummary: {
    topologyName: "Two-Stage Miller-Compensated CMOS Op-Amp",
    topologyDescription:
      "A classic two-stage CMOS amplifier with a differential input pair (M1–M2), active current-mirror load (M3–M4), cascode bias stage (M7–M8), and a common-source second stage (M6) with Miller compensation network (Cc, Rc).",
    rationale:
      "Selected over folded-cascode and telescopic architectures due to superior gain-bandwidth product and adequate output swing for a 1.8V supply. The two-stage topology achieves high DC gain (>60dB) while maintaining acceptable power consumption through Miller compensation.",
    transistorSizing: [
      { name: "M1", type: "PMOS", W: 16, L: 0.45, role: "Input pair (differential)" },
      { name: "M2", type: "PMOS", W: 16, L: 0.45, role: "Input pair (differential)" },
      { name: "M3", type: "NMOS", W: 12, L: 0.5, role: "Active load (current mirror)" },
      { name: "M4", type: "NMOS", W: 12, L: 0.5, role: "Active load (current mirror)" },
      { name: "M5", type: "PMOS", W: 20, L: 0.5, role: "Tail current source" },
      { name: "M6", type: "NMOS", W: 40, L: 0.5, role: "Second stage common-source" },
      { name: "M7", type: "PMOS", W: 12, L: 0.5, role: "Cascode bias" },
      { name: "M8", type: "PMOS", W: 12, L: 0.5, role: "Cascode bias" },
    ],
    operatingAssumptions: [
      "VDD = 1.8V, VSS = 0V",
      "Temperature = 27°C (TT corner)",
      "Load capacitance CL = 10 pF",
      "All transistors biased in strong inversion, saturation region",
      "Miller compensation: Cc = 2.8 pF, Rc = 720 Ω",
      "Tail current Ibias = 100 µA",
    ],
    confidenceScore: 0.91,
    biasCurrentUA: 100,
    powerEstimateUW: 740,
  },

  netlist: {
    format: "ngspice",
    generatedAt: "2025-10-15T09:08:05Z",
    raw: `* Two-Stage Miller-Compensated CMOS Op-Amp
* Technology: TSMC 180nm | VDD=1.8V | Ibias=100uA
* Generated by CircuitAI Agent — Run ID: run-001

.include "tsmc180nm.lib"

*** Supply and Bias ***
VDD vdd 0 DC 1.8V
VSS vss 0 DC 0V
Vbias vbias 0 DC 0.9V
Ibias vdd vbias DC 100u

*** Input Signals ***
Vicm vcm 0 DC 0.9V
Vid vinp vcm DC 0 AC 1 SIN(0 1m 1k)
Vinn vinn vcm DC 0

*** Compensation Network ***
Cc vout1 vout 2.8p
Rc vout1 rc_node 720

*** Input Differential Pair (PMOS) ***
M1 vout1 vinp vs1 vdd PMOS W=16u L=0.45u
M2 vout1 vinn vs2 vdd PMOS W=16u L=0.45u

*** Active Current Mirror Load (NMOS) ***
M3 vout1 vout1 vss vss NMOS W=12u L=0.5u
M4 vout1 vout1 vss vss NMOS W=12u L=0.5u

*** Tail Current Source ***
M5 vs1 vbias vdd vdd PMOS W=20u L=0.5u

*** Cascode Bias ***
M7 vs1 vcasc vdd vdd PMOS W=12u L=0.5u
M8 vs2 vcasc vdd vdd PMOS W=12u L=0.5u

*** Second Stage ***
M6 vout vout1 vss vss NMOS W=40u L=0.5u
M9 vout vbias2 vdd vdd PMOS W=24u L=0.5u

*** Bias Network ***
M10 vbias2 vbias2 vdd vdd PMOS W=8u L=0.5u
M11 vbias  vbias  vss vss NMOS W=8u L=0.5u

*** Load ***
CL vout 0 10p
RL vout 0 100Meg

*** Analysis ***
.op
.ac dec 100 10 1G
.tran 1n 500n
.noise V(vout) Vid 100

.measure AC gain_dc MAX V(vout) AT=10
.measure AC ugbw WHEN PM(V(vout))=0
.measure AC pm FIND VP(V(vout)) WHEN VDB(V(vout))=0

.end`,
  },

  simulationResult: sim3,
  iterations,

  candidates: [
    {
      id: "cand-1",
      rank: 1,
      topologyName: "Two-Stage Miller-Compensated",
      status: "selected",
      gainDB: 68.1,
      bandwidthMHz: 12.3,
      phaseMarginDeg: 62,
      powerMW: 0.74,
      noiseNVSqrtHz: 11.4,
      score: 88,
      selectionReason:
        "Best overall tradeoff: meets all hard constraints, lowest power among qualifying candidates.",
    },
    {
      id: "cand-2",
      rank: 2,
      topologyName: "Folded-Cascode OTA",
      status: "rejected",
      gainDB: 72.4,
      bandwidthMHz: 15.6,
      phaseMarginDeg: 68,
      powerMW: 1.42,
      noiseNVSqrtHz: 8.9,
      score: 71,
      rejectionReason:
        "Power consumption exceeds 1mW hard constraint. Output swing insufficient for 1.8V supply.",
    },
    {
      id: "cand-3",
      rank: 3,
      topologyName: "Telescopic Cascode OTA",
      status: "rejected",
      gainDB: 79.2,
      bandwidthMHz: 18.1,
      phaseMarginDeg: 72,
      powerMW: 0.91,
      noiseNVSqrtHz: 7.6,
      score: 64,
      rejectionReason:
        "Output swing < 0.8V with 1.8V supply — insufficient for general-purpose operation.",
    },
  ],
};
