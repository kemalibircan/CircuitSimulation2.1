"use client";

import { useEffect, useState, useCallback } from "react";
import { useNodesState, useEdgesState, addEdge, Connection, Edge } from "reactflow";
import { ComponentLibrary } from "@/components/playground/ComponentLibrary";
import { CircuitCanvasWithProvider } from "@/components/playground/CircuitCanvas";
import { ChatPanel } from "@/components/playground/ChatPanel";
import { StarterTemplates } from "@/components/playground/StarterTemplates";

import { useProjectStore } from "@/store/useProjectStore";
import type { ChatMessage, CircuitNodeData, StarterTemplate } from "@/types/playground";
import { mockChatInitial, mockAgentResponses } from "@/data/mockPlayground";

// ──────────────────────────────────────────────────────────────────────────────
// Embedded Playground Component
// ──────────────────────────────────────────────────────────────────────────────

export function WorkspacePlayground({ projectId }: { projectId: string }) {
  const project = useProjectStore((s) => s.getProject(projectId));
  const updatePlaygroundState = useProjectStore((s) => s.updatePlaygroundState);
  const updateChatHistory = useProjectStore((s) => s.updateChatHistory);

  // ─── Canvas State ───
  const [nodes, setNodes, onNodesChange] = useNodesState<CircuitNodeData>(
    project?.playgroundState?.nodes || []
  );
  const [edges, setEdges, onEdgesChange] = useEdgesState(
    project?.playgroundState?.edges || []
  );

  // ─── Chat State ───
  const [messages, setMessages] = useState<ChatMessage[]>(
    project?.chatHistory?.length ? project.chatHistory : mockChatInitial
  );
  const [isTyping, setIsTyping] = useState(false);

  // ─── Modal State ───
  const [showTemplates, setShowTemplates] = useState(false);

  // Sync state to global store on change (debounced or simple)
  useEffect(() => {
    updatePlaygroundState(projectId, { nodes, edges, selectedNodeId: null, selectedEdgeId: null });
  }, [nodes, edges, projectId, updatePlaygroundState]);

  useEffect(() => {
    updateChatHistory(projectId, messages);
  }, [messages, projectId, updateChatHistory]);

  // ─── Canvas Handlers ───
  const onConnect = useCallback(
    (params: Edge | Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // ─── Chat Handlers ───
  const handleSendMessage = useCallback(
    (text: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      setTimeout(() => {
        setIsTyping(false);
        const lowerText = text.toLowerCase();
        const matchedResponse = mockAgentResponses.find((r) =>
          lowerText.includes(r.trigger)
        );

        if (matchedResponse) {
          setMessages((prev) => [...prev, ...matchedResponse.messages]);
        } else {
          setMessages((prev) => [
            ...prev,
            {
              id: `msg-${Date.now() + 1}`,
              role: "agent",
              content:
                "I understand your request. If we were connected to the backend, I would implement this change directly on your schematic.",
              timestamp: new Date().toISOString(),
            },
          ]);
        }
      }, 1500);
    },
    []
  );

  // ─── Template Loader ───
  const handleLoadTemplate = useCallback(
    (tpl: StarterTemplate) => {
      setNodes(tpl.nodes);
      setEdges(tpl.edges);
      setShowTemplates(false);

      setMessages((prev) => [
        ...prev,
        {
          id: `sys-${Date.now()}`,
          role: "system",
          content: `Loaded template: ${tpl.name}\n${tpl.nodes.length} components, ${tpl.edges.length} connections.`,
          timestamp: new Date().toISOString(),
          actionType: "template_loaded",
          actionData: { templateId: tpl.id },
        },
      ]);
    },
    [setNodes, setEdges]
  );

  const handleClear = useCallback(() => {
    if (confirm("Clear the canvas and chat history?")) {
      setNodes([]);
      setEdges([]);
      setMessages(mockChatInitial);
    }
  }, [setNodes, setEdges]);

  // ─── Layout Render ───
  return (
    <div className="flex h-[800px] w-full overflow-hidden bg-zinc-950 font-sans border border-zinc-800 rounded-2xl relative shadow-2xl">
      <ComponentLibrary />
      <div className="flex-1 relative h-full bg-zinc-950 z-0">
        <CircuitCanvasWithProvider
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          setNodes={setNodes}
          setEdges={setEdges as any}
        />
      </div>
      <ChatPanel
        messages={messages}
        onSendMessage={handleSendMessage}
        onClear={handleClear}
        onLoadTemplateClick={() => setShowTemplates(true)}
        isTyping={isTyping}
      />
      {showTemplates && (
        <StarterTemplates
          onSelect={handleLoadTemplate}
          onClose={() => setShowTemplates(false)}
        />
      )}
    </div>
  );
}
