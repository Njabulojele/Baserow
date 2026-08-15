import { create } from "zustand";

export interface ActiveTimer {
  sessionId?: string;
  taskId?: string;
  goalId?: string;
  projectId?: string;
  title: string;
  startedAt: string; // ISO string
  isRunning: boolean;
  elapsedSeconds: number;
}

interface TimerStoreState {
  // New Active Timer backend state
  activeTimer: ActiveTimer | null;
  heartbeatIntervalId: any | null;

  // Legacy state getters for compatibility across UI components
  isRunning: boolean;
  startTime: number | null;
  accumulatedMs: number;

  // Actions
  setActiveTimer: (timer: ActiveTimer | null) => void;
  hydrateFromBackend: (data: any) => void;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;
  tick: () => void;
  clearTimer: () => void;

  // Legacy API compatibility actions
  start: () => void;
  stop: () => void;
  reset: () => void;
  getElapsedMs: () => number;
}

export const useTimerStore = create<TimerStoreState>()((set, get) => ({
  activeTimer: null,
  heartbeatIntervalId: null,

  isRunning: false,
  startTime: null,
  accumulatedMs: 0,

  setActiveTimer: (timer) => {
    const isRunning = !!timer?.isRunning;
    set({
      activeTimer: timer,
      isRunning,
      startTime: timer ? new Date(timer.startedAt).getTime() : null,
    });

    if (isRunning) {
      get().startHeartbeat();
    } else {
      get().stopHeartbeat();
    }
  },

  hydrateFromBackend: (data) => {
    if (!data || !data.startedAt) {
      set({
        activeTimer: null,
        isRunning: false,
        startTime: null,
        accumulatedMs: 0,
      });
      get().stopHeartbeat();
      return;
    }

    const startedEpoch = new Date(data.startedAt).getTime();
    const nowEpoch = Date.now();
    const elapsedSeconds = Math.max(0, Math.floor((nowEpoch - startedEpoch) / 1000));

    const activeTimer: ActiveTimer = {
      sessionId: data.sessionId || data.id,
      taskId: data.taskId,
      goalId: data.goalId,
      projectId: data.projectId,
      title: data.title || "Active Session",
      startedAt: data.startedAt,
      isRunning: true,
      elapsedSeconds,
    };

    set({
      activeTimer,
      isRunning: true,
      startTime: startedEpoch,
      accumulatedMs: elapsedSeconds * 1000,
    });

    get().startHeartbeat();
  },

  tick: () => {
    const { activeTimer, isRunning, accumulatedMs } = get();
    if (activeTimer && activeTimer.isRunning) {
      set({
        activeTimer: {
          ...activeTimer,
          elapsedSeconds: activeTimer.elapsedSeconds + 1,
        },
        accumulatedMs: (activeTimer.elapsedSeconds + 1) * 1000,
      });
    } else if (isRunning && get().startTime) {
      const elapsed = Date.now() - (get().startTime || Date.now());
      set({ accumulatedMs: elapsed });
    }
  },

  startHeartbeat: () => {
    const state = get();
    if (state.heartbeatIntervalId) return;

    // Send 30s heartbeat ping
    const interval = setInterval(async () => {
      const current = get().activeTimer;
      if (!current || !current.isRunning) {
        get().stopHeartbeat();
        return;
      }
      try {
        await fetch("/api/trpc/task.heartbeatTimer?batch=1", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            "0": {
              json: { sessionId: current.sessionId, id: current.sessionId },
            },
          }),
        });
      } catch (err) {
        // silent fail
      }
    }, 30000);

    set({ heartbeatIntervalId: interval });
  },

  stopHeartbeat: () => {
    const { heartbeatIntervalId } = get();
    if (heartbeatIntervalId) {
      clearInterval(heartbeatIntervalId);
      set({ heartbeatIntervalId: null });
    }
  },

  clearTimer: () => {
    get().stopHeartbeat();
    set({
      activeTimer: null,
      isRunning: false,
      startTime: null,
      accumulatedMs: 0,
    });
  },

  // Backward compatibility actions
  start: () => {
    const now = Date.now();
    const state = get();
    if (!state.isRunning) {
      set({
        isRunning: true,
        startTime: now,
        activeTimer: state.activeTimer
          ? { ...state.activeTimer, isRunning: true }
          : {
              title: "Focus Session",
              startedAt: new Date(now).toISOString(),
              isRunning: true,
              elapsedSeconds: Math.floor(state.accumulatedMs / 1000),
            },
      });
      get().startHeartbeat();
    }
  },

  stop: () => {
    const state = get();
    get().stopHeartbeat();
    if (state.isRunning && state.startTime) {
      const elapsed = Date.now() - state.startTime;
      set({
        isRunning: false,
        startTime: null,
        accumulatedMs: state.accumulatedMs + elapsed,
        activeTimer: state.activeTimer
          ? { ...state.activeTimer, isRunning: false }
          : null,
      });
    } else {
      set({ isRunning: false, startTime: null });
    }
  },

  reset: () => {
    get().stopHeartbeat();
    set({
      activeTimer: null,
      isRunning: false,
      startTime: null,
      accumulatedMs: 0,
    });
  },

  getElapsedMs: () => {
    const state = get();
    if (state.activeTimer && state.activeTimer.isRunning) {
      const started = new Date(state.activeTimer.startedAt).getTime();
      return Math.max(0, Date.now() - started);
    }
    if (state.isRunning && state.startTime !== null) {
      return state.accumulatedMs + (Date.now() - state.startTime);
    }
    return state.accumulatedMs;
  },
}));
