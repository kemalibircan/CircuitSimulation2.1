"use client";

import { useState, useMemo } from "react";
import { BarChart3, Eye, EyeOff, ChevronDown, ChevronUp, Zap, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { MetricCard } from "@/components/workspace/MetricCard";
import { DynamicWaveformChart, MonteCarloChart } from "@/components/charts/SimulationCharts";
import type { SimulationResult, WaveformData, SignalInfo } from "@/types/circuit";

// ── Topology display names ─────────────────────────────────────────────────

const TOPOLOGY_LABELS: Record<string, string> = {
  voltage_divider: "Voltage Divider",
  resistor_network: "Resistor Network",
  rc_filter: "RC Filter",
  lc_filter: "LC Filter",
  amplifier: "Amplifier",
  common_source: "Common Source",
  bjt_amplifier: "BJT Amplifier",
  current_mirror: "Current Mirror",
  comparator: "Comparator",
  voltage_regulator: "Voltage Regulator",
  oscillator: "Oscillator",
  bandgap_reference: "Bandgap Reference",
  general: "General Circuit",
  unknown: "Circuit",
};

// ── Main Panel ─────────────────────────────────────────────────────────────

interface SimulationResultsPanelProps {
  result: SimulationResult;
}

export function SimulationResultsPanel({ result }: SimulationResultsPanelProps) {
  const { metrics, waveforms, availableSignals, topologyType } = result;

  // Separate recommended vs optional waveforms
  const recommendedWaveforms = useMemo(
    () => (waveforms || []).filter((w) => w.isRecommended).sort((a, b) => a.priority - b.priority),
    [waveforms]
  );
  const optionalWaveforms = useMemo(
    () => (waveforms || []).filter((w) => !w.isRecommended),
    [waveforms]
  );

  // User-enabled optional waveforms
  const [enabledOptional, setEnabledOptional] = useState<Set<string>>(new Set());
  const [showSignalBrowser, setShowSignalBrowser] = useState(false);
  const [showMonteCarlo, setShowMonteCarlo] = useState(true);

  const toggleOptional = (id: string) => {
    setEnabledOptional((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const activeOptionalWaveforms = optionalWaveforms.filter((w) => enabledOptional.has(w.id));

  const topologyLabel = TOPOLOGY_LABELS[topologyType || "unknown"] || topologyType || "Circuit";

  // Determine if we have legacy Monte Carlo data
  const hasMonteCarlo = result.monteCarloGain?.length || result.monteCarloPhaseMargin?.length;

  // If no dynamic waveforms, fall back to legacy data
  const hasWaveforms = recommendedWaveforms.length > 0 || activeOptionalWaveforms.length > 0;

  return (
    <div className="space-y-6">
      {/* ── Topology Badge ── */}
      <div className="flex items-center justify-between">
        <SectionHeader
          title="Simulation Results"
          subtitle={`${topologyLabel} Analysis`}
          accent="violet"
        />
        <div className="flex items-center gap-2">
          {topologyType && (
            <span className="px-2.5 py-1 rounded-lg bg-violet-500/10 border border-violet-500/20 text-[10px] font-semibold text-violet-400 uppercase tracking-widest">
              {topologyLabel}
            </span>
          )}
          <span className="px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-[10px] font-mono text-zinc-400">
            {recommendedWaveforms.length} graphs · {metrics.length} metrics
          </span>
        </div>
      </div>

      {/* ── Performance Metrics ── */}
      {metrics.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Performance Metrics
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {metrics.map((m) => (
              <MetricCard key={m.id} metric={m} />
            ))}
          </div>
        </div>
      )}

      {/* ── Recommended Graphs ── */}
      {recommendedWaveforms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Recommended Graphs
            </span>
            <span className="text-[10px] text-zinc-600 ml-1">
              (based on {topologyLabel.toLowerCase()} topology)
            </span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {recommendedWaveforms.map((wf) => (
              <WaveformCard key={wf.id} waveform={wf} />
            ))}
          </div>
        </div>
      )}

      {/* ── User-Added Graphs ── */}
      {activeOptionalWaveforms.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Eye className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">
              Custom Signals
            </span>
          </div>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {activeOptionalWaveforms.map((wf) => (
              <WaveformCard
                key={wf.id}
                waveform={wf}
                onRemove={() => toggleOptional(wf.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Monte Carlo (legacy) ── */}
      {hasMonteCarlo && (
        <div>
          <button
            onClick={() => setShowMonteCarlo(!showMonteCarlo)}
            className="flex items-center gap-2 mb-3 group cursor-pointer"
          >
            <Zap className="w-3.5 h-3.5 text-yellow-400" />
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-300 transition-colors">
              Monte Carlo Analysis
            </span>
            {showMonteCarlo ? (
              <ChevronUp className="w-3 h-3 text-zinc-600" />
            ) : (
              <ChevronDown className="w-3 h-3 text-zinc-600" />
            )}
          </button>
          {showMonteCarlo && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.monteCarloGain?.length && (
                <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/60 p-4">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                    Gain Distribution
                  </div>
                  <MonteCarloChart data={result.monteCarloGain} label="DC Gain (dB)" color="#22d3ee" />
                </div>
              )}
              {result.monteCarloPhaseMargin?.length && (
                <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/60 p-4">
                  <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest mb-2">
                    Phase Margin Distribution
                  </div>
                  <MonteCarloChart data={result.monteCarloPhaseMargin} label="Phase Margin (°)" color="#a78bfa" />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Signal Browser ── */}
      {(availableSignals?.length > 0 || optionalWaveforms.length > 0) && (
        <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/60 p-4">
          <button
            onClick={() => setShowSignalBrowser(!showSignalBrowser)}
            className="flex items-center justify-between w-full group cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <Eye className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest group-hover:text-zinc-300 transition-colors">
                Available Signals & Graphs
              </span>
              <span className="text-[10px] text-zinc-600">
                ({availableSignals?.length || 0} signals, {optionalWaveforms.length} optional graphs)
              </span>
            </div>
            {showSignalBrowser ? (
              <ChevronUp className="w-4 h-4 text-zinc-600" />
            ) : (
              <ChevronDown className="w-4 h-4 text-zinc-600" />
            )}
          </button>

          {showSignalBrowser && (
            <div className="mt-4 space-y-4">
              {/* Available signals info */}
              {availableSignals?.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
                    Observable Signals
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableSignals.map((sig: SignalInfo) => (
                      <span
                        key={sig.name}
                        className={cn(
                          "px-2.5 py-1 rounded-lg text-[10px] font-mono border",
                          sig.type === "voltage"
                            ? "bg-cyan-500/5 border-cyan-500/20 text-cyan-400"
                            : "bg-amber-500/5 border-amber-500/20 text-amber-400"
                        )}
                      >
                        {sig.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Optional waveform toggles */}
              {optionalWaveforms.length > 0 && (
                <div>
                  <div className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest mb-2">
                    Optional Graphs
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {optionalWaveforms.map((wf) => (
                      <button
                        key={wf.id}
                        onClick={() => toggleOptional(wf.id)}
                        className={cn(
                          "flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-medium border transition-all",
                          enabledOptional.has(wf.id)
                            ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-300"
                            : "bg-zinc-900/50 border-zinc-800 text-zinc-500 hover:text-zinc-400 hover:border-zinc-700"
                        )}
                      >
                        {enabledOptional.has(wf.id) ? (
                          <Eye className="w-3 h-3" />
                        ) : (
                          <EyeOff className="w-3 h-3" />
                        )}
                        {wf.title}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Empty state if no waveforms at all ── */}
      {!hasWaveforms && metrics.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed border-zinc-800 rounded-2xl">
          <BarChart3 className="w-8 h-8 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">No simulation data available</p>
          <p className="text-xs text-zinc-700 mt-1">Run a simulation to see dynamic graphs and metrics</p>
        </div>
      )}
    </div>
  );
}

// ── Waveform Card Component ────────────────────────────────────────────────

function WaveformCard({
  waveform,
  onRemove,
}: {
  waveform: WaveformData;
  onRemove?: () => void;
}) {
  return (
    <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/60 p-4 hover:border-zinc-700/60 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <div
            className={cn(
              "w-1.5 h-1.5 rounded-full",
              waveform.isRecommended ? "bg-cyan-400" : "bg-amber-400"
            )}
          />
          <span className="text-xs font-semibold text-zinc-300">{waveform.title}</span>
        </div>
        <div className="flex items-center gap-2">
          {waveform.signals.length > 0 && (
            <span className="text-[9px] font-mono text-zinc-600">
              {waveform.signals.slice(0, 2).join(", ")}
              {waveform.signals.length > 2 && ` +${waveform.signals.length - 2}`}
            </span>
          )}
          {onRemove && (
            <button
              onClick={onRemove}
              className="text-[9px] text-zinc-600 hover:text-red-400 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>
      <DynamicWaveformChart waveform={waveform} height={240} />
    </div>
  );
}
