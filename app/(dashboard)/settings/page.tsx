"use client";

import { SectionHeader } from "@/components/layout/SectionHeader";
import { Save } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

function ToggleSwitch({ defaultChecked = false }: { defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked);
  return (
    <button
      onClick={() => setOn(!on)}
      className={cn(
        "relative w-10 h-5 rounded-full border transition-all duration-200",
        on ? "bg-cyan-500 border-cyan-500/50" : "bg-zinc-800 border-zinc-700"
      )}
    >
      <div
        className={cn(
          "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all duration-200",
          on ? "translate-x-5" : "translate-x-0.5"
        )}
      />
    </button>
  );
}

export default function SettingsPage() {
  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-zinc-100">Settings</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Agent configuration, simulation preferences, and display options
        </p>
      </div>

      {/* Agent */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <SectionHeader title="Agent Configuration" />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Agent Model</label>
            <select className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50">
              <option>CircuitAgent v2.1 (Recommended)</option>
              <option>CircuitAgent v2.0 (Stable)</option>
              <option>CircuitAgent v1.4 (Legacy)</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Max Iterations</label>
            <input
              type="number"
              defaultValue={10}
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
            <ToggleSwitch defaultChecked />
          </div>
          <div className="flex items-center justify-between py-1">
            <div>
              <p className="text-sm text-zinc-300">Aggressive Optimization</p>
              <p className="text-xs text-zinc-600">Use wider step sizes at the cost of more iterations</p>
            </div>
            <ToggleSwitch />
          </div>
        </div>
      </div>

      {/* Simulation */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-5 space-y-4">
        <SectionHeader title="Simulation" accent="emerald" />
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">SPICE Simulator</label>
            <select className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50">
              <option>NGSPICE v41 (Active)</option>
              <option>Spectre (Enterprise)</option>
              <option>HSPICE (Enterprise)</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">AC Resolution</label>
              <select className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-300 focus:outline-none focus:border-cyan-500/50">
                <option>100 pts/dec</option>
                <option>50 pts/dec</option>
                <option>200 pts/dec</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-widest">Temperature (°C)</label>
              <input
                type="number"
                defaultValue={27}
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
            { label: "Run Completed", desc: "Notify when agent finishes a design run" },
            { label: "Metric Targets Met", desc: "Alert when all design targets are satisfied" },
            { label: "Simulation Errors", desc: "Alert on SPICE simulation failures" },
          ].map(({ label, desc }) => (
            <div key={label} className="flex items-center justify-between py-1">
              <div>
                <p className="text-sm text-zinc-300">{label}</p>
                <p className="text-xs text-zinc-600">{desc}</p>
              </div>
              <ToggleSwitch defaultChecked />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <button className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-sm font-semibold transition-all shadow-lg shadow-cyan-500/20">
        <Save className="w-4 h-4" />
        Save Settings
      </button>
    </div>
  );
}
