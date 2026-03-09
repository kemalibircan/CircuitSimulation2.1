import { mockRun } from "@/data/mockRun";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { DesignSummaryCard } from "@/components/workspace/DesignSummaryCard";
import { NetlistViewer } from "@/components/workspace/NetlistViewer";
import { SimulationResultsPanel } from "@/components/workspace/SimulationResultsPanel";
import { IterationList } from "@/components/workspace/IterationList";
import { CandidateComparisonTable } from "@/components/workspace/CandidateComparisonTable";
import { AgentProgressTimeline } from "@/components/workspace/AgentProgressTimeline";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { formatDate } from "@/lib/utils";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function RunDetailPage({ params }: { params: { id: string } }) {
  // In production: fetch run by params.id from API
  const run = mockRun;

  return (
    <div className="p-6 space-y-8">
      {/* Back + Header */}
      <div className="space-y-3">
        <Link
          href="/runs"
          className="inline-flex items-center gap-2 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Runs
        </Link>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold text-zinc-100">Run {params.id}</h1>
              <StatusBadge status={run.status} />
            </div>
            <p className="text-sm text-zinc-500 mt-1 max-w-2xl line-clamp-2">
              {run.requirement.naturalLanguagePrompt}
            </p>
            <p className="text-[11px] text-zinc-600 mt-1">
              Started {formatDate(run.startedAt)}
              {run.completedAt && ` · Completed ${formatDate(run.completedAt)}`}
            </p>
          </div>
        </div>
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Agent Progress */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <SectionHeader title="Agent Workflow" />
          <AgentProgressTimeline steps={run.steps} />
        </div>

        {/* Design Summary */}
        {run.designSummary && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
            <SectionHeader title="Design Output" accent="violet" />
            <DesignSummaryCard summary={run.designSummary} />
          </div>
        )}
      </div>

      {/* Netlist */}
      {run.netlist && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <SectionHeader title="SPICE Netlist" accent="emerald" />
          <NetlistViewer netlist={run.netlist} />
        </div>
      )}

      {/* Simulation Results */}
      {run.simulationResult && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
          <SimulationResultsPanel result={run.simulationResult} />
        </div>
      )}

      {/* Iterations */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <SectionHeader title="Optimization Iterations" accent="amber" />
        <IterationList iterations={run.iterations} />
      </div>

      {/* Candidates */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <SectionHeader title="Topology Candidates" />
        <CandidateComparisonTable candidates={run.candidates} />
      </div>
    </div>
  );
}
