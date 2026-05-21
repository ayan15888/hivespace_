"use client";

import { useQuery } from "@tanstack/react-query";
import { getTeamsByWorkspace, TeamResponse } from "@/lib/api/teams";
import { queryKeys } from "@/lib/queryKeys";

export function useTeams(workspaceId?: string) {
  const query = useQuery<TeamResponse[], Error>({
    queryKey: workspaceId ? queryKeys.teams(workspaceId) : ["teams", "none"],
    queryFn: () => {
      if (!workspaceId) return Promise.resolve([]);
      return getTeamsByWorkspace(workspaceId);
    },
    enabled: !!workspaceId,
    staleTime: 30_000,
    retry: 1,
  });

  return {
    teams: query.data ?? [],
    loading: query.isLoading || query.isFetching,
    error: query.error?.message ?? null,
    refresh: query.refetch,
  };
}
