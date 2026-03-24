"use client";

import React from "react";
import type { CircuitComponentType } from "@/types/playground";

// ──────────────────────────────────────────────────────────────────────────────
// Design Constants — Shared across all circuit symbols
// ──────────────────────────────────────────────────────────────────────────────

const STROKE_DEFAULT = "#a1a1aa"; // zinc-400
const STROKE_SELECTED = "#22d3ee"; // cyan-400
const STROKE_WIDTH = 1.5;
const FILL_NONE = "none";

interface SymbolProps {
  selected?: boolean;
  width?: number;
  height?: number;
}

function useStroke(selected?: boolean) {
  return selected ? STROKE_SELECTED : STROKE_DEFAULT;
}

// ──────────────────────────────────────────────────────────────────────────────
// Resistor — IEEE zigzag symbol
// ──────────────────────────────────────────────────────────────────────────────

export function ResistorSymbol({ selected, width = 60, height = 24 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 60 24" fill={FILL_NONE}>
      {/* Lead wires */}
      <line x1="0" y1="12" x2="10" y2="12" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="50" y1="12" x2="60" y2="12" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Zigzag body */}
      <polyline
        points="10,12 14,4 20,20 26,4 32,20 38,4 44,20 50,12"
        stroke={s}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill={FILL_NONE}
      />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Capacitor — Two parallel plates
// ──────────────────────────────────────────────────────────────────────────────

export function CapacitorSymbol({ selected, width = 60, height = 32 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 60 32" fill={FILL_NONE}>
      {/* Lead wires */}
      <line x1="0" y1="16" x2="24" y2="16" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="36" y1="16" x2="60" y2="16" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Plates */}
      <line x1="24" y1="6" x2="24" y2="26" stroke={s} strokeWidth={STROKE_WIDTH + 0.5} strokeLinecap="round" />
      <line x1="36" y1="6" x2="36" y2="26" stroke={s} strokeWidth={STROKE_WIDTH + 0.5} strokeLinecap="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Inductor — Coil humps
// ──────────────────────────────────────────────────────────────────────────────

export function InductorSymbol({ selected, width = 60, height = 24 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 60 24" fill={FILL_NONE}>
      {/* Lead wires */}
      <line x1="0" y1="16" x2="8" y2="16" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="52" y1="16" x2="60" y2="16" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Coil arcs */}
      <path
        d="M 8,16 C 8,6 19,6 19,16 C 19,6 30,6 30,16 C 30,6 41,6 41,16 C 41,6 52,6 52,16"
        stroke={s}
        strokeWidth={STROKE_WIDTH}
        strokeLinecap="round"
        fill={FILL_NONE}
      />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Diode — Triangle + bar
// ──────────────────────────────────────────────────────────────────────────────

export function DiodeSymbol({ selected, width = 60, height = 32 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 60 32" fill={FILL_NONE}>
      {/* Lead wires */}
      <line x1="0" y1="16" x2="18" y2="16" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="42" y1="16" x2="60" y2="16" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Triangle (anode side) */}
      <polygon
        points="18,6 42,16 18,26"
        stroke={s}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        fill={FILL_NONE}
      />
      {/* Cathode bar */}
      <line x1="42" y1="6" x2="42" y2="26" stroke={s} strokeWidth={STROKE_WIDTH + 0.5} strokeLinecap="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Voltage Source — Circle with + and −
// ──────────────────────────────────────────────────────────────────────────────

export function VoltageSourceSymbol({ selected, width = 48, height = 48 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 48 48" fill={FILL_NONE}>
      {/* Lead wires */}
      <line x1="24" y1="0" x2="24" y2="10" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="24" y1="38" x2="24" y2="48" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Circle */}
      <circle cx="24" cy="24" r="14" stroke={s} strokeWidth={STROKE_WIDTH} />
      {/* Plus sign */}
      <line x1="24" y1="15" x2="24" y2="21" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="21" y1="18" x2="27" y2="18" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Minus sign */}
      <line x1="21" y1="30" x2="27" y2="30" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Current Source — Circle with arrow
// ──────────────────────────────────────────────────────────────────────────────

export function CurrentSourceSymbol({ selected, width = 48, height = 48 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 48 48" fill={FILL_NONE}>
      {/* Lead wires */}
      <line x1="24" y1="0" x2="24" y2="10" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="24" y1="38" x2="24" y2="48" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Circle */}
      <circle cx="24" cy="24" r="14" stroke={s} strokeWidth={STROKE_WIDTH} />
      {/* Arrow (pointing up = conventional current direction) */}
      <line x1="24" y1="32" x2="24" y2="16" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <polyline points="20,20 24,16 28,20" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" strokeLinecap="round" fill={FILL_NONE} />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// NMOS Transistor
// ──────────────────────────────────────────────────────────────────────────────

export function NMOSSymbol({ selected, width = 56, height = 64 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 56 64" fill={FILL_NONE}>
      {/* Gate lead */}
      <line x1="0" y1="32" x2="16" y2="32" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Gate electrode (vertical bar) */}
      <line x1="16" y1="16" x2="16" y2="48" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Channel (vertical bar, slight gap from gate) */}
      <line x1="22" y1="16" x2="22" y2="48" stroke={s} strokeWidth={STROKE_WIDTH + 0.5} strokeLinecap="round" />
      {/* Drain lead (top) */}
      <line x1="22" y1="22" x2="44" y2="22" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="44" y1="0" x2="44" y2="22" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Source lead (bottom) */}
      <line x1="22" y1="42" x2="44" y2="42" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="44" y1="42" x2="44" y2="64" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Arrow on source (pointing inward for NMOS) */}
      <polygon points="28,42 34,38 34,46" fill={s} stroke={s} strokeWidth={0.5} />
      {/* Bulk connection line */}
      <line x1="22" y1="32" x2="44" y2="32" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeDasharray="2 3" opacity={0.4} />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PMOS Transistor
// ──────────────────────────────────────────────────────────────────────────────

export function PMOSSymbol({ selected, width = 56, height = 64 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 56 64" fill={FILL_NONE}>
      {/* Gate lead */}
      <line x1="0" y1="32" x2="12" y2="32" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Inversion bubble */}
      <circle cx="14" cy="32" r="2.5" stroke={s} strokeWidth={STROKE_WIDTH} fill={FILL_NONE} />
      {/* Gate electrode */}
      <line x1="16" y1="16" x2="16" y2="48" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Channel */}
      <line x1="22" y1="16" x2="22" y2="48" stroke={s} strokeWidth={STROKE_WIDTH + 0.5} strokeLinecap="round" />
      {/* Source lead (top for PMOS) */}
      <line x1="22" y1="22" x2="44" y2="22" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="44" y1="0" x2="44" y2="22" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Drain lead (bottom for PMOS) */}
      <line x1="22" y1="42" x2="44" y2="42" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="44" y1="42" x2="44" y2="64" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Arrow on source (pointing outward for PMOS) */}
      <polygon points="34,22 28,18 28,26" fill={s} stroke={s} strokeWidth={0.5} />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// NPN BJT Transistor
// ──────────────────────────────────────────────────────────────────────────────

export function NPNSymbol({ selected, width = 56, height = 64 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 56 64" fill={FILL_NONE}>
      {/* Base lead */}
      <line x1="0" y1="32" x2="20" y2="32" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Emitter-Base junction (vertical bar) */}
      <line x1="20" y1="16" x2="20" y2="48" stroke={s} strokeWidth={STROKE_WIDTH + 0.5} strokeLinecap="round" />
      {/* Collector line (upper diagonal) */}
      <line x1="20" y1="24" x2="44" y2="8" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Collector lead */}
      <line x1="44" y1="0" x2="44" y2="8" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Emitter line (lower diagonal) */}
      <line x1="20" y1="40" x2="44" y2="56" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Emitter lead */}
      <line x1="44" y1="56" x2="44" y2="64" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Arrow on emitter (pointing outward for NPN) */}
      <polygon points="38,52 44,56 36,56" fill={s} stroke={s} strokeWidth={0.5} />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// PNP BJT Transistor
// ──────────────────────────────────────────────────────────────────────────────

export function PNPSymbol({ selected, width = 56, height = 64 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 56 64" fill={FILL_NONE}>
      {/* Base lead */}
      <line x1="0" y1="32" x2="20" y2="32" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Emitter-Base junction (vertical bar) */}
      <line x1="20" y1="16" x2="20" y2="48" stroke={s} strokeWidth={STROKE_WIDTH + 0.5} strokeLinecap="round" />
      {/* Emitter line (upper diagonal) — for PNP, emitter is top */}
      <line x1="20" y1="24" x2="44" y2="8" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="44" y1="0" x2="44" y2="8" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Arrow on emitter (pointing inward for PNP) */}
      <polygon points="26,20 20,24 26,28" fill={s} stroke={s} strokeWidth={0.5} />
      {/* Collector line (lower diagonal) */}
      <line x1="20" y1="40" x2="44" y2="56" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="44" y1="56" x2="44" y2="64" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Op-Amp — Triangle shape with +/− inputs
// ──────────────────────────────────────────────────────────────────────────────

export function OpAmpSymbol({ selected, width = 72, height = 64 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 72 64" fill={FILL_NONE}>
      {/* Input leads */}
      <line x1="0" y1="20" x2="16" y2="20" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="0" y1="44" x2="16" y2="44" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Triangle body */}
      <polygon
        points="16,4 60,32 16,60"
        stroke={s}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        fill={FILL_NONE}
      />
      {/* Output lead */}
      <line x1="60" y1="32" x2="72" y2="32" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* + label (non-inverting input) */}
      <text x="22" y="24" fill={s} fontSize="10" fontFamily="monospace" fontWeight="bold">+</text>
      {/* − label (inverting input) */}
      <text x="22" y="48" fill={s} fontSize="10" fontFamily="monospace" fontWeight="bold">−</text>
      {/* VDD lead (top) */}
      <line x1="38" y1="0" x2="38" y2="18" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeDasharray="3 2" opacity={0.5} />
      {/* VSS lead (bottom) */}
      <line x1="38" y1="46" x2="38" y2="64" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" strokeDasharray="3 2" opacity={0.5} />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Ground — Standard 3-line ground symbol
// ──────────────────────────────────────────────────────────────────────────────

export function GroundSymbol({ selected, width = 32, height = 28 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 32 28" fill={FILL_NONE}>
      {/* Lead */}
      <line x1="16" y1="0" x2="16" y2="10" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Three horizontal bars (decreasing width) */}
      <line x1="4" y1="10" x2="28" y2="10" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="8" y1="16" x2="24" y2="16" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="12" y1="22" x2="20" y2="22" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// VDD — Power rail symbol
// ──────────────────────────────────────────────────────────────────────────────

export function VDDSymbol({ selected, width = 32, height = 28 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 32 28" fill={FILL_NONE}>
      {/* Lead */}
      <line x1="16" y1="12" x2="16" y2="28" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Rail bar */}
      <line x1="4" y1="12" x2="28" y2="12" stroke={s} strokeWidth={STROKE_WIDTH + 0.5} strokeLinecap="round" />
      {/* Arrow pointing up */}
      <polyline points="12,6 16,1 20,6" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinejoin="round" strokeLinecap="round" fill={FILL_NONE} />
      <line x1="16" y1="1" x2="16" y2="12" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Input Node — Arrow pointing right
// ──────────────────────────────────────────────────────────────────────────────

export function InputNodeSymbol({ selected, width = 40, height = 24 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 40 24" fill={FILL_NONE}>
      {/* Arrow body */}
      <polygon
        points="0,4 28,4 28,0 40,12 28,24 28,20 0,20"
        stroke={s}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        fill={FILL_NONE}
      />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Output Node — Arrow pointing right (filled feel)
// ──────────────────────────────────────────────────────────────────────────────

export function OutputNodeSymbol({ selected, width = 40, height = 24 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 40 24" fill={FILL_NONE}>
      {/* Arrow body inverted */}
      <polygon
        points="12,0 40,0 40,24 12,24 0,12"
        stroke={s}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        fill={FILL_NONE}
      />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Test Probe
// ──────────────────────────────────────────────────────────────────────────────

export function ProbeSymbol({ selected, width = 32, height = 32 }: SymbolProps) {
  const s = useStroke(selected);
  return (
    <svg width={width} height={height} viewBox="0 0 32 32" fill={FILL_NONE}>
      {/* Lead */}
      <line x1="16" y1="0" x2="16" y2="10" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      {/* Diamond */}
      <polygon
        points="16,10 26,20 16,30 6,20"
        stroke={s}
        strokeWidth={STROKE_WIDTH}
        strokeLinejoin="round"
        fill={FILL_NONE}
      />
      {/* Inner dot */}
      <circle cx="16" cy="20" r="2" fill={s} />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Scope — Oscilloscope measurement tool
// ──────────────────────────────────────────────────────────────────────────────

export function ScopeSymbol({ selected, width = 36, height = 36 }: SymbolProps) {
  const s = selected ? "#34d399" : "#a1a1aa"; // emerald for scope
  return (
    <svg width={width} height={height} viewBox="0 0 36 36" fill={FILL_NONE}>
      {/* Screen body */}
      <rect x="4" y="4" width="28" height="22" rx="3" stroke={s} strokeWidth={STROKE_WIDTH} />
      {/* Waveform inside screen */}
      <polyline
        points="8,18 12,10 16,18 20,14 24,22 28,15"
        stroke={selected ? "#6ee7b7" : "#22d3ee"}
        strokeWidth={1.2}
        strokeLinejoin="round"
        strokeLinecap="round"
        fill={FILL_NONE}
      />
      {/* Stand */}
      <line x1="14" y1="26" x2="14" y2="32" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="22" y1="26" x2="22" y2="32" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
      <line x1="10" y1="32" x2="26" y2="32" stroke={s} strokeWidth={STROKE_WIDTH} strokeLinecap="round" />
    </svg>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Symbol Registry — Maps component type to SVG component
// ──────────────────────────────────────────────────────────────────────────────

export const symbolRegistry: Record<CircuitComponentType, React.FC<SymbolProps>> = {
  resistor: ResistorSymbol,
  capacitor: CapacitorSymbol,
  inductor: InductorSymbol,
  diode: DiodeSymbol,
  vsource: VoltageSourceSymbol,
  isource: CurrentSourceSymbol,
  nmos: NMOSSymbol,
  pmos: PMOSSymbol,
  npn: NPNSymbol,
  pnp: PNPSymbol,
  opamp: OpAmpSymbol,
  ground: GroundSymbol,
  vdd: VDDSymbol,
  input_node: InputNodeSymbol,
  output_node: OutputNodeSymbol,
  probe: ProbeSymbol,
  scope: ScopeSymbol,
  subcircuit: ResistorSymbol, // fallback
};

// ──────────────────────────────────────────────────────────────────────────────
// Helper — Get SVG dimensions for a component type
// ──────────────────────────────────────────────────────────────────────────────

export const symbolDimensions: Record<CircuitComponentType, { width: number; height: number }> = {
  resistor: { width: 60, height: 24 },
  capacitor: { width: 60, height: 32 },
  inductor: { width: 60, height: 24 },
  diode: { width: 60, height: 32 },
  vsource: { width: 48, height: 48 },
  isource: { width: 48, height: 48 },
  nmos: { width: 56, height: 64 },
  pmos: { width: 56, height: 64 },
  npn: { width: 56, height: 64 },
  pnp: { width: 56, height: 64 },
  opamp: { width: 72, height: 64 },
  ground: { width: 32, height: 28 },
  vdd: { width: 32, height: 28 },
  input_node: { width: 40, height: 24 },
  output_node: { width: 40, height: 24 },
  probe: { width: 32, height: 32 },
  scope: { width: 36, height: 36 },
  subcircuit: { width: 60, height: 24 },
};
