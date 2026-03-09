"use client";

import { memo } from "react";
import { getSmoothStepPath, type EdgeProps } from "reactflow";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Custom Wire / Edge for React Flow
// ──────────────────────────────────────────────────────────────────────────────

export const WireEdge = memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style = {},
  data,
  selected,
}: EdgeProps) => {
  // We use smoothstep (orthogonal lines with rounded corners) for circuit schematic feel
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <>
      <path
        id={id}
        style={style}
        className={cn(
          "react-flow__edge-path transition-all duration-200 fill-none",
          selected
            ? "stroke-cyan-500 stroke-[3px]"
            : "stroke-zinc-600 stroke-[2px] hover:stroke-zinc-400"
        )}
        d={edgePath}
      />
      {/* Invisible thicker path for easier hovering/clicking */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={20}
        className="react-flow__edge-interaction"
      />
      
      {/* Optional Net Label */}
      {data?.netName && (
        <g
          transform={`translate(${labelX}, ${labelY})`}
          className={cn(
            "pointer-events-none transition-opacity",
            selected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          )}
        >
          <rect
            x={-20}
            y={-10}
            width={40}
            height={20}
            rx={4}
            className="fill-zinc-900 stroke-zinc-700 stroke-1"
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            className="fill-zinc-400 text-[9px] font-mono font-bold"
          >
            {data.netName}
          </text>
        </g>
      )}
    </>
  );
});

WireEdge.displayName = "WireEdge";
