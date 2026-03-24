// ──────────────────────────────────────────────────────────────────────────────
// CircuitAI Playground — TypeScript Interfaces
// ──────────────────────────────────────────────────────────────────────────────

// ─── Component Types ─────────────────────────────────────────────────────────

export type CircuitComponentType =
  | "nmos"
  | "pmos"
  | "npn"
  | "pnp"
  | "resistor"
  | "capacitor"
  | "inductor"
  | "diode"
  | "vsource"
  | "isource"
  | "opamp"
  | "ground"
  | "vdd"
  | "input_node"
  | "output_node"
  | "probe"
  | "scope"
  | "subcircuit";

export type ComponentCategory =
  | "active"
  | "passive"
  | "sources"
  | "nodes"
  | "tools";

// ─── Property Schemas ────────────────────────────────────────────────────────

export interface PropertyField {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  unit?: string;
  options?: string[];
  min?: number;
  max?: number;
  step?: number;
}

export interface ComponentPropertySchema {
  type: CircuitComponentType;
  fields: PropertyField[];
}

// ─── Node / Edge Data ────────────────────────────────────────────────────────

export interface CircuitNodeData {
  label: string;               // e.g. "M1", "R1"
  type: CircuitComponentType;
  /** Component-specific props, keyed by field name */
  props: Record<string, string | number>;
  selected?: boolean;
  hasWarning?: boolean;
  warningMessage?: string;
}

export interface CircuitEdgeData {
  label?: string;              // net name e.g. "VDD", "net_3"
  netName?: string;
  animated?: boolean;
  /** Scope measurement data — populated after simulation */
  scopeData?: {
    voltage?: string;          // e.g. "1.23V"
    current?: string;          // e.g. "50µA"
    power?: string;            // e.g. "61.5µW"
    nodeName?: string;         // SPICE node name
  };
  /** Whether this edge is currently being probed by scope */
  isProbed?: boolean;
}

// ─── Canvas State ────────────────────────────────────────────────────────────

import type { Node, Edge } from "reactflow";

export type CircuitNode = Node<CircuitNodeData>;
export type CircuitEdge = Edge<CircuitEdgeData>;

export interface CircuitCanvasState {
  nodes: CircuitNode[];
  edges: CircuitEdge[];
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  viewport?: { x: number; y: number; zoom: number };
}

export interface CircuitSelectionState {
  nodeIds: string[];
  edgeIds: string[];
}

// ─── Component Library ───────────────────────────────────────────────────────

export type PortDirection = "input" | "output" | "bidirectional" | "power";
export type ElectricalType = "signal" | "power" | "ground";

export interface ComponentDefinition {
  type: CircuitComponentType;
  label: string;
  shortLabel: string;
  category: ComponentCategory;
  description: string;
  defaultProps: Record<string, string | number>;
  ports: PortDefinition[];
  /** Pixel dimensions for the SVG node */
  nodeWidth: number;
  nodeHeight: number;
  /** SPICE netlist prefix letter (e.g. M for MOSFET, R for resistor) */
  spicePrefix: string;
  /** Template for netlist line generation */
  netlistTemplate?: string;
}

export interface PortDefinition {
  id: string;
  label: string;
  position: "top" | "bottom" | "left" | "right";
  offsetPercent?: number; // along the edge, 0-100
  /** Pixel-precise X offset relative to node origin */
  x: number;
  /** Pixel-precise Y offset relative to node origin */
  y: number;
  /** Signal direction for connection validation */
  direction: PortDirection;
  /** Electrical type for simulation mapping */
  electricalType: ElectricalType;
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type ChatMessageRole = "user" | "agent" | "system" | "suggestion";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  timestamp: string;
  /** Optional structured data for system/suggestion messages */
  actionType?: AgentActionType;
  actionData?: Record<string, unknown>;
}

export type AgentActionType =
  | "node_added"
  | "node_removed"
  | "edge_created"
  | "edge_removed"
  | "property_updated"
  | "template_loaded"
  | "warning"
  | "suggestion"
  | "simulation_triggered"
  | "canvas_update"
  | "info";

export interface AgentAction {
  type: AgentActionType;
  description: string;
  nodeId?: string;
  edgeId?: string;
  property?: string;
  value?: string | number;
}

// ─── Playground Commands (parsed intent) ────────────────────────────────────

export type CommandVerb =
  | "add"
  | "connect"
  | "remove"
  | "modify"
  | "optimize"
  | "explain"
  | "load"
  | "simulate"
  | "query";

export interface PlaygroundCommand {
  verb: CommandVerb;
  target?: string;
  parameter?: string;
  value?: string | number;
  raw: string;
}

// ─── Starter Templates ────────────────────────────────────────────────────────

export interface StarterTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  complexity: "beginner" | "intermediate" | "advanced";
  nodes: CircuitNode[];
  edges: CircuitEdge[];
}
