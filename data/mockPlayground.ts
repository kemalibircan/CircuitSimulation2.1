import type { ChatMessage, StarterTemplate } from "@/types/playground";

// ──────────────────────────────────────────────────────────────────────────────
// Starter Templates
// ──────────────────────────────────────────────────────────────────────────────

export const starterTemplates: StarterTemplate[] = [
  {
    id: "diff-pair",
    name: "Differential Pair",
    description: "Classic NMOS input differential pair with PMOS active load and tail current source.",
    category: "Amplifier",
    complexity: "intermediate",
    nodes: [
      { id: "vdd", type: "vdd", position: { x: 300, y: 50 }, data: { label: "VDD", type: "vdd", props: { voltage: 1.8 } } },
      { id: "m3", type: "pmos", position: { x: 200, y: 150 }, data: { label: "M3", type: "pmos", props: { W: 20, L: 0.5 } } },
      { id: "m4", type: "pmos", position: { x: 400, y: 150 }, data: { label: "M4", type: "pmos", props: { W: 20, L: 0.5 } } },
      { id: "m1", type: "nmos", position: { x: 200, y: 300 }, data: { label: "M1", type: "nmos", props: { W: 10, L: 0.5 } } },
      { id: "m2", type: "nmos", position: { x: 400, y: 300 }, data: { label: "M2", type: "nmos", props: { W: 10, L: 0.5 } } },
      { id: "iss", type: "isource", position: { x: 300, y: 450 }, data: { label: "Iss", type: "isource", props: { current: 100, unit: "µA" } } },
      { id: "gnd", type: "ground", position: { x: 300, y: 550 }, data: { label: "GND", type: "ground", props: {} } },
      { id: "vinp", type: "input_node", position: { x: 50, y: 300 }, data: { label: "VIN+", type: "input_node", props: { name: "VIN+" } } },
      { id: "vinm", type: "input_node", position: { x: 550, y: 300 }, data: { label: "VIN−", type: "input_node", props: { name: "VIN−" } } },
      { id: "vout", type: "output_node", position: { x: 500, y: 225 }, data: { label: "VOUT", type: "output_node", props: { name: "VOUT" } } },
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
      { id: "vdd", type: "vdd", position: { x: 200, y: 50 }, data: { label: "VDD", type: "vdd", props: { voltage: 1.8 } } },
      { id: "rd", type: "resistor", position: { x: 200, y: 150 }, data: { label: "RD", type: "resistor", props: { resistance: 10, unit: "kΩ" } } },
      { id: "m1", type: "nmos", position: { x: 200, y: 300 }, data: { label: "M1", type: "nmos", props: { W: 10, L: 0.18 } } },
      { id: "gnd", type: "ground", position: { x: 200, y: 450 }, data: { label: "GND", type: "ground", props: {} } },
      { id: "vin", type: "input_node", position: { x: 50, y: 300 }, data: { label: "VIN", type: "input_node", props: { name: "VIN" } } },
      { id: "vout", type: "output_node", position: { x: 350, y: 225 }, data: { label: "VOUT", type: "output_node", props: { name: "VOUT" } } },
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
      { id: "vin", type: "input_node", position: { x: 50, y: 200 }, data: { label: "VIN", type: "input_node", props: { name: "VIN" } } },
      { id: "r1", type: "resistor", position: { x: 200, y: 150 }, data: { label: "R1", type: "resistor", props: { resistance: 1, unit: "kΩ" } } },
      { id: "c1", type: "capacitor", position: { x: 350, y: 250 }, data: { label: "C1", type: "capacitor", props: { capacitance: 10, unit: "pF" } } },
      { id: "gnd", type: "ground", position: { x: 350, y: 400 }, data: { label: "GND", type: "ground", props: {} } },
      { id: "vout", type: "output_node", position: { x: 500, y: 200 }, data: { label: "VOUT", type: "output_node", props: { name: "VOUT" } } },
    ],
    edges: [
      { id: "e1", source: "vin", target: "r1", sourceHandle: "out", targetHandle: "p", type: "step" },
      { id: "e2", source: "r1", target: "c1", sourceHandle: "n", targetHandle: "p", type: "step" },
      { id: "e3", source: "r1", target: "vout", sourceHandle: "n", targetHandle: "inp", type: "step" },
      { id: "e4", source: "c1", target: "gnd", sourceHandle: "n", targetHandle: "gnd", type: "step" },
    ],
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Mock Chat Data
// ──────────────────────────────────────────────────────────────────────────────

export const mockChatInitial: ChatMessage[] = [
  {
    id: "msg-1",
    role: "agent",
    content: "Welcome to the Circuit Playground. I am CircuitAgent. You can drag components from the library to build a circuit manually, or give me natural language instructions and I will build and modify the circuit for you.\n\nType something like **\"Load a differential pair\"** or **\"Add an NMOS and connect its source to ground\"** to get started.",
    timestamp: new Date().toISOString(),
  },
];

export const mockAgentResponses = [
  {
    trigger: "load a differential",
    messages: [
      {
        id: "sys-2",
        role: "system" as const,
        content: "Loaded template: Differential Pair",
        timestamp: new Date().toISOString(),
        actionType: "template_loaded" as const,
        actionData: { templateId: "diff-pair" },
      },
      {
        id: "msg-3",
        role: "agent" as const,
        content: "I've loaded a standard NMOS differential pair with a PMOS active load on the canvas. The tail current is set to 100µA.\n\nWould you like to run a DC operating point simulation, or do you want to modify the transistor sizing first?",
        timestamp: new Date().toISOString(),
      },
    ],
  },
  {
    trigger: "increase",
    messages: [
      {
        id: "sys-4",
        role: "system" as const,
        content: "M1 width updated: 10µm → 20µm\nM2 width updated: 10µm → 20µm",
        timestamp: new Date().toISOString(),
        actionType: "property_updated" as const,
        actionData: { nodes: ["m1", "m2"], property: "W", value: 20 },
      },
      {
        id: "msg-5",
        role: "agent" as const,
        content: "I've doubled the width of the input pair (M1, M2) to 20µm. This should increase your transconductance (gm) and overall gain, at the cost of slightly higher input capacitance.",
        timestamp: new Date().toISOString(),
      },
    ],
  },
  {
    trigger: "why",
    messages: [
      {
        id: "msg-6",
        role: "agent" as const,
        content: "Looking at the differential pair topology, the dominant pole is located at the output node (`VOUT`), determined by the load capacitance and the output resistance of M2 and M4 ($R_{out} \approx r_{o2} || r_{o4}$).\n\nIf your phase margin is low, you might need to add a compensation network (like a Miller capacitor if you add a second stage), or reduce the load impedance.",
        timestamp: new Date().toISOString(),
      },
      {
        id: "msg-7",
        role: "suggestion" as const,
        content: "Suggestion: Add a second gain stage to increase overall open-loop gain and enable Miller compensation for better stability control.",
        timestamp: new Date().toISOString(),
        actionType: "suggestion" as const,
      },
    ],
  },
];
