"use client";

import { useState, useEffect } from "react";
import { ProjectResponse, getProjectsByWorkspace } from "@/lib/api/projects";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function useProjects() {
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const [projects, setProjects] = useState<ProjectResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProjects() {
      if (!activeWorkspace) {
        setProjects([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getProjectsByWorkspace(activeWorkspace.id);
        setProjects(data);
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to fetch projects");
      } finally {
        setLoading(false);
      }
    }

    fetchProjects();
  }, [activeWorkspace]);

  return {
    projects,
    loading,
    error,
    refreshProjects: async () => {
      if (!activeWorkspace) return;
      setLoading(true);
      try {
        const data = await getProjectsByWorkspace(activeWorkspace.id);
        setProjects(data);
      } finally {
        setLoading(false);
      }
    }
  };
}
