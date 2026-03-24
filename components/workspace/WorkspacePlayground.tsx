"use client";

import { useEffect, useState, useCallback } from "react";
import { useNodesState, useEdgesState, addEdge, Connection, Edge } from "reactflow";
import { ComponentLibrary } from "@/components/playground/ComponentLibrary";
import { CircuitCanvasWithProvider } from "@/components/playground/CircuitCanvas";
import { ChatPanel } from "@/components/playground/ChatPanel";
import { StarterTemplates } from "@/components/playground/StarterTemplates";

import { useProjectStore } from "@/store/useProjectStore";
import { api } from "@/lib/api";
import type { ChatMessage, CircuitNodeData, CircuitEdgeData, StarterTemplate, AgentActionType } from "@/types/playground";

const WELCOME_MESSAGE: ChatMessage[] = [
  {
    id: "msg-welcome",
    role: "agent",
    content: "Welcome to the Circuit Playground. I am CircuitAgent. You can drag components from the library to build a circuit manually, or give me natural language instructions and I will build and modify the circuit for you.\n\nType something like **\"Load a differential pair\"** or **\"Add an NMOS and connect its source to ground\"** to get started.",
    timestamp: new Date().toISOString(),
  },
];

// ──────────────────────────────────────────────────────────────────────────────
// Embedded Playground Component
// ──────────────────────────────────────────────────────────────────────────────

export function WorkspacePlayground({ projectId, activeRunId }: { projectId: string; activeRunId?: string }) {
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
    project?.chatHistory?.length ? project.chatHistory : WELCOME_MESSAGE
  );
  const [isTyping, setIsTyping] = useState(false);

  // ─── Modal State ───
  const [showTemplates, setShowTemplates] = useState(false);

  // ─── Scope Mode ───
  const [scopeMode, setScopeMode] = useState(false);

  // Sync state to global store on change
  useEffect(() => {
    updatePlaygroundState(projectId, { nodes, edges, selectedNodeId: null, selectedEdgeId: null });
  }, [nodes, edges, projectId, updatePlaygroundState]);

  useEffect(() => {
    updateChatHistory(projectId, messages);
  }, [messages, projectId, updateChatHistory]);

  // ─── Load simulation results into playground when activeRunId changes ───
  useEffect(() => {
    if (!activeRunId || !project?.runData) return;

    const run = project.runData;
    // If the run has simulation result with waveform data, populate scope data
    const simResult = run?.simulationResult;
    if (simResult?.waveforms) {
      // Map simulation waveform signals to edge scope data
      setEdges((currentEdges) =>
        currentEdges.map((edge) => {
          const netName = (edge.data as CircuitEdgeData)?.netName;
          if (!netName) return edge;

          // Try to find matching waveform signal in simulation results
          const waveform = simResult.waveforms?.find(
            (w: any) => w.name?.toLowerCase() === netName.toLowerCase() ||
              w.signals?.some((sig: any) => sig.name?.toLowerCase() === netName.toLowerCase())
          );

          if (waveform) {
            const sig: any = (waveform as any).signals?.[0];
            return {
              ...edge,
              data: {
                ...edge.data,
                scopeData: {
                  voltage: sig?.yValues?.[sig.yValues.length - 1]
                    ? `${sig.yValues[sig.yValues.length - 1].toFixed(3)}V`
                    : undefined,
                  nodeName: netName,
                },
              },
            };
          }
          return edge;
        })
      );
    }
  }, [activeRunId, project?.runData, setEdges]);

  // ─── Canvas Handlers ───
  const onConnect = useCallback(
    (params: Edge | Connection) => {
      // Auto-assign net names for new connections
      const edgeId = `e-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const newEdge = {
        ...params,
        id: edgeId,
        type: "customWireEdge",
        data: {
          netName: `net_${edges.length + 1}`,
        } as CircuitEdgeData,
      };
      setEdges((eds) => addEdge(newEdge, eds));
    },
    [setEdges, edges.length]
  );

  // ─── Scope Mode Handler ───
  const handleScopeModeToggle = useCallback(() => {
    setScopeMode((prev) => {
      // When exiting scope mode, clear all probe markers
      if (prev) {
        setEdges((eds) =>
          eds.map((e) => ({
            ...e,
            data: { ...e.data, isProbed: false } as CircuitEdgeData,
          }))
        );
      }
      return !prev;
    });
  }, [setEdges]);

  const handleEdgeProbe = useCallback(
    (edgeId: string) => {
      setEdges((eds) =>
        eds.map((e) => {
          if (e.id === edgeId) {
            const currentlyProbed = (e.data as CircuitEdgeData)?.isProbed;
            // Toggle the probe on this edge
            const edgeData = (e.data || {}) as CircuitEdgeData;

            // Generate mock measurement data if no simulation data exists
            const scopeData = edgeData.scopeData || {
              voltage: `${(Math.random() * 3.3).toFixed(3)}V`,
              current: `${(Math.random() * 1000).toFixed(1)}µA`,
              nodeName: edgeData.netName || `net_${e.id.slice(-4)}`,
            };

            return {
              ...e,
              data: {
                ...edgeData,
                isProbed: !currentlyProbed,
                scopeData,
              },
            };
          }
          return e;
        })
      );

      // Add a system message about the probe
      const edge = edges.find((e) => e.id === edgeId);
      const netName = (edge?.data as CircuitEdgeData)?.netName || edgeId;
      if (!(edge?.data as CircuitEdgeData)?.isProbed) {
        setMessages((prev) => [
          ...prev,
          {
            id: `probe-${Date.now()}`,
            role: "system",
            content: `🔬 Scope attached to **${netName}**`,
            timestamp: new Date().toISOString(),
            actionType: "info" as AgentActionType,
          },
        ]);
      }
    },
    [edges, setEdges]
  );

  // ─── Chat Handlers ───
  const handleSendMessage = useCallback(
    async (text: string) => {
      const userMsg: ChatMessage = {
        id: `msg-${Date.now()}`,
        role: "user",
        content: text,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      try {
        // Send the complete canvas state to the backend
        const response: any = await api.chatCommand(projectId, text, { nodes, edges });
        setIsTyping(false);

        // Instantly apply patches returned by the AI Agent
        if (response.canvas_patches && Array.isArray(response.canvas_patches) && response.canvas_patches.length > 0) {
          let updatedNodes = [...nodes];
          let updatedEdges = [...edges];
          
          for (const patch of response.canvas_patches) {
            const op = patch.op;
            if (op === "add_node" && patch.node) {
              updatedNodes.push(patch.node);
            } else if (op === "remove_node" && patch.node_id) {
              updatedNodes = updatedNodes.filter(n => n.id !== patch.node_id);
              updatedEdges = updatedEdges.filter(e => e.source !== patch.node_id && e.target !== patch.node_id);
            } else if (op === "update_node" && patch.node_id && patch.properties) {
              updatedNodes = updatedNodes.map(n => 
                n.id === patch.node_id 
                  ? { ...n, data: { ...n.data, props: { ...n.data.props, ...patch.properties } } } 
                  : n
              );
            } else if (op === "add_edge" && patch.edge) {
              // Ensure new edges use the custom wire type
              const newEdge = {
                ...patch.edge,
                type: patch.edge.type || "customWireEdge",
                data: {
                  netName: patch.edge.data?.netName || `net_${updatedEdges.length + 1}`,
                  ...patch.edge.data,
                } as CircuitEdgeData,
              };
              updatedEdges.push(newEdge);
            } else if (op === "remove_edge" && patch.edge_id) {
              updatedEdges = updatedEdges.filter(e => e.id !== patch.edge_id);
            }
          }
          
          setNodes(updatedNodes);
          setEdges(updatedEdges as any);
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `agent-${Date.now()}`,
            role: "agent",
            content: response.agent_message || "Done.",
            timestamp: new Date().toISOString(),
            actionType: "canvas_update",
            actionData: response.canvas_patches,
          },
        ]);
      } catch (error: any) {
        setIsTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            role: "system",
            content: `❌ **Error communicating with agent:** ${error.message}`,
            timestamp: new Date().toISOString(),
          },
        ]);
      }
    },
    [projectId, nodes, edges, setNodes, setEdges]
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
      setMessages(WELCOME_MESSAGE);
      setScopeMode(false);
    }
  }, [setNodes, setEdges]);

  // ─── Layout Render ───
  return (
    <div className="flex h-[calc(100vh-140px)] min-h-[600px] w-full overflow-hidden bg-zinc-950 font-sans border border-zinc-800 rounded-2xl relative shadow-2xl">
      <ComponentLibrary
        scopeMode={scopeMode}
        onScopeModeToggle={handleScopeModeToggle}
      />
      <div className="flex-1 relative h-full bg-zinc-950 z-0">
        <CircuitCanvasWithProvider
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          setNodes={setNodes}
          setEdges={setEdges as any}
          scopeMode={scopeMode}
          onEdgeProbe={handleEdgeProbe}
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
