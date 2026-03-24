"use client";

import { useEffect, useRef } from "react";
import { Terminal, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { AgentStep, AgentStepLog } from "@/types/circuit";
import { useState } from "react";
import { SectionHeader } from "@/components/layout/SectionHeader";

interface ConsoleViewProps {
  steps: AgentStep[];
  clientLogs?: { stepLabel: string; log: AgentStepLog }[];
}

export function ConsoleView({ steps, clientLogs = [] }: ConsoleViewProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Auto-scroll to bottom on new logs
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [steps, clientLogs]);

  // Flatten all logs into a single chronologically sorted array
  const allLogs: { stepLabel: string; log: AgentStepLog }[] = [
    ...steps.flatMap((s) => s.logs.map((l) => ({ stepLabel: s.label, log: l }))),
    ...clientLogs,
  ].sort(
    (a, b) =>
      new Date(a.log.timestamp).getTime() - new Date(b.log.timestamp).getTime()
  );

  const handleCopy = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="h-full flex flex-col rounded-2xl bg-zinc-950/80 border border-zinc-800 p-5 shadow-xl min-h-[600px] overflow-hidden">
      <SectionHeader
        title="Execution Console"
        subtitle="Live backend engine and orchestration logs"
        accent="cyan"
      />
      
      {allLogs.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-20 text-center border border-zinc-800/50 border-dashed rounded-xl bg-zinc-900/30 mt-4">
          <div className="w-10 h-10 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center mb-3">
            <Terminal className="w-4 h-4 text-zinc-600" />
          </div>
          <p className="text-sm font-medium text-zinc-500">Awaiting execution logs</p>
          <p className="text-xs text-zinc-700 mt-1">Logs will appear here once the run starts</p>
        </div>
      ) : (
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto mt-4 rounded-xl border border-zinc-900 bg-black/60 p-4 font-mono text-xs leading-relaxed space-y-1 scrollbar-thin scrollbar-thumb-zinc-800"
        >
          {allLogs.map(({ stepLabel, log }, i) => {
            // Determine styling based on type
            const isInfo = log.type === "info";
            const isWarning = log.type === "warning";
            const isResult = log.type === "result";
            const isReasoning = log.type === "reasoning";
            
            // Xyce logs can be multi-line
            const isMultiline = log.message.includes("\\n") || log.message.includes("XYCE STDOUT") || log.message.includes("XYCE STDERR");
            const cleanMessage = log.message;

            return (
              <div
                key={i}
                className="group flex flex-col sm:flex-row items-start py-1 px-2 rounded hover:bg-zinc-900/50 transition-colors"
              >
                <div className="flex flex-shrink-0 w-full sm:w-48 mb-1 sm:mb-0 space-x-2">
                  <span className="text-zinc-600 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], {
                      hour12: false,
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      fractionalSecondDigits: 3,
                    })}
                  </span>
                  <span className="text-zinc-500 truncate" title={stepLabel}>
                    [{stepLabel}]
                  </span>
                </div>
                
                <div className="flex-1 w-full min-w-0 flex items-start gap-2 relative">
                  <span
                    className={cn(
                      "break-words whitespace-pre-wrap -ml-1 pl-1 border-l-2",
                      isInfo ? "text-zinc-300 border-transparent" : "",
                      isWarning ? "text-amber-400 border-amber-500/50 bg-amber-500/5" : "",
                      isResult ? "text-emerald-400 border-emerald-500/50 bg-emerald-500/5" : "",
                      isReasoning ? "text-violet-400 border-violet-500/50 bg-violet-500/5" : ""
                    )}
                  >
                    {cleanMessage}
                  </span>
                  
                  {isMultiline && (
                    <button
                      onClick={() => handleCopy(cleanMessage, i)}
                      className="opacity-0 group-hover:opacity-100 absolute top-0 right-0 p-1 rounded bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-all shadow-sm"
                      title="Copy log"
                    >
                      {copiedIndex === i ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
