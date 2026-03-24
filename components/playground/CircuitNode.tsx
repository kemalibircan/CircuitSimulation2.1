"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import { type NodeProps } from "reactflow";
import type { CircuitNodeData } from "@/types/playground";
import { getComponentDef } from "@/data/componentLibrary";
import { symbolRegistry } from "./symbols";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Custom Circuit Node — SVG-based with pixel-precise handles
// ──────────────────────────────────────────────────────────────────────────────

// Padding around the SVG symbol for labels and breathing room
const PADDING_X = 8;
const PADDING_TOP = 4;
const PADDING_BOTTOM = 28; // space for labels below

export const CircuitNode = memo(({ data, selected }: NodeProps<CircuitNodeData>) => {
  const def = getComponentDef(data.type);

  if (!def) {
    return (
      <div className="p-2 bg-red-500/10 border border-red-500 text-red-500 text-xs rounded">
        Unknown type: {data.type}
      </div>
    );
  }

  const SymbolComponent = symbolRegistry[data.type];
  const totalWidth = def.nodeWidth + PADDING_X * 2;
  const totalHeight = def.nodeHeight + PADDING_TOP + PADDING_BOTTOM;

  // Format value summary for display
  const valueSummary = getValueSummary(data);

  return (
    <div
      className={cn(
        "relative group flex flex-col items-center",
        "transition-all duration-150 ease-out"
      )}
      style={{ width: totalWidth, height: totalHeight }}
    >
      {/* Handles / Ports — positioned at exact pixel locations */}
      {def.ports.map((port) => {
        let position = Position.Top;
        if (port.position === "bottom") position = Position.Bottom;
        if (port.position === "left") position = Position.Left;
        if (port.position === "right") position = Position.Right;

        return (
          <Handle
            key={port.id}
            type="source"
            position={position}
            id={port.id}
            style={{
              position: "absolute",
              left: port.x + PADDING_X,
              top: port.y + PADDING_TOP,
              transform: "translate(-50%, -50%)",
            }}
            className={cn(
              "!w-2 !h-2 !rounded-full !border-[1.5px] transition-all duration-150",
              "!border-zinc-700 !bg-zinc-900",
              selected
                ? "!bg-cyan-400 !border-cyan-400 !shadow-[0_0_6px_rgba(34,211,238,0.5)]"
                : "hover:!bg-cyan-400 hover:!border-cyan-400 hover:!shadow-[0_0_4px_rgba(34,211,238,0.3)]"
            )}
            title={`${port.label} (${port.id})`}
          />
        );
      })}

      {/* Warning Icon Overlay */}
      {data.hasWarning && (
        <div
          className="absolute -top-2 -right-2 bg-zinc-900 border border-amber-500/50 rounded-full p-0.5 z-10"
          title={data.warningMessage}
        >
          <AlertTriangle className="w-3 h-3 text-amber-500" />
        </div>
      )}

      {/* Selection highlight glow */}
      {selected && (
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            boxShadow: "0 0 12px 2px rgba(34, 211, 238, 0.15)",
            border: "1px solid rgba(34, 211, 238, 0.2)",
          }}
        />
      )}

      {/* SVG Symbol */}
      <div
        className="flex items-center justify-center pointer-events-none"
        style={{ marginTop: PADDING_TOP }}
      >
        {SymbolComponent && (
          <SymbolComponent
            selected={selected}
            width={def.nodeWidth}
            height={def.nodeHeight}
          />
        )}
      </div>

      {/* Labels below the symbol */}
      <div className="flex flex-col items-center gap-0 pointer-events-none mt-0.5 w-full">
        {/* Instance name (e.g. R1, M1, C1) */}
        <div
          className={cn(
            "font-mono font-bold text-[10px] leading-tight",
            selected ? "text-cyan-300" : "text-zinc-300"
          )}
        >
          {data.label}
        </div>

        {/* Value summary (e.g. 10kΩ, 1pF, 1.8V) */}
        {valueSummary && (
          <div className="font-mono text-[8px] leading-tight text-zinc-500">
            {valueSummary}
          </div>
        )}
      </div>
    </div>
  );
});

CircuitNode.displayName = "CircuitNode";

// ──────────────────────────────────────────────────────────────────────────────
// Helper — Generate a concise value summary for display
// ──────────────────────────────────────────────────────────────────────────────

function getValueSummary(data: CircuitNodeData): string | null {
  const p = data.props;
  switch (data.type) {
    case "nmos":
    case "pmos":
      return `${p.W || "?"}µ/${p.L || "?"}µ`;
    case "resistor":
      return `${p.resistance || "?"}${p.unit || ""}`;
    case "capacitor":
      return `${p.capacitance || "?"}${p.unit || ""}`;
    case "inductor":
      return `${p.inductance || "?"}${p.unit || ""}`;
    case "vsource":
      return `${p.voltage || "?"}V`;
    case "isource":
      return `${p.current || "?"}${p.unit || ""}`;
    case "diode":
      return String(p.model || "");
    case "npn":
    case "pnp":
      return `β=${p.betaF || "?"}`;
    case "opamp":
      return String(p.model || "");
    case "vdd":
      return `${p.voltage || "?"}V`;
    default:
      return null;
  }
}
