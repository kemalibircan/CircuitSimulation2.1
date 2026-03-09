"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  ReferenceLine,
} from "recharts";
import { formatFrequency } from "@/lib/utils";
import type {
  ChartDataPoint,
  MonteCarloDataPoint,
} from "@/types/circuit";

// ──────────────────────────────────────────────────────────────────────────────
// Custom tooltip
// ──────────────────────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
  xFormatter,
  yUnit,
}: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: number;
  xFormatter?: (v: number) => string;
  yUnit?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-zinc-900 border border-zinc-700 px-3 py-2 shadow-xl text-xs font-mono">
      <div className="text-zinc-400 mb-1">{xFormatter ? xFormatter(label ?? 0) : label}</div>
      {payload.map((p) => (
        <div key={p.name} style={{ color: p.color }}>
          {p.name}: {p.value.toFixed(2)} {yUnit ?? ""}
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// AC Response (Gain + Phase, tabbed via prop)
// ──────────────────────────────────────────────────────────────────────────────

interface ACResponseChartProps {
  acData: ChartDataPoint[];
  phaseData: ChartDataPoint[];
}

export function ACResponseChart({ acData, phaseData }: ACResponseChartProps) {
  // Downsample for performance: 1 in 3 points
  const sampled = acData.filter((_, i) => i % 3 === 0);
  const sampledPhase = phaseData.filter((_, i) => i % 3 === 0);

  // Merge
  const merged = sampled.map((d, i) => ({
    freq: d.x,
    gain: parseFloat(d.y.toFixed(2)),
    phase: parseFloat((sampledPhase[i]?.y ?? 0).toFixed(1)),
  }));

  return (
    <div className="space-y-1">
      <label className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">AC Response (Bode)</label>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={merged} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="freq"
            scale="log"
            domain={["auto", "auto"]}
            type="number"
            tickFormatter={(v: number) => formatFrequency(v)}
            tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={false}
          />
          <YAxis
            yAxisId="gain"
            tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            unit=" dB"
          />
          <YAxis
            yAxisId="phase"
            orientation="right"
            tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            unit="°"
          />
          <Tooltip
            content={
              <CustomTooltip
                xFormatter={formatFrequency}
              />
            }
          />
          <Legend
            wrapperStyle={{ fontSize: "10px", color: "#71717a" }}
          />
          <ReferenceLine yAxisId="gain" y={0} stroke="#3f3f46" strokeDasharray="4 4" />
          <Line
            yAxisId="gain"
            type="monotone"
            dataKey="gain"
            stroke="#22d3ee"
            strokeWidth={1.5}
            dot={false}
            name="Gain (dB)"
          />
          <Line
            yAxisId="phase"
            type="monotone"
            dataKey="phase"
            stroke="#a78bfa"
            strokeWidth={1.5}
            dot={false}
            name="Phase (°)"
            strokeDasharray="4 2"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Transient Response
// ──────────────────────────────────────────────────────────────────────────────

export function TransientChart({ data }: { data: ChartDataPoint[] }) {
  const mapped = data.map((d) => ({
    t: d.x,
    vout: parseFloat(d.y.toFixed(4)),
  }));

  return (
    <div className="space-y-1">
      <label className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">Transient Response</label>
      <ResponsiveContainer width="100%" height={160}>
        <LineChart data={mapped} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="t"
            tickFormatter={(v: number) => `${v}ns`}
            tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
            axisLine={{ stroke: "#3f3f46" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 10, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            unit="V"
          />
          <Tooltip
            content={
              <CustomTooltip yUnit="V" />
            }
          />
          <Line
            type="monotone"
            dataKey="vout"
            stroke="#34d399"
            strokeWidth={1.5}
            dot={false}
            name="V_out (V)"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Monte Carlo Distribution
// ──────────────────────────────────────────────────────────────────────────────

export function MonteCarloChart({
  data,
  label,
  unit,
  target,
}: {
  data: MonteCarloDataPoint[];
  label: string;
  unit: string;
  target?: number;
}) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] text-zinc-600 font-mono uppercase tracking-widest">
        Monte Carlo — {label}
      </label>
      <ResponsiveContainer width="100%" height={130}>
        <BarChart data={data} margin={{ top: 4, right: 12, left: -12, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
          <XAxis
            dataKey="value"
            tickFormatter={(v: number) => `${v}${unit}`}
            tick={{ fill: "#52525b", fontSize: 9, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fill: "#52525b", fontSize: 9, fontFamily: "monospace" }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            content={
              <CustomTooltip yUnit="samples" />
            }
          />
          {target !== undefined && (
            <ReferenceLine
              x={target}
              stroke="#ef4444"
              strokeDasharray="4 2"
              strokeWidth={1.5}
            />
          )}
          <Bar dataKey="count" fill="#22d3ee" opacity={0.7} radius={[2, 2, 0, 0]} name="Count" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
