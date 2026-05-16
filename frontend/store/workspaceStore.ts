import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { WorkspaceResponse, getWorkspacesByTenant } from "@/lib/api/workspaces";

interface WorkspaceState {
  workspaces: WorkspaceResponse[];
  activeWorkspace: WorkspaceResponse | null;
  loading: boolean;
  error: string | null;
  fetchWorkspaces: (orgId: string) => Promise<void>;
  setActiveWorkspace: (workspace: WorkspaceResponse | null) => void;
  addWorkspace: (workspace: WorkspaceResponse) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set, get) => ({
      workspaces: [],
      activeWorkspace: null,
      loading: false,
      error: null,

      fetchWorkspaces: async (orgId: string) => {
        set({ loading: true, error: null });
        try {
          const data = await getWorkspacesByTenant(orgId);
          set({ workspaces: data, loading: false });
          // Auto-select first workspace if none active
          if (data.length > 0 && !get().activeWorkspace) {
            set({ activeWorkspace: data[0] });
          }
        } catch (err: any) {
          set({ error: err.message || "Failed to fetch workspaces", loading: false });
        }
      },

      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
      
      addWorkspace: (workspace) => {
        set((state) => ({ workspaces: [...state.workspaces, workspace] }));
      },
    }),
    {
      name: 'hivespace-workspaces',
    }
  )
);
