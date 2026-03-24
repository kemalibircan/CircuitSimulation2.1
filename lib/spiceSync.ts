import { v4 as uuidv4 } from "uuid";
import type { CircuitNode, CircuitEdge, CircuitNodeData, CircuitEdgeData } from "@/types/playground";

/**
 * Very basic SPICE to Playground and Playground to SPICE syncing utilities
 */

// 1. generateSpiceFromPlayground
export function generateSpiceFromPlayground(nodes: CircuitNode[], edges: CircuitEdge[]): string {
  let spice = "* Auto-generated SPICE Netlist from Playground\n";
  spice += "* Note: Connections are simplified for demo purposes.\n\n";

  // Naive edge parsing: group node ports by net
  const nets: Record<string, { nodeId: string; handle: string }[]> = {};
  edges.forEach((edge, i) => {
    const netName = edge.data?.netName || `net_${i + 1}`;
    if (!nets[netName]) nets[netName] = [];
    if (edge.source && edge.sourceHandle) {
      nets[netName].push({ nodeId: edge.source, handle: edge.sourceHandle });
    }
    if (edge.target && edge.targetHandle) {
      nets[netName].push({ nodeId: edge.target, handle: edge.targetHandle });
    }
  });

  // Utility to find a netName for a specific node handle
  const findNetForPort = (nodeId: string, handle: string) => {
    for (const [netName, connections] of Object.entries(nets)) {
      if (connections.find(c => c.nodeId === nodeId && c.handle === handle)) {
        return netName;
      }
    }
    return "0"; // Default floating / disconnected to 0
  };

  nodes.forEach((node) => {
    const d = node.data;
    if (!d) return;

    if (d.type === "nmos" || d.type === "pmos") {
      const dNet = findNetForPort(node.id, "drain");
      const gNet = findNetForPort(node.id, "gate");
      const sNet = findNetForPort(node.id, "source");
      const bNet = d.type === "nmos" ? "0" : "vdd"; // simplified bulk
      const model = d.props.model || (d.type === "nmos" ? "NMOS" : "PMOS");
      const W = d.props.W || "10";
      const L = d.props.L || "0.5";
      spice += `M_${node.id} ${dNet} ${gNet} ${sNet} ${bNet} ${model} W=${W}u L=${L}u\n`;
    } else if (d.type === "resistor") {
      const pNet = findNetForPort(node.id, "p");
      const nNet = findNetForPort(node.id, "n");
      const rVal = d.props.resistance || "10k";
      spice += `R_${node.id} ${pNet} ${nNet} ${rVal}\n`;
    } else if (d.type === "capacitor") {
      const pNet = findNetForPort(node.id, "p");
      const nNet = findNetForPort(node.id, "n");
      const cVal = d.props.capacitance || "1p";
      spice += `C_${node.id} ${pNet} ${nNet} ${cVal}\n`;
    } else if (d.type === "vsource") {
      const pNet = findNetForPort(node.id, "pos");
      const nNet = findNetForPort(node.id, "neg");
      const vVal = d.props.voltage || "1.8";
      spice += `V_${node.id} ${pNet} ${nNet} DC ${vVal}V\n`;
    } else if (d.type === "isource") {
      const pNet = findNetForPort(node.id, "pos");
      const nNet = findNetForPort(node.id, "neg");
      const iVal = d.props.current || "100u";
      spice += `I_${node.id} ${pNet} ${nNet} DC ${iVal}A\n`;
    } else if (d.type === "opamp") {
      const inpNet = findNetForPort(node.id, "inp");
      const innNet = findNetForPort(node.id, "inn");
      const outNet = findNetForPort(node.id, "out");
      const vddNet = findNetForPort(node.id, "vdd");
      const vssNet = findNetForPort(node.id, "vss");
      const model = d.props.model || "Opamp";
      spice += `X_${node.id} ${inpNet} ${innNet} ${outNet} ${vddNet} ${vssNet} ${model}\n`;
    } else if (d.type === "inductor") {
      const pNet = findNetForPort(node.id, "p");
      const nNet = findNetForPort(node.id, "n");
      const lVal = d.props.inductance || "1n";
      spice += `L_${node.id} ${pNet} ${nNet} ${lVal}\n`;
    } else if (d.type === "diode") {
      const pNet = findNetForPort(node.id, "p");
      const nNet = findNetForPort(node.id, "n");
      spice += `D_${node.id} ${pNet} ${nNet} Dmodel\n`;
    } else if (d.type === "npn" || d.type === "pnp") {
      const cNet = findNetForPort(node.id, "drain");
      const bNet = findNetForPort(node.id, "gate");
      const eNet = findNetForPort(node.id, "source");
      const model = d.props.model || (d.type === "npn" ? "NPN" : "PNP");
      spice += `Q_${node.id} ${cNet} ${bNet} ${eNet} ${model}\n`;
    } else if (d.type === "ground") {
      const gndNet = findNetForPort(node.id, "gnd");
      spice += `* Node ${node.id} is GND (Net: ${gndNet} -> 0)\n`;
    } else if (d.type === "vdd") {
      const vddNet = findNetForPort(node.id, "vdd");
      const vVal = d.props.voltage || "1.8";
      spice += `V_VDD_${node.id} ${vddNet} 0 DC ${vVal}V\n`;
    } else {
      spice += `* Unhandled component type: ${d.type} (${node.id})\n`;
    }
  });

  spice += "\n.op\n.end\n";
  return spice;
}

// ── Helper types for smart layout ──
interface ParsedComponent {
  node: CircuitNode;
  nets: { net: string; handle: string }[];
  role: "source" | "active" | "passive" | "supply" | "ground" | "output";
}

// 2. parseSpiceToPlayground — Topology-aware auto-layout
export function parseSpiceToPlayground(spice: string, existingNodes: CircuitNode[] = []): { nodes: CircuitNode[], edges: CircuitEdge[] } {
  const parsedComponents: ParsedComponent[] = [];
  const edges: CircuitEdge[] = [];
  const lines = spice.split(/\r?\n/);
  const netsConfig: Record<string, { nodeId: string, handle: string }[]> = {};

  const recordNet = (netName: string, nodeId: string, handle: string) => {
    if (netName === "0" || netName.toLowerCase() === "gnd") return;
    if (!netsConfig[netName]) netsConfig[netName] = [];
    netsConfig[netName].push({ nodeId, handle });
  };

  // ── Phase 1: Parse all component lines ──
  lines.forEach(line => {
    const l = line.trim();
    if (!l || l.startsWith("*") || l.startsWith(".")) return;
    const parts = l.split(/\s+/);
    const label = parts[0];
    const prefix = label.charAt(0).toUpperCase();

    if (prefix === "M") {
      const [name, nd, ng, ns, nb, model] = parts;
      const wMatch = l.match(/W=([\d.]+u?)/i);
      const lMatch = l.match(/L=([\d.]+u?)/i);
      const type = (model && model.toUpperCase().includes("P")) ? "pmos" : "nmos";
      parsedComponents.push({
        node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type, props: { model: model || "", W: wMatch?.[1]?.replace("u","") || "10", L: lMatch?.[1]?.replace("u","") || "0.5" } }, position: { x: 0, y: 0 } },
        nets: [{ net: nd, handle: "drain" }, { net: ng, handle: "gate" }, { net: ns, handle: "source" }],
        role: "active"
      });

    } else if (prefix === "X") {
      const name = parts[0];
      const modelName = parts[parts.length - 1];
      const netTokens = parts.slice(1, -1);
      const isOpamp = modelName.toLowerCase().includes("opamp") || modelName.toLowerCase().includes("op_amp") || modelName.toLowerCase().includes("oa") || netTokens.length >= 3;
      if (isOpamp) {
        const opNets: { net: string; handle: string }[] = [];
        const handleMap = ["inp", "inn", "out", "vdd", "vss"];
        netTokens.forEach((tok, i) => { if (i < handleMap.length) opNets.push({ net: tok, handle: handleMap[i] }); });
        parsedComponents.push({
          node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type: "opamp", props: { model: modelName } }, position: { x: 0, y: 0 } },
          nets: opNets, role: "active"
        });
      } else {
        parsedComponents.push({
          node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type: "resistor", props: { model: modelName } }, position: { x: 0, y: 0 } },
          nets: [], role: "passive"
        });
      }

    } else if (prefix === "R") {
      const [name, n1, n2, val] = parts;
      parsedComponents.push({
        node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type: "resistor", props: { resistance: val || "10k" } }, position: { x: 0, y: 0 } },
        nets: [{ net: n1, handle: "p" }, { net: n2, handle: "n" }], role: "passive"
      });

    } else if (prefix === "C") {
      const [name, n1, n2, val] = parts;
      parsedComponents.push({
        node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type: "capacitor", props: { capacitance: val || "1p" } }, position: { x: 0, y: 0 } },
        nets: [{ net: n1, handle: "p" }, { net: n2, handle: "n" }], role: "passive"
      });

    } else if (prefix === "L") {
      const [name, n1, n2, val] = parts;
      parsedComponents.push({
        node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type: "inductor", props: { inductance: val || "1n" } }, position: { x: 0, y: 0 } },
        nets: [{ net: n1, handle: "p" }, { net: n2, handle: "n" }], role: "passive"
      });

    } else if (prefix === "D") {
      const [name, n1, n2] = parts;
      parsedComponents.push({
        node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type: "diode", props: {} }, position: { x: 0, y: 0 } },
        nets: [{ net: n1, handle: "p" }, { net: n2, handle: "n" }], role: "passive"
      });

    } else if (prefix === "Q") {
      const [name, nc, nb, ne, model] = parts;
      const type = (model && model.toUpperCase().includes("PNP")) ? "pnp" : "npn";
      parsedComponents.push({
        node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type, props: { model: model || "" } }, position: { x: 0, y: 0 } },
        nets: [{ net: nc, handle: "drain" }, { net: nb, handle: "gate" }, { net: ne, handle: "source" }], role: "active"
      });

    } else if (prefix === "V") {
      const [name, n1, n2, dcStr, valStr] = parts;
      if (name.toUpperCase().includes("VDD") || name.toUpperCase() === "VDD") {
        parsedComponents.push({
          node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type: "vdd", props: { voltage: valStr?.replace("V","") || "1.8" } }, position: { x: 0, y: 0 } },
          nets: [{ net: n1, handle: "vdd" }], role: "supply"
        });
      } else {
        parsedComponents.push({
          node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type: "vsource", props: { voltage: valStr?.replace("V","") || "1.8" } }, position: { x: 0, y: 0 } },
          nets: [{ net: n1, handle: "pos" }, { net: n2, handle: "neg" }], role: "source"
        });
      }

    } else if (prefix === "I") {
      const [name, n1, n2, dcStr, valStr] = parts;
      parsedComponents.push({
        node: { id: name || uuidv4(), type: "customCircuitNode", data: { label: name, type: "isource", props: { current: valStr?.replace("A","") || "100u" } }, position: { x: 0, y: 0 } },
        nets: [{ net: n1, handle: "pos" }, { net: n2, handle: "neg" }], role: "source"
      });
    }
  });

  // ── Phase 2: Topology-aware layout ──
  // Layout strategy:
  //   Row 0 (top):     VDD / power supplies — centered
  //   Row 1 (middle):  Sources (left) → Active devices (center-right)
  //   Row 2 (lower):   Passive components — spread below
  //   Row 3 (bottom):  GND — centered

  const SPACING_X = 200;
  const SPACING_Y = 180;
  const START_X = 120;
  const START_Y = 80;

  const supplies = parsedComponents.filter(c => c.role === "supply");
  const sources = parsedComponents.filter(c => c.role === "source");
  const actives = parsedComponents.filter(c => c.role === "active");
  const passives = parsedComponents.filter(c => c.role === "passive");

  const maxRowWidth = Math.max(supplies.length, sources.length + actives.length, passives.length, 1);
  const centerX = START_X + Math.floor(maxRowWidth / 2) * SPACING_X;

  // Row 0: VDD
  supplies.forEach((comp, i) => {
    comp.node.position = { x: centerX + (i - Math.floor(supplies.length / 2)) * SPACING_X, y: START_Y };
  });

  // Row 1: Sources left, Active devices right
  const row1Y = START_Y + SPACING_Y;
  sources.forEach((comp, i) => {
    comp.node.position = { x: START_X + i * SPACING_X, y: row1Y };
  });

  const activeStartX = START_X + Math.max(sources.length, 1) * SPACING_X;
  actives.forEach((comp, i) => {
    comp.node.position = { x: activeStartX + i * SPACING_X, y: row1Y };
  });

  // Row 2: Passive components
  const row2Y = row1Y + SPACING_Y;
  passives.forEach((comp, i) => {
    comp.node.position = { x: START_X + i * SPACING_X, y: row2Y };
  });

  // ── Phase 3: Build nodes array, preserve existing positions ──
  const nodes: CircuitNode[] = [];
  parsedComponents.forEach(comp => {
    const node = comp.node;
    const existing = existingNodes.find(en => en.id === node.id || en.data?.label === node.data?.label);
    if (existing) {
      node.position = { ...existing.position };
      if (existing.data.label === node.data.label) node.id = existing.id;
    }
    nodes.push(node);
    comp.nets.forEach(({ net, handle }) => recordNet(net, node.id, handle));
  });

  // ── Phase 4: Add GND node at bottom center ──
  const hasGndRefs = lines.some(line => {
    const l = line.trim();
    if (!l || l.startsWith("*") || l.startsWith(".")) return false;
    return l.split(/\s+/).slice(1).some(t => t === "0");
  });

  if (hasGndRefs) {
    const gndY = row2Y + SPACING_Y;
    const gndNode: CircuitNode = {
      id: "GND", type: "customCircuitNode",
      data: { label: "GND", type: "ground", props: {} },
      position: { x: centerX, y: gndY }
    };
    const existingGnd = existingNodes.find(en => en.data?.type === "ground");
    if (existingGnd) { gndNode.position = { ...existingGnd.position }; gndNode.id = existingGnd.id; }
    nodes.push(gndNode);

    // Connect all '0' references to GND
    lines.forEach(line => {
      const l = line.trim();
      if (!l || l.startsWith("*") || l.startsWith(".")) return;
      const tokens = l.split(/\s+/);
      const compName = tokens[0];
      const existingNode = nodes.find(n => n.id === compName);
      if (!existingNode) return;

      tokens.slice(1).forEach((token, idx) => {
        if (token !== "0") return;
        let handle = "n";
        const t = existingNode.data?.type;
        if (t === "nmos" || t === "pmos" || t === "npn" || t === "pnp") {
          handle = idx === 0 ? "drain" : idx === 1 ? "gate" : "source";
        } else if (t === "opamp") {
          handle = (["inp", "inn", "out", "vdd", "vss"])[idx] || "inn";
        } else if (t === "vsource" || t === "isource") {
          handle = idx === 0 ? "pos" : "neg";
        } else {
          handle = idx === 0 ? "p" : "n";
        }
        if (!netsConfig["GND_NET"]) netsConfig["GND_NET"] = [];
        netsConfig["GND_NET"].push({ nodeId: existingNode.id, handle });
        netsConfig["GND_NET"].push({ nodeId: gndNode.id, handle: "gnd" });
      });
    });
  }

  // ── Phase 5: Create edges from nets ──
  let edgeCounter = 0;
  for (const [netName, connections] of Object.entries(netsConfig)) {
    // Deduplicate
    const unique: { nodeId: string; handle: string }[] = [];
    const seen = new Set<string>();
    for (const c of connections) {
      const key = `${c.nodeId}:${c.handle}`;
      if (!seen.has(key)) { seen.add(key); unique.push(c); }
    }
    for (let i = 0; i < unique.length - 1; i++) {
      edges.push({
        id: `e-${netName}-${edgeCounter++}`,
        source: unique[i].nodeId,
        sourceHandle: unique[i].handle,
        target: unique[i + 1].nodeId,
        targetHandle: unique[i + 1].handle,
        data: { netName },
        animated: false,
        type: "customWireEdge"
      });
    }
  }

  return { nodes, edges };
}
