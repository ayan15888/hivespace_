"use client";

import { useQuery } from "@tanstack/react-query";
import { getWorkspaceMembers, WorkspaceMemberResponse } from "@/lib/api/workspaces";
import { useWorkspaceStore } from "@/store/workspaceStore";

const DEFAULT_MEMBERS: WorkspaceMemberResponse[] = [];

export function useWorkspaceMembers(workspaceId?: string) {
  const activeWorkspace = useWorkspaceStore((state) => state.activeWorkspace);
  const targetWorkspaceId = workspaceId || activeWorkspace?.id;

  const query = useQuery<WorkspaceMemberResponse[], Error>({
    queryKey: targetWorkspaceId ? ["workspaceMembers", targetWorkspaceId] : ["workspaceMembers", "none"],
    queryFn: () => {
      if (!targetWorkspaceId) return Promise.resolve([]);
      return getWorkspaceMembers(targetWorkspaceId);
    },
    enabled: !!targetWorkspaceId,
    staleTime: 30_000,
    retry: 1,
  });

  return {
    members: query.data ?? DEFAULT_MEMBERS,
    loading: query.isLoading || query.isFetching,
    error: query.error?.message ?? null,
  };
}
