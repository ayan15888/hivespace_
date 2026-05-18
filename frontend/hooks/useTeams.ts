"use client";

import { useState, useEffect, useCallback } from "react";
import { getTeamsByWorkspace, TeamResponse } from "@/lib/api/teams";

export function useTeams(workspaceId?: string) {
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchTeams = useCallback(async () => {
    if (!workspaceId) {
      setTeams([]);
      return;
    }
    setLoading(true);
    try {
      const data = await getTeamsByWorkspace(workspaceId);
      setTeams(data);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return { teams, loading, error, refresh: fetchTeams };
}
