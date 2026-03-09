"use client";

import { useState } from "react";
import {
  CheckCircle2,
  Circle,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDuration } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { AgentStep } from "@/types/circuit";

const stepIcons = {
  pending: Circle,
  running: Loader2,
  complete: CheckCircle2,
  failed: XCircle,
};

const stepColors = {
  pending: "text-zinc-600",
  running: "text-cyan-400",
  complete: "text-emerald-400",
  failed: "text-red-400",
};

const connectorColors = {
  pending: "bg-zinc-800",
  running: "bg-cyan-500/50",
  complete: "bg-emerald-500/50",
  failed: "bg-red-500/50",
};

interface AgentProgressTimelineProps {
  steps: AgentStep[];
}

function StepItem({
  step,
  isLast,
}: {
  step: AgentStep;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(step.status === "running");
  const Icon = stepIcons[step.status];

  return (
    <div className="flex gap-3">
      {/* Icon + connector line */}
      <div className="flex flex-col items-center flex-shrink-0">
        <div
          className={cn(
            "w-7 h-7 rounded-full border flex items-center justify-center flex-shrink-0 z-10",
            step.status === "running"
              ? "bg-cyan-500/10 border-cyan-500/40"
              : step.status === "complete"
              ? "bg-emerald-500/10 border-emerald-500/40"
              : step.status === "failed"
              ? "bg-red-500/10 border-red-500/40"
              : "bg-zinc-900 border-zinc-800"
          )}
        >
          <Icon
            className={cn(
              "w-3.5 h-3.5",
              stepColors[step.status],
              step.status === "running" && "animate-spin"
            )}
          />
        </div>
        {!isLast && (
          <div
            className={cn(
              "w-px flex-1 mt-1 min-h-[24px]",
              connectorColors[step.status]
            )}
          />
        )}
      </div>

      {/* Content */}
      <div className={cn("pb-4 flex-1 min-w-0", isLast && "pb-0")}>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left flex items-start justify-between gap-2 group"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={cn(
                  "text-sm font-medium",
                  step.status === "pending"
                    ? "text-zinc-600"
                    : step.status === "running"
                    ? "text-cyan-300"
                    : "text-zinc-200"
                )}
              >
                {step.label}
              </span>
              <StatusBadge status={step.status} size="xs" />
              {step.durationMs !== undefined && (
                <span className="text-[10px] text-zinc-600 font-mono">
                  {formatDuration(step.durationMs)}
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-600 mt-0.5">{step.description}</p>
          </div>
          {(step.reasoning || step.logs.length > 0) && (
            <span className="text-zinc-600 group-hover:text-zinc-400 transition-colors mt-0.5 flex-shrink-0">
              {expanded ? (
                <ChevronDown className="w-3.5 h-3.5" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5" />
              )}
            </span>
          )}
        </button>

        {/* Expanded detail */}
        {expanded && (
          <div className="mt-2 space-y-2 animate-slide-in">
            {step.reasoning && (
              <div className="px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  {step.reasoning}
                </p>
              </div>
            )}
            {step.logs.length > 0 && (
              <div className="rounded-lg bg-zinc-950 border border-zinc-800/40 overflow-hidden">
                {step.logs.map((log, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2 px-3 py-1.5 border-b border-zinc-900 last:border-0"
                  >
                    <span className="text-[10px] font-mono text-zinc-600 flex-shrink-0 mt-0.5">
                      {log.timestamp}
                    </span>
                    <span
                      className={cn(
                        "text-[11px] font-mono leading-relaxed",
                        log.type === "result"
                          ? "text-emerald-400"
                          : log.type === "warning"
                          ? "text-amber-400"
                          : log.type === "reasoning"
                          ? "text-violet-400"
                          : "text-zinc-500"
                      )}
                    >
                      {log.message}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function AgentProgressTimeline({ steps }: AgentProgressTimelineProps) {
  const doneCount = steps.filter((s) => s.status === "complete").length;
  const pct = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-4">
      {/* Progress bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-zinc-600 font-mono">
            {doneCount}/{steps.length} steps
          </span>
          <span className="text-[10px] text-zinc-600 font-mono">{pct}%</span>
        </div>
        <div className="h-1 rounded-full bg-zinc-900 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {/* Steps */}
      <div>
        {steps.map((step, i) => (
          <StepItem key={step.id} step={step} isLast={i === steps.length - 1} />
        ))}
      </div>
    </div>
  );
}
