import { cn } from "@/lib/utils";
import type { RunStatus, AgentStepStatus } from "@/types/circuit";

type BadgeStatus = RunStatus | AgentStepStatus | "pass" | "fail" | "warning";

interface StatusBadgeProps {
  status: BadgeStatus;
  size?: "xs" | "sm" | "md";
  showDot?: boolean;
  label?: string;
}

const statusConfig: Record<
  BadgeStatus,
  { label: string; dot: string; bg: string; text: string; border: string }
> = {
  idle: {
    label: "Idle",
    dot: "bg-zinc-500",
    bg: "bg-zinc-900",
    text: "text-zinc-400",
    border: "border-zinc-700",
  },
  pending: {
    label: "Pending",
    dot: "bg-zinc-500",
    bg: "bg-zinc-900",
    text: "text-zinc-400",
    border: "border-zinc-700",
  },
  running: {
    label: "Running",
    dot: "bg-cyan-400 animate-pulse-smooth",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/30",
  },
  complete: {
    label: "Complete",
    dot: "bg-emerald-400",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  failed: {
    label: "Failed",
    dot: "bg-red-400",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  pass: {
    label: "Pass",
    dot: "bg-emerald-400",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/30",
  },
  fail: {
    label: "Fail",
    dot: "bg-red-400",
    bg: "bg-red-500/10",
    text: "text-red-400",
    border: "border-red-500/30",
  },
  warning: {
    label: "Warning",
    dot: "bg-amber-400",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/30",
  },
};

const sizeClasses = {
  xs: "text-[10px] px-1.5 py-0.5 gap-1",
  sm: "text-xs px-2 py-0.5 gap-1.5",
  md: "text-xs px-2.5 py-1 gap-1.5",
};

const dotSizes = {
  xs: "w-1.5 h-1.5",
  sm: "w-1.5 h-1.5",
  md: "w-2 h-2",
};

export function StatusBadge({
  status,
  size = "sm",
  showDot = true,
  label,
}: StatusBadgeProps) {
  const cfg = statusConfig[status] ?? statusConfig.idle;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border font-medium",
        cfg.bg,
        cfg.text,
        cfg.border,
        sizeClasses[size]
      )}
    >
      {showDot && (
        <span
          className={cn("rounded-full flex-shrink-0", cfg.dot, dotSizes[size])}
        />
      )}
      {label ?? cfg.label}
    </span>
  );
}
