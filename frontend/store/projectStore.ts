import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { ProjectResponse, getProjectsByWorkspace } from "@/lib/api/projects";

interface ProjectState {
  projects: ProjectResponse[];
  loading: boolean;
  error: string | null;
  fetchProjects: (workspaceId: string) => Promise<void>;
  addProject: (project: ProjectResponse) => void;
  setProjects: (projects: ProjectResponse[]) => void;
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      projects: [],
      loading: false,
      error: null,

      fetchProjects: async (workspaceId: string) => {
        set({ loading: true, error: null });
        try {
          const data = await getProjectsByWorkspace(workspaceId);
          set({ projects: data, loading: false });
        } catch (err: any) {
          set({ error: err.message || "Failed to fetch projects", loading: false });
        }
      },

      addProject: (project) => {
        set((state) => ({ projects: [...state.projects, project] }));
      },

      setProjects: (projects) => set({ projects }),
    }),
    {
      name: 'hivespace-projects',
    }
  )
);
