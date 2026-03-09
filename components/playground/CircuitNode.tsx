"use client";

import { memo } from "react";
import { Handle, Position } from "reactflow";
import { type NodeProps } from "reactflow";
import type { CircuitNodeData } from "@/types/playground";
import { getComponentDef } from "@/data/componentLibrary";
import { cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Custom Circuit Node for React Flow
// ──────────────────────────────────────────────────────────────────────────────

export const CircuitNode = memo(({ data, selected }: NodeProps<CircuitNodeData>) => {
  const def = getComponentDef(data.type);

  if (!def) {
    return (
      <div className="p-2 bg-red-500/10 border border-red-500 text-red-500 text-xs rounded">
        Unknown type: {data.type}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "relative group flex flex-col items-center justify-center p-3 rounded-xl border bg-zinc-950/90 shadow-lg backdrop-blur-sm min-w-[80px] transition-all duration-200",
        selected
          ? "border-cyan-500 shadow-cyan-500/20 ring-1 ring-cyan-500/50"
          : data.hasWarning
          ? "border-amber-500/50 shadow-amber-500/10"
          : "border-zinc-800 hover:border-zinc-700"
      )}
    >
      {/* Handles / Ports */}
      {def.ports.map((port) => {
        let position = Position.Top;
        if (port.position === "bottom") position = Position.Bottom;
        if (port.position === "left") position = Position.Left;
        if (port.position === "right") position = Position.Right;

        // Visual offset along the edge (e.g. 50% is center)
        const style: React.CSSProperties = {};
        if (port.position === "top" || port.position === "bottom") {
          style.left = `${port.offsetPercent ?? 50}%`;
        } else {
          style.top = `${port.offsetPercent ?? 50}%`;
        }

        return (
          <Handle
            key={port.id}
            type="source" // react flow allows connecting source-to-source if we use bidirectional or just generic handles
            position={position}
            id={port.id}
            style={style}
            className={cn(
              "w-2.5 h-2.5 rounded-full border-2 border-zinc-950 transition-colors pointer-events-auto",
              selected ? "bg-cyan-400" : "bg-zinc-500 hover:bg-cyan-400"
            )}
          />
        );
      })}

      {/* Warning Icon Overlay */}
      {data.hasWarning && (
        <div 
          className="absolute -top-2 -right-2 bg-zinc-900 border border-amber-500/50 rounded-full p-0.5"
          title={data.warningMessage}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </div>
      )}

      {/* Node Content */}
      <div className="flex flex-col items-center gap-1.5 pointer-events-none">
        {/* Symbol / Short Label */}
        <div
          className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm border",
            selected
              ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
              : "bg-zinc-900 text-zinc-300 border-zinc-800"
          )}
        >
          {def.shortLabel}
        </div>

        {/* Labels & Props Summary */}
        <div className="text-center space-y-0.5">
          <div className="font-mono font-bold text-xs text-zinc-200">
            {data.label}
          </div>
          
          {/* Show a mini summary of key props (e.g. W/L for MOS, or R value) */}
          <div className="text-[9px] text-zinc-500 font-medium">
            {data.type === "nmos" || data.type === "pmos" ? (
              `${data.props.W || "?"}µ/${data.props.L || "?"}µ`
            ) : data.type === "resistor" ? (
              `${data.props.resistance || "?"}${data.props.unit || ""}`
            ) : data.type === "capacitor" ? (
              `${data.props.capacitance || "?"}${data.props.unit || ""}`
            ) : data.type === "vsource" ? (
              `${data.props.voltage || "?"}V`
            ) : data.type === "isource" ? (
              `${data.props.current || "?"}${data.props.unit || ""}`
            ) : (
              def.label
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

CircuitNode.displayName = "CircuitNode";
