"use client";

import { useParams } from "next/navigation";
import { useProjectStore } from "@/store/useProjectStore";
import { Archive } from "lucide-react";

export default function HistoryPage() {
  const { id } = useParams() as { id: string };
  const project = useProjectStore((s) => s.getProject(id));

  if (!project) return null;

  return (
    <div className="min-h-full p-6 space-y-6 animate-fade-in">
      <div className="flex items-center gap-3 mb-8">
        <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
          <Archive className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-zinc-100">Project History</h1>
          <p className="text-sm text-zinc-500 mt-0.5">
            Review past agent conversations and canvas states
          </p>
        </div>
      </div>

      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-8 shadow-xl text-center">
        <Archive className="w-8 h-8 text-zinc-600 mx-auto mb-3" />
        <h3 className="text-zinc-300 font-medium">History Log</h3>
        <p className="text-sm text-zinc-500 mt-1 max-w-sm mx-auto">
          This feature tracks project-wide historical changes, including prompt iterations and saved checkpoints over time.
        </p>
      </div>
    </div>
  );
}
