import type { ComponentDefinition, ComponentCategory } from "@/types/playground";

// ──────────────────────────────────────────────────────────────────────────────
// Master component library definition
// ──────────────────────────────────────────────────────────────────────────────

export const componentLibrary: ComponentDefinition[] = [
  // ── ACTIVE ──────────────────────────────────────────────────────────────────
  {
    type: "nmos",
    label: "NMOS",
    shortLabel: "N",
    category: "active",
    description: "N-channel MOSFET transistor",
    defaultProps: { W: 10, L: 0.5, fingers: 1, model: "NMOS_VTH" },
    ports: [
      { id: "drain", label: "D", position: "top", offsetPercent: 50 },
      { id: "gate", label: "G", position: "left", offsetPercent: 50 },
      { id: "source", label: "S", position: "bottom", offsetPercent: 50 },
    ],
  },
  {
    type: "pmos",
    label: "PMOS",
    shortLabel: "P",
    category: "active",
    description: "P-channel MOSFET transistor",
    defaultProps: { W: 20, L: 0.5, fingers: 1, model: "PMOS_VTH" },
    ports: [
      { id: "drain", label: "D", position: "bottom", offsetPercent: 50 },
      { id: "gate", label: "G", position: "left", offsetPercent: 50 },
      { id: "source", label: "S", position: "top", offsetPercent: 50 },
    ],
  },
  {
    type: "npn",
    label: "BJT NPN",
    shortLabel: "Q",
    category: "active",
    description: "NPN bipolar junction transistor",
    defaultProps: { Is: "1e-15", betaF: 100, model: "NPN_BJT" },
    ports: [
      { id: "collector", label: "C", position: "top", offsetPercent: 50 },
      { id: "base", label: "B", position: "left", offsetPercent: 50 },
      { id: "emitter", label: "E", position: "bottom", offsetPercent: 50 },
    ],
  },
  {
    type: "pnp",
    label: "BJT PNP",
    shortLabel: "Q",
    category: "active",
    description: "PNP bipolar junction transistor",
    defaultProps: { Is: "1e-15", betaF: 100, model: "PNP_BJT" },
    ports: [
      { id: "collector", label: "C", position: "bottom", offsetPercent: 50 },
      { id: "base", label: "B", position: "left", offsetPercent: 50 },
      { id: "emitter", label: "E", position: "top", offsetPercent: 50 },
    ],
  },
  {
    type: "opamp",
    label: "Op-Amp",
    shortLabel: "U",
    category: "active",
    description: "Ideal op-amp block",
    defaultProps: { gain: "1e6", model: "IDEAL_OPAMP" },
    ports: [
      { id: "vp", label: "+", position: "left", offsetPercent: 33 },
      { id: "vm", label: "−", position: "left", offsetPercent: 67 },
      { id: "out", label: "OUT", position: "right", offsetPercent: 50 },
      { id: "vdd", label: "VDD", position: "top", offsetPercent: 50 },
      { id: "vss", label: "VSS", position: "bottom", offsetPercent: 50 },
    ],
  },

  // ── PASSIVE ─────────────────────────────────────────────────────────────────
  {
    type: "resistor",
    label: "Resistor",
    shortLabel: "R",
    category: "passive",
    description: "Resistor element",
    defaultProps: { resistance: 10, unit: "kΩ", tolerance: "5%" },
    ports: [
      { id: "p", label: "P", position: "top", offsetPercent: 50 },
      { id: "n", label: "N", position: "bottom", offsetPercent: 50 },
    ],
  },
  {
    type: "capacitor",
    label: "Capacitor",
    shortLabel: "C",
    category: "passive",
    description: "Capacitor element",
    defaultProps: { capacitance: 1, unit: "pF" },
    ports: [
      { id: "p", label: "P", position: "top", offsetPercent: 50 },
      { id: "n", label: "N", position: "bottom", offsetPercent: 50 },
    ],
  },
  {
    type: "inductor",
    label: "Inductor",
    shortLabel: "L",
    category: "passive",
    description: "Inductor element",
    defaultProps: { inductance: 1, unit: "nH" },
    ports: [
      { id: "p", label: "P", position: "top", offsetPercent: 50 },
      { id: "n", label: "N", position: "bottom", offsetPercent: 50 },
    ],
  },
  {
    type: "diode",
    label: "Diode",
    shortLabel: "D",
    category: "passive",
    description: "Semiconductor diode",
    defaultProps: { Is: "1e-14", model: "D_1N4148" },
    ports: [
      { id: "anode", label: "A", position: "top", offsetPercent: 50 },
      { id: "cathode", label: "K", position: "bottom", offsetPercent: 50 },
    ],
  },

  // ── SOURCES ─────────────────────────────────────────────────────────────────
  {
    type: "vsource",
    label: "Voltage Source",
    shortLabel: "V",
    category: "sources",
    description: "Independent voltage source",
    defaultProps: { voltage: 1.8, acAmplitude: 1, type: "DC" },
    ports: [
      { id: "pos", label: "+", position: "top", offsetPercent: 50 },
      { id: "neg", label: "−", position: "bottom", offsetPercent: 50 },
    ],
  },
  {
    type: "isource",
    label: "Current Source",
    shortLabel: "I",
    category: "sources",
    description: "Independent current source",
    defaultProps: { current: 100, unit: "µA", type: "DC" },
    ports: [
      { id: "pos", label: "+", position: "top", offsetPercent: 50 },
      { id: "neg", label: "−", position: "bottom", offsetPercent: 50 },
    ],
  },

  // ── NODES ───────────────────────────────────────────────────────────────────
  {
    type: "ground",
    label: "Ground",
    shortLabel: "GND",
    category: "nodes",
    description: "Reference ground node (0V)",
    defaultProps: {},
    ports: [
      { id: "gnd", label: "GND", position: "top", offsetPercent: 50 },
    ],
  },
  {
    type: "vdd",
    label: "VDD",
    shortLabel: "VDD",
    category: "nodes",
    description: "Power supply rail node",
    defaultProps: { voltage: 1.8 },
    ports: [
      { id: "vdd", label: "VDD", position: "bottom", offsetPercent: 50 },
    ],
  },
  {
    type: "input_node",
    label: "Input",
    shortLabel: "IN",
    category: "nodes",
    description: "Circuit input terminal",
    defaultProps: { name: "VIN" },
    ports: [
      { id: "out", label: "→", position: "right", offsetPercent: 50 },
    ],
  },
  {
    type: "output_node",
    label: "Output",
    shortLabel: "OUT",
    category: "nodes",
    description: "Circuit output terminal",
    defaultProps: { name: "VOUT" },
    ports: [
      { id: "inp", label: "←", position: "left", offsetPercent: 50 },
    ],
  },
  {
    type: "probe",
    label: "Test Probe",
    shortLabel: "TP",
    category: "nodes",
    description: "Measurement / test point",
    defaultProps: { name: "TP1" },
    ports: [
      { id: "probe", label: "↓", position: "top", offsetPercent: 50 },
    ],
  },
];

export const componentCategories: { id: ComponentCategory; label: string; color: string }[] = [
  { id: "active", label: "Active", color: "text-cyan-400" },
  { id: "passive", label: "Passive", color: "text-violet-400" },
  { id: "sources", label: "Sources", color: "text-emerald-400" },
  { id: "nodes", label: "Nodes", color: "text-amber-400" },
];

export function getComponentDef(type: string): ComponentDefinition | undefined {
  return componentLibrary.find((c) => c.type === type);
}
