import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type TimerSessionType =
  | "focus"
  | "break"
  | "pomodoro"
  | "short_break"
  | "long_break";

export type TimerMode =
  | "pomodoro"
  | "deep_work"
  | "sprint"
  | "stopwatch"
  | "custom";

export interface ActiveTimer {
  sessionId?: string;
  taskId?: string;
  taskTitle?: string;
  goalId?: string;
  goalTitle?: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  title: string;
  notes?: string;
  sessionType: TimerSessionType;
  mode: TimerMode;
  targetSeconds: number; // 0 for stopwatch, 1500 (25m), 3600 (1h), 1800 (30m), 300 (5m)
  startedAt: string; // ISO string
  isRunning: boolean;
  elapsedSeconds: number;
  pomodoroPhase?: "work" | "break";
}

export interface StartSessionOptions {
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  taskId?: string;
  taskTitle?: string;
  goalId?: string;
  goalTitle?: string;
  title?: string;
  notes?: string;
  sessionType?: TimerSessionType;
  mode?: TimerMode;
  targetSeconds?: number;
}

interface TimerStoreState {
  activeTimer: ActiveTimer | null;
  heartbeatIntervalId: any | null;
  isQuickModalOpen: boolean;

  // Compatibility fields
  isRunning: boolean;
  startTime: number | null;
  accumulatedMs: number;

  // Modal control
  setQuickModalOpen: (open: boolean) => void;

  // Primary Actions
  startSession: (options?: StartSessionOptions) => void;
  switchToBreak: (durationMinutes?: number) => void;
  switchToFocus: (targetMinutes?: number) => void;
  togglePause: () => void;
  resume: () => void;
  pause: () => void;
  stopAndReset: () => ActiveTimer | null;
  updateNotes: (notes: string) => void;
  setTargetSeconds: (seconds: number) => void;

  // Legacy actions
  setActiveTimer: (timer: ActiveTimer | null) => void;
  hydrateFromBackend: (data: any) => void;
  startHeartbeat: () => void;
  stopHeartbeat: () => void;
  tick: () => void;
  clearTimer: () => void;
  start: () => void;
  stop: () => void;
  reset: () => void;
  getElapsedMs: () => number;
}

export const useTimerStore = create<TimerStoreState>()(
  persist(
    (set, get) => ({
      activeTimer: null,
      heartbeatIntervalId: null,
      isQuickModalOpen: false,

      isRunning: false,
      startTime: null,
      accumulatedMs: 0,

      setQuickModalOpen: (open) => set({ isQuickModalOpen: open }),

      startSession: (options = {}) => {
        const now = new Date();
        const nowIso = now.toISOString();
        const mode = options.mode || "pomodoro";
        const sessionType = options.sessionType || (mode === "pomodoro" ? "pomodoro" : "focus");

        let targetSeconds = options.targetSeconds ?? 1500;
        if (options.targetSeconds === undefined) {
          if (mode === "pomodoro") targetSeconds = 25 * 60;
          else if (mode === "deep_work") targetSeconds = 60 * 60;
          else if (mode === "sprint") targetSeconds = 30 * 60;
          else if (mode === "stopwatch") targetSeconds = 0;
        }

        const title =
          options.title ||
          options.taskTitle ||
          options.projectName ||
          (sessionType === "break" ? "Rest & Recharge" : "Deep Work Focus");

        const activeTimer: ActiveTimer = {
          sessionId: `sess_${Date.now()}`,
          taskId: options.taskId,
          taskTitle: options.taskTitle,
          goalId: options.goalId,
          goalTitle: options.goalTitle,
          projectId: options.projectId,
          projectName: options.projectName,
          projectColor: options.projectColor,
          title,
          notes: options.notes || "",
          sessionType,
          mode,
          targetSeconds,
          startedAt: nowIso,
          isRunning: true,
          elapsedSeconds: 0,
          pomodoroPhase: sessionType === "break" ? "break" : "work",
        };

        set({
          activeTimer,
          isRunning: true,
          startTime: now.getTime(),
          accumulatedMs: 0,
        });

        get().startHeartbeat();
      },

      switchToBreak: (durationMinutes = 5) => {
        const current = get().activeTimer;
        const now = new Date();
        const activeTimer: ActiveTimer = {
          sessionId: `sess_${Date.now()}`,
          projectId: current?.projectId,
          projectName: current?.projectName,
          projectColor: current?.projectColor,
          taskId: current?.taskId,
          taskTitle: current?.taskTitle,
          goalId: current?.goalId,
          goalTitle: current?.goalTitle,
          title: "Coffee & Rest Break",
          notes: "Resting eyes and stretching",
          sessionType: durationMinutes >= 15 ? "long_break" : "short_break",
          mode: current?.mode || "pomodoro",
          targetSeconds: durationMinutes * 60,
          startedAt: now.toISOString(),
          isRunning: true,
          elapsedSeconds: 0,
          pomodoroPhase: "break",
        };

        set({
          activeTimer,
          isRunning: true,
          startTime: now.getTime(),
          accumulatedMs: 0,
        });
        get().startHeartbeat();
      },

      switchToFocus: (targetMinutes = 25) => {
        const current = get().activeTimer;
        const now = new Date();
        const activeTimer: ActiveTimer = {
          sessionId: `sess_${Date.now()}`,
          projectId: current?.projectId,
          projectName: current?.projectName,
          projectColor: current?.projectColor,
          taskId: current?.taskId,
          taskTitle: current?.taskTitle,
          goalId: current?.goalId,
          goalTitle: current?.goalTitle,
          title: current?.taskTitle || current?.projectName || "Deep Work Focus",
          notes: current?.notes || "",
          sessionType: "focus",
          mode: current?.mode || "pomodoro",
          targetSeconds: targetMinutes * 60,
          startedAt: now.toISOString(),
          isRunning: true,
          elapsedSeconds: 0,
          pomodoroPhase: "work",
        };

        set({
          activeTimer,
          isRunning: true,
          startTime: now.getTime(),
          accumulatedMs: 0,
        });
        get().startHeartbeat();
      },

      togglePause: () => {
        const { isRunning, pause, resume } = get();
        if (isRunning) pause();
        else resume();
      },

      resume: () => {
        const { activeTimer } = get();
        const now = Date.now();
        if (!activeTimer) {
          get().startSession();
          return;
        }
        set({
          activeTimer: { ...activeTimer, isRunning: true },
          isRunning: true,
          startTime: now,
        });
        get().startHeartbeat();
      },

      pause: () => {
        const { activeTimer, startTime, accumulatedMs } = get();
        get().stopHeartbeat();
        const now = Date.now();
        const addedMs = startTime ? Math.max(0, now - startTime) : 0;
        const totalMs = accumulatedMs + addedMs;
        const totalSec = Math.floor(totalMs / 1000);

        if (activeTimer) {
          set({
            activeTimer: { ...activeTimer, isRunning: false, elapsedSeconds: totalSec },
            isRunning: false,
            startTime: null,
            accumulatedMs: totalMs,
          });
        } else {
          set({ isRunning: false, startTime: null, accumulatedMs: totalMs });
        }
      },

      stopAndReset: () => {
        const { activeTimer } = get();
        const totalMs = get().getElapsedMs();
        const totalSec = Math.floor(totalMs / 1000);
        get().stopHeartbeat();
        const finishedTimer = activeTimer
          ? { ...activeTimer, elapsedSeconds: totalSec, isRunning: false }
          : null;

        set({
          activeTimer: null,
          isRunning: false,
          startTime: null,
          accumulatedMs: 0,
        });
        return finishedTimer;
      },

      updateNotes: (notes: string) => {
        const current = get().activeTimer;
        if (current) {
          set({ activeTimer: { ...current, notes } });
        }
      },

      setTargetSeconds: (seconds: number) => {
        const current = get().activeTimer;
        if (current) {
          set({ activeTimer: { ...current, targetSeconds: seconds } });
        }
      },

      setActiveTimer: (timer) => {
        const isRunning = !!timer?.isRunning;
        set({
          activeTimer: timer,
          isRunning,
          startTime: timer ? new Date(timer.startedAt).getTime() : null,
        });
        if (isRunning) get().startHeartbeat();
        else get().stopHeartbeat();
      },

      hydrateFromBackend: (data) => {
        if (!data || !data.startedAt) {
          get().clearTimer();
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
          sessionType: data.sessionType || "focus",
          mode: data.mode || "pomodoro",
          targetSeconds: data.targetSeconds || 1500,
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
        // Always derive elapsed from wall-clock delta — never accumulate +1.
        // This ensures correctness regardless of how often the browser fires setInterval.
        const { activeTimer, startTime, accumulatedMs } = get();
        if (activeTimer && activeTimer.isRunning && startTime !== null) {
          const totalMs = accumulatedMs + Math.max(0, Date.now() - startTime);
          const totalSec = Math.floor(totalMs / 1000);
          set({
            activeTimer: { ...activeTimer, elapsedSeconds: totalSec },
          });
        }
      },

      startHeartbeat: () => {
        const state = get();
        if (state.heartbeatIntervalId) return;

        let tickCount = 0;
        const interval = setInterval(async () => {
          const { activeTimer, startTime, accumulatedMs } = get();
          if (!activeTimer || !activeTimer.isRunning) {
            get().stopHeartbeat();
            return;
          }

          // Always compute from wall clock — immune to tab throttling
          if (startTime !== null) {
            const totalMs = accumulatedMs + Math.max(0, Date.now() - startTime);
            const totalSec = Math.floor(totalMs / 1000);
            set({ activeTimer: { ...activeTimer, elapsedSeconds: totalSec } });
          }

          // Backend heartbeat ping — only every 30 ticks (~30 seconds)
          tickCount++;
          if (tickCount % 30 === 0) {
            try {
              await fetch("/api/trpc/task.heartbeatTimer?batch=1", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  "0": {
                    json: { sessionId: activeTimer.sessionId, id: activeTimer.sessionId },
                  },
                }),
              });
            } catch {
              // silent fail
            }
          }
        }, 1000); // 1-second tick; backend ping throttled to every 30s via counter

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

      start: () => get().resume(),
      stop: () => get().pause(),
      reset: () => get().clearTimer(),

      getElapsedMs: () => {
        const state = get();
        if (state.isRunning && state.startTime !== null) {
          return state.accumulatedMs + Math.max(0, Date.now() - state.startTime);
        }
        return state.accumulatedMs;
      },
    }),
    {
      name: "baserow_active_timer",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        activeTimer: state.activeTimer,
        accumulatedMs: state.accumulatedMs,
        isRunning: state.isRunning,
        startTime: state.startTime,
      }),
    }
  )
);
