import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrgResponse } from "@/lib/api/orgs";

interface OrgState {
  activeOrg: OrgResponse | null;
  setActiveOrg: (org: OrgResponse | null) => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set) => ({
      activeOrg: null,
      setActiveOrg: (org) => set({ activeOrg: org }),
    }),
    {
      name: 'activeOrg', // key in localStorage
    }
  )
);
