"use client";

import { useState, useRef, useEffect } from "react";
import { Send, Cpu, LayoutTemplate, RotateCcw, BoxSelect } from "lucide-react";
import type { ChatMessage } from "@/types/playground";
import { cn } from "@/lib/utils";

// ──────────────────────────────────────────────────────────────────────────────
// Chat Panel (Right Sidebar)
// ──────────────────────────────────────────────────────────────────────────────

interface ChatPanelProps {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onClear: () => void;
  onLoadTemplateClick: () => void;
  isTyping?: boolean;
}

export function ChatPanel({
  messages,
  onSendMessage,
  onClear,
  onLoadTemplateClick,
  isTyping = false,
}: ChatPanelProps) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput("");
  };

  return (
    <div className="w-[320px] flex-shrink-0 flex flex-col bg-zinc-950/80 border-l border-zinc-800/80 backdrop-blur-md h-full z-10 font-sans">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center">
            <Cpu className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-zinc-100 leading-tight">CircuitAgent</h2>
            <p className="text-[10px] text-zinc-500 flex items-center gap-1.5 mt-0.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Online
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onLoadTemplateClick}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-cyan-400 hover:bg-zinc-900 transition-colors"
            title="Load Template"
          >
            <LayoutTemplate className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onClear}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-zinc-500 hover:text-red-400 hover:bg-zinc-900 transition-colors"
            title="Clear Chat & Canvas"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-800">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[90%] text-sm rounded-xl px-4 py-2.5",
              msg.role === "user"
                ? "ml-auto bg-cyan-500 text-zinc-950 font-medium"
                : msg.role === "system"
                ? "mx-auto bg-zinc-900/50 border border-zinc-800 text-zinc-400 text-xs w-full"
                : msg.role === "suggestion"
                ? "bg-amber-500/10 border border-amber-500/30 text-amber-200/90 text-xs"
                : "bg-zinc-900 text-zinc-300 border border-zinc-800 mr-auto"
            )}
          >
            {/* System Message Icon Block */}
            {msg.role === "system" && (
              <div className="flex items-center gap-1.5 mb-1.5 text-zinc-500 font-mono text-[9px] uppercase tracking-widest pl-0.5">
                <BoxSelect className="w-3 h-3" />
                Canvas Update
              </div>
            )}
            
            <span className={cn(
              msg.role === "system" && "whitespace-pre-line font-mono text-[11px]",
              msg.role === "agent" && "leading-relaxed"
            )}>
              {msg.content}
            </span>
            
            {/* Timestamp */}
            {msg.role !== "system" && (
              <div
                className={cn(
                  "text-[9px] mt-1.5 text-right opacity-60",
                  msg.role === "user" ? "text-cyan-950" : "text-zinc-500"
                )}
              >
                {new Date(msg.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="max-w-[90%] bg-zinc-900 border border-zinc-800 mr-auto rounded-xl px-4 py-3 flex items-center gap-1.5">
            <span className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.3s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce [animation-delay:-0.15s]" />
              <span className="w-1.5 h-1.5 rounded-full bg-zinc-600 animate-bounce" />
            </span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Input Box */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-900/50">
        <form
          onSubmit={handleSubmit}
          className="flex items-end gap-2 bg-zinc-950 border border-zinc-800 focus-within:border-cyan-500/50 rounded-xl p-1.5 transition-colors shadow-inner"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask agent to modify circuit..."
            className="flex-1 max-h-32 min-h-9 resize-none bg-transparent text-sm text-zinc-300 placeholder-zinc-600 px-2 py-1.5 focus:outline-none scrollbar-thin overflow-y-auto"
            rows={1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isTyping}
            className="w-9 h-9 flex-shrink-0 bg-cyan-500 hover:bg-cyan-400 disabled:bg-zinc-800 disabled:text-zinc-600 active:scale-95 text-zinc-950 flex items-center justify-center rounded-lg transition-all"
          >
            <Send className="w-4 h-4 ml-0.5" />
          </button>
        </form>
        <p className="text-center text-[9px] text-zinc-600 mt-2 font-medium">
          Agent can modify canvas elements, answer conceptual questions, and suggest topologies.
        </p>
      </div>
    </div>
  );
}
