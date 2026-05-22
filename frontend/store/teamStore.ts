import { create } from "zustand";
import { persist } from "zustand/middleware";
import { TeamResponse, getTeamsByWorkspace } from "@/lib/api/teams";

interface TeamState {
  teams: TeamResponse[];
  loading: boolean;
  error: string | null;
  fetchTeams: (workspaceId: string) => Promise<void>;
  addTeam: (team: TeamResponse) => void;
  removeTeam: (teamId: string) => void;
  updateTeam: (team: TeamResponse) => void;
  setTeams: (teams: TeamResponse[]) => void;
}

export const useTeamStore = create<TeamState>()(
  persist(
    (set) => ({
      teams: [],
      loading: false,
      error: null,

      fetchTeams: async (workspaceId: string) => {
        set({ loading: true, error: null });
        try {
          const data = await getTeamsByWorkspace(workspaceId);
          set({ teams: data, loading: false });
        } catch (err: any) {
          set({ error: err.message || "Failed to fetch teams", loading: false });
        }
      },

      addTeam: (team) => {
        set((state) => ({ teams: [team, ...state.teams] }));
      },

      removeTeam: (teamId) => {
        set((state) => ({ teams: state.teams.filter((t) => t.id !== teamId) }));
      },

      updateTeam: (updatedTeam) => {
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === updatedTeam.id ? updatedTeam : t
          ),
        }));
      },

      setTeams: (teams) => set({ teams }),
    }),
    {
      name: "hivespace-teams",
    }
  )
);
