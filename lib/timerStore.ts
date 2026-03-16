import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TimerState {
  isRunning: boolean;
  startTime: number | null; // epoch ms when timer was last started
  accumulatedMs: number; // time accumulated before last pause
  start: () => void;
  stop: () => void;
  reset: () => void;
  getElapsedMs: () => number;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      isRunning: false,
      startTime: null,
      accumulatedMs: 0,

      start: () => {
        const state = get();
        if (!state.isRunning) {
          set({ isRunning: true, startTime: Date.now() });
        }
      },

      stop: () => {
        const state = get();
        if (state.isRunning && state.startTime !== null) {
          const elapsed = Date.now() - state.startTime;
          set({
            isRunning: false,
            accumulatedMs: state.accumulatedMs + elapsed,
            startTime: null,
          });
        }
      },

      reset: () => {
        set({ isRunning: false, startTime: null, accumulatedMs: 0 });
      },

      getElapsedMs: () => {
        const state = get();
        if (state.isRunning && state.startTime !== null) {
          return state.accumulatedMs + (Date.now() - state.startTime);
        }
        return state.accumulatedMs;
      },
    }),
    {
      name: "baserow-timer",
    },
  ),
);
