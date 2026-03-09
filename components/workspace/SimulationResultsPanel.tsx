"use client";

import { MetricCard } from "./MetricCard";
import { ACResponseChart, TransientChart, MonteCarloChart } from "@/components/charts/SimulationCharts";
import type { SimulationResult } from "@/types/circuit";
import { SectionHeader } from "@/components/layout/SectionHeader";

interface SimulationResultsPanelProps {
  result: SimulationResult;
}

export function SimulationResultsPanel({ result }: SimulationResultsPanelProps) {
  return (
    <div className="space-y-6">
      {/* Metric cards grid */}
      <div>
        <SectionHeader title="Performance Metrics" subtitle="vs. design targets" />
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {result.metrics.map((m) => (
            <MetricCard key={m.id} metric={m} />
          ))}
        </div>
      </div>

      {/* Charts */}
      <div className="space-y-4">
        <SectionHeader title="Simulation Waveforms" accent="violet" />
        <div className="space-y-4">
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-4">
            <ACResponseChart
              acData={result.acResponse}
              phaseData={result.phaseResponse}
            />
          </div>
          <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-4">
            <TransientChart data={result.transientResponse} />
          </div>
        </div>
      </div>

      {/* Monte Carlo (optional) */}
      {result.monteCarloGain && result.monteCarloPhaseMargin && (
        <div className="space-y-4">
          <SectionHeader title="Monte Carlo Analysis" subtitle="200-point process variation" accent="emerald" />
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-4">
              <MonteCarloChart
                data={result.monteCarloGain}
                label="DC Gain"
                unit=" dB"
                target={60}
              />
            </div>
            <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 px-4 py-4">
              <MonteCarloChart
                data={result.monteCarloPhaseMargin}
                label="Phase Margin"
                unit="°"
                target={60}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <div className="w-4 h-px bg-red-500" />
            <span>Red dashed line = minimum target</span>
          </div>
        </div>
      )}
    </div>
  );
}
