"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Check, ChevronRight, Cpu, Loader2, Plus, Zap } from "lucide-react";
import { useProjectStore } from "@/store/useProjectStore";
import type { CircuitCategory } from "@/types/circuit";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Create Project Wizard Modal
// ──────────────────────────────────────────────────────────────────────────────

const categories: { id: CircuitCategory; label: string; desc: string }[] = [
  { id: "op-amp", label: "Operational Amplifier", desc: "Two-stage, folded cascode, etc." },
  { id: "filter", label: "Filter", desc: "Active/Passive continuous-time filters" },
  { id: "voltage-regulator", label: "Voltage Regulator", desc: "LDOs, DC-DC Converters" },
  { id: "oscillator", label: "Oscillator", desc: "VCOs, Ring Oscillators" },
  { id: "lna", label: "Low Noise Amplifier", desc: "RF front-end LNA topologies" },
];

interface CreateProjectWizardProps {
  onClose: () => void;
}

export function CreateProjectWizard({ onClose }: CreateProjectWizardProps) {
  const router = useRouter();
  const createProject = useProjectStore((s) => s.createProject);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [projectName, setProjectName] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<CircuitCategory>("op-amp");

  // Step 3 animation progress
  const [progress, setProgress] = useState(0);

  const handleNext = () => {
    if (step === 1 && projectName.trim().length > 0) {
      setStep(2);
    } else if (step === 2) {
      setStep(3);
    }
  };

  useEffect(() => {
    if (step === 3) {
      // Simulate "Creating Workspace" animation
      let perc = 0;
      const interval = setInterval(() => {
        perc += 15;
        if (perc >= 100) {
          clearInterval(interval);
          setProgress(100);
          
          // Actually create and redirect
          const newId = createProject(projectName.trim(), selectedCategory);
          setTimeout(() => {
            router.push(`/workspace/${newId}`);
          }, 400); // short delay after hitting 100%
        } else {
          setProgress(perc);
        }
      }, 300);

      return () => clearInterval(interval);
    }
  }, [step, createProject, projectName, selectedCategory, router]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md p-4 animate-fade-in">
      <div
        className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden flex flex-col animate-slide-in relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(step === 1 || step === 2) && (
          <div className="px-6 py-5 border-b border-zinc-800 bg-zinc-900/40 relative">
            <h2 className="text-lg font-bold text-zinc-100 mb-1">Create New Project</h2>
            <p className="text-xs text-zinc-500">Step {step} of 2</p>
            <button
              onClick={onClose}
              className="absolute top-5 right-5 w-8 h-8 rounded-lg flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              ✕
            </button>
          </div>
        )}

        {/* Step 1: Project Name */}
        {step === 1 && (
          <div className="p-6 space-y-5 animate-fade-in">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                Project Name
              </label>
              <input
                type="text"
                autoFocus
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g. High-Speed LDO v2"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && projectName.trim()) handleNext();
                }}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all font-medium"
              />
            </div>
            
            <div className="pt-2 flex justify-end">
              <button
                onClick={handleNext}
                disabled={!projectName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 rounded-xl text-sm font-bold transition-all"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Category Selection */}
        {step === 2 && (
          <div className="p-6 space-y-5 animate-fade-in">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-widest pl-1">
                Project Type
              </label>
              <div className="grid grid-cols-1 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={cn(
                      "flex items-center text-left p-3 rounded-xl border transition-all",
                      selectedCategory === cat.id
                        ? "bg-cyan-500/10 border-cyan-500/50 text-cyan-400"
                        : "bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:border-zinc-700"
                    )}
                  >
                    <div className="flex-1">
                      <div className="text-sm font-bold mb-0.5">{cat.label}</div>
                      <div className={cn("text-[11px]", selectedCategory === cat.id ? "text-cyan-500/70" : "text-zinc-600")}>
                        {cat.desc}
                      </div>
                    </div>
                    {selectedCategory === cat.id && <Check className="w-5 h-5" />}
                  </button>
                ))}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                onClick={() => setStep(1)}
                className="px-4 py-2.5 text-sm font-medium text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-5 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-xl text-sm font-bold transition-all shadow-lg shadow-cyan-500/20"
              >
                <Zap className="w-4 h-4 fill-current" />
                Create Workspace
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Loading Animation */}
        {step === 3 && (
          <div className="p-10 flex flex-col items-center justify-center text-center space-y-6 min-h-[300px] animate-fade-in">
            <div className="relative w-16 h-16 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-zinc-800" />
              <div 
                className="absolute inset-0 rounded-full border-4 border-cyan-500 border-t-transparent animate-spin" 
              />
              <Cpu className="w-6 h-6 text-cyan-400 animate-pulse" />
            </div>
            
            <div className="space-y-2 w-full max-w-xs mx-auto">
              <h3 className="text-sm font-bold text-zinc-100">Initializing Workspace...</h3>
              <p className="text-xs text-zinc-500 font-mono">
                {progress < 30 ? "Booting agent core..." : progress < 60 ? "Loading TSMC 180nm PDK..." : progress < 90 ? "Spinning up NGSPICE server..." : "Workspace ready"}
              </p>
              
              <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden mt-4">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-300 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
