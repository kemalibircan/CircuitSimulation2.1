"use client";

import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { Activity } from "lucide-react";

export default function RunsPage() {
  const { id } = useParams() as { id: string };
  const project = useProjectStore((s) => s.getProject(id));

  if (!project) return null;

  return (
    <div className="min-h-full p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Activity className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Project Runs</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            History of all AI execution runs for {project.name}
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-8 shadow-xl text-center">
        <Activity className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-zinc-300 font-medium">No external runs recorded</h3>
        <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
          Currently, the active run is displayed in the Overview page. Stored historical runs will appear here in the future.
        </p>
      </div>
    </div>
  );
}
