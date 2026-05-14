"use client";

import { useState, useEffect } from "react";
import { WorkspaceResponse, getWorkspacesByTenant } from "@/lib/api/workspaces";
import { useOrg } from "@/store/orgStore";

export function useWorkspaces() {
  const { activeOrg } = useOrg();
  const [workspaces, setWorkspaces] = useState<WorkspaceResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkspaces() {
      if (!activeOrg) {
        setWorkspaces([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const data = await getWorkspacesByTenant(activeOrg.id);
        setWorkspaces(data);
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to fetch workspaces");
      } finally {
        setLoading(false);
      }
    }

    fetchWorkspaces();
  }, [activeOrg]);

  return {
    workspaces,
    loading,
    error,
    refreshWorkspaces: async () => {
      if (!activeOrg) return;
      setLoading(true);
      try {
        const data = await getWorkspacesByTenant(activeOrg.id);
        setWorkspaces(data);
      } finally {
        setLoading(false);
      }
    }
  };
}
