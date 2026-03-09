import { mockRunsList } from "@/data/mockRunsList";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { formatDate } from "@/lib/utils";
import { Clock, RotateCcw } from "lucide-react";
import Link from "next/link";

export default function HistoryPage() {
  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Design History</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Previously submitted design requirements and their status
        </p>
      </div>

      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5">
        <SectionHeader
          title="Past Requirements"
          subtitle={`${mockRunsList.length} sessions`}
          accent="amber"
        />

        <div className="space-y-2">
          {mockRunsList.map((run, i) => (
            <div
              key={run.id}
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
              <Link
                href="/workspace"
                className="flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 text-[11px] text-zinc-500 hover:text-zinc-300 transition-all opacity-0 group-hover:opacity-100"
              >
                <RotateCcw className="w-3 h-3" />
                Re-run
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
