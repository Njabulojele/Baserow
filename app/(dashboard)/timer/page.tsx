"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useTimerStore, TimerMode, TimerSessionType } from "@/lib/timerStore";
import { useTimerDisplay } from "@/hooks/useTimerDisplay";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Timer as TimerIcon,
  Clock as ClockIcon,
  Play,
  Pause,
  RotateCcw,
  SkipForward,
  Settings2,
  Tag,
  CheckCircle2,
  Circle,
  Volume2,
  VolumeX,
  Music,
  Maximize2,
  Minimize2,
  Plus,
  Flame,
  Coffee,
  Sparkles,
  ChevronDown,
  X,
  ExternalLink,
  Sliders,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ── Web Audio Synth Helper (Zero External Audio Dependencies) ───────────────
class FocusAudioSynth {
  private ctx: AudioContext | null = null;
  private ambientSource: AudioBufferSourceNode | null = null;
  private ambientGain: GainNode | null = null;

  private getContext(): AudioContext {
    if (!this.ctx || this.ctx.state === "closed") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
    return this.ctx;
  }

  // Play pleasant crystal completion bell chime (D5 -> A5 harmonized)
  playCompletionChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      // Note 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.8);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 1.8);

      // Note 2: 880 Hz (A5) slightly delayed
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.15);
      gain2.gain.setValueAtTime(0.25, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 2.2);
    } catch {
      // Audio autoplay policy fallback
    }
  }

  // Soft mechanical tick
  playTick() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.04);
    } catch {
      // Audio policy fallback
    }
  }

  // Generate soothing ambient brown/rain noise
  startAmbientNoise(type: "rain" | "brown" | "cafe", volume: number = 0.15) {
    try {
      this.stopAmbientNoise();
      const ctx = this.getContext();
      const bufferSize = ctx.sampleRate * 2; // 2 second buffer
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      let lastOut = 0.0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Brown noise filter approximation
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = lastOut * 3.5;
      }

      const noiseSource = ctx.createBufferSource();
      noiseSource.buffer = buffer;
      noiseSource.loop = true;

      // Lowpass filter for smooth rain sound
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(type === "rain" ? 700 : 400, ctx.currentTime);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(volume, ctx.currentTime);

      noiseSource.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      noiseSource.start();
      this.ambientSource = noiseSource;
      this.ambientGain = gain;
    } catch {
      // Audio policy fallback
    }
  }

  stopAmbientNoise() {
    try {
      if (this.ambientSource) {
        this.ambientSource.stop();
        this.ambientSource.disconnect();
        this.ambientSource = null;
      }
    } catch {
      // Ignore
    }
  }
}

const audioSynth = typeof window !== "undefined" ? new FocusAudioSynth() : null;

export default function TimerPage() {
  const {
    activeTimer,
    isRunning,
    startSession,
    switchToBreak,
    switchToFocus,
    togglePause,
    stopAndReset,
    setTargetSeconds,
    accumulatedMs,
  } = useTimerStore();

  const display = useTimerDisplay();

  // Mode Selection: "timer" | "clock" | "pomodoro" | "stopwatch"
  const [activeMode, setActiveMode] = useState<"timer" | "clock" | "pomodoro" | "stopwatch">("pomodoro");

  // Pomodoro Session Counter (1-4)
  const [pomodoroCycle, setPomodoroCycle] = useState<number>(1);

  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [pomodoroWorkMins, setPomodoroWorkMins] = useState(25);
  const [shortBreakMins, setShortBreakMins] = useState(5);
  const [longBreakMins, setLongBreakMins] = useState(15);
  const [dailyTargetHours, setDailyTargetHours] = useState(4);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [tickingEnabled, setTickingEnabled] = useState(false);
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);

  // Ambient sound channel: "off" | "rain" | "brown"
  const [ambientSound, setAmbientSound] = useState<"off" | "rain" | "brown">("off");
  const [isAmbientModalOpen, setIsAmbientModalOpen] = useState(false);

  // Task Drawer & Selection Popover
  const [isTasksDrawerOpen, setIsTasksDrawerOpen] = useState(false);
  const [isLabelPickerOpen, setIsLabelPickerOpen] = useState(false);
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [customLabel, setCustomLabel] = useState<string>("");
  const [newTaskTitle, setNewTaskTitle] = useState("");

  // Fullscreen state
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [currentTime, setCurrentTime] = useState<string>("00:00:00");

  // High-frequency ticker linked to getElapsedMs for smooth, instant countdown of central timer
  const [currentElapsedMs, setCurrentElapsedMs] = useState<number>(0);

  useEffect(() => {
    const update = () => {
      setCurrentElapsedMs(useTimerStore.getState().getElapsedMs());
    };
    update();
    if (isRunning) {
      const interval = setInterval(update, 100);
      return () => clearInterval(interval);
    }
  }, [isRunning, activeTimer]);

  const currentElapsedSec = Math.floor(currentElapsedMs / 1000);

  // tRPC Queries & Mutations
  const utils = trpc.useUtils();
  const { data: statsData } = trpc.timer.getStats.useQuery(undefined, {
    refetchInterval: 10000,
  });
  const { data: projectsData } = trpc.project.getProjects.useQuery();
  const { data: tasksData } = trpc.task.getTasks.useQuery(undefined, {
    staleTime: 30000,
  });

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const tasks = Array.isArray(tasksData)
    ? tasksData.filter((t: any) => t.status !== "done" && t.status !== "completed")
    : [];

  const logSessionMutation = trpc.timer.logSession.useMutation({
    onSuccess: () => {
      utils.timer.getStats.invalidate();
      utils.timer.getRecentSessions.invalidate();
      utils.analytics.getDashboardStats.invalidate();
      utils.task.getTasks.invalidate();
    },
  });

  const createTaskMutation = trpc.task.createTask.useMutation({
    onSuccess: () => {
      utils.task.getTasks.invalidate();
      setNewTaskTitle("");
      toast.success("Task added to focus list");
    },
  });

  const updateTaskMutation = trpc.task.updateTask.useMutation({
    onSuccess: () => {
      utils.task.getTasks.invalidate();
    },
  });

  // Keep live clock updated
  useEffect(() => {
    const updateClock = () => {
      const d = new Date();
      const h = String(d.getHours()).padStart(2, "0");
      const m = String(d.getMinutes()).padStart(2, "0");
      const s = String(d.getSeconds()).padStart(2, "0");
      setCurrentTime(`${h}:${m}:${s}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, []);

  // Sync selected project/task from activeTimer when loaded
  useEffect(() => {
    if (activeTimer) {
      if (activeTimer.projectId) setSelectedProjectId(activeTimer.projectId);
      if (activeTimer.taskId) setSelectedTaskId(activeTimer.taskId);
      if (activeTimer.title && !activeTimer.taskId) setCustomLabel(activeTimer.title);
    }
  }, [activeTimer]);

  // Handle ambient sound playback toggle
  useEffect(() => {
    if (!audioSynth) return;
    if (ambientSound === "off" || !isRunning) {
      audioSynth.stopAmbientNoise();
    } else {
      audioSynth.startAmbientNoise(ambientSound === "rain" ? "rain" : "brown", 0.15);
    }
    return () => {
      audioSynth?.stopAmbientNoise();
    };
  }, [ambientSound, isRunning]);

  // Optional subtle ticking sound on each second when running
  useEffect(() => {
    if (!isRunning || !tickingEnabled || !soundEnabled) return;
    const interval = setInterval(() => {
      audioSynth?.playTick();
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning, tickingEnabled, soundEnabled]);

  // Check for countdown completion (Pomodoro / Timer)
  useEffect(() => {
    if (!activeTimer || !isRunning || activeTimer.targetSeconds <= 0) return;

    if (currentElapsedSec >= activeTimer.targetSeconds) {
      if (soundEnabled) {
        audioSynth?.playCompletionChime();
      }

      const isBreak =
        activeTimer.sessionType === "break" ||
        activeTimer.sessionType === "short_break" ||
        activeTimer.sessionType === "long_break";

      if (!isBreak) {
        // Work session completed!
        toast.success(`🎉 Focus block complete! Logged ${Math.round(currentElapsedSec / 60)} minutes.`, {
          duration: 6000,
        });

        // Log session to backend
        logSessionMutation.mutate({
          durationSeconds: currentElapsedSec,
          projectId: activeTimer.projectId,
          taskId: activeTimer.taskId,
          goalId: activeTimer.goalId,
          sessionType: "focus",
          title: activeTimer.title,
          notes: activeTimer.notes,
        });

        // Determine next break phase
        const nextCycle = pomodoroCycle >= 4 ? 1 : pomodoroCycle + 1;
        setPomodoroCycle(nextCycle);

        if (pomodoroCycle >= 4) {
          switchToBreak(longBreakMins);
          toast.info(`Time for a long break (${longBreakMins}m) ☕`);
        } else {
          switchToBreak(shortBreakMins);
          toast.info(`Time for a short break (${shortBreakMins}m) ☕`);
        }

        if (!autoStartBreaks) {
          useTimerStore.getState().pause();
        }
      } else {
        // Break session completed!
        toast.info("☕ Break complete! Ready for your next focus session 🎯");
        switchToFocus(pomodoroWorkMins);
        if (!autoStartBreaks) {
          useTimerStore.getState().pause();
        }
      }
    }
  }, [
    activeTimer?.elapsedSeconds,
    activeTimer?.targetSeconds,
    isRunning,
    soundEnabled,
    pomodoroCycle,
    pomodoroWorkMins,
    shortBreakMins,
    longBreakMins,
    autoStartBreaks,
  ]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Selected Project & Task metadata
  const currentProject = projects.find((p: any) => p.id === selectedProjectId);
  const currentTask = tasks.find((t: any) => t.id === selectedTaskId);

  // Active Session Status text
  const isBreakActive =
    activeTimer?.sessionType === "break" ||
    activeTimer?.sessionType === "short_break" ||
    activeTimer?.sessionType === "long_break";

  // Target duration calculation based on active mode
  const getTargetSeconds = useCallback((mode: string) => {
    if (mode === "pomodoro") return pomodoroWorkMins * 60;
    if (mode === "timer") return 15 * 60;
    if (mode === "stopwatch") return 0;
    return pomodoroWorkMins * 60;
  }, [pomodoroWorkMins]);

  // Handle Primary Start / Pause / Resume
  const handleToggleTimer = () => {
    if (isRunning) {
      togglePause();
    } else {
      if (activeTimer) {
        togglePause();
      } else {
        const proj = currentProject;
        const task = currentTask;
        const title = customLabel || task?.title || proj?.name || "Focus Session";
        const targetSeconds = getTargetSeconds(activeMode);

        startSession({
          projectId: proj?.id,
          projectName: proj?.name,
          projectColor: proj?.color || "#a9927d",
          taskId: task?.id,
          taskTitle: task?.title,
          title,
          mode: (activeMode === "pomodoro" ? "pomodoro" : activeMode === "stopwatch" ? "stopwatch" : "custom") as TimerMode,
          sessionType: activeMode === "pomodoro" ? "pomodoro" : "focus",
          targetSeconds,
        });

        if (soundEnabled) {
          audioSynth?.playTick();
        }
      }
    }
  };

  // Reset Timer
  const handleReset = () => {
    if (isRunning) {
      togglePause();
    }
    stopAndReset();
    toast.info("Timer reset");
  };

  // Skip to Next Phase (Work <-> Break)
  const handleSkip = () => {
    if (isBreakActive) {
      switchToFocus(pomodoroWorkMins);
      toast.info(`Switched to Focus Time (${pomodoroWorkMins}m) 🎯`);
    } else {
      const nextCycle = pomodoroCycle >= 4 ? 1 : pomodoroCycle + 1;
      setPomodoroCycle(nextCycle);
      const breakDuration = pomodoroCycle >= 4 ? longBreakMins : shortBreakMins;
      switchToBreak(breakDuration);
      toast.info(`Switched to Break (${breakDuration}m) ☕`);
    }
  };

  // Stop & Log Current Progress
  const handleStopAndLog = () => {
    const session = stopAndReset();
    const duration = session && session.elapsedSeconds > 0 ? session.elapsedSeconds : currentElapsedSec;
    if (duration >= 5) {
      logSessionMutation.mutate({
        durationSeconds: duration,
        projectId: session?.projectId || selectedProjectId || undefined,
        taskId: session?.taskId || selectedTaskId || undefined,
        goalId: session?.goalId || undefined,
        sessionType: session?.sessionType || "focus",
        title: session?.title || customLabel || "Focus Session",
        notes: session?.notes || "",
      });
      toast.success(`Session saved: ${Math.round(duration / 60)}m logged!`);
    }
  };

  // Compute Digits Display
  const timerDigits = useMemo(() => {
    if (activeMode === "clock") {
      return currentTime;
    }
    if (activeMode === "stopwatch") {
      const h = Math.floor(currentElapsedSec / 3600);
      const m = Math.floor((currentElapsedSec % 3600) / 60);
      const s = currentElapsedSec % 60;
      if (h > 0) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
      }
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    // Countdown for Pomodoro or Timer mode
    if (activeTimer && activeTimer.targetSeconds > 0) {
      const remainingSec = Math.max(0, activeTimer.targetSeconds - currentElapsedSec);
      const m = Math.floor(remainingSec / 60);
      const s = remainingSec % 60;
      return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    // Idle state
    const defaultMins = activeMode === "pomodoro" ? pomodoroWorkMins : 15;
    return `${String(defaultMins).padStart(2, "0")}:00`;
  }, [activeMode, currentTime, currentElapsedSec, activeTimer, pomodoroWorkMins]);

  // Today's total work time
  const todayFocusSec = (statsData?.todayFocusSeconds || 0) + (activeTimer && !isBreakActive ? currentElapsedSec : 0);
  const todayHours = Math.floor(todayFocusSec / 3600);
  const todayMins = Math.floor((todayFocusSec % 3600) / 60);
  const todaySecs = todayFocusSec % 60;

  // Daily target progress ratio
  const dailyTargetSec = dailyTargetHours * 3600;
  const targetProgress = Math.min(100, Math.round((todayFocusSec / dailyTargetSec) * 100));

  return (
    <div className="relative min-h-[calc(100vh-4.5rem)] w-full bg-[#000000] text-white flex flex-col justify-between items-center px-4 py-8 select-none overflow-hidden">
      {/* Subtle Background Glow */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_40%,rgba(255,255,255,0.03),transparent_100%)] pointer-events-none" />

      {/* ── TOP PILL NAVIGATION BAR ────────────────────────────────────────── */}
      <div className="z-10 flex flex-wrap items-center justify-center gap-2">
        <div className="flex items-center p-1 rounded-full bg-[#12141a]/80 border border-white/[0.08] backdrop-blur-md shadow-2xl">
          <button
            onClick={() => {
              setActiveMode("timer");
              if (!isRunning && activeTimer) stopAndReset();
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeMode === "timer"
                ? "bg-white/15 text-white shadow-sm border border-white/10"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <TimerIcon className="w-3.5 h-3.5" />
            Timer
          </button>

          <button
            onClick={() => {
              setActiveMode("clock");
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeMode === "clock"
                ? "bg-white/15 text-white shadow-sm border border-white/10"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            Clock
          </button>

          <button
            onClick={() => {
              setActiveMode("pomodoro");
              if (!isRunning && activeTimer) stopAndReset();
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeMode === "pomodoro"
                ? "bg-white/15 text-white shadow-sm border border-white/10"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <TimerIcon className="w-3.5 h-3.5" />
            Pomodoro
          </button>

          <button
            onClick={() => {
              setActiveMode("stopwatch");
              if (!isRunning && activeTimer) stopAndReset();
            }}
            className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
              activeMode === "stopwatch"
                ? "bg-white/15 text-white shadow-sm border border-white/10"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <ClockIcon className="w-3.5 h-3.5" />
            Stopwatch
          </button>
        </div>

        {/* Focus Mode & Compact Mode Buttons */}
        <div className="flex items-center p-1 rounded-full bg-[#12141a]/80 border border-white/[0.08] backdrop-blur-md">
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Focus"}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            Focus
          </button>
          <button
            onClick={() => setIsSettingsOpen(true)}
            title="Timer Settings"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-400 hover:text-white transition-colors"
          >
            <Settings2 className="w-3.5 h-3.5" />
            Settings
          </button>
        </div>
      </div>

      {/* ── CENTRAL DISPLAY AREA ───────────────────────────────────────────── */}
      <div className="z-10 flex flex-col items-center justify-center my-auto space-y-7 max-w-2xl w-full">
        {/* Sub-header Pill (Phase & Session count & Quick Setting) */}
        {activeMode !== "clock" && (
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08] backdrop-blur-sm shadow-sm">
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-300">
              {isBreakActive ? (
                <>
                  <Coffee className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-amber-300">
                    {activeTimer?.sessionType === "long_break" ? "Long Break" : "Short Break"}
                  </span>
                </>
              ) : (
                <>
                  <TimerIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Focus Time</span>
                </>
              )}
            </div>

            {activeMode === "pomodoro" && (
              <>
                <span className="text-neutral-600">•</span>
                <span className="text-xs font-mono text-neutral-400">
                  Session {pomodoroCycle} of 4
                </span>
              </>
            )}

            <button
              onClick={() => setIsSettingsOpen(true)}
              className="ml-1 text-neutral-400 hover:text-white transition-colors p-0.5 rounded-full hover:bg-white/10"
              title="Configure durations"
            >
              <Settings2 className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* ── MASSIVE TIMER DIGITS ─────────────────────────────────────────── */}
        <div className="relative flex items-center justify-center tracking-tighter">
          <span className="text-7xl sm:text-9xl md:text-[11.5rem] lg:text-[13rem] font-bold font-mono text-white tabular-nums tracking-normal leading-none drop-shadow-[0_15px_40px_rgba(0,0,0,0.8)]">
            {timerDigits}
          </span>
        </div>

        {/* ── MAIN ACTION BUTTONS ──────────────────────────────────────────── */}
        {activeMode !== "clock" && (
          <div className="flex items-center justify-center gap-3.5 pt-2">
            {/* Start / Pause Button */}
            <button
              onClick={handleToggleTimer}
              className={`flex items-center gap-2 px-9 py-3.5 rounded-full text-base font-semibold transition-all transform hover:scale-[1.03] active:scale-[0.98] shadow-2xl ${
                isRunning
                  ? "bg-amber-400 text-black hover:bg-amber-300"
                  : "bg-white text-black hover:bg-neutral-100"
              }`}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  Start
                </>
              )}
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] text-neutral-300 hover:text-white text-sm font-medium transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Reset
            </button>

            {/* Skip Button */}
            {activeMode === "pomodoro" && (
              <button
                onClick={handleSkip}
                className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-white/[0.06] border border-white/10 hover:bg-white/[0.12] text-neutral-300 hover:text-white text-sm font-medium transition-all"
              >
                <SkipForward className="w-4 h-4" />
                Skip
              </button>
            )}

            {/* Stop & Log Button if active */}
            {activeTimer && currentElapsedSec >= 5 && (
              <button
                onClick={handleStopAndLog}
                className="flex items-center gap-2 px-5 py-3.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 hover:bg-emerald-500/30 text-emerald-300 text-sm font-medium transition-all"
                title="Save & log progress to project/task"
              >
                <CheckCircle2 className="w-4 h-4" />
                Save Session
              </button>
            )}
          </div>
        )}

        {/* ── PROJECT / TASK LABEL PICKER BADGE ────────────────────────────── */}
        <div className="flex flex-col items-center gap-2 pt-1">
          <button
            onClick={() => setIsLabelPickerOpen(true)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/[0.04] border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/20 transition-all text-xs font-medium text-neutral-300 hover:text-white"
          >
            {currentProject ? (
              <>
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: currentProject.color || "#a9927d" }}
                />
                <span className="font-semibold text-white">{currentProject.name}</span>
                {currentTask && (
                  <>
                    <span className="text-neutral-500">•</span>
                    <span className="text-neutral-300 truncate max-w-[180px]">
                      {currentTask.title}
                    </span>
                  </>
                )}
              </>
            ) : customLabel ? (
              <>
                <Tag className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-white font-medium">{customLabel}</span>
              </>
            ) : (
              <>
                <Tag className="w-3.5 h-3.5 text-neutral-400" />
                <span>Select Label / Project</span>
              </>
            )}
            <ChevronDown className="w-3 h-3 text-neutral-500 ml-0.5" />
          </button>
        </div>

        {/* ── WORK TIME SUMMARY & HABIT PROGRESS ────────────────────────────── */}
        <div className="text-center space-y-1 text-xs text-neutral-400 font-mono pt-2">
          <p>
            Total work time today:{" "}
            <span className="text-neutral-200 font-semibold">
              {todayHours > 0 ? `${todayHours}h ` : ""}
              {todayMins}m {todaySecs}s
            </span>
          </p>

          {activeMode === "pomodoro" && (
            <p className="text-neutral-500 text-[11px]">
              Next: {isBreakActive ? `Focus Time (${pomodoroWorkMins}m)` : `Short Break (${shortBreakMins}m)`}
            </p>
          )}

          {/* Minimal daily target progress line */}
          <div className="w-48 mx-auto pt-2">
            <div className="flex items-center justify-between text-[10px] text-neutral-500 mb-1">
              <span>Goal: {dailyTargetHours}h</span>
              <span className="text-emerald-400">{targetProgress}%</span>
            </div>
            <div className="h-1 w-full bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${targetProgress}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── BOTTOM FLOATING DOCK & CORNER STATUS ───────────────────────────── */}
      <div className="z-10 w-full flex items-center justify-between px-2 pt-4">
        {/* Bottom Left: System Status */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>All operations normal</span>
        </div>

        {/* Center Floating Dock */}
        <div className="flex items-center p-1.5 rounded-full bg-[#12141a]/90 border border-white/[0.08] backdrop-blur-md shadow-xl gap-1">
          {/* Tasks Drawer Button */}
          <button
            onClick={() => setIsTasksDrawerOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium text-neutral-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-neutral-400" />
            <span>Tasks</span>
            {tasks.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-white/10 text-neutral-300 font-mono">
                {tasks.length}
              </span>
            )}
          </button>

          {/* Audio Effects Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              toast.info(soundEnabled ? "Sound effects muted" : "Sound effects enabled 🔔");
            }}
            title={soundEnabled ? "Mute Bell Chimes" : "Enable Bell Chimes"}
            className={`p-2 rounded-full transition-colors ${
              soundEnabled ? "text-neutral-300 hover:text-white" : "text-neutral-600 hover:text-neutral-400"
            }`}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Ambient Noise Selector */}
          <button
            onClick={() => setIsAmbientModalOpen(true)}
            title="Focus Ambient Noise"
            className={`p-2 rounded-full transition-colors ${
              ambientSound !== "off" ? "text-emerald-400 bg-emerald-500/15" : "text-neutral-300 hover:text-white"
            }`}
          >
            <Music className="w-4 h-4" />
          </button>

          {/* Spotify Direct Playlist */}
          <a
            href="https://open.spotify.com/genre/focus"
            target="_blank"
            rel="noopener noreferrer"
            title="Spotify Focus Music"
            className="p-2 rounded-full text-emerald-400 hover:text-emerald-300 hover:bg-white/10 transition-colors"
          >
            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
            </svg>
          </a>
        </div>

        {/* Bottom Right: Community Streak Badge */}
        <div className="flex items-center gap-2 text-xs text-neutral-500 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span>277 studying now</span>
        </div>
      </div>

      {/* ── LABEL / PROJECT / TASK SELECTOR MODAL ──────────────────────────── */}
      <Dialog open={isLabelPickerOpen} onOpenChange={setIsLabelPickerOpen}>
        <DialogContent className="max-w-md bg-[#101218] border border-neutral-800 text-white p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              Link Timer to Project & Task
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Project Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Project
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-44 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedProjectId("");
                    setSelectedTaskId("");
                  }}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
                    !selectedProjectId
                      ? "bg-white/15 border border-white/20 text-white"
                      : "bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08]"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
                    No Project (General Focus)
                  </span>
                  {!selectedProjectId && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                {projects.map((proj: any) => (
                  <button
                    key={proj.id}
                    type="button"
                    onClick={() => {
                      setSelectedProjectId(proj.id);
                      setSelectedTaskId("");
                    }}
                    className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
                      selectedProjectId === proj.id
                        ? "bg-white/15 border border-white/20 text-white"
                        : "bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08]"
                    }`}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: proj.color || "#a9927d" }}
                      />
                      <span className="truncate">{proj.name}</span>
                    </span>
                    {selectedProjectId === proj.id && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Task Picker */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Specific Task (Optional)
              </label>
              <div className="grid grid-cols-1 gap-1.5 max-h-40 overflow-y-auto pr-1">
                <button
                  type="button"
                  onClick={() => setSelectedTaskId("")}
                  className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
                    !selectedTaskId
                      ? "bg-white/15 border border-white/20 text-white"
                      : "bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08]"
                  }`}
                >
                  <span>No Specific Task</span>
                  {!selectedTaskId && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                </button>

                {tasks
                  .filter((t: any) => !selectedProjectId || t.projectId === selectedProjectId)
                  .map((task: any) => (
                    <button
                      key={task.id}
                      type="button"
                      onClick={() => setSelectedTaskId(task.id)}
                      className={`flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all ${
                        selectedTaskId === task.id
                          ? "bg-white/15 border border-white/20 text-white"
                          : "bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08]"
                      }`}
                    >
                      <span className="truncate">{task.title}</span>
                      {selectedTaskId === task.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                      )}
                    </button>
                  ))}
              </div>
            </div>

            {/* Custom Notes / Label */}
            <div className="space-y-1.5">
              <label className="text-xs font-mono text-neutral-400 uppercase tracking-wider">
                Custom Session Title / Notes
              </label>
              <input
                type="text"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="e.g. Deep Work Sprint, Client Deck..."
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              onClick={() => setIsLabelPickerOpen(false)}
              className="w-full py-2.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors"
            >
              Done
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── TASKS SLIDE-OVER DRAWER ────────────────────────────────────────── */}
      <Dialog open={isTasksDrawerOpen} onOpenChange={setIsTasksDrawerOpen}>
        <DialogContent className="max-w-md bg-[#101218] border border-neutral-800 text-white p-6 rounded-2xl shadow-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white flex items-center justify-between">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Focus Task List
              </span>
              <span className="text-xs font-mono text-neutral-400">
                {tasks.length} pending
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Quick Add Task Input */}
          <div className="flex items-center gap-2 pt-2">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && newTaskTitle.trim()) {
                  createTaskMutation.mutate({
                    title: newTaskTitle.trim(),
                    status: "not_started",
                    priority: "medium",
                    type: "shallow_work",
                    projectId: selectedProjectId || undefined,
                  });
                }
              }}
              placeholder="+ Add a quick task..."
              className="flex-1 px-3 py-2 rounded-lg bg-black/40 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-neutral-600"
            />
            <button
              disabled={!newTaskTitle.trim()}
              onClick={() => {
                if (newTaskTitle.trim()) {
                  createTaskMutation.mutate({
                    title: newTaskTitle.trim(),
                    status: "not_started",
                    priority: "medium",
                    type: "shallow_work",
                    projectId: selectedProjectId || undefined,
                  });
                }
              }}
              className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-medium disabled:opacity-40 transition-colors"
            >
              Add
            </button>
          </div>

          {/* Task Items List */}
          <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 pt-2">
            {tasks.length === 0 ? (
              <div className="text-center py-8 text-neutral-500 text-xs">
                No active tasks found. Add one above!
              </div>
            ) : (
              tasks.map((task: any) => {
                const isCurrent = selectedTaskId === task.id;
                return (
                  <div
                    key={task.id}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all ${
                      isCurrent
                        ? "bg-emerald-500/10 border-emerald-500/30"
                        : "bg-white/[0.02] border-white/[0.06] hover:border-white/15"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        onClick={() => {
                          updateTaskMutation.mutate({
                            id: task.id,
                            status: "done" as any,
                          });
                          toast.success(`Completed "${task.title}"!`);
                        }}
                        className="text-neutral-500 hover:text-emerald-400 transition-colors"
                      >
                        <Circle className="w-4 h-4" />
                      </button>

                      <span
                        onClick={() => {
                          setSelectedTaskId(task.id);
                          if (task.projectId) setSelectedProjectId(task.projectId);
                          setIsTasksDrawerOpen(false);
                          toast.success(`Active focus bound to: ${task.title}`);
                        }}
                        className={`text-xs font-medium cursor-pointer truncate ${
                          isCurrent ? "text-emerald-300 font-semibold" : "text-neutral-300 hover:text-white"
                        }`}
                      >
                        {task.title}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        if (task.projectId) setSelectedProjectId(task.projectId);
                        setIsTasksDrawerOpen(false);
                        toast.success(`Switched focus to: ${task.title}`);
                      }}
                      className="px-2 py-1 rounded-md bg-white/10 hover:bg-white/20 text-[10px] font-mono text-neutral-300 shrink-0 transition-colors"
                    >
                      {isCurrent ? "Active" : "Select"}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ── AMBIENT AUDIO MODAL ────────────────────────────────────────────── */}
      <Dialog open={isAmbientModalOpen} onOpenChange={setIsAmbientModalOpen}>
        <DialogContent className="max-w-sm bg-[#101218] border border-neutral-800 text-white p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Music className="w-4 h-4 text-emerald-400" />
              Ambient Focus Noise
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-1 gap-2 pt-3">
            <button
              onClick={() => {
                setAmbientSound("off");
                setIsAmbientModalOpen(false);
                toast.info("Ambient sound turned off");
              }}
              className={`p-3 rounded-xl flex items-center justify-between text-xs font-medium transition-all ${
                ambientSound === "off"
                  ? "bg-white/15 border border-white/20 text-white"
                  : "bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08]"
              }`}
            >
              <span>Mute Ambient Sound</span>
              {ambientSound === "off" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={() => {
                setAmbientSound("rain");
                setIsAmbientModalOpen(false);
                toast.success("Gentle Rain playing 🌧️");
              }}
              className={`p-3 rounded-xl flex items-center justify-between text-xs font-medium transition-all ${
                ambientSound === "rain"
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                  : "bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08]"
              }`}
            >
              <span>🌧️ Gentle Rain</span>
              {ambientSound === "rain" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </button>

            <button
              onClick={() => {
                setAmbientSound("brown");
                setIsAmbientModalOpen(false);
                toast.success("Deep Brown Noise playing 🤎");
              }}
              className={`p-3 rounded-xl flex items-center justify-between text-xs font-medium transition-all ${
                ambientSound === "brown"
                  ? "bg-emerald-500/20 border border-emerald-500/40 text-emerald-300"
                  : "bg-white/[0.03] text-neutral-400 hover:bg-white/[0.08]"
              }`}
            >
              <span>🤎 Deep Brown Noise</span>
              {ambientSound === "brown" && <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── SETTINGS CONFIGURATION MODAL ───────────────────────────────────── */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md bg-[#101218] border border-neutral-800 text-white p-6 rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold text-white flex items-center gap-2">
              <Settings2 className="w-4 h-4 text-emerald-400" />
              Timer & Pomodoro Settings
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-3 text-xs">
            {/* Durations */}
            <div className="space-y-2">
              <label className="text-neutral-400 font-mono uppercase tracking-wider text-[11px]">
                Durations (Minutes)
              </label>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="text-neutral-500 text-[10px] block mb-1">Focus</span>
                  <input
                    type="number"
                    min={1}
                    max={180}
                    value={pomodoroWorkMins}
                    onChange={(e) => setPomodoroWorkMins(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 rounded-lg bg-black/40 border border-neutral-800 text-center font-mono font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block mb-1">Short Break</span>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={shortBreakMins}
                    onChange={(e) => setShortBreakMins(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 rounded-lg bg-black/40 border border-neutral-800 text-center font-mono font-bold text-white focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-neutral-500 text-[10px] block mb-1">Long Break</span>
                  <input
                    type="number"
                    min={1}
                    max={90}
                    value={longBreakMins}
                    onChange={(e) => setLongBreakMins(Math.max(1, Number(e.target.value)))}
                    className="w-full p-2 rounded-lg bg-black/40 border border-neutral-800 text-center font-mono font-bold text-white focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Daily Target */}
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Daily Focus Target</span>
                <span className="font-mono text-emerald-400 font-bold">{dailyTargetHours} Hours</span>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={0.5}
                value={dailyTargetHours}
                onChange={(e) => setDailyTargetHours(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>

            {/* Sound & Ticking Toggles */}
            <div className="space-y-2 pt-2 border-t border-neutral-800">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-neutral-300">Completion Chime Sound</span>
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="rounded border-neutral-800 accent-emerald-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-neutral-300">Mechanical Ticking Sound</span>
                <input
                  type="checkbox"
                  checked={tickingEnabled}
                  onChange={(e) => setTickingEnabled(e.target.checked)}
                  className="rounded border-neutral-800 accent-emerald-500 w-4 h-4"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <span className="text-neutral-300">Auto-Start Breaks</span>
                <input
                  type="checkbox"
                  checked={autoStartBreaks}
                  onChange={(e) => setAutoStartBreaks(e.target.checked)}
                  className="rounded border-neutral-800 accent-emerald-500 w-4 h-4"
                />
              </label>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <button
              onClick={() => {
                if (!isRunning) {
                  setTargetSeconds(pomodoroWorkMins * 60);
                }
                setIsSettingsOpen(false);
                toast.success("Settings applied");
              }}
              className="w-full py-2.5 rounded-lg bg-white text-black font-semibold text-xs hover:bg-neutral-200 transition-colors"
            >
              Save Settings
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
