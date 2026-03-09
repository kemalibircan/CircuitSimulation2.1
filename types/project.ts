import type { AgentRun, CircuitCategory } from "./circuit";
import type { CircuitCanvasState, ChatMessage } from "./playground";

export interface Project {
  id: string;
  name: string;
  category: CircuitCategory;
  createdAt: string;
  updatedAt: string;
  
  // Workspace data
  runData?: AgentRun; // The saved agent run state, if any

  // Playground data
  playgroundState?: CircuitCanvasState;
  chatHistory?: ChatMessage[];
}
