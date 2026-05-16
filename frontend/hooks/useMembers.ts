"use client";

import { useState, useEffect } from "react";
import { getOrganizationMembers, MemberResponse } from "@/lib/api/orgs";
import { useOrgStore } from "@/store/orgStore";

export function useMembers() {
  const activeOrg = useOrgStore((state) => state.activeOrg);
  const [members, setMembers] = useState<MemberResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadMembers() {
      if (!activeOrg) {
        setMembers([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getOrganizationMembers(activeOrg.id);
        setMembers(data);
        setError(null);
      } catch (err: unknown) {
        const errorMessage = (err as Error).message || "Failed to load members";
        setError(errorMessage);
        console.error(errorMessage);
      } finally {
        setLoading(false);
      }
    }
    loadMembers();
  }, [activeOrg]);

  return { members, loading, error };
}
