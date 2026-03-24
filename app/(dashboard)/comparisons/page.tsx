"use client";

import { useState, useEffect } from "react";
import { api, mapApiRunToFrontend, mapApiRunSummaryToFrontend } from "@/lib/api";
import type { AgentRun, AgentRunSummary } from "@/types/circuit";
import { CandidateComparisonTable } from "@/components/workspace/CandidateComparisonTable";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { ChevronDown, AlertCircle } from "lucide-react";

export default function ComparisonsPage() {
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<AgentRun | null>(null);
  const [loadingRuns, setLoadingRuns] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch completed runs list
  useEffect(() => {
    async function fetchRuns() {
      setLoadingRuns(true);
      setError(null);
      try {
        const { runs: apiRuns } = await api.listRuns(1, 50);
        const mapped = apiRuns.map(mapApiRunSummaryToFrontend);
        const completedRuns = mapped.filter((r) => r.status === "complete" || (r.status as string) === "completed");
        setRuns(completedRuns);
        if (completedRuns.length > 0) {
          setSelectedRunId(completedRuns[0].id);
        }
      } catch (err) {
        setError("Could not load runs. Make sure the API server is running.");
        console.error(err);
      } finally {
        setLoadingRuns(false);
      }
    }
    fetchRuns();
  }, []);

  // Fetch run detail when selection changes
  useEffect(() => {
    if (!selectedRunId) return;
    async function fetchRunDetail() {
      setLoadingDetail(true);
      try {
        const raw = await api.getRun(selectedRunId!);
        setSelectedRun(mapApiRunToFrontend(raw));
      } catch (err) {
        console.error("Failed to load run detail:", err);
        setSelectedRun(null);
      } finally {
        setLoadingDetail(false);
      }
    }
    fetchRunDetail();
  }, [selectedRunId]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Candidate Comparison</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Evaluated topologies from agent runs, ranked by composite score
        </p>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-xl border border-red-800/60 bg-red-950/20 p-4 text-sm text-red-400 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Loading state */}
      {loadingRuns && (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
        </div>
      )}

      {/* Empty state */}
      {!loadingRuns && !error && runs.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20">
          <p className="text-sm font-medium text-zinc-500">No completed runs to compare</p>
          <p className="text-xs text-zinc-700 mt-1">Complete a design run first to see candidate comparisons</p>
        </div>
      )}

      {/* Run selector + content */}
      {!loadingRuns && runs.length > 0 && (
        <>
          {/* Run selector */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 flex items-center gap-3">
            <StatusBadge status="complete" />
            <div className="flex-1 min-w-0 relative">
              <select
                value={selectedRunId || ""}
                onChange={(e) => setSelectedRunId(e.target.value)}
                className="w-full bg-transparent text-xs text-zinc-300 focus:outline-none appearance-none cursor-pointer pr-6"
              >
                {runs.map((r) => (
                  <option key={r.id} value={r.id} className="bg-zinc-900 text-zinc-300">
                    {r.prompt.slice(0, 100)}{r.prompt.length > 100 ? "..." : ""} [{r.id.slice(0, 8)}]
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* Loading detail */}
          {loadingDetail && (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
            </div>
          )}

          {/* Candidates table */}
          {!loadingDetail && selectedRun && selectedRun.candidates && selectedRun.candidates.length > 0 && (
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
              <SectionHeader
                title="Topology Candidates"
                subtitle={`${selectedRun.candidates.length} candidates evaluated`}
              />
              <CandidateComparisonTable candidates={selectedRun.candidates} />
            </div>
          )}

          {/* No candidates */}
          {!loadingDetail && selectedRun && (!selectedRun.candidates || selectedRun.candidates.length === 0) && (
            <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/20 p-8 text-center">
              <p className="text-sm text-zinc-500">No candidates found for this run</p>
            </div>
          )}

          {/* Score formula note */}
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 space-y-1.5">
            <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Score Methodology</p>
            <p className="text-xs text-zinc-600">
              Score = 0.3 × Gain_norm + 0.25 × BW_norm + 0.25 × PM_norm + 0.2 × (1 − Power_norm)
              <br />
              Normalized against design targets. Hard-constraint violations incur a 25-point penalty.
            </p>
          </div>
        </>
      )}
    </div>
  );
}
