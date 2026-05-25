import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { OrgResponse, getMyOrganizations } from "@/lib/api/orgs";
import { registerActiveTenantIdGetter } from "@/lib/api/client";

interface OrgState {
  orgs: OrgResponse[];
  activeOrg: OrgResponse | null;
  loading: boolean;
  error: string | null;
  fetchOrgs: () => Promise<void>;
  setActiveOrg: (org: OrgResponse | null) => void;
  addOrg: (org: OrgResponse) => void;
}

export const useOrgStore = create<OrgState>()(
  persist(
    (set, get) => ({
      orgs: [],
      activeOrg: null,
      loading: false,
      error: null,

      fetchOrgs: async () => {
        set({ loading: true, error: null });
        try {
          const data = await getMyOrganizations();
          set({ orgs: data, loading: false });
          // Auto-select first org if none active
          if (data.length > 0 && !get().activeOrg) {
            set({ activeOrg: data[0] });
          }
        } catch (err: any) {
          set({ error: err.message || "Failed to fetch organizations", loading: false });
        }
      },

      setActiveOrg: (org) => set({ activeOrg: org }),
      
      addOrg: (org) => {
        set((state) => ({ orgs: [...state.orgs, org] }));
      },
    }),
    {
      name: 'hivespace-orgs',
    }
  )
);

// Register the active tenant ID getter for the API client dynamically (avoids circular dependency loops in standard ESM)
if (typeof window !== "undefined") {
  registerActiveTenantIdGetter(() => useOrgStore.getState().activeOrg?.id);
}
