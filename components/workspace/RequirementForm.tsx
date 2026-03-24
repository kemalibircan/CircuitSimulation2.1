"use client";

import { useState, useEffect } from "react";
import { Send, Plus, X, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CircuitCategory, DesignConstraint } from "@/types/circuit";
import { ModelSelector } from "@/components/workspace/ModelPricingCard";
import { getDefaultModel, estimateCost, formatPrice } from "@/lib/modelConfig";

const categories: { value: CircuitCategory; label: string }[] = [
  { value: "op-amp", label: "Operational Amplifier" },
  { value: "current-mirror", label: "Current Mirror" },
  { value: "differential-pair", label: "Differential Pair" },
  { value: "lna", label: "Low-Noise Amplifier" },
  { value: "bandgap", label: "Bandgap Reference" },
  { value: "oscillator", label: "Oscillator / VCO" },
  { value: "filter", label: "Active Filter" },
  { value: "comparator", label: "Comparator" },
  { value: "voltage-regulator", label: "Voltage Regulator" },
  { value: "charge-pump", label: "Charge Pump" },
];

const metricOptions = [
  { key: "gain", label: "DC Gain", unit: "dB", placeholder: "≥ 60" },
  { key: "bw", label: "GBW", unit: "MHz", placeholder: "≥ 10" },
  { key: "pm", label: "Phase Margin", unit: "°", placeholder: "≥ 60" },
  { key: "power", label: "Power", unit: "mW", placeholder: "≤ 1.0" },
  { key: "vdd", label: "Supply Voltage", unit: "V", placeholder: "1.8" },
  { key: "cl", label: "Load Cap", unit: "pF", placeholder: "10" },
  { key: "noise", label: "Input Noise", unit: "nV/√Hz", placeholder: "≤ 15" },
];

interface MetricEntry {
  key: string;
  label: string;
  unit: string;
  value: string;
  priority: "hard" | "soft";
}

interface RequirementFormProps {
  onSubmit: (prompt: string, category: CircuitCategory, metrics: MetricEntry[], modelId?: string) => void;
  isRunning: boolean;
  initialPrompt?: string;
  initialCategory?: CircuitCategory;
}

export function RequirementForm({ onSubmit, isRunning, initialPrompt = "", initialCategory = "op-amp" }: RequirementFormProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [category, setCategory] = useState<CircuitCategory>(initialCategory);
  const [metrics, setMetrics] = useState<MetricEntry[]>(
    initialCategory === "blank" ? [] : [
      { key: "gain", label: "DC Gain", unit: "dB", value: "60", priority: "hard" },
      { key: "bw", label: "GBW", unit: "MHz", value: "10", priority: "hard" },
      { key: "pm", label: "Phase Margin", unit: "°", value: "60", priority: "hard" },
      { key: "power", label: "Power", unit: "mW", value: "1.0", priority: "soft" },
    ]
  );
  const [showMetricPicker, setShowMetricPicker] = useState(false);
  const [selectedModel, setSelectedModel] = useState(getDefaultModel().id);

  // Sync with parent-provided initial values (e.g., after run starts)
  useEffect(() => { if (initialPrompt) setPrompt(initialPrompt); }, [initialPrompt]);
  useEffect(() => { if (initialCategory) setCategory(initialCategory); }, [initialCategory]);

  const costEstimate = estimateCost(prompt, selectedModel);

  function addMetric(opt: (typeof metricOptions)[0]) {
    if (metrics.find((m) => m.key === opt.key)) return;
    setMetrics((prev) => [
      ...prev,
      { key: opt.key, label: opt.label, unit: opt.unit, value: "", priority: "soft" },
    ]);
    setShowMetricPicker(false);
  }

  function removeMetric(key: string) {
    setMetrics((prev) => prev.filter((m) => m.key !== key));
  }

  function updateMetric(key: string, field: keyof MetricEntry, value: string) {
    setMetrics((prev) =>
      prev.map((m) => (m.key === key ? { ...m, [field]: value } : m))
    );
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) return;
    onSubmit(prompt, category, metrics, selectedModel);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* NL Prompt */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
          Design Requirements
        </label>
        <div className="relative">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={4}
            placeholder="Describe your circuit requirements in natural language..."
            className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
            disabled={isRunning}
          />
          <div className="absolute bottom-2 right-3 text-[10px] text-zinc-600 font-mono">
            {prompt.length} chars
          </div>
        </div>
      </div>

      {/* Hidden legacy fields - Category and Process Technology are removed from UI per user request */}
      <input type="hidden" name="category" value={category} />

      {/* Target Metrics */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-medium text-zinc-400 uppercase tracking-widest">
            Target Metrics
          </label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMetricPicker(!showMetricPicker)}
              className="flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              disabled={isRunning}
            >
              <Plus className="w-3.5 h-3.5" />
              Add metric
            </button>
            {showMetricPicker && (
              <div className="absolute right-0 mt-1 z-50 w-52 rounded-xl bg-zinc-900 border border-zinc-800 shadow-2xl py-1 animate-slide-in">
                {metricOptions
                  .filter((o) => !metrics.find((m) => m.key === o.key))
                  .map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => addMetric(opt)}
                      className="w-full text-left px-3 py-2 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors flex items-center justify-between"
                    >
                      {opt.label}
                      <span className="text-zinc-600">{opt.unit}</span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          {metrics.map((m) => (
            <div
              key={m.key}
              className="flex items-center gap-2 p-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60 group"
            >
              <div className="flex-1 flex items-center gap-2">
                <span className="text-xs text-zinc-400 w-24 flex-shrink-0">{m.label}</span>
                <input
                  type="text"
                  value={m.value}
                  onChange={(e) => updateMetric(m.key, "value", e.target.value)}
                  placeholder="value"
                  className="flex-1 bg-transparent text-xs text-zinc-200 placeholder-zinc-700 focus:outline-none border-b border-transparent focus:border-zinc-700 py-1 min-w-0"
                  disabled={isRunning}
                />
                <span className="text-[10px] text-zinc-600 font-mono flex-shrink-0">{m.unit}</span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() =>
                    updateMetric(m.key, "priority", m.priority === "hard" ? "soft" : "hard")
                  }
                  className={cn(
                    "text-[10px] px-1.5 py-0.5 rounded border transition-colors",
                    m.priority === "hard"
                      ? "border-red-500/40 text-red-400 bg-red-500/10"
                      : "border-zinc-700 text-zinc-500 bg-transparent"
                  )}
                  disabled={isRunning}
                >
                  {m.priority === "hard" ? "hard" : "soft"}
                </button>
                <button
                  type="button"
                  onClick={() => removeMetric(m.key)}
                  className="text-zinc-700 hover:text-zinc-400 opacity-0 group-hover:opacity-100 transition-all"
                  disabled={isRunning}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Model Selection */}
      <ModelSelector
        selectedModelId={selectedModel}
        onSelectModel={setSelectedModel}
        disabled={isRunning}
      />

      {/* Estimated Cost */}
      {prompt.trim() && (
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-zinc-900/60 border border-zinc-800/60">
          <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-semibold">Est. Cost</span>
          <span className="text-xs font-mono text-zinc-300">{formatPrice(costEstimate.totalCost)}</span>
          <span className="text-[9px] text-zinc-600">({costEstimate.inputTokens.toLocaleString()} in / {costEstimate.outputTokens.toLocaleString()} out tokens)</span>
        </div>
      )}

      {/* Submit */}
      <button
        type="submit"
        disabled={isRunning || !prompt.trim()}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200",
          isRunning
            ? "bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 cursor-not-allowed"
            : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-lg shadow-cyan-500/20 hover:shadow-cyan-400/30"
        )}
      >
        {isRunning ? (
          <>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse-smooth" />
            Agent is running...
          </>
        ) : (
          <>
            <Send className="w-4 h-4" />
            Run Design Agent
          </>
        )}
      </button>
    </form>
  );
}
