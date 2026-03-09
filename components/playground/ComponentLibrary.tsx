"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { componentLibrary, componentCategories } from "@/data/componentLibrary";
import type { ComponentDefinition, ComponentCategory } from "@/types/playground";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Component Search Bar
// ──────────────────────────────────────────────────────────────────────────────

export function ComponentSearch({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  return (
    <div className="relative mb-4">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-zinc-500" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search components..."
        className="block w-full pl-9 pr-3 py-2 border border-zinc-800 rounded-lg leading-5 bg-zinc-900/60 text-zinc-300 placeholder-zinc-500 focus:outline-none focus:bg-zinc-900 focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 sm:text-xs transition-colors"
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Draggable Component Item
// ──────────────────────────────────────────────────────────────────────────────

function DraggableComponentItem({ def }: { def: ComponentDefinition }) {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="group flex flex-col p-2.5 rounded-lg border border-zinc-800 bg-zinc-900/40 hover:bg-zinc-800/80 hover:border-zinc-700 cursor-grab active:cursor-grabbing transition-all hover:-translate-y-0.5"
      draggable
      onDragStart={(e) => onDragStart(e, def.type)}
    >
      <div className="flex items-center gap-2 mb-1">
        <div className="w-6 h-6 rounded flex items-center justify-center bg-zinc-800 text-zinc-300 font-mono text-xs font-bold border border-zinc-700/50 group-hover:bg-zinc-700 transition-colors">
          {def.shortLabel}
        </div>
        <span className="text-xs font-semibold text-zinc-200">{def.label}</span>
      </div>
      <p className="text-[10px] text-zinc-500 leading-tight group-hover:text-zinc-400 line-clamp-2">
        {def.description}
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Left Panel: Component Library
// ──────────────────────────────────────────────────────────────────────────────

export function ComponentLibrary() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredLibrary = componentLibrary.filter((c) =>
    c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-64 flex-shrink-0 flex flex-col bg-zinc-950/80 border-r border-zinc-800/80 backdrop-blur-md h-full z-10">
      <div className="p-4 border-b border-zinc-800/80">
        <h2 className="text-sm font-bold text-zinc-100 mb-1">Library</h2>
        <p className="text-[10px] text-zinc-500 uppercase tracking-widest mb-3">Drag to canvas</p>
        <ComponentSearch query={searchQuery} setQuery={setSearchQuery} />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pt-2 space-y-6 scrollbar-thin scrollbar-thumb-zinc-800 hover:scrollbar-thumb-zinc-700">
        {componentCategories.map((cat) => {
          const catItems = filteredLibrary.filter((c) => c.category === cat.id);
          if (catItems.length === 0) return null;

          return (
            <div key={cat.id} className="space-y-2">
              <h3 className={cn("text-[10px] font-bold uppercase tracking-widest flex items-center gap-1", cat.color)}>
                <div className={cn("w-1.5 h-1.5 rounded-full bg-current")} />
                {cat.label}
              </h3>
              <div className="grid grid-cols-1 gap-2">
                {catItems.map((def) => (
                  <DraggableComponentItem key={def.type} def={def} />
                ))}
              </div>
            </div>
          );
        })}

        {filteredLibrary.length === 0 && (
          <div className="text-center py-10">
            <p className="text-xs text-zinc-500">No components found.</p>
          </div>
        )}
      </div>
    </div>
  );
}
