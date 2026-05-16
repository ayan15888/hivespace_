"use client";

import { useEffect, useCallback } from "react";
import { useWorkspaceStore } from "@/store/workspaceStore";
import { useOrgStore } from "@/store/orgStore";

export function useWorkspaces() {
  const activeOrg = useOrgStore((state) => state.activeOrg);
  const { workspaces, loading, error, fetchWorkspaces } = useWorkspaceStore();

  const refreshWorkspaces = useCallback(async () => {
    if (!activeOrg) return;
    await fetchWorkspaces(activeOrg.id);
  }, [activeOrg, fetchWorkspaces]);

  useEffect(() => {
    refreshWorkspaces();
  }, [refreshWorkspaces]);

  return {
    workspaces,
    loading,
    error,
    refreshWorkspaces
  };
}
