import { create } from "zustand";
import { persist } from "zustand/middleware";
import { v4 as uuidv4 } from "uuid";
import type { Project } from "@/types/project";
import type { CircuitCategory, AgentRun } from "@/types/circuit";
import type { CircuitCanvasState, ChatMessage } from "@/types/playground";

interface ProjectState {
  projects: Project[];
  
  // Actions
  createProject: (name: string, category: CircuitCategory) => string;
  deleteProject: (id: string) => void;
  getProject: (id: string) => Project | undefined;
  
  // Workspace specific updates
  updateProjectRun: (id: string, runData: AgentRun) => void;
  
  // Playground specific updates
  updatePlaygroundState: (id: string, state: CircuitCanvasState) => void;
  updateChatHistory: (id: string, history: ChatMessage[]) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set, get) => ({
      projects: [],

      createProject: (name, category) => {
        const id = uuidv4();
        const newProject: Project = {
          id,
          name,
          category,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        set((state) => ({
          projects: [newProject, ...state.projects],
        }));

        return id;
      },

      deleteProject: (id) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
        }));
      },

      getProject: (id) => {
        return get().projects.find((p) => p.id === id);
      },

      updateProjectRun: (id, runData) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, runData, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      updatePlaygroundState: (id, playgroundState) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, playgroundState, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },

      updateChatHistory: (id, chatHistory) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === id ? { ...p, chatHistory, updatedAt: new Date().toISOString() } : p
          ),
        }));
      },
    }),
    {
      name: "circuit-ai-projects", // unique name for localStorage key
    }
  )
);
