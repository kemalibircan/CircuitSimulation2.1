"use client";

import { useEffect, useState } from "react";
import { X, Save } from "lucide-react";
import type { CircuitNodeData } from "@/types/playground";
import { getComponentDef } from "@/data/componentLibrary";

// ──────────────────────────────────────────────────────────────────────────────
// Property Inspector (Side Panel / Drawer)
// ──────────────────────────────────────────────────────────────────────────────

interface PropertyInspectorProps {
  nodeId: string;
  data: CircuitNodeData;
  onUpdate: (nodeId: string, newData: CircuitNodeData) => void;
  onClose: () => void;
}

export function PropertyInspector({ nodeId, data, onUpdate, onClose }: PropertyInspectorProps) {
  const def = getComponentDef(data.type);
  const [localProps, setLocalProps] = useState(data.props);
  const [localLabel, setLocalLabel] = useState(data.label);

  // Sync state if a new node is selected
  useEffect(() => {
    setLocalProps(data.props);
    setLocalLabel(data.label);
  }, [nodeId, data]);

  if (!def) return null;

  const handleSave = () => {
    onUpdate(nodeId, {
      ...data,
      label: localLabel,
      props: localProps,
    });
  };

  const handlePropChange = (key: string, value: string | number) => {
    setLocalProps((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="absolute right-4 top-4 w-64 bg-zinc-950/95 border border-zinc-800 rounded-xl shadow-2xl backdrop-blur-md overflow-hidden z-50 flex flex-col pointer-events-auto animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div>
          <h3 className="text-xs font-bold text-zinc-100">{def.label}</h3>
          <p className="text-[10px] text-zinc-500 font-mono mt-0.5">ID: {nodeId}</p>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-md hover:bg-zinc-800 flex items-center justify-center text-zinc-500 hover:text-zinc-300 transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* Label / Name */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Designator Name
          </label>
          <input
            type="text"
            value={localLabel}
            onChange={(e) => setLocalLabel(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1.5 text-xs text-zinc-300 font-mono focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50"
          />
        </div>

        {/* Dynamic Props */}
        <div className="space-y-3">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
            Parameters
          </label>
          <div className="space-y-2.5">
            {Object.entries(localProps).map(([key, value]) => {
              const isNumber = typeof value === "number";
              return (
                <div key={key} className="flex items-center justify-between gap-2">
                  <label className="text-xs font-mono text-zinc-400 w-16 truncate">
                    {key}
                  </label>
                  <input
                    type={isNumber ? "number" : "text"}
                    value={value}
                    onChange={(e) =>
                      handlePropChange(key, isNumber ? Number(e.target.value) : e.target.value)
                    }
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-md px-2.5 py-1 text-xs text-zinc-300 focus:outline-none focus:border-cyan-500/50 text-right"
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer / Actions */}
      <div className="p-3 border-t border-zinc-800 bg-zinc-900/30 flex justify-end">
        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-lg text-xs font-semibold transition-all shadow-lg shadow-cyan-500/20"
        >
          <Save className="w-3.5 h-3.5" />
          Apply
        </button>
      </div>
    </div>
  );
}
