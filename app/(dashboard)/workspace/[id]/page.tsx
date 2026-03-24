"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Play, RotateCcw, Download, ChevronRight, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { useProjectStore } from "@/store/useProjectStore";
import { parseSpiceToPlayground, generateSpiceFromPlayground } from "@/lib/spiceSync";
import { api, mapApiRunToFrontend } from "@/lib/api";

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
import { ConsoleView } from "@/components/workspace/ConsoleView";

import type { AgentRun, CircuitCategory } from "@/types/circuit";

type WorkspaceTab = "playground" | "requirements" | "design" | "netlist" | "simulation" | "iterations" | "candidates" | "console";


const PIPELINE_STEPS = [
  { id: "step-requirement_parsing", label: "Requirement Parsing", description: "Extracting structured constraints from natural language" },
  { id: "step-topology_selection", label: "Topology Selection", description: "Evaluating candidate topologies against constraints" },
  { id: "step-netlist_generation", label: "Netlist Generation", description: "Generating initial SPICE netlist with nominal sizing" },
  { id: "step-validation", label: "Validation", description: "Validating netlist structure" },
  { id: "step-simulation_run", label: "Simulation Run", description: "Running AC, transient, and DC operating point analysis" },
  { id: "step-metric_extraction", label: "Metric Extraction", description: "Extracting gain, bandwidth, phase margin, and power" },
  { id: "step-monte_carlo", label: "Monte Carlo Analysis", description: "Running Monte Carlo for process variation" },
  { id: "step-optimization_loop", label: "Optimization Loop", description: "Iterative sizing refinement to meet all targets" },
  { id: "step-recommendation_ready", label: "Final Recommendation", description: "Generating design summary and final report" },
];

function createEmptyRun(prompt = "", category: CircuitCategory = "op-amp"): AgentRun {
  return {
    id: "",
    status: "idle",
    startedAt: "",
    requirement: {
      id: "",
      naturalLanguagePrompt: prompt,
      category,
      constraints: [],
      supplyVoltage: 1.8,
      technology: "TSMC 180nm",
      temperature: 27,
      createdAt: new Date().toISOString(),
    },
    steps: PIPELINE_STEPS.map((s) => ({
      ...s,
      status: "pending" as const,
      logs: [],
    })),
    iterations: [],
    candidates: [],
  };
}

const tabs: { id: WorkspaceTab; label: string }[] = [
  { id: "requirements", label: "Requirements" },
  { id: "design", label: "Design Output" },
  { id: "netlist", label: "Netlist" },
  { id: "simulation", label: "Simulation" },
  { id: "iterations", label: "Iterations" },
  { id: "candidates", label: "Candidates" },
  { id: "console", label: "Console" },
  { id: "playground", label: "Playground ✦" },
];

export default function WorkspacePage() {
  const { id } = useParams() as { id: string };
  const router = useRouter();

  // Project context
  const project = useProjectStore((s) => s.getProject(id));
  const updateProjectRun = useProjectStore((s) => s.updateProjectRun);
  const updatePlaygroundState = useProjectStore((s) => s.updatePlaygroundState);

  // Local state
  const [run, setRun] = useState<AgentRun>(() => createEmptyRun());
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("requirements");
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Collapsible left panel
  const [isHydrated, setIsHydrated] = useState(false);

  // Client-side logs for the Execution Console (frontend errors, API events, etc.)
  const [clientLogs, setClientLogs] = useState<{ stepLabel: string; log: import("@/types/circuit").AgentStepLog }[]>([]);
  const addClientLog = useCallback((message: string, type: "info" | "warning" | "result" = "info", stepLabel = "Frontend") => {
    setClientLogs(prev => [...prev, { stepLabel, log: { timestamp: new Date().toISOString(), message, type } }]);
  }, []);

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

  // Sync Playground to Netlist when switching to "netlist" tab
  useEffect(() => {
    if (activeTab === "netlist" && project?.playgroundState) {
      const { nodes, edges } = project.playgroundState;
      if (nodes && nodes.length > 0) {
        const generatedSpice = generateSpiceFromPlayground(nodes, edges);
        setRun(prev => {
          if (!prev.netlist) return prev;
          return {
            ...prev,
            netlist: { ...prev.netlist, raw: generatedSpice }
          };
        });
      }
    }
  }, [activeTab, project?.playgroundState]);

  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [lastPrompt, setLastPrompt] = useState("");
  const [lastCategory, setLastCategory] = useState<CircuitCategory | "">("");
  const pollRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => () => { if (pollRef.current) clearTimeout(pollRef.current); }, []);

  const handleSubmit = useCallback(
    async (prompt: string, category: CircuitCategory, metrics: unknown[]) => {
      setIsRunning(true);
      setActiveTab("console");
      setIsSidebarOpen(true);
      setLastPrompt(prompt);
      setLastCategory(category);
      setClientLogs([]);  // Clear previous logs

      // Reset UI to pending/running state
      const pendingRun = createEmptyRun(prompt, category);
      pendingRun.status = "running";
      setRun(pendingRun);

      addClientLog(`🚀 Run started — Category: ${category}, Prompt: "${prompt.slice(0, 80)}${prompt.length > 80 ? '...' : ''}"`, "info", "Run Creation");

      try {
        // 1️⃣ Create run on backend
        const constraints = (metrics as { label: string; value: string; unit: string; priority: string }[])
          .map((m) => ({
            metric: m.label,
            target: parseFloat(m.value) || 0,
            unit: m.unit || "",
            priority: (m.priority || "hard") as "hard" | "soft",
          }));

        addClientLog(`📡 Sending request to backend (POST /api/v1/runs)...`, "info", "API");
        const created = await api.createRun({
          natural_language_prompt: prompt,
          category,
          supply_voltage: 1.8,
          technology: "TSMC 180nm",
          temperature: 27,
          constraints,
        });

        const runId = created.id;
        setActiveRunId(runId);
        addClientLog(`✅ Run created: ${runId}`, "result", "API");
        addClientLog(`⏳ Polling for pipeline status every 2s...`, "info", "Polling");

        // 2️⃣ Poll for status every 2s
        const poll = async (): Promise<void> => {
          try {
            const { status, current_step, progress_percent } = await api.getRunStatus(runId);
            
            // Fetch real steps so logs arrive live
            const fullRun = await api.getRun(runId);
            const mapped = mapApiRunToFrontend(fullRun);

            setRun((prev) => {
              // Merge backend steps into the full pipeline list
              const backendStepsMap = new Map((mapped.steps || []).map(s => [s.id, s]));
              const updatedSteps = prev.steps.map(s => {
                const bStep = backendStepsMap.get(s.id);
                if (bStep) {
                  return { ...s, ...bStep };
                }
                const stepKey = s.id.replace("step-", "");
                if (current_step && stepKey === current_step) return { ...s, status: "running" as import("@/types/circuit").AgentStepStatus };
                
                // fallback prior logic for remaining
                const pipelineOrder = [
                  "requirement_parsing","topology_selection","netlist_generation",
                  "validation","simulation_run","metric_extraction",
                  "monte_carlo","optimization_loop","recommendation_ready"
                ];
                
                if (current_step) {
                  const currentIdx = pipelineOrder.indexOf(current_step);
                  const stepIdx = pipelineOrder.indexOf(stepKey);
                  if (currentIdx !== -1 && stepIdx !== -1 && currentIdx > stepIdx) {
                    return { ...s, status: "complete" as import("@/types/circuit").AgentStepStatus };
                  }
                }
                
                return s;
              });

              return {
                ...prev,
                ...mapped, // overwrite with incoming latest run data (iterations etc)
                status: status as AgentRun["status"],
                steps: updatedSteps,
              };
            });

            if (status === "completed" || status === "complete") {
              setIsRunning(false);
              updateProjectRun(id, { ...mapped, status: "complete" });
              if (mapped.netlist?.raw) {
                const { nodes, edges } = parseSpiceToPlayground(mapped.netlist.raw);
                updatePlaygroundState(id, { nodes, edges, selectedNodeId: null, selectedEdgeId: null });
              }
            } else if (status === "failed" || status === "cancelled") {
              setRun((prev) => ({ ...prev, status: "failed" }));
              setIsRunning(false);
            } else {
              // Continue polling
              pollRef.current = setTimeout(poll, 2000);
            }
          } catch (err) {
            console.error("Polling error:", err);
            addClientLog(`⚠️ Polling error: ${err instanceof Error ? err.message : String(err)}. Retrying in 3s...`, "warning", "Polling");
            pollRef.current = setTimeout(poll, 3000);
          }
        };
        pollRef.current = setTimeout(poll, 2000);

      } catch (err) {
        console.error("Failed to create run:", err);
        const errMsg = err instanceof Error ? err.message : String(err);
        addClientLog(`❌ Failed to create run: ${errMsg}`, "warning", "API Error");
        // Try to extract more detail from API response
        if (err && typeof err === 'object' && 'response' in err) {
          try {
            const body = await (err as { response: Response }).response?.text?.();
            if (body) addClientLog(`📋 API Response: ${body.slice(0, 500)}`, "warning", "API Error");
          } catch { /* ignore */ }
        }
        setRun((prev) => ({ ...prev, status: "failed" }));
        setIsRunning(false);
        setActiveTab("console");
      }
    },
    [id, updateProjectRun, updatePlaygroundState]
  );


  const handleNetlistChange = (newRaw: string) => {
    // 1. Update netlist locally
    setRun(prev => {
      if (!prev.netlist) return prev;
      return {
        ...prev,
        netlist: { ...prev.netlist, raw: newRaw }
      };
    });
    // 2. Sync to Playground State
    const { nodes, edges } = parseSpiceToPlayground(newRaw, project?.playgroundState?.nodes || []);
    updatePlaygroundState(id, { nodes, edges, selectedNodeId: null, selectedEdgeId: null });
  };

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
              setRun(createEmptyRun());
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
        {/* ── LEFT PANEL: Agent Progress ── */}
        <div
          className={cn(
            "space-y-4 transition-all duration-300 h-full max-h-[calc(100vh-140px)] flex flex-col hidden lg:flex",
            !isSidebarOpen && "hidden lg:hidden"
          )}
        >
          <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 shadow-xl flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between mb-4 flex-shrink-0">
              <SectionHeader
                title="Agent Progress"
                subtitle="Live autonomous workflow"
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
            {/* The actual timeline scroll view */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-zinc-800 pb-10">
              <AgentProgressTimeline steps={run.steps} />
            </div>
          </div>
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
                tab.id !== "requirements" &&
                tab.id !== "console" &&
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
              <WorkspacePlayground projectId={id} activeRunId={run?.id} />
            ) : (
              <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-5 shadow-xl min-h-[600px]">
                
                {/* A — Requirements */}
                {activeTab === "requirements" && (
                   <div className="max-w-xl space-y-6">
                     <div className="bg-zinc-950/50 border border-zinc-800/80 rounded-xl p-4">
                       <SectionHeader
                         title="Requirements"
                         subtitle="Describe circuit goals"
                         accent="cyan"
                       />
                       <RequirementForm onSubmit={handleSubmit} isRunning={isRunning} initialPrompt={lastPrompt} initialCategory={lastCategory || project?.category || "op-amp"} />
                     </div>

                     {allDone && (
                      <div className="rounded-xl bg-zinc-950/50 border border-zinc-800/80 p-4 space-y-3 animate-slide-in">
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
                            <div key={label} className="px-3 py-2 rounded-lg bg-zinc-900/80 border border-zinc-800/60">
                              <div className="text-[10px] text-zinc-600 uppercase tracking-widest">{label}</div>
                              <div className="text-sm font-mono font-semibold text-zinc-200">{value}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                   </div>
                )}

                {/* B — Design Output */}
                {activeTab === "design" && (
                  <div>
                    {allDone && run.designSummary ? (
                      <>
                        <SectionHeader title="Design Output" subtitle="Selected topology, sizing, and rationale" accent="violet" />
                        <DesignSummaryCard summary={run.designSummary} />
                      </>
                    ) : (
                      <div className="flex flex-col items-center justify-center p-20 text-center border border-zinc-800/50 border-dashed rounded-2xl bg-zinc-950/20">
                        <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3">
                          <Play className="w-4 h-4 text-zinc-600" />
                        </div>
                        <p className="text-sm font-medium text-zinc-500">Run the agent to see results</p>
                        <p className="text-xs text-zinc-700 mt-1">Submit your requirements in the Requirements tab</p>
                      </div>
                    )}
                  </div>
                )}

                {/* C — Netlist */}
                {activeTab === "netlist" && allDone && run.netlist && (
                  <div>
                    <SectionHeader title="SPICE Netlist" subtitle="Auto-generated / Synced" accent="emerald" />
                    <NetlistViewer netlist={run.netlist} onChange={handleNetlistChange} />
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

                {/* G — Console */}
                {activeTab === "console" && (
                  <div className="space-y-4">
                    {/* Error banner */}
                    {run.status === "failed" && (
                      <div className="rounded-xl border border-red-800/60 bg-red-950/20 p-4 space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                          <span className="text-sm font-semibold text-red-400">Pipeline Failed</span>
                        </div>
                        <p className="text-xs text-red-400/70">
                          The design agent encountered an error. Check the logs below for details.
                          You can retry by submitting new requirements.
                        </p>
                      </div>
                    )}
                    <ConsoleView steps={run.steps} clientLogs={clientLogs} />
                  </div>
                )}

                {/* Disabled state for other tabs */}
                {!allDone && activeTab !== "requirements" && activeTab !== "design" && activeTab !== "console" && (
                  <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3">
                      <Play className="w-4 h-4 text-zinc-600" />
                    </div>
                    <p className="text-sm font-medium text-zinc-500">Run the agent to see results</p>
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
