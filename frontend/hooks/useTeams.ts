"use client";

import { useEffect, useCallback } from "react";
import { useTeamStore } from "@/store/teamStore";
import { useWorkspaceStore } from "@/store/workspaceStore";

export function useTeams(workspaceId?: string) {
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const resolvedWorkspaceId = workspaceId || activeWorkspace?.id;

  const { teams, loading, error, fetchTeams } = useTeamStore();

  const refresh = useCallback(async () => {
    if (!resolvedWorkspaceId) return;
    await fetchTeams(resolvedWorkspaceId);
  }, [fetchTeams, resolvedWorkspaceId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { teams, loading, error, refresh };
}
