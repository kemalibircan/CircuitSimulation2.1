import { mockRun } from "@/data/mockRun";
import { CandidateComparisonTable } from "@/components/workspace/CandidateComparisonTable";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { mockRunsList } from "@/data/mockRunsList";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function ComparisonsPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Candidate Comparison</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Evaluated topologies from the latest agent run, ranked by composite score
        </p>
      </div>

      {/* Run context */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 flex items-center gap-3">
        <StatusBadge status="complete" />
        <div className="flex-1 min-w-0">
          <p className="text-xs text-zinc-300 line-clamp-1">
            {mockRun.requirement.naturalLanguagePrompt}
          </p>
        </div>
        <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0">{mockRun.id}</span>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <SectionHeader
          title="Topology Candidates"
          subtitle={`${mockRun.candidates.length} candidates evaluated`}
        />
        <CandidateComparisonTable candidates={mockRun.candidates} />
      </div>

      {/* Score formula note */}
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 space-y-1.5">
        <p className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Score Methodology</p>
        <p className="text-xs text-zinc-600">
          Score = 0.3 × Gain_norm + 0.25 × BW_norm + 0.25 × PM_norm + 0.2 × (1 − Power_norm)
          <br />
          Normalized against design targets. Hard-constraint violations incur a 25-point penalty.
        </p>
      </div>
    </div>
  );
}
