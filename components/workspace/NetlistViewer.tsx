"use client";

import { useState } from "react";
import { Copy, Download, ChevronDown, ChevronUp, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NetlistOutput } from "@/types/circuit";

interface NetlistViewerProps {
  netlist: NetlistOutput;
  onChange?: (newRaw: string) => void;
}

// Very lightweight syntax highlighter for SPICE — no external deps
function highlightSpice(line: string): React.ReactNode {
  // Comments
  if (line.startsWith("*")) {
    return <span className="spice-comment">{line}</span>;
  }
  // Directives
  if (line.startsWith(".")) {
    const parts = line.split(" ");
    return (
      <>
        <span className="spice-directive">{parts[0]}</span>
        <span className="spice-value">{" " + parts.slice(1).join(" ")}</span>
      </>
    );
  }
  // Component lines (M, R, C, V, I...)
  const compMatch = line.match(/^([MRCVIL]\w*)\s+(.*)$/i);
  if (compMatch) {
    const rest = compMatch[2].split(/\s+/);
    // Last token is model/value
    const model = rest[rest.length - 1];
    const nets = rest.slice(0, -1);
    return (
      <>
        <span className="spice-component">{compMatch[1]}</span>{" "}
        {nets.map((n, i) => (
          <span key={i}>
            <span className="spice-net">{n}</span>{" "}
          </span>
        ))}
        <span className="spice-model">{model}</span>
      </>
    );
  }
  return <span className="spice-value">{line}</span>;
}

export function NetlistViewer({ netlist, onChange }: NetlistViewerProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(netlist.raw);

  const lines = netlist.raw.split("\n");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(netlist.raw);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback: do nothing
    }
  }

  function handleDownload() {
    const blob = new Blob([netlist.raw], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `circuit_netlist.sp`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSave() {
    setIsEditing(false);
    onChange?.(draft);
  }

  return (
    <div className="rounded-xl border border-zinc-800 overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-900/80 border-b border-zinc-800">
        <div className="flex items-center gap-3">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-500/60" />
            <div className="w-3 h-3 rounded-full bg-amber-500/60" />
            <div className="w-3 h-3 rounded-full bg-emerald-500/60" />
          </div>
          <span className="text-xs font-mono text-zinc-500">
            netlist.sp — {netlist.format.toUpperCase()}
          </span>
          <span className="text-[10px] text-zinc-700 font-mono">
            {lines.length} lines
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {isEditing ? (
            <>
               <button
                onClick={() => { setIsEditing(false); setDraft(netlist.raw); }}
                className="px-2.5 py-1 rounded-md text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-2.5 py-1 rounded-md text-xs text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/30 transition-all font-medium"
              >
                Save Changes
              </button>
            </>
          ) : (
             <button
              onClick={() => { setIsEditing(true); setDraft(netlist.raw); }}
              className="px-2.5 py-1 rounded-md text-xs text-cyan-500 hover:text-cyan-400 hover:bg-zinc-800 transition-all"
            >
              Edit Netlist
            </button>
          )}
          <div className="w-px h-4 bg-zinc-800 mx-1" />
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            {copied ? "Copied" : "Copy"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Download
          </button>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800 transition-all"
          >
            {collapsed ? (
              <ChevronDown className="w-3.5 h-3.5" />
            ) : (
              <ChevronUp className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Code body */}
      {!collapsed && (
        <div className="overflow-auto max-h-80 bg-zinc-950">
          {isEditing ? (
             <textarea
               value={draft}
               onChange={(e) => setDraft(e.target.value)}
               className="w-full min-h-[300px] bg-zinc-950 text-zinc-300 font-mono text-xs p-4 focus:outline-none resize-none"
               spellCheck={false}
             />
          ) : (
          <table className="w-full text-xs font-mono">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i} className="hover:bg-zinc-900/50 transition-colors">
                  <td className="pl-4 pr-3 py-0.5 text-right text-zinc-700 select-none w-10 border-r border-zinc-900">
                    {i + 1}
                  </td>
                  <td className="px-4 py-0.5 whitespace-pre leading-relaxed">
                    {highlightSpice(line)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      )}
    </div>
  );
}
