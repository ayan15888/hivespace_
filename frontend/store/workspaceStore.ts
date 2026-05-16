import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WorkspaceResponse } from "@/lib/api/workspace";

interface WorkspaceState {
  activeWorkspace: WorkspaceResponse | null;
  setActiveWorkspace: (workspace: WorkspaceResponse | null) => void;
}

export const useWorkspaceStore = create<WorkspaceState>()(
  persist(
    (set) => ({
      activeWorkspace: null,
      setActiveWorkspace: (workspace) => set({ activeWorkspace: workspace }),
    }),
    {
      name: 'activeWorkspace', // key in localStorage
    }
  )
);
