import { create } from "zustand";

interface TeamPageState {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  isManageSheetOpen: boolean;
  setIsManageSheetOpen: (open: boolean) => void;
}

export const useTeamPageStore = create<TeamPageState>((set) => ({
  activeTab: "overview",
  setActiveTab: (tab) => set({ activeTab: tab }),
  isManageSheetOpen: false,
  setIsManageSheetOpen: (open) => set({ isManageSheetOpen: open }),
}));
