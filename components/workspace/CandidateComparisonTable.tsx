import { cn } from "@/lib/utils";
import type { CircuitCandidate } from "@/types/circuit";
import { Trophy, X, Clock } from "lucide-react";

interface CandidateComparisonTableProps {
  candidates: CircuitCandidate[];
}

const statusConfig = {
  selected: {
    rowCls: "bg-emerald-500/5 border-l-2 border-l-emerald-500",
    badge: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    icon: <Trophy className="w-3 h-3 text-emerald-400" />,
    label: "Selected",
  },
  rejected: {
    rowCls: "opacity-60",
    badge: "bg-red-500/10 text-red-400 border-red-500/30",
    icon: <X className="w-3 h-3 text-red-400" />,
    label: "Rejected",
  },
  pending: {
    rowCls: "",
    badge: "bg-zinc-800 text-zinc-500 border-zinc-700",
    icon: <Clock className="w-3 h-3 text-zinc-500" />,
    label: "Pending",
  },
};

const columns: { key: keyof CircuitCandidate; label: string; unit: string }[] = [
  { key: "rank", label: "Rank", unit: "" },
  { key: "topologyName", label: "Topology", unit: "" },
  { key: "gainDB", label: "Gain", unit: "dB" },
  { key: "bandwidthMHz", label: "GBW", unit: "MHz" },
  { key: "phaseMarginDeg", label: "PM", unit: "°" },
  { key: "powerMW", label: "Power", unit: "mW" },
  { key: "noiseNVSqrtHz", label: "Noise", unit: "nV/√Hz" },
  { key: "score", label: "Score", unit: "/100" },
];

export function CandidateComparisonTable({ candidates }: CandidateComparisonTableProps) {
  const sorted = [...candidates].sort((a, b) => a.rank - b.rank);

  return (
    <div className="overflow-x-auto rounded-xl border border-zinc-800">
      <table className="w-full text-xs min-w-[600px]">
        <thead>
          <tr className="bg-zinc-900/70 border-b border-zinc-800">
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest whitespace-nowrap"
              >
                {col.label}
                {col.unit && (
                  <span className="text-zinc-700 font-normal"> ({col.unit})</span>
                )}
              </th>
            ))}
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Status
            </th>
            <th className="px-4 py-3 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
              Notes
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {sorted.map((candidate) => {
            const cfg = statusConfig[candidate.status];
            return (
              <tr
                key={candidate.id}
                className={cn(
                  "hover:bg-zinc-900/30 transition-colors",
                  cfg.rowCls
                )}
              >
                <td className="px-4 py-3">
                  <span className="font-mono font-bold text-zinc-400">
                    #{candidate.rank}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-zinc-200 whitespace-nowrap">
                    {candidate.topologyName}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-zinc-300">{candidate.gainDB}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{candidate.bandwidthMHz}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{candidate.phaseMarginDeg}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{candidate.powerMW}</td>
                <td className="px-4 py-3 font-mono text-zinc-300">{candidate.noiseNVSqrtHz}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1">
                    <div
                      className="h-1.5 rounded-full bg-zinc-800 w-12 overflow-hidden"
                    >
                      <div
                        className={cn(
                          "h-full rounded-full",
                          candidate.score >= 80
                            ? "bg-emerald-500"
                            : candidate.score >= 60
                            ? "bg-amber-500"
                            : "bg-red-500"
                        )}
                        style={{ width: `${candidate.score}%` }}
                      />
                    </div>
                    <span className="font-mono font-semibold text-zinc-300">
                      {candidate.score}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-medium",
                      cfg.badge
                    )}
                  >
                    {cfg.icon}
                    {cfg.label}
                  </span>
                </td>
                <td className="px-4 py-3 text-zinc-600 max-w-[200px]">
                  <p className="text-[10px] leading-relaxed line-clamp-2">
                    {candidate.selectionReason ?? candidate.rejectionReason ?? "—"}
                  </p>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
