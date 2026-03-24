"use client";

import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  const { id } = useParams() as { id: string };
  const project = useProjectStore((s) => s.getProject(id));

  if (!project) return null;

  return (
    <div className="min-h-full p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Settings className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Project Settings</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Configure {project.name} context parameters
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-8 shadow-xl">
        <h3 className="text-zinc-300 font-medium mb-4">Configuration</h3>
        <p className="text-sm text-zinc-500 max-w-sm">
          Settings configuration for simulation limits, node capacities, and agent behavior will be managed here.
        </p>
      </div>
    </div>
  );
}
