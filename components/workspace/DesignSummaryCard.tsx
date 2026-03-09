"use client";

import { Cpu, Star, Info } from "lucide-react";
import { cn, confidenceColor, formatConfidence } from "@/lib/utils";
import type { DesignSummary } from "@/types/circuit";
import { SectionHeader } from "@/components/layout/SectionHeader";

interface DesignSummaryCardProps {
  summary: DesignSummary;
}

export function DesignSummaryCard({ summary }: DesignSummaryCardProps) {
  const confColor = confidenceColor(summary.confidenceScore);
  const confLabel = formatConfidence(summary.confidenceScore);

  return (
    <div className="space-y-5">
      {/* Topology identity */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
            <Cpu className="w-4 h-4 text-violet-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-zinc-100">
              {summary.topologyName}
            </h3>
            <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
              {summary.topologyDescription}
            </p>
          </div>
        </div>
        {/* Confidence */}
        <div className="flex-shrink-0 text-right">
          <div
            className={cn(
              "text-xl font-bold font-mono",
              confColor
            )}
          >
            {Math.round(summary.confidenceScore * 100)}%
          </div>
          <div className={cn("text-[10px] font-medium uppercase tracking-widest", confColor)}>
            {confLabel} confidence
          </div>
        </div>
      </div>

      {/* Rationale */}
      <div className="px-4 py-3 rounded-xl bg-zinc-900/60 border border-zinc-800/60">
        <div className="flex items-center gap-1.5 mb-2">
          <Info className="w-3 h-3 text-cyan-400" />
          <span className="text-[10px] font-semibold text-cyan-400 uppercase tracking-widest">
            Agent Rationale
          </span>
        </div>
        <p className="text-xs text-zinc-400 leading-relaxed">{summary.rationale}</p>
      </div>

      {/* Transistor sizing table */}
      <div>
        <SectionHeader title="Transistor Sizing" accent="violet" />
        <div className="overflow-x-auto rounded-xl border border-zinc-800">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/60">
                {["Device", "Type", "W (µm)", "L (µm)", "Role"].map((h) => (
                  <th
                    key={h}
                    className="px-3 py-2 text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {summary.transistorSizing.map((t) => (
                <tr
                  key={t.name}
                  className="hover:bg-zinc-900/40 transition-colors"
                >
                  <td className="px-3 py-2 font-mono text-cyan-400 font-medium">
                    {t.name}
                  </td>
                  <td className="px-3 py-2">
                    <span
                      className={cn(
                        "text-[10px] px-1.5 py-0.5 rounded border font-mono",
                        t.type === "PMOS"
                          ? "text-violet-400 border-violet-500/30 bg-violet-500/10"
                          : "text-cyan-400 border-cyan-500/30 bg-cyan-500/10"
                      )}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="px-3 py-2 font-mono text-zinc-300">{t.W}</td>
                  <td className="px-3 py-2 font-mono text-zinc-300">{t.L}</td>
                  <td className="px-3 py-2 text-zinc-500 text-[11px]">{t.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Operating assumptions */}
      <div>
        <SectionHeader title="Operating Assumptions" accent="emerald" />
        <ul className="space-y-1.5">
          {summary.operatingAssumptions.map((a, i) => (
            <li key={i} className="flex items-start gap-2">
              <Star className="w-3 h-3 text-emerald-500 flex-shrink-0 mt-0.5" />
              <span className="text-xs text-zinc-500">{a}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-2">
        <div className="px-3 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Bias Current</div>
          <div className="text-sm font-mono font-semibold text-zinc-200">
            {summary.biasCurrentUA} <span className="text-xs text-zinc-500">µA</span>
          </div>
        </div>
        <div className="px-3 py-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
          <div className="text-[10px] text-zinc-600 uppercase tracking-widest mb-1">Power Estimate</div>
          <div className="text-sm font-mono font-semibold text-zinc-200">
            {summary.powerEstimateUW} <span className="text-xs text-zinc-500">µW</span>
          </div>
        </div>
      </div>
    </div>
  );
}
