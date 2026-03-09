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
import { getComponentDef } from "@/data/componentLibrary";

// Register custom node/edge types for React Flow
const nodeTypes = { customCircuitNode: CircuitNode };
const edgeTypes = { customWireEdge: WireEdge };

interface CircuitCanvasProps {
  nodes: import("reactflow").Node<CircuitNodeData>[];
  edges: import("reactflow").Edge<CircuitEdgeData>[];
  onNodesChange?: (changes: NodeChange[]) => void;
  onEdgesChange?: (changes: EdgeChange[]) => void;
  onConnect?: (connection: Connection) => void;
  setNodes?: React.Dispatch<React.SetStateAction<import("reactflow").Node<CircuitNodeData>[]>>;
  setEdges?: React.Dispatch<React.SetStateAction<import("reactflow").Edge<CircuitEdgeData>[]>>;
}

export function CircuitCanvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  setNodes,
  setEdges,
}: CircuitCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [reactFlowInstance, setReactFlowInstance] = useState<ReactFlowInstance | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

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
        x: event.clientX - reactFlowBounds.left - 40, // offset for visual center
        y: event.clientY - reactFlowBounds.top - 40,
      });

      const newNode: import("reactflow").Node<CircuitNodeData> = {
        id: getId(),
        type: "customCircuitNode",
        position,
        data: {
          label: def.shortLabel + Math.floor(Math.random() * 100),
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

  return (
    <div className="flex-1 h-full w-full relative" ref={reactFlowWrapper}>
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
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        defaultEdgeOptions={{ type: "customWireEdge" }}
        fitView
        className="bg-zinc-950"
        proOptions={{ hideAttribution: true }}
      >
        {/* Subtle dot grid for engineering feel */}
        <Background color="#3f3f46" gap={24} size={1} />
        
        {/* Minimap in bottom left */}
        <MiniMap
          nodeColor="#06b6d4" // cyan-500
          maskColor="rgba(9, 9, 11, 0.7)" // zinc-950 with opacity
          className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden !bottom-4 !left-4"
        />
        
        {/* Controls in bottom right */}
        <Controls
          className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden fill-zinc-400 [&>button]:border-zinc-800 [&>button:hover]:bg-zinc-800 [&>button:hover]:fill-cyan-400 !bottom-4 !right-4"
        />
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
