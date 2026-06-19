import { create } from "zustand";

interface ProjectOverviewState {
  isTeamsDialogOpen: boolean;
  setIsTeamsDialogOpen: (open: boolean) => void;
  selectedTeamToAssign: string;
  setSelectedTeamToAssign: (teamId: string) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
}

export const useProjectOverviewStore = create<ProjectOverviewState>((set) => ({
  isTeamsDialogOpen: false,
  setIsTeamsDialogOpen: (open) => set({ isTeamsDialogOpen: open }),
  selectedTeamToAssign: "",
  setSelectedTeamToAssign: (teamId) => set({ selectedTeamToAssign: teamId }),
  isCreateModalOpen: false,
  setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
}));
