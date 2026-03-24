import type { StarterTemplate } from "@/types/playground";

// ──────────────────────────────────────────────────────────────────────────────
// Starter Templates — Predefined circuit layouts for the playground canvas
// ──────────────────────────────────────────────────────────────────────────────

export const starterTemplates: StarterTemplate[] = [
  {
    id: "diff-pair",
    name: "Differential Pair",
    description: "Classic NMOS input differential pair with PMOS active load and tail current source.",
    category: "Amplifier",
    complexity: "intermediate",
    nodes: [
      { id: "vdd", type: "customCircuitNode", position: { x: 300, y: 50 }, data: { label: "VDD", type: "vdd", props: { voltage: 1.8 } } },
      { id: "m3", type: "customCircuitNode", position: { x: 200, y: 150 }, data: { label: "M3", type: "pmos", props: { W: 20, L: 0.5 } } },
      { id: "m4", type: "customCircuitNode", position: { x: 400, y: 150 }, data: { label: "M4", type: "pmos", props: { W: 20, L: 0.5 } } },
      { id: "m1", type: "customCircuitNode", position: { x: 200, y: 300 }, data: { label: "M1", type: "nmos", props: { W: 10, L: 0.5 } } },
      { id: "m2", type: "customCircuitNode", position: { x: 400, y: 300 }, data: { label: "M2", type: "nmos", props: { W: 10, L: 0.5 } } },
      { id: "iss", type: "customCircuitNode", position: { x: 300, y: 450 }, data: { label: "Iss", type: "isource", props: { current: 100, unit: "µA" } } },
      { id: "gnd", type: "customCircuitNode", position: { x: 300, y: 550 }, data: { label: "GND", type: "ground", props: {} } },
      { id: "vinp", type: "customCircuitNode", position: { x: 50, y: 300 }, data: { label: "VIN+", type: "input_node", props: { name: "VIN+" } } },
      { id: "vinm", type: "customCircuitNode", position: { x: 550, y: 300 }, data: { label: "VIN−", type: "input_node", props: { name: "VIN−" } } },
      { id: "vout", type: "customCircuitNode", position: { x: 500, y: 225 }, data: { label: "VOUT", type: "output_node", props: { name: "VOUT" } } },
    ],
    edges: [
      { id: "e-vdd", source: "vdd", target: "m3", sourceHandle: "vdd", targetHandle: "source", type: "step" },
      { id: "e-vdd2", source: "vdd", target: "m4", sourceHandle: "vdd", targetHandle: "source", type: "step" },
      { id: "e-load1", source: "m3", target: "m1", sourceHandle: "drain", targetHandle: "drain", type: "step" },
      { id: "e-load2", source: "m4", target: "m2", sourceHandle: "drain", targetHandle: "drain", type: "step" },
      { id: "e-tail1", source: "m1", target: "m2", sourceHandle: "source", targetHandle: "source", type: "step" },
      { id: "e-tail2", source: "m1", target: "iss", sourceHandle: "source", targetHandle: "pos", type: "step" },
      { id: "e-gnd", source: "iss", target: "gnd", sourceHandle: "neg", targetHandle: "gnd", type: "step" },
      { id: "e-in1", source: "vinp", target: "m1", sourceHandle: "out", targetHandle: "gate", type: "step" },
      { id: "e-in2", source: "vinm", target: "m2", sourceHandle: "out", targetHandle: "gate", type: "step" },
      { id: "e-out", source: "m4", target: "vout", sourceHandle: "drain", targetHandle: "inp", type: "step" },
      { id: "e-cm", source: "m3", target: "m3", sourceHandle: "drain", targetHandle: "gate", type: "step" },
      { id: "e-cm2", source: "m3", target: "m4", sourceHandle: "gate", targetHandle: "gate", type: "step" },
    ],
  },
  {
    id: "cs-amp",
    name: "Common Source Amplifier",
    description: "Simple common-source amplifier with passive resistive load.",
    category: "Amplifier",
    complexity: "beginner",
    nodes: [
      { id: "vdd", type: "customCircuitNode", position: { x: 200, y: 50 }, data: { label: "VDD", type: "vdd", props: { voltage: 1.8 } } },
      { id: "rd", type: "customCircuitNode", position: { x: 200, y: 150 }, data: { label: "RD", type: "resistor", props: { resistance: 10, unit: "kΩ" } } },
      { id: "m1", type: "customCircuitNode", position: { x: 200, y: 300 }, data: { label: "M1", type: "nmos", props: { W: 10, L: 0.18 } } },
      { id: "gnd", type: "customCircuitNode", position: { x: 200, y: 450 }, data: { label: "GND", type: "ground", props: {} } },
      { id: "vin", type: "customCircuitNode", position: { x: 50, y: 300 }, data: { label: "VIN", type: "input_node", props: { name: "VIN" } } },
      { id: "vout", type: "customCircuitNode", position: { x: 350, y: 225 }, data: { label: "VOUT", type: "output_node", props: { name: "VOUT" } } },
    ],
    edges: [
      { id: "e1", source: "vdd", target: "rd", sourceHandle: "vdd", targetHandle: "p", type: "step" },
      { id: "e2", source: "rd", target: "m1", sourceHandle: "n", targetHandle: "drain", type: "step" },
      { id: "e3", source: "m1", target: "gnd", sourceHandle: "source", targetHandle: "gnd", type: "step" },
      { id: "e4", source: "vin", target: "m1", sourceHandle: "out", targetHandle: "gate", type: "step" },
      { id: "e5", source: "rd", target: "vout", sourceHandle: "n", targetHandle: "inp", type: "step" },
    ],
  },
  {
    id: "rc-filter",
    name: "RC Low-Pass Filter",
    description: "First-order passive low-pass filter.",
    category: "Filter",
    complexity: "beginner",
    nodes: [
      { id: "vin", type: "customCircuitNode", position: { x: 50, y: 200 }, data: { label: "VIN", type: "input_node", props: { name: "VIN" } } },
      { id: "r1", type: "customCircuitNode", position: { x: 200, y: 150 }, data: { label: "R1", type: "resistor", props: { resistance: 1, unit: "kΩ" } } },
      { id: "c1", type: "customCircuitNode", position: { x: 350, y: 250 }, data: { label: "C1", type: "capacitor", props: { capacitance: 10, unit: "pF" } } },
      { id: "gnd", type: "customCircuitNode", position: { x: 350, y: 400 }, data: { label: "GND", type: "ground", props: {} } },
      { id: "vout", type: "customCircuitNode", position: { x: 500, y: 200 }, data: { label: "VOUT", type: "output_node", props: { name: "VOUT" } } },
    ],
    edges: [
      { id: "e1", source: "vin", target: "r1", sourceHandle: "out", targetHandle: "p", type: "step" },
      { id: "e2", source: "r1", target: "c1", sourceHandle: "n", targetHandle: "p", type: "step" },
      { id: "e3", source: "r1", target: "vout", sourceHandle: "n", targetHandle: "inp", type: "step" },
      { id: "e4", source: "c1", target: "gnd", sourceHandle: "n", targetHandle: "gnd", type: "step" },
    ],
  },
];
