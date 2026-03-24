"use client";

import { SectionHeader } from "@/components/layout/SectionHeader";
import { ModelPricingCard } from "@/components/workspace/ModelPricingCard";
import { Save, Check } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { getDefaultModel } from "@/lib/modelConfig";

function ToggleSwitch({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        "relative w-10 h-5 rounded-full border transition-all duration-200",
        checked ? "bg-cyan-500 border-cyan-500/50" : "bg-zinc-800 border-zinc-700"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
          checked ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

interface SettingsState {
  selectedModel: string;
  maxIterations: number;
  monteCarloEnabled: boolean;
  aggressiveOptimization: boolean;
  simulator: string;
  acResolution: string;
  temperature: number;
  notifyRunCompleted: boolean;
  notifyTargetsMet: boolean;
  notifySimErrors: boolean;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsState>({
    selectedModel: getDefaultModel().id,
    maxIterations: 10,
    monteCarloEnabled: true,
    aggressiveOptimization: false,
    simulator: "ngspice-41",
    acResolution: "100",
    temperature: 27,
    notifyRunCompleted: true,
    notifyTargetsMet: true,
    notifySimErrors: true,
  });
  const [saved, setSaved] = useState(false);

  const update = <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  };

  const handleSave = () => {
    // Persist to localStorage for now (backend endpoint can be added later)
    localStorage.setItem("circuitai-settings", JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  // Load from localStorage on mount
  useState(() => {
    try {
      const stored = localStorage.getItem("circuitai-settings");
      if (stored) {
        setSettings((prev) => ({ ...prev, ...JSON.parse(stored) }));
      }
    } catch {}
  });

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Agent configuration, simulation preferences, and display options
        </p>
      </div>

      {/* Agent Model & Pricing */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <SectionHeader title="Agent Configuration" />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">AI Model</label>
            <ModelPricingCard
              selectedModelId={settings.selectedModel}
              onSelectModel={(id) => update("selectedModel", id)}
              compact
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Max Iterations</label>
            <input
              type="number"
              value={settings.maxIterations}
              onChange={(e) => update("maxIterations", Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
              min={1}
              max={50}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50"
            />
            <p className="text-[11px] text-zinc-600">Maximum allowed optimization iterations per run (1–50)</p>
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm text-zinc-300">Enable Monte Carlo Analysis</p>
              <p className="text-xs text-zinc-600">Run 200-point process variation analysis after optimization</p>
            </div>
            <ToggleSwitch checked={settings.monteCarloEnabled} onChange={(v) => update("monteCarloEnabled", v)} />
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm text-zinc-300">Aggressive Optimization</p>
              <p className="text-xs text-zinc-600">Use wider step sizes at the cost of more iterations</p>
            </div>
            <ToggleSwitch checked={settings.aggressiveOptimization} onChange={(v) => update("aggressiveOptimization", v)} />
          </div>
        </div>
      </div>

      {/* Simulation */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <SectionHeader title="Simulation" accent="emerald" />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">SPICE Simulator</label>
            <select
              value={settings.simulator}
              onChange={(e) => update("simulator", e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50"
            >
              <option value="ngspice-41">NGSPICE v41 (Active)</option>
              <option value="spectre">Spectre (Enterprise)</option>
              <option value="hspice">HSPICE (Enterprise)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">AC Resolution</label>
              <select
                value={settings.acResolution}
                onChange={(e) => update("acResolution", e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50"
              >
                <option value="100">100 pts/dec</option>
                <option value="50">50 pts/dec</option>
                <option value="200">200 pts/dec</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Temperature (°C)</label>
              <input
                type="number"
                value={settings.temperature}
                onChange={(e) => update("temperature", parseInt(e.target.value) || 27)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <SectionHeader title="Notifications" accent="amber" />
        <div className="space-y-3">
          {[
            { key: "notifyRunCompleted" as const, label: "Run Completed", desc: "Notify when agent finishes a design run" },
            { key: "notifyTargetsMet" as const, label: "Metric Targets Met", desc: "Alert when all design targets are satisfied" },
            { key: "notifySimErrors" as const, label: "Simulation Errors", desc: "Alert on SPICE simulation failures" },
          ].map(({ key, label, desc }) => (
            <div key={key} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-zinc-300">{label}</p>
                <p className="text-xs text-zinc-600">{desc}</p>
              </div>
              <ToggleSwitch checked={settings[key]} onChange={(v) => update(key, v)} />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button
        onClick={handleSave}
        className={cn(
          "flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-lg",
          saved
            ? "bg-emerald-500 text-zinc-950 shadow-emerald-500/20"
            : "bg-cyan-500 hover:bg-cyan-400 text-zinc-950 shadow-cyan-500/20"
        )}
      >
        {saved ? (
          <>
            <Check className="w-4 h-4" />
            Saved
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Settings
          </>
        )}
      </button>
    </div>
  );
}
