"use client";

import { useState, useEffect } from "react";
import { api, mapApiRunSummaryToFrontend } from "@/lib/api";
import type { AgentRunSummary } from "@/types/circuit";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { formatDate } from "@/lib/utils";
import { Clock, RotateCcw, RefreshCw } from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRuns = async () => {
    setLoading(true);
    setError(null);
    try {
      const { runs: apiRuns } = await api.listRuns(1, 100);
      setRuns(apiRuns.map(mapApiRunSummaryToFrontend));
    } catch (err) {
      setError("Could not load design history. Make sure the API server is running.");
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
          <h1 className="text-lg font-bold text-zinc-100">Design History</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Previously submitted design requirements and their status
          </p>
        </div>
        <button
          onClick={fetchRuns}
          className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-zinc-300 transition-all bg-zinc-900/50"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
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
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <div className="w-12 h-12 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3">
            <Clock className="w-5 h-5 text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-500">No design history yet</p>
          <p className="text-xs text-zinc-700 mt-1">Completed design runs will appear here</p>
        </div>
      )}

      {/* Runs list */}
      {!loading && !error && runs.length > 0 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <SectionHeader
            title="Past Requirements"
            subtitle={`${runs.length} sessions`}
            accent="amber"
          />

          <div className="space-y-2">
            {runs.map((run, i) => (
              <Link
                key={run.id}
                href={`/runs/${run.id}`}
                className="flex items-start gap-4 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800/60 hover:border-zinc-700 transition-colors group"
              >
                {/* Index */}
                <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center text-[11px] font-mono text-zinc-500 flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-medium text-zinc-400 uppercase">{run.category}</span>
                    <StatusBadge status={run.status} size="xs" />
                  </div>
                  <p className="text-sm text-zinc-300 line-clamp-2">{run.prompt}</p>
                  <div className="flex items-center gap-1.5 mt-1.5 text-[10px] text-zinc-600">
                    <Clock className="w-3 h-3" />
                    {formatDate(run.startedAt)}
                  </div>
                </div>

                {/* Rerun action */}
                <div
                  className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-500 hover:text-zinc-300 transition-all opacity-0 group-hover:opacity-100"
                >
                  <RotateCcw className="w-3 h-3" />
                  Re-run
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
