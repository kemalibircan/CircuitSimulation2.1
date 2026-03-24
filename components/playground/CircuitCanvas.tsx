"use client";

import { useCallback, useRef, useState, DragEvent } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  NodeChange,
  EdgeChange,
  ReactFlowProvider,
  ReactFlowInstance,
} from "reactflow";
import "reactflow/dist/style.css";

import { CircuitNode } from "./CircuitNode";
import { WireEdge } from "./WireEdge";
import { PropertyInspector } from "./PropertyInspector";
import type { CircuitNodeData, CircuitEdgeData, CircuitComponentType } from "@/types/playground";
import { getComponentDef, componentLibrary } from "@/data/componentLibrary";

// Register custom node/edge types for React Flow
// Map both the generic "customCircuitNode" key AND every individual component type
// so that nodes created by the backend (type: "resistor") or via drag-drop
// (type: "customCircuitNode") all render with the custom SVG-based CircuitNode.
const nodeTypes: Record<string, typeof CircuitNode> = { customCircuitNode: CircuitNode };
componentLibrary.forEach((c) => { nodeTypes[c.type] = CircuitNode; });

// Also register step + customWireEdge as wire edge
const edgeTypes = {
  customWireEdge: WireEdge,
  step: WireEdge,
  default: WireEdge,
};

interface CircuitCanvasProps {
  nodes: import("reactflow").Node<CircuitNodeData>[];
  edges: import("reactflow").Edge<CircuitEdgeData>[];
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  setNodes?: React.Dispatch<React.SetStateAction<import("reactflow").Node<CircuitNodeData>[]>>;
  setEdges?: React.Dispatch<React.SetStateAction<import("reactflow").Edge<CircuitEdgeData>[]>>;
  /** Scope mode — when active, clicking edges probes them */
  scopeMode?: boolean;
  /** Callback when an edge is probed in scope mode */
  onEdgeProbe?: (edgeId: string) => void;
}

export function CircuitCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  setNodes,
  setEdges,
  scopeMode = false,
  onEdgeProbe,
}: CircuitCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Instance counter per component type for better labels
  const instanceCounterRef = useRef<Record<string, number>>({});

  // Generate a clean label like R1, M2, C3
  const getNextLabel = (type: CircuitComponentType): string => {
    const def = getComponentDef(type);
    if (!def) return `X${Math.floor(Math.random() * 100)}`;
    const prefix = def.shortLabel;
    const count = (instanceCounterRef.current[prefix] || 0) + 1;
    instanceCounterRef.current[prefix] = count;
    return `${prefix}${count}`;
  };

  // Auto-generate a generic unique ID
  const getId = () => `node-${Math.random().toString(36).substr(2, 9)}`;

  // Handle drag over from left panel
  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  // Handle drop to create node
  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();

      if (!reactFlowInstance || !reactFlowWrapper.current || !setNodes) return;

      const type = event.dataTransfer.getData("application/reactflow") as CircuitComponentType;
      if (!type) return;

      const def = getComponentDef(type);
      if (!def) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.project({
        x: event.clientX - reactFlowBounds.left - (def.nodeWidth / 2),
        y: event.clientY - reactFlowBounds.top - (def.nodeHeight / 2),
      });

      const newNode: import("reactflow").Node<CircuitNodeData> = {
        id: getId(),
        type: "customCircuitNode",
        position,
        data: {
          label: getNextLabel(type),
          type,
          props: { ...def.defaultProps },
        },
      };

      setNodes((nds) => nds.concat(newNode));
    },
    [reactFlowInstance, setNodes]
  );

  const selectedNode = nodes.find((n) => n.id === selectedNodeId);

  const handleUpdateNode = (id: string, newData: CircuitNodeData) => {
    if (setNodes) {
      setNodes((nds) =>
        nds.map((node) => (node.id === id ? { ...node, data: newData } : node))
      );
    }
  };

  // Handle edge click for scope mode
  const handleEdgeClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      if (scopeMode && onEdgeProbe) {
        onEdgeProbe(edge.id);
      }
    },
    [scopeMode, onEdgeProbe]
  );

  return (
    <div
      className="flex-1 h-full w-full relative"
      ref={reactFlowWrapper}
      style={scopeMode ? { cursor: "crosshair" } : undefined}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onInit={setReactFlowInstance}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onSelectionChange={(params) => {
          setSelectedNodeId(params.nodes.length === 1 ? params.nodes[0].id : null);
        }}
        onEdgeClick={handleEdgeClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "customWireEdge" }}
        connectionLineStyle={{ stroke: "#22d3ee", strokeWidth: 1.5 }}
        connectionMode={"loose" as any}
        snapToGrid={true}
        snapGrid={[12, 12]}
        fitView
        className="bg-zinc-950"
        proOptions={{ hideAttribution: true }}
      >
        {/* Subtle dot grid for engineering feel */}
        <Background color="#3f3f46" gap={24} size={1} />
        
        {/* Controls sticky on the right */}
        <Controls
          position="top-right"
          className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden fill-zinc-400 shadow-xl shadow-black/40 [&>button]:border-zinc-800 [&>button:hover]:bg-zinc-800 [&>button:hover]:fill-cyan-400"
          style={{ display: "flex", flexDirection: "column" }}
        />

        {/* Scope mode indicator overlay */}
        {scopeMode && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
            <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/40 backdrop-blur-sm">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[11px] font-bold text-emerald-300 tracking-wide">
                SCOPE MODE — Click a wire to measure
              </span>
            </div>
          </div>
        )}
      </ReactFlow>

      {/* Popover Property Inspector if a node is selected */}
      {selectedNode && selectedNodeId && (
        <PropertyInspector
          nodeId={selectedNodeId}
          data={selectedNode.data}
          onUpdate={handleUpdateNode}
          onClose={() => setSelectedNodeId(null)}
        />
      )}
    </div>
  );
}

// Wrap in ReactFlowProvider if not already provided upstream
export function CircuitCanvasWithProvider(props: CircuitCanvasProps) {
  return (
    <ReactFlowProvider>
      <CircuitCanvas {...props} />
    </ReactFlowProvider>
  );
}
