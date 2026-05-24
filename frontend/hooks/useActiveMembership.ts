"use client";

import { useQuery } from "@tanstack/react-query";
import { getOrganizationMembers, MemberResponse } from "@/lib/api/orgs";
import { useOrgStore } from "@/store/orgStore";
import { useAuthStore } from "@/store/authStore";
import { queryKeys } from "@/lib/queryKeys";

export function useActiveMembership() {
  const activeOrg = useOrgStore((state) => state.activeOrg);
  const user = useAuthStore((state) => state.user);

  const query = useQuery<MemberResponse[], Error>({
    queryKey: activeOrg ? queryKeys.members(activeOrg.id) : ["members", "none"],
    queryFn: () => {
      if (!activeOrg) return Promise.resolve([]);
      return getOrganizationMembers(activeOrg.id);
    },
    enabled: !!activeOrg && !!user,
    staleTime: 30_000,
    retry: 1,
  });

  const members = query.data ?? [];
  const activeMember = members.find(
    (m) => m.email.toLowerCase() === user?.email?.toLowerCase()
  );

  return {
    membership: activeMember ?? null,
    loading: query.isLoading || query.isFetching,
    error: query.error?.message ?? null,
  };
}
