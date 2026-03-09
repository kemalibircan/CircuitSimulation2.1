"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, TrendingUp, TrendingDown, Minus, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { IterationResult } from "@/types/circuit";
import { StatusBadge } from "@/components/ui/StatusBadge";

interface IterationCardProps {
  iteration: IterationResult;
  defaultOpen?: boolean;
}

function DeltaChip({ delta, unit }: { delta: number; unit: string }) {
  const isPositive = delta > 0;
  const isZero = delta === 0;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 text-[10px] font-mono px-1.5 py-0.5 rounded border",
        isZero
          ? "text-zinc-500 border-zinc-700"
          : isPositive
          ? "text-emerald-400 border-emerald-500/30 bg-emerald-500/10"
          : "text-red-400 border-red-500/30 bg-red-500/10"
      )}
    >
      {isZero ? (
        <Minus className="w-2.5 h-2.5" />
      ) : isPositive ? (
        <TrendingUp className="w-2.5 h-2.5" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5" />
      )}
      {isPositive ? "+" : ""}
      {delta.toFixed(1)} {unit}
    </span>
  );
}

function IterationCard({ iteration, defaultOpen = false }: IterationCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-200",
        iteration.allTargetsMet
          ? "border-emerald-500/30 bg-emerald-500/5"
          : "border-zinc-800 bg-zinc-900/40"
      )}
    >
      {/* Header */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 gap-3"
      >
        <div className="flex items-center gap-3">
          <div
            className={cn(
              "w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold font-mono",
              iteration.allTargetsMet
                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                : "bg-zinc-800 text-zinc-400 border border-zinc-700"
            )}
          >
            {iteration.iteration}
          </div>
          <div className="text-left">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-zinc-200">
                Iteration {iteration.iteration}
              </span>
              {iteration.allTargetsMet && (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              )}
            </div>
            <p className="text-xs text-zinc-500">
              {iteration.targetsMetCount}/{iteration.totalTargets} targets met
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <StatusBadge
            status={iteration.allTargetsMet ? "complete" : "warning"}
            size="xs"
            label={iteration.allTargetsMet ? "All met" : "Partial"}
          />
          {open ? (
            <ChevronDown className="w-4 h-4 text-zinc-600" />
          ) : (
            <ChevronRight className="w-4 h-4 text-zinc-600" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {open && (
        <div className="px-4 pb-4 space-y-4 border-t border-zinc-800/60 pt-4 animate-slide-in">
          {/* Parameter changes */}
          <div>
            <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest mb-2">
              Parameter Changes
            </p>
            <div className="space-y-1.5">
              {iteration.parameterChanges.map((p, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-xs bg-zinc-900/60 rounded-lg px-3 py-1.5"
                >
                  <span className="text-zinc-500 w-36 flex-shrink-0 font-mono text-[11px]">{p.parameter}</span>
                  <span className="font-mono text-zinc-600">{p.from}</span>
                  <span className="text-zinc-700">→</span>
                  <span className="font-mono text-cyan-400">{p.to}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metric deltas */}
          <div>
            <p className="text-[10px] text-zinc-600 font-semibold uppercase tracking-widest mb-2">
              Metric Improvements
            </p>
            <div className="flex flex-wrap gap-2">
              {iteration.metricDeltas.map((d, i) => (
                <div key={i} className="flex items-center gap-1.5">
                  <span className="text-[10px] text-zinc-500">{d.metric}</span>
                  <DeltaChip delta={d.delta} unit={d.unit} />
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div className="px-3 py-2.5 rounded-lg bg-zinc-950/60 border border-zinc-800/60">
            <p className="text-[11px] text-zinc-400 leading-relaxed italic">
              {iteration.notes}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

interface IterationListProps {
  iterations: IterationResult[];
}

export function IterationList({ iterations }: IterationListProps) {
  return (
    <div className="space-y-2">
      {iterations.map((iter, i) => (
        <IterationCard
          key={iter.id}
          iteration={iter}
          defaultOpen={i === iterations.length - 1}
        />
      ))}
    </div>
  );
}
