"use client";

import { memo } from "react";
import { getSmoothStepPath, type EdgeProps } from "reactflow";
import type { CircuitEdgeData } from "@/types/playground";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Custom Wire / Edge — Circuit schematic style with scope measurement
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
}: EdgeProps<CircuitEdgeData>) => {
  const isProbed = data?.isProbed;

  // Step/orthogonal routing with tight corners for circuit-schematic feel
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 2,
  });

  const strokeColor = isProbed
    ? "#34d399"   // emerald for probed
    : selected
    ? "#22d3ee"   // cyan for selected
    : "#52525b";  // zinc-600 default

  const strokeWidth = isProbed ? 2.5 : selected ? 2 : 1.5;

  return (
    <>
      {/* Selection / probe glow */}
      {(selected || isProbed) && (
        <path
          d={edgePath}
          fill="none"
          stroke={isProbed ? "rgba(52, 211, 153, 0.2)" : "rgba(34, 211, 238, 0.15)"}
          strokeWidth={8}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none"
        />
      )}

      {/* Main wire path */}
      <path
        id={id}
        style={style}
        className="react-flow__edge-path transition-all duration-150 fill-none"
        d={edgePath}
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Invisible wider path for click target */}
      <path
        d={edgePath}
        fill="none"
        strokeOpacity={0}
        strokeWidth={16}
        className="react-flow__edge-interaction"
      />

      {/* Connection dots at endpoints */}
      <circle
        cx={sourceX}
        cy={sourceY}
        r={isProbed ? 3 : 2}
        className="transition-all duration-150"
        fill={strokeColor}
      />
      <circle
        cx={targetX}
        cy={targetY}
        r={isProbed ? 3 : 2}
        className="transition-all duration-150"
        fill={strokeColor}
      />

      {/* Scope measurement popup — shown when probed */}
      {isProbed && data?.scopeData && (
        <g transform={`translate(${labelX}, ${labelY - 36})`}>
          {/* Popup background */}
          <rect
            x={-56}
            y={-22}
            width={112}
            height={44}
            rx={6}
            fill="#0a0a0a"
            stroke="#34d399"
            strokeWidth={1}
            opacity={0.95}
          />
          {/* Small pointer triangle */}
          <polygon
            points="-6,22 6,22 0,28"
            fill="#0a0a0a"
            stroke="#34d399"
            strokeWidth={1}
          />
          <line x1="-5" y1="22" x2="5" y2="22" stroke="#0a0a0a" strokeWidth={2} />
          
          {/* Scope icon indicator */}
          <circle cx={-42} cy={-8} r={4} fill="#34d399" opacity={0.3} />
          <circle cx={-42} cy={-8} r={1.5} fill="#34d399" />
          
          {/* Voltage display */}
          <text x={-32} y={-4} fill="#6ee7b7" fontSize="10" fontFamily="monospace" fontWeight="bold">
            V: {data.scopeData.voltage || "—"}
          </text>
          
          {/* Current display */}
          <text x={-32} y={10} fill="#fbbf24" fontSize="9" fontFamily="monospace">
            I: {data.scopeData.current || "—"}
          </text>

          {/* Net name label */}
          {data.scopeData.nodeName && (
            <text x={32} y={-4} fill="#a1a1aa" fontSize="7" fontFamily="monospace" textAnchor="end">
              {data.scopeData.nodeName}
            </text>
          )}
        </g>
      )}

      {/* Net name label (shown on hover/selection without scope) */}
      {!isProbed && data?.netName && (
        <g
          transform={`translate(${labelX}, ${labelY})`}
          className={cn(
            "pointer-events-none transition-opacity duration-150",
            selected ? "opacity-100" : "opacity-0"
          )}
        >
          <rect
            x={-18}
            y={-8}
            width={36}
            height={16}
            rx={3}
            className="fill-zinc-900/90 stroke-zinc-700 stroke-[0.5]"
          />
          <text
            x={0}
            y={4}
            textAnchor="middle"
            className="fill-zinc-400 text-[8px] font-mono font-medium"
          >
            {data.netName}
          </text>
        </g>
      )}

      {/* Animated current flow indicator when probed */}
      {isProbed && (
        <circle r={3} fill="#34d399" opacity={0.7}>
          <animateMotion dur="2s" repeatCount="indefinite" path={edgePath} />
        </circle>
      )}
    </>
  );
});

WireEdge.displayName = "WireEdge";
