"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrganizationMembers, MemberResponse } from "@/lib/api/orgs";
import { useOrgStore } from "@/store/orgStore";
import { queryKeys } from "@/lib/queryKeys";

export function useMembers() {
  const activeOrg = useOrgStore((state) => state.activeOrg);

  const query = useQuery<MemberResponse[], Error>({
    queryKey: activeOrg ? queryKeys.members(activeOrg.id) : ["members", "none"],
    queryFn: () => {
      if (!activeOrg) return Promise.resolve([]);
      return getOrganizationMembers(activeOrg.id);
    },
    enabled: !!activeOrg,
    staleTime: 30_000,
    retry: 1,
  });

  return {
    members: query.data ?? [],
    loading: query.isLoading || query.isFetching,
    error: query.error?.message ?? null,
  };
}
