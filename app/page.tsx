"use client";

import { useState } from "react";
import Link from "next/link";
import { Plus, CircuitBoard, Clock, LayoutDashboard, Cpu } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import { CreateProjectWizard } from "@/components/projects/CreateProjectModal";
import { formatTimeAgo } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Projects Dashboard (Landing Page)
// ──────────────────────────────────────────────────────────────────────────────

export default function ProjectsDashboard() {
  const projects = useProjectStore((s) => s.projects);
  const [showCreateModal, setShowCreateModal] = useState(false);

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-300 font-sans flex relative">
      {/* Background Grid Pattern */}
      <div 
        className="absolute inset-0 z-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle at center, #27272a 1px, transparent 1px)",
          backgroundSize: "24px 24px"
        }}
      />

      <div className="flex-1 max-w-6xl mx-auto p-8 z-10">
        
        {/* Header */}
        <header className="flex items-start justify-between mb-12 animate-fade-in py-4 border-b border-zinc-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex flex-col items-center justify-center relative overflow-hidden group">
              <div className="absolute inset-0 bg-cyan-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
              <CircuitBoard className="w-5 h-5 text-cyan-400 z-10 relative" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-100 tracking-tight flex items-center gap-2">
                CircuitAI
                <span className="px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-400 border border-zinc-700">STUDIO</span>
              </h1>
              <p className="text-xs text-zinc-500 font-medium">Analog Synthesis & Simulation Platform</p>
            </div>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            New Project
          </button>
        </header>

        {/* Dashboard Content */}
        <main className="animate-slide-in">
          <div className="flex items-center gap-2 mb-6">
            <LayoutDashboard className="w-4 h-4 text-zinc-500" />
            <h2 className="text-sm font-bold text-zinc-100 uppercase tracking-widest">Recent Projects</h2>
          </div>

          {projects.length === 0 ? (
            // Empty State
            <div className="flex flex-col items-center justify-center max-w-md mx-auto py-24 text-center border border-dashed border-zinc-800 rounded-2xl bg-zinc-900/20">
              <div className="w-16 h-16 rounded-3xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 shadow-2xl">
                <Cpu className="w-6 h-6 text-zinc-600" />
              </div>
              <h3 className="text-lg font-bold text-zinc-200 mb-2">No projects yet</h3>
              <p className="text-sm text-zinc-500 mb-8 max-w-[280px]">
                Create your first analog circuit project to start using the autonomous design agent.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-zinc-100 hover:bg-white text-zinc-950 rounded-xl text-sm font-bold transition-all shadow-xl shadow-white/5 active:scale-95"
              >
                <Plus className="w-4 h-4 stroke-[3]" />
                Create First Project
              </button>
            </div>
          ) : (
            // Project Grid
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {projects.map((project) => (
                <Link
                  key={project.id}
                  href={`/workspace/${project.id}`}
                  className="group flex flex-col p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 hover:bg-zinc-900 hover:border-cyan-500/50 transition-all hover:-translate-y-1 shadow-xl shadow-black/20"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center group-hover:border-cyan-500/30 group-hover:bg-cyan-500/5 transition-colors">
                      <Cpu className="w-5 h-5 text-zinc-500 group-hover:text-cyan-400 transition-colors" />
                    </div>
                  </div>
                  
                  <h3 className="text-base font-bold text-zinc-200 group-hover:text-cyan-400 transition-colors mb-1 truncate">
                    {project.name}
                  </h3>
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-6 truncate">
                    {project.category.replace("-", " ")}
                  </div>
                  
                  <div className="mt-auto pt-4 border-t border-zinc-800/80 flex items-center justify-between text-[10px] text-zinc-600 font-mono">
                    <div className="flex items-center gap-1.5" title={new Date(project.updatedAt).toLocaleString()}>
                      <Clock className="w-3 h-3" />
                      {formatTimeAgo(new Date(project.updatedAt))}
                    </div>
                    
                    <span className="font-sans font-bold text-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      Open →
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </main>
      </div>

      {showCreateModal && <CreateProjectWizard onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}
