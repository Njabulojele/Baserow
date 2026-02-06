import { create } from "zustand";

interface UIState {
  sidebarOpen: boolean;
  commandBarOpen: boolean;
  toggleSidebar: () => void;
  toggleCommandBar: () => void;
  openCommandBar: () => void;
  closeCommandBar: () => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  commandBarOpen: false,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  toggleCommandBar: () => set((s) => ({ commandBarOpen: !s.commandBarOpen })),
  openCommandBar: () => set({ commandBarOpen: true }),
  closeCommandBar: () => set({ commandBarOpen: false }),
}));
