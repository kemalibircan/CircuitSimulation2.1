"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";
import type { WaveformData, ChartDataPoint } from "@/types/circuit";

// ── Color palette for multi-signal charts ──────────────────────────────────

const SIGNAL_COLORS = [
  "#22d3ee", // cyan-400
  "#a78bfa", // violet-400
  "#34d399", // emerald-400
  "#f97316", // orange-500
  "#f472b6", // pink-400
  "#facc15", // yellow-400
  "#60a5fa", // blue-400
  "#fb923c", // orange-400
];

// ── Axis formatting helpers ────────────────────────────────────────────────

function formatFrequency(value: number): string {
  if (value >= 1e9) return `${(value / 1e9).toFixed(1)}G`;
  if (value >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  return value.toFixed(1);
}

function formatTime(value: number): string {
  if (value >= 1) return `${value.toFixed(2)}s`;
  if (value >= 1e-3) return `${(value * 1e3).toFixed(1)}ms`;
  if (value >= 1e-6) return `${(value * 1e6).toFixed(1)}µs`;
  if (value >= 1e-9) return `${(value * 1e9).toFixed(1)}ns`;
  return value.toExponential(1);
}

function formatGeneric(value: number): string {
  if (Math.abs(value) >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (Math.abs(value) >= 1e3) return `${(value / 1e3).toFixed(1)}k`;
  if (Math.abs(value) < 0.01 && value !== 0) return value.toExponential(1);
  return value.toFixed(2);
}

function getXFormatter(chartType: string): (v: number) => string {
  if (chartType === "bode_magnitude" || chartType === "bode_phase") return formatFrequency;
  if (chartType === "time_domain") return formatTime;
  return formatGeneric;
}

// ── Dynamic Waveform Chart — renders any WaveformData ──────────────────────

interface DynamicWaveformChartProps {
  waveform: WaveformData;
  height?: number;
}

export function DynamicWaveformChart({ waveform, height = 280 }: DynamicWaveformChartProps) {
  const { chartType, data, title, xLabel, xUnit, yLabel, yUnit, signals } = waveform;

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-xs text-zinc-600 border border-dashed border-zinc-800 rounded-xl">
        No data available for {title}
      </div>
    );
  }

  if (chartType === "bar") {
    return <BarMetricChart data={data} title={title} yLabel={yLabel} yUnit={yUnit} height={height} />;
  }

  const xFormatter = getXFormatter(chartType);
  const isLogX = chartType === "bode_magnitude" || chartType === "bode_phase";

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={data} margin={{ top: 8, right: 24, left: 12, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
          <XAxis
            dataKey="x"
            type="number"
            scale={isLogX ? "log" : "linear"}
            domain={isLogX ? ["dataMin", "dataMax"] : ["auto", "auto"]}
            tickFormatter={xFormatter}
            stroke="#52525b"
            tick={{ fill: "#71717a", fontSize: 10 }}
            label={{ value: `${xLabel} (${xUnit})`, position: "insideBottom", offset: -2, fill: "#71717a", fontSize: 10 }}
          />
          <YAxis
            stroke="#52525b"
            tick={{ fill: "#71717a", fontSize: 10 }}
            tickFormatter={(v: number) => {
              const abs = Math.abs(v);
              if (abs === 0) return "0";
              if (abs >= 1) return v.toFixed(2);
              if (abs >= 1e-3) return `${(v * 1e3).toFixed(1)}m`;
              if (abs >= 1e-6) return `${(v * 1e6).toFixed(1)}µ`;
              if (abs >= 1e-9) return `${(v * 1e9).toFixed(1)}n`;
              return v.toExponential(1);
            }}
            label={{ value: `${yLabel} (${yUnit})`, angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 10 }}
          />
          <Tooltip
            contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px", fontSize: "11px" }}
            labelStyle={{ color: "#a1a1aa" }}
            labelFormatter={(v) => `${xLabel}: ${xFormatter(Number(v))}`}
            formatter={(value: number) => [`${value.toFixed(3)} ${yUnit}`, yLabel]}
          />
          {signals.length > 1 && (
            <Legend
              wrapperStyle={{ fontSize: "10px", color: "#a1a1aa" }}
              iconType="line"
            />
          )}
          <Line
            type="monotone"
            dataKey="y"
            stroke={SIGNAL_COLORS[0]}
            strokeWidth={2}
            dot={false}
            name={signals[0] || yLabel}
            activeDot={{ r: 3, fill: SIGNAL_COLORS[0] }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Bar chart for discrete metrics ─────────────────────────────────────────

interface BarMetricChartProps {
  data: ChartDataPoint[];
  title: string;
  yLabel: string;
  yUnit: string;
  height?: number;
}

function BarMetricChart({ data, yLabel, yUnit, height = 200 }: BarMetricChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 24, left: 12, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="label" stroke="#52525b" tick={{ fill: "#71717a", fontSize: 10 }} />
        <YAxis
          stroke="#52525b"
          tick={{ fill: "#71717a", fontSize: 10 }}
          label={{ value: `${yLabel} (${yUnit})`, angle: -90, position: "insideLeft", fill: "#71717a", fontSize: 10 }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px", fontSize: "11px" }}
          labelStyle={{ color: "#a1a1aa" }}
        />
        <Bar dataKey="y" radius={[4, 4, 0, 0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={SIGNAL_COLORS[i % SIGNAL_COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ── Legacy charts (kept for backwards compatibility) ───────────────────────

interface LegacyChartProps {
  data: ChartDataPoint[];
  height?: number;
}

export function ACResponseChart({ data, height = 260 }: LegacyChartProps) {
  return (
    <DynamicWaveformChart
      waveform={{
        id: "legacy-ac",
        title: "AC Response",
        chartType: "bode_magnitude",
        xLabel: "Frequency",
        xUnit: "Hz",
        yLabel: "Gain",
        yUnit: "dB",
        signals: ["V(out)"],
        data,
        isRecommended: true,
        priority: 1,
      }}
      height={height}
    />
  );
}

export function TransientChart({ data, height = 260 }: LegacyChartProps) {
  return (
    <DynamicWaveformChart
      waveform={{
        id: "legacy-transient",
        title: "Transient Response",
        chartType: "time_domain",
        xLabel: "Time",
        xUnit: "s",
        yLabel: "Voltage",
        yUnit: "V",
        signals: ["V(out)"],
        data,
        isRecommended: true,
        priority: 2,
      }}
      height={height}
    />
  );
}

export function MonteCarloChart({
  data,
  label = "Distribution",
  color = "#22d3ee",
}: {
  data: { value: number; count: number }[];
  label?: string;
  color?: string;
}) {
  if (!data?.length) return null;
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 8, right: 24, left: 12, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
        <XAxis dataKey="value" stroke="#52525b" tick={{ fill: "#71717a", fontSize: 10 }} tickFormatter={(v: number) => v.toFixed(1)} />
        <YAxis stroke="#52525b" tick={{ fill: "#71717a", fontSize: 10 }} />
        <Tooltip
          contentStyle={{ backgroundColor: "#18181b", border: "1px solid #3f3f46", borderRadius: "12px", fontSize: "11px" }}
          labelStyle={{ color: "#a1a1aa" }}
        />
        <Bar dataKey="count" fill={color} radius={[3, 3, 0, 0]} name={label} />
      </BarChart>
    </ResponsiveContainer>
  );
}
