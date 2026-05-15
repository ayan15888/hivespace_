"use client";

import { useState, useEffect } from "react";
import { OrgResponse, getMyOrganizations } from "@/lib/api/orgs";
import { useAuth } from "./useAuth";

export function useOrgs() {
  const { user } = useAuth();
  const [orgs, setOrgs] = useState<OrgResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchOrgs() {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const data = await getMyOrganizations();
        setOrgs(data);
      } catch (err: unknown) {
        setError((err as Error).message || "Failed to fetch organizations");
      } finally {
        setLoading(false);
      }
    }

    fetchOrgs();
  }, [user]);

  return {
    orgs,
    loading,
    error,
    refreshOrgs: async () => {
      setLoading(true);
      try {
        const data = await getMyOrganizations();
        setOrgs(data);
      } finally {
        setLoading(false);
      }
    }
  };
}
