"use client";

import { useEffect, useRef, useState } from "react";
import { useGoalStore } from "@/lib/goalStore";
import {
  Play,
  Pause,
  CheckCircle2,
  X,
  Minimize2,
  Maximize2,
  AlertTriangle,
  Flame,
  Coffee,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";

export function FloatingGoalTimer() {
  const activeSession = useGoalStore((s) => s.activeSession);
  const pauseGoalSession = useGoalStore((s) => s.pauseGoalSession);
  const resumeGoalSession = useGoalStore((s) => s.resumeGoalSession);
  const updateSessionElapsed = useGoalStore((s) => s.updateSessionElapsed);
  const setSessionBlinking = useGoalStore((s) => s.setSessionBlinking);
  const switchPomodoroPhase = useGoalStore((s) => s.switchPomodoroPhase);
  const stopAndSaveGoalSession = useGoalStore((s) => s.stopAndSaveGoalSession);
  const dismissSession = useGoalStore((s) => s.dismissSession);

  const [isMinimized, setIsMinimized] = useState(false);
  const lastMovementTimeRef = useRef<number>(Date.now());

  const utils = trpc.useUtils();
  const logSessionMutation = trpc.goals.logSession.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
    },
  });

  // 1. Movement / Inactivity Event Listener
  useEffect(() => {
    if (!activeSession || !activeSession.isRunning) return;

    const handleUserActivity = () => {
      lastMovementTimeRef.current = Date.now();
    };

    window.addEventListener("mousemove", handleUserActivity);
    window.addEventListener("keydown", handleUserActivity);
    window.addEventListener("mousedown", handleUserActivity);
    window.addEventListener("touchstart", handleUserActivity);

    return () => {
      window.removeEventListener("mousemove", handleUserActivity);
      window.removeEventListener("keydown", handleUserActivity);
      window.removeEventListener("mousedown", handleUserActivity);
      window.removeEventListener("touchstart", handleUserActivity);
    };
  }, [activeSession?.isRunning]);

  // 2. Timer Loop & Inactivity Check (Ticks every second)
  useEffect(() => {
    if (!activeSession || !activeSession.isRunning) return;

    const interval = setInterval(() => {
      const nextElapsed = activeSession.elapsedSeconds + 1;
      updateSessionElapsed(nextElapsed);

      const targetSeconds = activeSession.targetMinutes * 60;
      const inactivityMs = Date.now() - lastMovementTimeRef.current;
      const fifteenMinutesMs = 15 * 60 * 1000;

      // ── Post-Session Overrun Inactivity Auto-Save ───────────────────────
      // Only triggers IF session has exceeded target duration AND 15 minutes of zero movement pass
      if (nextElapsed >= targetSeconds + 300 && inactivityMs >= fifteenMinutesMs) {
        setSessionBlinking(true);
        toast.info(
          `Focus Session completed: Logged ${Math.round(nextElapsed / 60)} mins for "${activeSession.goalTitle}".`,
          { duration: 6000 }
        );
        const goalId = activeSession.goalId;
        const minsTracked = stopAndSaveGoalSession();
        logSessionMutation.mutate({ goalId, durationMinutes: minsTracked });
        return;
      }

      // ── Pomodoro Auto-Transition Logic ──────────────────────────────────
      if (activeSession.mode === "pomodoro") {
        const workSecs = (activeSession.pomodoroWorkMinutes || 25) * 60;
        const breakSecs = (activeSession.pomodoroBreakMinutes || 5) * 60;

        if (activeSession.pomodoroPhase === "work" && nextElapsed >= workSecs) {
          toast.success("Focus Session complete! Time for a short break ☕");
          switchPomodoroPhase("break");
        } else if (
          activeSession.pomodoroPhase === "break" &&
          nextElapsed >= breakSecs
        ) {
          toast.info("Break complete! Ready to start focus session 🎯");
          switchPomodoroPhase("work");
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [
    activeSession,
    updateSessionElapsed,
    setSessionBlinking,
    stopAndSaveGoalSession,
    switchPomodoroPhase,
  ]);

  if (!activeSession) return null;

  const totalTargetSecs =
    activeSession.mode === "pomodoro"
      ? (activeSession.pomodoroPhase === "break"
          ? activeSession.pomodoroBreakMinutes || 5
          : activeSession.pomodoroWorkMinutes || 25) * 60
      : activeSession.targetMinutes * 60;

  const progressPercent = Math.min(
    100,
    Math.round((activeSession.elapsedSeconds / totalTargetSecs) * 100)
  );

  const mins = Math.floor(activeSession.elapsedSeconds / 60);
  const secs = activeSession.elapsedSeconds % 60;
  const timeFormatted = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;

  const handleComplete = () => {
    if (!activeSession) return;
    const goalId = activeSession.goalId;
    const minutesTracked = stopAndSaveGoalSession();
    logSessionMutation.mutate({
      goalId,
      durationMinutes: minutesTracked,
    });
    toast.success(
      `Goal completed! Logged ${minutesTracked} mins & synced to database ⚡`
    );
  };

  // ── Minimized Floating Badge ──────────────────────────────────────────────
  if (isMinimized) {
    return (
      <div className="fixed bottom-6 right-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
        <button
          onClick={() => setIsMinimized(false)}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-full shadow-2xl border backdrop-blur-xl transition-all ${
            activeSession.isBlinking
              ? "bg-rose-500/90 text-white border-rose-400 animate-pulse ring-4 ring-rose-500/50"
              : "bg-black/90 text-foreground border-emerald-500/30 hover:border-emerald-500/60"
          }`}
        >
          <span className="relative flex h-3 w-3">
            <span
              className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                activeSession.isRunning ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            <span
              className={`relative inline-flex rounded-full h-3 w-3 ${
                activeSession.isRunning ? "bg-emerald-500" : "bg-amber-500"
              }`}
            />
          </span>
          <span className="font-mono text-sm font-bold tracking-wider">
            {timeFormatted}
          </span>
          <span className="text-xs font-semibold max-w-[120px] truncate opacity-80">
            {activeSession.goalTitle}
          </span>
          <Maximize2 className="w-3.5 h-3.5 opacity-60 hover:opacity-100" />
        </button>
      </div>
    );
  }

  // ── Expanded Floating Window ──────────────────────────────────────────────
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 w-80 md:w-96 rounded-2xl shadow-2xl border backdrop-blur-2xl transition-all duration-300 p-5 space-y-4 ${
        activeSession.isBlinking
          ? "bg-rose-950/90 border-rose-500/80 ring-4 ring-rose-500/30 animate-pulse"
          : "bg-background/95 border-white/10 dark:bg-black/90"
      }`}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {activeSession.mode === "pomodoro" ? (
            activeSession.pomodoroPhase === "break" ? (
              <span className="toota-pill bg-amber-500/15 text-amber-500 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                <Coffee className="w-3 h-3" /> Short Break
              </span>
            ) : (
              <span className="toota-pill bg-emerald-500/15 text-emerald-500 text-[10px] font-bold px-2 py-0.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Pomodoro Focus
              </span>
            )
          ) : (
            <span className="toota-pill text-[10px] font-bold px-2 py-0.5">
              Goal Session
            </span>
          )}

          {activeSession.isBlinking && (
            <span className="text-[10px] font-bold text-rose-400 flex items-center gap-1 animate-bounce">
              <AlertTriangle className="w-3 h-3" /> Inactive!
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(true)}
            className="p-1 rounded-lg hover:bg-white/10 text-muted-foreground hover:text-foreground transition-colors"
            title="Minimize"
          >
            <Minimize2 className="w-4 h-4" />
          </button>
          <button
            onClick={dismissSession}
            className="p-1 rounded-lg hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors"
            title="Cancel Session"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* GOAL TITLE */}
      <div>
        <h4 className="text-base font-extrabold text-foreground truncate">
          {activeSession.goalTitle}
        </h4>
        <p className="text-xs text-muted-foreground mt-0.5 font-mono">
          Target: {activeSession.targetMinutes} mins • Inactivity auto-pause enabled
        </p>
      </div>

      {/* PROGRESS BAR & TIMER DISPLAY */}
      <div className="space-y-2 py-2">
        <div className="flex items-baseline justify-between">
          <span className="font-mono text-3xl font-black text-foreground tracking-tight">
            {timeFormatted}
          </span>
          <span className="text-xs font-mono font-bold text-emerald-500">
            {progressPercent}%
          </span>
        </div>

        <div className="h-2 w-full bg-secondary/80 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              activeSession.pomodoroPhase === "break"
                ? "bg-amber-500"
                : activeSession.isBlinking
                ? "bg-rose-500"
                : "bg-emerald-500"
            }`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* CONTROLS */}
      <div className="flex items-center gap-2 pt-1">
        {activeSession.isRunning ? (
          <button
            onClick={pauseGoalSession}
            className="flex-1 py-2.5 px-4 rounded-xl bg-secondary hover:bg-secondary/80 text-foreground text-xs font-bold flex items-center justify-center gap-2 transition-all"
          >
            <Pause className="w-4 h-4 text-amber-400" /> Pause
          </button>
        ) : (
          <button
            onClick={resumeGoalSession}
            className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md"
          >
            <Play className="w-4 h-4 fill-black" /> Resume
          </button>
        )}

        <button
          onClick={handleComplete}
          className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black text-xs font-extrabold flex items-center justify-center gap-2 transition-all shadow-md"
        >
          <CheckCircle2 className="w-4 h-4" /> Save & Done
        </button>
      </div>
    </div>
  );
}
