"use client";

import { useState, createContext, useContext } from "react";
import type { WorkspaceResponse } from "@/lib/api/workspace";

interface WorkspaceContextType {
  activeWorkspace: WorkspaceResponse | null;
  setActiveWorkspace: (workspace: WorkspaceResponse | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceResponse | null>(() => {
    if (typeof window !== "undefined") {
      const savedWorkspace = localStorage.getItem("activeWorkspace");
      if (savedWorkspace) {
        try {
          return JSON.parse(savedWorkspace);
        } catch {
          console.error("Failed to parse saved workspace");
        }
      }
    }
    return null;
  });

  const setActiveWorkspace = (workspace: WorkspaceResponse | null) => {
    setActiveWorkspaceState(workspace);
    if (workspace) {
      localStorage.setItem("activeWorkspace", JSON.stringify(workspace));
    } else {
      localStorage.removeItem("activeWorkspace");
    }
  };

  return (
    <WorkspaceContext.Provider value={{ activeWorkspace, setActiveWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
