import type { AgentRunSummary } from "@/types/circuit";

export const mockRunsList: AgentRunSummary[] = [
  {
    id: "run-001",
    status: "complete",
    category: "op-amp",
    prompt:
      "Design a two-stage CMOS operational amplifier with at least 60 dB gain and 10 MHz bandwidth",
    topologyName: "Two-Stage Miller-Compensated",
    gainDB: 68.1,
    bandwidthMHz: 12.3,
    startedAt: "2025-10-15T09:05:00Z",
    completedAt: "2025-10-15T09:31:07Z",
  },
  {
    id: "run-002",
    status: "complete",
    category: "current-mirror",
    prompt:
      "Generate a low-power cascode current mirror with < 5% output current error across 0.5–1.4V compliance range",
    topologyName: "Regulated Cascode Current Mirror",
    gainDB: undefined,
    bandwidthMHz: undefined,
    startedAt: "2025-10-14T14:22:00Z",
    completedAt: "2025-10-14T14:48:30Z",
  },
  {
    id: "run-003",
    status: "failed",
    category: "lna",
    prompt:
      "Design a 2.4GHz inductively-degenerated CMOS LNA with NF < 1.5dB and IIP3 > -5dBm",
    topologyName: undefined,
    gainDB: undefined,
    bandwidthMHz: undefined,
    startedAt: "2025-10-13T11:10:00Z",
    completedAt: "2025-10-13T11:42:10Z",
  },
  {
    id: "run-004",
    status: "complete",
    category: "bandgap",
    prompt:
      "Implement a CMOS bandgap voltage reference with < 50 ppm/°C temperature coefficient",
    topologyName: "Self-Biased Bandgap Reference",
    gainDB: undefined,
    bandwidthMHz: undefined,
    startedAt: "2025-10-12T16:05:00Z",
    completedAt: "2025-10-12T16:38:44Z",
  },
  {
    id: "run-005",
    status: "running",
    category: "filter",
    prompt:
      "Design a 5th-order Butterworth low-pass Gm-C filter with 10 MHz cutoff frequency in 65nm process",
    topologyName: undefined,
    gainDB: undefined,
    bandwidthMHz: undefined,
    startedAt: "2025-10-15T12:00:00Z",
    completedAt: undefined,
  },
];
