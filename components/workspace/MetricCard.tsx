import { cn } from "@/lib/utils";
import type { SimulationMetric } from "@/types/circuit";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface MetricCardProps {
  metric: SimulationMetric;
}

export function MetricCard({ metric }: MetricCardProps) {
  const pf = metric.passFail;
  const passColors = {
    pass: "border-emerald-500/30 bg-emerald-500/5",
    fail: "border-red-500/30 bg-red-500/5",
    warning: "border-amber-500/30 bg-amber-500/5",
  };
  const valueColors = {
    pass: "text-emerald-400",
    fail: "text-red-400",
    warning: "text-amber-400",
  };
  const Icon = pf === "pass" ? TrendingUp : pf === "fail" ? TrendingDown : Minus;
  const iconColor = {
    pass: "text-emerald-500",
    fail: "text-red-500",
    warning: "text-amber-500",
  };

  return (
    <div
      className={cn(
        "relative p-4 rounded-xl border bg-zinc-900/60 transition-all",
        pf ? passColors[pf] : "border-zinc-800"
      )}
    >
      {/* Status icon */}
      {pf && (
        <Icon
          className={cn(
            "absolute top-3 right-3 w-3.5 h-3.5",
            iconColor[pf]
          )}
        />
      )}
      <div className="text-[10px] font-medium text-zinc-500 uppercase tracking-widest mb-2">
        {metric.label}
      </div>
      <div
        className={cn(
          "text-2xl font-bold font-mono leading-none",
          pf ? valueColors[pf] : "text-zinc-100"
        )}
      >
        {metric.value}
        <span className="text-xs text-zinc-500 font-sans ml-1">
          {metric.unit}
        </span>
      </div>
      {metric.target !== undefined && (
        <div className="mt-2 text-[10px] text-zinc-600">
          Target:{" "}
          <span className="text-zinc-500 font-mono">
            {metric.target} {metric.unit}
          </span>
        </div>
      )}
    </div>
  );
}
