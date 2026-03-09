"use client";

import { usePathname } from "next/navigation";
import { Bell, HelpCircle, User, Terminal } from "lucide-react";
import { cn } from "@/lib/utils";

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  "/workspace": {
    title: "Design Workspace",
    subtitle: "Agentic analog circuit design interface",
  },
  "/runs": {
    title: "Agent Runs",
    subtitle: "History of design sessions and results",
  },
  "/comparisons": {
    title: "Candidate Comparison",
    subtitle: "Side-by-side evaluation of circuit topologies",
  },
  "/history": {
    title: "Design History",
    subtitle: "Previously submitted requirements and outputs",
  },
  "/settings": {
    title: "Settings",
    subtitle: "Agent configuration and preferences",
  },
};

export function TopNavbar() {
  const pathname = usePathname();

  // Match exact or nested (e.g. /runs/[id])
  const key = Object.keys(pageTitles).find(
    (k) => pathname === k || pathname.startsWith(k + "/")
  );
  const meta = key ? pageTitles[key] : { title: "CircuitAI", subtitle: "" };

  return (
    <header className="flex items-center justify-between px-6 py-3.5 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-sm z-10 flex-shrink-0">
      {/* Title */}
      <div className="flex flex-col">
        <h1 className="text-sm font-semibold text-zinc-100 leading-tight">
          {meta.title}
        </h1>
        {meta.subtitle && (
          <p className="text-xs text-zinc-500">{meta.subtitle}</p>
        )}
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1">
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-zinc-800 hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-900 transition-all text-xs text-zinc-500 hover:text-zinc-300">
          <Terminal className="w-3.5 h-3.5" />
          NGSPICE v41
        </button>

        <div className="w-px h-4 bg-zinc-800 mx-1" />

        <button className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all">
          <Bell className="w-4 h-4" />
        </button>
        <button className="p-2 rounded-lg text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900 transition-all">
          <HelpCircle className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-zinc-800 mx-1" />

        <button className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 transition-all">
          <div className="w-6 h-6 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center">
            <User className="w-3 h-3 text-white" />
          </div>
          <span className="text-xs text-zinc-400">Engineer</span>
        </button>
      </div>
    </header>
  );
}
