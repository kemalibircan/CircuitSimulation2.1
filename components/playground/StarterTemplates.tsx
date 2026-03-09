"use client";

import { X, Play, Zap } from "lucide-react";
import { starterTemplates } from "@/data/mockPlayground";
import type { StarterTemplate } from "@/types/playground";

interface StarterTemplatesProps {
  onSelect: (template: StarterTemplate) => void;
  onClose: () => void;
}

export function StarterTemplates({ onSelect, onClose }: StarterTemplatesProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col animate-slide-in"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/40">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center">
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100">Starter Templates</h2>
              <p className="text-[11px] text-zinc-500">Load a pre-built circuit onto the canvas</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Grid */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-800">
          {starterTemplates.map((tpl) => (
            <button
              key={tpl.id}
              onClick={() => onSelect(tpl)}
              className="text-left group flex flex-col p-4 rounded-xl border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-900 hover:border-cyan-500/50 transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors">
                  {tpl.name}
                </h3>
                <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-500 border border-zinc-700">
                  {tpl.complexity}
                </span>
              </div>
              <p className="text-xs text-zinc-500 mb-4 line-clamp-2">
                {tpl.description}
              </p>
              
              <div className="mt-auto flex items-center justify-between text-[10px] text-zinc-600 font-mono">
                <div className="flex items-center gap-3">
                  <span>{tpl.nodes.length} nodes</span>
                  <span>{tpl.edges.length} edges</span>
                </div>
                <div className="flex items-center gap-1.5 text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity font-bold font-sans">
                  Load <Play className="w-3 h-3" />
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
