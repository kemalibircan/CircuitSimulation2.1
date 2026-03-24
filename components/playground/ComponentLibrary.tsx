"use client";

import { useState } from "react";
import { Search, Crosshair } from "lucide-react";
import { componentLibrary, componentCategories } from "@/data/componentLibrary";
import type { ComponentDefinition, ComponentCategory } from "@/types/playground";
import { symbolRegistry, ScopeSymbol } from "./symbols";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Component Search Bar
// ──────────────────────────────────────────────────────────────────────────────

export function ComponentSearch({ query, setQuery }: { query: string; setQuery: (v: string) => void }) {
  return (
    <div className="relative mb-3">
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
// Draggable Component Item with SVG Preview
// ──────────────────────────────────────────────────────────────────────────────

function DraggableComponentItem({ def }: { def: ComponentDefinition }) {
  const onDragStart = (event: React.DragEvent<HTMLDivElement>, nodeType: string) => {
    event.dataTransfer.setData("application/reactflow", nodeType);
    event.dataTransfer.effectAllowed = "move";
  };

  const SymbolComponent = symbolRegistry[def.type];

  // Calculate scale to fit symbol in a 36x28 box
  const maxW = 36;
  const maxH = 28;
  const scaleX = maxW / def.nodeWidth;
  const scaleY = maxH / def.nodeHeight;
  const scale = Math.min(scaleX, scaleY, 1);

  return (
    <div
      className="group flex items-center gap-2.5 p-2 rounded-lg border border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/60 hover:border-zinc-700 cursor-grab active:cursor-grabbing transition-all duration-150 hover:-translate-y-0.5"
      draggable
      onDragStart={(e) => onDragStart(e, def.type)}
    >
      {/* SVG Preview */}
      <div
        className="flex-shrink-0 flex items-center justify-center rounded bg-zinc-900/80 border border-zinc-800/50 group-hover:border-zinc-700/80 transition-colors"
        style={{ width: maxW + 8, height: maxH + 4 }}
      >
        {SymbolComponent && (
          <div style={{ transform: `scale(${scale})`, transformOrigin: "center" }}>
            <SymbolComponent
              width={def.nodeWidth}
              height={def.nodeHeight}
            />
          </div>
        )}
      </div>

      {/* Labels */}
      <div className="flex-1 min-w-0">
        <div className="text-[11px] font-semibold text-zinc-200 leading-tight truncate">
          {def.label}
        </div>
        <div className="text-[9px] text-zinc-500 leading-tight mt-0.5 line-clamp-1 group-hover:text-zinc-400">
          {def.description}
        </div>
      </div>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Scope Tool Button — Activates scope mode instead of drag
// ──────────────────────────────────────────────────────────────────────────────

function ScopeToolButton({
  isActive,
  onToggle,
}: {
  isActive: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      onClick={onToggle}
      className={cn(
        "w-full flex items-center gap-2.5 p-2.5 rounded-lg border transition-all duration-200",
        isActive
          ? "border-emerald-500/60 bg-emerald-500/10 shadow-[0_0_12px_rgba(52,211,153,0.15)]"
          : "border-zinc-800/60 bg-zinc-900/30 hover:bg-zinc-800/60 hover:border-zinc-700"
      )}
    >
      {/* Scope Icon */}
      <div
        className={cn(
          "flex-shrink-0 flex items-center justify-center rounded transition-colors",
          isActive ? "bg-emerald-500/15" : "bg-zinc-900/80 border border-zinc-800/50"
        )}
        style={{ width: 44, height: 32 }}
      >
        <ScopeSymbol selected={isActive} width={28} height={28} />
      </div>

      {/* Labels */}
      <div className="flex-1 min-w-0 text-left">
        <div className={cn(
          "text-[11px] font-semibold leading-tight",
          isActive ? "text-emerald-300" : "text-zinc-200"
        )}>
          Oscilloscope
        </div>
        <div className={cn(
          "text-[9px] leading-tight mt-0.5",
          isActive ? "text-emerald-400/60" : "text-zinc-500"
        )}>
          {isActive ? "Click a wire to probe • Click again to exit" : "Click to activate scope mode"}
        </div>
      </div>

      {/* Active indicator */}
      {isActive && (
        <div className="flex-shrink-0 flex items-center gap-1">
          <Crosshair className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
        </div>
      )}
    </button>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Left Panel: Component Library
// ──────────────────────────────────────────────────────────────────────────────

interface ComponentLibraryProps {
  scopeMode?: boolean;
  onScopeModeToggle?: () => void;
}

export function ComponentLibrary({ scopeMode = false, onScopeModeToggle }: ComponentLibraryProps) {
  const [searchQuery, setSearchQuery] = useState("");

  // Filter out scope from drag list — it's handled by the tool button
  const filteredLibrary = componentLibrary
    .filter((c) => c.type !== "scope")
    .filter((c) =>
      c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.type.toLowerCase().includes(searchQuery.toLowerCase())
    );

  return (
    <div className="w-56 flex-shrink-0 flex flex-col bg-zinc-950/80 border-r border-zinc-800/80 backdrop-blur-md h-full z-10">
      <div className="p-3 border-b border-zinc-800/80">
        <h2 className="text-xs font-bold text-zinc-100 mb-0.5">Components</h2>
        <p className="text-[9px] text-zinc-500 uppercase tracking-widest mb-2.5">Drag to canvas</p>
        <ComponentSearch query={searchQuery} setQuery={setSearchQuery} />
      </div>

      <div className="flex-1 overflow-y-auto p-3 pt-2 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800 hover:scrollbar-thumb-zinc-700">
        {componentCategories
          .filter((cat) => cat.id !== "tools")
          .map((cat) => {
            const catItems = filteredLibrary.filter((c) => c.category === cat.id);
            if (catItems.length === 0) return null;

            return (
              <div key={cat.id} className="space-y-1.5">
                <h3 className={cn("text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 mb-1", cat.color)}>
                  <div className={cn("w-1 h-1 rounded-full bg-current")} />
                  {cat.label}
                </h3>
                <div className="grid grid-cols-1 gap-1">
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

        {/* Tools Section — Scope button */}
        <div className="space-y-1.5">
          <h3 className="text-[9px] font-bold uppercase tracking-widest flex items-center gap-1 mb-1 text-emerald-300">
            <div className="w-1 h-1 rounded-full bg-current" />
            Tools
          </h3>
          <ScopeToolButton
            isActive={scopeMode}
            onToggle={onScopeModeToggle || (() => {})}
          />
        </div>
      </div>
    </div>
  );
}
