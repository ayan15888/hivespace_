"use client";

import { useEffect, useCallback } from "react";
import { useOrgStore } from "@/store/orgStore";
import { useAuth } from "./useAuth";

export function useOrgs() {
  const { user } = useAuth();
  const { orgs, loading, error, fetchOrgs } = useOrgStore();

  const refreshOrgs = useCallback(async () => {
    if (!user) return;
    await fetchOrgs();
  }, [user, fetchOrgs]);

  useEffect(() => {
    refreshOrgs();
  }, [refreshOrgs]);

  return {
    orgs,
    loading,
    error,
    refreshOrgs
  };
}
