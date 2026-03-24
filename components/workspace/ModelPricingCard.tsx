"use client";

import { AI_MODELS, formatPrice, type AIModelConfig } from "@/lib/modelConfig";
import { cn } from "@/lib/utils";
import { Cpu, DollarSign, Zap, Info } from "lucide-react";

// ──────────────────────────────────────────────────────────────────────────────
// Token Pricing Card — Shows per-model input/output costs
// ──────────────────────────────────────────────────────────────────────────────

interface ModelPricingCardProps {
  selectedModelId?: string;
  onSelectModel?: (id: string) => void;
  compact?: boolean;
}

const badgeColors: Record<string, string> = {
  emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  cyan: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
  violet: "bg-violet-500/10 text-violet-400 border-violet-500/30",
  blue: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  amber: "bg-amber-500/10 text-amber-400 border-amber-500/30",
};

export function ModelPricingCard({ selectedModelId, onSelectModel, compact = false }: ModelPricingCardProps) {
  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2">
        <DollarSign className="w-3.5 h-3.5 text-zinc-500" />
        <span className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
          Model Pricing
        </span>
        <span className="text-[9px] text-zinc-600 font-mono">per 1M tokens</span>
      </div>

      {/* Pricing Table */}
      <div className={cn("rounded-xl border border-zinc-800 overflow-hidden", compact && "text-xs")}>
        <table className="w-full">
          <thead>
            <tr className="bg-zinc-900/80 border-b border-zinc-800">
              <th className="text-left text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-3 py-2">Model</th>
              <th className="text-right text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-3 py-2">Input</th>
              <th className="text-right text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-3 py-2">Output</th>
              <th className="text-right text-[10px] font-semibold text-zinc-500 uppercase tracking-widest px-3 py-2">Context</th>
            </tr>
          </thead>
          <tbody>
            {AI_MODELS.map((model) => {
              const isSelected = model.id === selectedModelId;
              return (
                <tr
                  key={model.id}
                  onClick={() => onSelectModel?.(model.id)}
                  className={cn(
                    "border-b border-zinc-800/60 transition-colors",
                    onSelectModel && "cursor-pointer hover:bg-zinc-800/40",
                    isSelected && "bg-cyan-500/5 border-cyan-500/20"
                  )}
                >
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-bold border",
                        badgeColors[model.badgeColor] || badgeColors.cyan
                      )}>
                        {model.provider.toUpperCase()}
                      </span>
                      <span className={cn("text-xs font-medium", isSelected ? "text-cyan-400" : "text-zinc-300")}>
                        {model.name}
                      </span>
                      {model.isDefault && (
                        <span className="text-[8px] px-1 py-0.5 rounded bg-zinc-800 text-zinc-500 font-semibold">DEFAULT</span>
                      )}
                    </div>
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs font-mono text-emerald-400">
                    {formatPrice(model.inputPricePerMToken)}
                  </td>
                  <td className="text-right px-3 py-2.5 text-xs font-mono text-amber-400">
                    {formatPrice(model.outputPricePerMToken)}
                  </td>
                  <td className="text-right px-3 py-2.5 text-[10px] font-mono text-zinc-500">
                    {(model.maxContextTokens / 1000).toFixed(0)}K
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Info note */}
      <div className="flex items-start gap-1.5 text-[10px] text-zinc-600">
        <Info className="w-3 h-3 flex-shrink-0 mt-0.5" />
        <span>Prices reflect latest published rates. Actual costs depend on prompt complexity and circuit topology.</span>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Inline Model Selector — For use in RequirementForm or workspace
// ──────────────────────────────────────────────────────────────────────────────

interface ModelSelectorProps {
  selectedModelId: string;
  onSelectModel: (id: string) => void;
  disabled?: boolean;
}

export function ModelSelector({ selectedModelId, onSelectModel, disabled }: ModelSelectorProps) {
  const selected = AI_MODELS.find((m) => m.id === selectedModelId) || AI_MODELS[0];
  
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest flex items-center gap-1.5">
        <Cpu className="w-3 h-3" />
        AI Model
      </label>
      <select
        value={selectedModelId}
        onChange={(e) => onSelectModel(e.target.value)}
        disabled={disabled}
        className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-3 py-2.5 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all disabled:opacity-50 appearance-none cursor-pointer"
      >
        {AI_MODELS.map((model) => (
          <option key={model.id} value={model.id} className="bg-zinc-900 text-zinc-300">
            {model.name} — {model.provider.toUpperCase()} {model.isDefault ? "(Default)" : ""}
          </option>
        ))}
      </select>
      <div className="flex items-center gap-3 text-[10px] text-zinc-600">
        <span>Input: <span className="text-emerald-400 font-mono">{formatPrice(selected.inputPricePerMToken)}/1M</span></span>
        <span>Output: <span className="text-amber-400 font-mono">{formatPrice(selected.outputPricePerMToken)}/1M</span></span>
        <span>Context: <span className="font-mono">{(selected.maxContextTokens / 1000).toFixed(0)}K</span></span>
      </div>
    </div>
  );
}
