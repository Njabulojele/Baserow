import { create } from "zustand";
import { persist } from "zustand/middleware";

export type GoalFrequency = "daily" | "specific_days";
export type GoalMode = "standard" | "pomodoro";
export type DayOfWeek = "mon" | "tue" | "wed" | "thu" | "fri" | "sat" | "sun";

export interface Goal {
  id: string;
  title: string;
  description?: string;
  pillar: string;
  frequency: GoalFrequency;
  scheduledDays: DayOfWeek[];
  targetMinutes: number;
  mode: GoalMode;
  pomodoroWorkMinutes?: number;
  pomodoroBreakMinutes?: number;
  autoStartBreaks?: boolean;
  streak: number;
  completedDates: string[]; // YYYY-MM-DD
  createdAt: string;
}

export interface ActiveGoalSession {
  goalId: string;
  goalTitle: string;
  targetMinutes: number;
  mode: GoalMode;
  startTime: number;
  elapsedSeconds: number;
  isRunning: boolean;
  isPaused: boolean;
  isBlinking: boolean;
  pomodoroPhase?: "work" | "break";
  pomodoroWorkMinutes?: number;
  pomodoroBreakMinutes?: number;
  autoStartBreaks?: boolean;
}

interface GoalState {
  goals: Goal[];
  activeSession: ActiveGoalSession | null;
  addGoal: (goal: Omit<Goal, "id" | "streak" | "completedDates" | "createdAt">) => Goal;
  updateGoal: (id: string, updatedFields: Partial<Goal>) => void;
  deleteGoal: (id: string) => void;
  toggleGoalCompletion: (id: string, dateStr?: string) => void;
  startGoalSession: (goal: Goal) => void;
  pauseGoalSession: () => void;
  resumeGoalSession: () => void;
  updateSessionElapsed: (seconds: number) => void;
  setSessionBlinking: (blinking: boolean) => void;
  switchPomodoroPhase: (phase: "work" | "break") => void;
  stopAndSaveGoalSession: () => number; // returns elapsed minutes
  dismissSession: () => void;
}

const DEFAULT_GOALS: Goal[] = [
  {
    id: "goal_deep_work",
    title: "Deep Work Sprint",
    description: "Uninterrupted focus session on primary product features",
    pillar: "Deep Work",
    frequency: "daily",
    scheduledDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    targetMinutes: 60,
    mode: "standard",
    streak: 5,
    completedDates: [new Date().toISOString().split("T")[0]],
    createdAt: new Date().toISOString(),
  },
  {
    id: "goal_client_outreach",
    title: "High-Touch Client Outreach",
    description: "Follow up with leads and schedule intro calls",
    pillar: "Revenue",
    frequency: "specific_days",
    scheduledDays: ["mon", "wed", "fri"],
    targetMinutes: 45,
    mode: "pomodoro",
    pomodoroWorkMinutes: 25,
    pomodoroBreakMinutes: 5,
    autoStartBreaks: true,
    streak: 3,
    completedDates: [],
    createdAt: new Date().toISOString(),
  },
  {
    id: "goal_health",
    title: "Daily Movement & Gym",
    description: "Physical conditioning and workout session",
    pillar: "Health",
    frequency: "daily",
    scheduledDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
    targetMinutes: 45,
    mode: "standard",
    streak: 7,
    completedDates: [new Date().toISOString().split("T")[0]],
    createdAt: new Date().toISOString(),
  },
];

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export const useGoalStore = create<GoalState>()(
  persist(
    (set, get) => ({
      goals: DEFAULT_GOALS,
      activeSession: null,

      addGoal: (newGoalData) => {
        const newGoal: Goal = {
          ...newGoalData,
          id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          streak: 0,
          completedDates: [],
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ goals: [newGoal, ...state.goals] }));
        return newGoal;
      },

      updateGoal: (id, updatedFields) => {
        set((state) => ({
          goals: state.goals.map((g) => (g.id === id ? { ...g, ...updatedFields } : g)),
        }));
      },

      deleteGoal: (id) => {
        set((state) => ({
          goals: state.goals.filter((g) => g.id !== id),
          activeSession: state.activeSession?.goalId === id ? null : state.activeSession,
        }));
      },

      toggleGoalCompletion: (id, dateStr) => {
        const targetDate = dateStr || getTodayStr();
        set((state) => {
          const updatedGoals = state.goals.map((g) => {
            if (g.id !== id) return g;
            const alreadyCompleted = g.completedDates.includes(targetDate);
            const newDates = alreadyCompleted
              ? g.completedDates.filter((d) => d !== targetDate)
              : [...g.completedDates, targetDate];

            // Recalculate streak
            let streak = g.streak;
            if (!alreadyCompleted) {
              streak += 1;
            } else {
              streak = Math.max(0, streak - 1);
            }

            return {
              ...g,
              completedDates: newDates,
              streak,
            };
          });
          return { goals: updatedGoals };
        });
      },

      startGoalSession: (goal) => {
        set({
          activeSession: {
            goalId: goal.id,
            goalTitle: goal.title,
            targetMinutes: goal.targetMinutes,
            mode: goal.mode,
            startTime: Date.now(),
            elapsedSeconds: 0,
            isRunning: true,
            isPaused: false,
            isBlinking: false,
            pomodoroPhase: goal.mode === "pomodoro" ? "work" : undefined,
            pomodoroWorkMinutes: goal.pomodoroWorkMinutes || 25,
            pomodoroBreakMinutes: goal.pomodoroBreakMinutes || 5,
            autoStartBreaks: goal.autoStartBreaks ?? true,
          },
        });
      },

      pauseGoalSession: () => {
        set((state) => {
          if (!state.activeSession) return {};
          return {
            activeSession: {
              ...state.activeSession,
              isRunning: false,
              isPaused: true,
            },
          };
        });
      },

      resumeGoalSession: () => {
        set((state) => {
          if (!state.activeSession) return {};
          return {
            activeSession: {
              ...state.activeSession,
              isRunning: true,
              isPaused: false,
              isBlinking: false,
            },
          };
        });
      },

      updateSessionElapsed: (seconds) => {
        set((state) => {
          if (!state.activeSession) return {};
          return {
            activeSession: {
              ...state.activeSession,
              elapsedSeconds: seconds,
            },
          };
        });
      },

      setSessionBlinking: (blinking) => {
        set((state) => {
          if (!state.activeSession) return {};
          return {
            activeSession: {
              ...state.activeSession,
              isBlinking: blinking,
            },
          };
        });
      },

      switchPomodoroPhase: (phase) => {
        set((state) => {
          if (!state.activeSession) return {};
          return {
            activeSession: {
              ...state.activeSession,
              pomodoroPhase: phase,
              elapsedSeconds: 0,
              isRunning: phase === "break" ? (state.activeSession.autoStartBreaks ?? true) : true,
              isPaused: phase === "break" ? !(state.activeSession.autoStartBreaks ?? true) : false,
            },
          };
        });
      },

      stopAndSaveGoalSession: () => {
        const { activeSession, toggleGoalCompletion } = get();
        if (!activeSession) return 0;
        const elapsedMinutes = Math.max(1, Math.round(activeSession.elapsedSeconds / 60));
        toggleGoalCompletion(activeSession.goalId);
        set({ activeSession: null });
        return elapsedMinutes;
      },

      dismissSession: () => {
        set({ activeSession: null });
      },
    }),
    {
      name: "baserow-goals-store",
    }
  )
);
