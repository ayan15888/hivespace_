import { create } from 'zustand';

interface UiState {
  isAiSidebarOpen: boolean;
  setAiSidebarOpen: (isOpen: boolean) => void;
  toggleAiSidebar: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  isAiSidebarOpen: false,
  setAiSidebarOpen: (isOpen) => set({ isAiSidebarOpen: isOpen }),
  toggleAiSidebar: () => set((state) => ({ isAiSidebarOpen: !state.isAiSidebarOpen })),
}));
