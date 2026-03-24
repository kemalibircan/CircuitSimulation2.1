"use client";

import { useState, useEffect } from "react";
import { api, mapApiRunSummaryToFrontend } from "@/lib/api";
import type { AgentRunSummary } from "@/types/circuit";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { formatDate } from "@/lib/utils";
import { Play, Clock, Zap, RefreshCw } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const categoryLabels: Record<string, string> = {
  "op-amp": "Op-Amp",
  "current-mirror": "Current Mirror",
  "differential-pair": "Diff. Pair",
  lna: "LNA",
  bandgap: "Bandgap",
  oscillator: "Oscillator",
  filter: "Filter",
  comparator: "Comparator",
  "voltage-regulator": "Reg.",
  "charge-pump": "Charge Pump",
};

export default function RunsPage() {
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const { runs: apiRuns } = await api.listRuns(1, 50);
      setRuns(apiRuns.map(mapApiRunSummaryToFrontend));
    } catch (err) {
      setError("Could not connect to backend. Make sure the API server is running on port 8000.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRuns(); }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-zinc-100">Agent Runs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Previous design sessions and their outcomes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchRuns}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-zinc-300 transition-all bg-zinc-900/50"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <Link
            href="/workspace"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-sm font-medium transition-all shadow-lg shadow-cyan-500/20"
          >
            <Play className="w-4 h-4" />
            New Run
          </Link>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-800/60 bg-red-950/20 p-4 text-sm text-red-400">
          ⚠ {error}
        </div>
      )}

      {/* Loading state */}
      {loading && !error && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loading && !error && runs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3">
            <Zap className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-500">No runs yet</p>
          <p className="text-xs text-zinc-700 mt-1">Start a new design run from the workspace</p>
        </div>
      )}

      <div className="space-y-3">
        {runs.map((run) => (
          <Link
            key={run.id}
            href={`/runs/${run.id}`}
            className={cn(
              "block rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 hover:border-zinc-700 hover:bg-zinc-900 transition-all group"
            )}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className="w-10 h-10 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center flex-shrink-0 mt-0.5 group-hover:border-cyan-500/30 transition-colors">
                <Zap className="w-4 h-4 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                    {categoryLabels[run.category] ?? run.category}
                  </span>
                  <StatusBadge status={run.status} size="xs" />
                  <span className="text-[10px] font-mono text-zinc-600">{run.id.slice(0, 8)}</span>
                </div>
                <p className="text-sm text-zinc-300 line-clamp-1 mb-1">{run.prompt}</p>
                {run.topologyName && (
                  <p className="text-xs text-zinc-500">
                    Topology: <span className="text-cyan-400">{run.topologyName}</span>
                    {run.gainDB !== undefined && (
                      <> · Gain: <span className="font-mono">{run.gainDB} dB</span></>
                    )}
                    {run.bandwidthMHz !== undefined && (
                      <> · BW: <span className="font-mono">{run.bandwidthMHz} MHz</span></>
                    )}
                  </p>
                )}
              </div>

              {/* Timestamp */}
              <div className="flex-shrink-0 flex items-center gap-1 text-[10px] text-zinc-600 mt-1">
                <Clock className="w-3 h-3" />
                {formatDate(run.startedAt)}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

