import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DocSidebarState {
  activeProjectId: string | null;
  activeDocId: string | null;
  setActiveProject: (id: string | null) => void;
  setActiveDoc: (id: string | null) => void;
}

export const useDocSidebarState = create<DocSidebarState>()(
  persist(
    (set) => ({
      activeProjectId: null,
      activeDocId: null,
      setActiveProject: (id) => set({ activeProjectId: id }),
      setActiveDoc: (id) => set({ activeDocId: id }),
    }),
    { name: "hivespace-doc-sidebar" }
  )
);
