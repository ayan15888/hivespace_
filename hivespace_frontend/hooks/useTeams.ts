"use client";

import { useState, useEffect, useCallback } from "react";
import { getTeamsByProject, TeamResponse } from "@/lib/api/teams";
import { usePathname } from "next/navigation";

export function useTeams() {
  const pathname = usePathname();
  const [teams, setTeams] = useState<TeamResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Extract projectId from pathname if we are in a project route
  const projectId = pathname.split("/projects/")[1]?.split("/")[0];

  const fetchTeams = useCallback(async () => {
    if (!projectId) {
      setTeams([]);
      return;
    }

    setLoading(true);
    try {
      const data = await getTeamsByProject(projectId);
      setTeams(data);
      setError(null);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchTeams();
  }, [fetchTeams]);

  return { teams, loading, error, refresh: fetchTeams };
}
