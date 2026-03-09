"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Play, RotateCcw, Download, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { mockRun } from "@/data/mockRun";
import { useProjectStore } from "@/store/useProjectStore";

import { StatusBadge } from "@/components/ui/StatusBadge";
import { SectionHeader } from "@/components/layout/SectionHeader";
import { RequirementForm } from "@/components/workspace/RequirementForm";
import { AgentProgressTimeline } from "@/components/workspace/AgentProgressTimeline";
import { DesignSummaryCard } from "@/components/workspace/DesignSummaryCard";
import { NetlistViewer } from "@/components/workspace/NetlistViewer";
import { SimulationResultsPanel } from "@/components/workspace/SimulationResultsPanel";
import { IterationList } from "@/components/workspace/IterationList";
import { CandidateComparisonTable } from "@/components/workspace/CandidateComparisonTable";
import { WorkspacePlayground } from "@/components/workspace/WorkspacePlayground";

import type { AgentRun, CircuitCategory } from "@/types/circuit";

type WorkspaceTab = "playground" | "progress" | "design" | "netlist" | "simulation" | "iterations" | "candidates";

const tabs: { id: WorkspaceTab; label: string }[] = [
  { id: "progress", label: "Agent Progress" },
  { id: "design", label: "Design Output" },
  { id: "netlist", label: "Netlist" },
  { id: "simulation", label: "Simulation" },
  { id: "iterations", label: "Iterations" },
  { id: "candidates", label: "Candidates" },
  { id: "playground", label: "Playground ✦" },
];

export default function WorkspacePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // Project context
  const project = useProjectStore((s) => s.getProject(id));
  const updateProjectRun = useProjectStore((s) => s.updateProjectRun);

  // Local state
  const [run, setRun] = useState<AgentRun>(mockRun);
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("playground");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Collapsible left panel
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for hydration before acting on project data
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Sync run state if loaded from memory
  useEffect(() => {
    if (isHydrated && project && project.runData) {
      setRun(project.runData);
    }
  }, [project, isHydrated]);

  // If invalid project after hydration, redirect
  useEffect(() => {
    if (isHydrated && !project) {
      router.push("/");
    }
  }, [project, isHydrated, router]);

  const handleSubmit = useCallback(
    async (prompt: string, category: CircuitCategory, metrics: unknown[]) => {
      setIsRunning(true);
      setActiveTab("progress");
      setIsSidebarOpen(false); // Auto-collapse to focus on progress

      const resetRun: AgentRun = {
        ...mockRun,
        status: "running",
        steps: mockRun.steps.map((s, i) => ({
          ...s,
          status: i === 0 ? "running" : "pending",
          logs: i === 0 ? s.logs : [],
        })),
        requirement: {
          ...mockRun.requirement,
          naturalLanguagePrompt: prompt,
          category,
        },
      };
      setRun(resetRun);

      for (let i = 0; i < mockRun.steps.length; i++) {
        await new Promise((r) => setTimeout(r, 900));
        setRun((prev) => ({
          ...prev,
          steps: prev.steps.map((s, idx) => ({
            ...s,
            status: idx < i ? "complete" : idx === i ? "running" : "pending",
          })),
        }));
      }

      // Await final step
      await new Promise((r) => setTimeout(r, 800));
      setRun(mockRun);
      setIsRunning(false);
      updateProjectRun(id, mockRun); // Save to store immediately
    },
    [id, updateProjectRun]
  );

  if (!isHydrated || !project) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-zinc-950">
        <div className="w-8 h-8 rounded-full border-2 border-cyan-500 border-t-transparent animate-spin" />
      </div>
    );
  }

  const doneSteps = run.steps.filter((s) => s.status === "complete").length;
  const allDone = run.status === "complete";

  return (
    <div className="min-h-full p-6 space-y-6">
      {/* Page header */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-zinc-100">{project.name}</h1>
            <StatusBadge status={run.status} size="sm" />
          </div>
          <p className="text-sm text-zinc-500 uppercase tracking-widest font-semibold flex items-center gap-2">
            <span>{project.category.replace("-", " ")}</span>
            <span className="w-1 h-1 rounded-full bg-zinc-700" />
            <span>TSMC 180nm</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          {allDone && (
            <button className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-zinc-300 transition-all bg-zinc-900/50">
              <Download className="w-3.5 h-3.5" />
              Export Report
            </button>
          )}
          <button
            onClick={() => {
              setRun(mockRun);
              setIsRunning(false);
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-zinc-800 hover:border-zinc-700 text-xs font-semibold text-zinc-400 hover:text-zinc-300 transition-all bg-zinc-900/50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Design
          </button>
        </div>
      </div>

      {/* Main layout: Dynamic Columns */}
      <div
        className={cn(
          "grid gap-6 transition-all duration-300 ease-in-out",
          isSidebarOpen ? "grid-cols-1 xl:grid-cols-[380px_1fr]" : "grid-cols-1"
        )}
      >
        {/* ── LEFT PANEL: Requirement Input ── */}
        <div
          className={cn(
            "space-y-4 transition-all duration-300",
            !isSidebarOpen && "hidden"
          )}
        >
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <SectionHeader
                title="Requirements"
                subtitle="Describe circuit goals"
                accent="cyan"
              />
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors"
                title="Collapse Panel"
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
            <RequirementForm onSubmit={handleSubmit} isRunning={isRunning} />
          </div>

          {allDone && (
            <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-4 space-y-3 animate-slide-in">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">
                  Run Summary
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Iterations", value: `${run.iterations.length}` },
                  { label: "Candidates", value: `${run.candidates.length}` },
                  { label: "Steps", value: `${doneSteps}/${run.steps.length}` },
                  { label: "MC Points", value: "200" },
                ].map(({ label, value }) => (
                  <div key={label} className="px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800">
                    <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{label}</div>
                    <div className="text-sm font-mono font-semibold text-zinc-200">{value}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── RIGHT PANEL: Tabbed output ── */}
        <div className="space-y-4 min-w-0">
          {/* Tab bar */}
          <div className="flex items-center gap-1 p-1 bg-zinc-900/60 border border-zinc-800 rounded-xl overflow-x-auto relative min-h-[44px]">
            {!isSidebarOpen && (
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex-shrink-0 flex items-center justify-center w-9 h-9 mr-2 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800 rounded-lg transition-colors border-r border-zinc-800/50"
                title="Expand Panel"
              >
                <PanelLeftOpen className="w-4 h-4" />
              </button>
            )}

            {tabs.map((tab) => {
              const isDisabled =
                !allDone &&
                tab.id !== "progress" &&
                tab.id !== "playground" &&
                !isRunning;
                
              return (
                <button
                  key={tab.id}
                  onClick={() => !isDisabled && setActiveTab(tab.id)}
                  disabled={isDisabled}
                  className={cn(
                    "flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap",
                    activeTab === tab.id
                      ? "bg-zinc-800 text-zinc-100 shadow-sm"
                      : isDisabled
                      ? "text-zinc-700 cursor-not-allowed"
                      : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50",
                    tab.id === "playground" && activeTab !== "playground" && "text-cyan-600 hover:text-cyan-400"
                  )}
                >
                  {tab.label}
                  {tab.id === "iterations" && allDone && (
                    <span className="ml-1.5 text-[10px] font-mono text-zinc-600">
                      {run.iterations.length}
                    </span>
                  )}
                  {tab.id === "candidates" && allDone && (
                    <span className="ml-1.5 text-[10px] font-mono text-zinc-600">
                      {run.candidates.length}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          <div className="animate-fade-in relative z-10 w-full rounded-2xl">
            {activeTab === "playground" ? (
              // Playground handles its own massive UI wrapper to look like a full-screen board
              <WorkspacePlayground projectId={id} />
            ) : (
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 shadow-xl min-h-[600px]">
                {/* A — Agent Progress */}
                {activeTab === "progress" && (
                  <div>
                    <SectionHeader
                      title="Agent Workflow"
                      subtitle={
                        isRunning
                          ? "Agent is actively processing your requirements…"
                          : allDone
                          ? "All steps completed successfully"
                          : "Ready to run"
                      }
                      accent="cyan"
                    />
                    <AgentProgressTimeline steps={run.steps} />
                  </div>
                )}

                {/* B — Design Output */}
                {activeTab === "design" && allDone && run.designSummary && (
                  <div>
                    <SectionHeader title="Design Output" subtitle="Selected topology, sizing, and rationale" accent="violet" />
                    <DesignSummaryCard summary={run.designSummary} />
                  </div>
                )}

                {/* C — Netlist */}
                {activeTab === "netlist" && allDone && run.netlist && (
                  <div>
                    <SectionHeader title="SPICE Netlist" subtitle="Auto-generated — ready for simulation" accent="emerald" />
                    <NetlistViewer netlist={run.netlist} />
                  </div>
                )}

                {/* D — Simulation */}
                {activeTab === "simulation" && allDone && run.simulationResult && (
                  <SimulationResultsPanel result={run.simulationResult} />
                )}

                {/* E — Iterations */}
                {activeTab === "iterations" && allDone && (
                  <div>
                    <SectionHeader title="Optimization Iterations" subtitle="Parameter refinements and metric improvements per cycle" accent="amber" />
                    <IterationList iterations={run.iterations} />
                  </div>
                )}

                {/* F — Candidates */}
                {activeTab === "candidates" && allDone && (
                  <div>
                    <SectionHeader title="Candidate Comparison" subtitle="Evaluated topologies ranked by composite score" accent="cyan" />
                    <CandidateComparisonTable candidates={run.candidates} />
                    <div className="mt-4 flex items-center gap-2 text-[10px] text-zinc-600">
                      <ChevronRight className="w-3 h-3 text-zinc-700" />
                      Selected topology highlighted in green · Score combines gain, stability, power, and process margin
                    </div>
                  </div>
                )}

                {/* Disabled state */}
                {!allDone && activeTab !== "progress" && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3">
                      <Play className="w-4 h-4 text-zinc-600" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500">Run the agent to see results</p>
                    <p className="text-xs text-zinc-700 mt-1">Submit your requirements using the form on the left</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
