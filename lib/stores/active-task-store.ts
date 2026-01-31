import { create } from "zustand";

interface ActiveTask {
  id: string;
  title: string;
  startedAt: Date;
  projectName: string | null;
  projectColor: string | null;
}

interface ActiveTaskState {
  activeTask: ActiveTask | null;
  setActiveTask: (task: ActiveTask | null) => void;
  clearActiveTask: () => void;
}

export const useActiveTaskStore = create<ActiveTaskState>((set) => ({
  activeTask: null,
  setActiveTask: (task) => set({ activeTask: task }),
  clearActiveTask: () => set({ activeTask: null }),
}));
