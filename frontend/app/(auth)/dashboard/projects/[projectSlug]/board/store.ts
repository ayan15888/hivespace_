import { create } from "zustand";

interface BoardState {
  selectedTaskId: string | null;
  setSelectedTaskId: (id: string | null) => void;
  isCreateModalOpen: boolean;
  setIsCreateModalOpen: (open: boolean) => void;
  defaultStatus: string;
  setDefaultStatus: (status: string) => void;
  sortByPriority: boolean;
  toggleSortByPriority: () => void;
}

export const useBoardStore = create<BoardState>((set) => ({
  selectedTaskId: null,
  setSelectedTaskId: (id) => set({ selectedTaskId: id }),
  isCreateModalOpen: false,
  setIsCreateModalOpen: (open) => set({ isCreateModalOpen: open }),
  defaultStatus: "Todo",
  setDefaultStatus: (status) => set({ defaultStatus: status }),
  sortByPriority: false,
  toggleSortByPriority: () => set((state) => ({ sortByPriority: !state.sortByPriority })),
}));
