"use client";

import { useEffect, useCallback } from "react";
import { useProjectStore } from "@/store/projectStore";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function useProjects() {
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const { projects, loading, error, fetchProjects } = useProjectStore();

  const refreshProjects = useCallback(async () => {
    if (!activeWorkspace) return;
    await fetchProjects(activeWorkspace.id);
  }, [activeWorkspace, fetchProjects]);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  return {
    projects,
    loading,
    error,
    refreshProjects
  };
}
