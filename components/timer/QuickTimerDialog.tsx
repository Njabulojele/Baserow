"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useTimerStore, TimerMode, TimerSessionType } from "@/lib/timerStore";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Timer,
  Play,
  Pause,
  Square,
  Coffee,
  Sparkles,
  Flame,
  FolderKanban,
  Target,
  CheckCircle2,
  Clock,
  RotateCcw,
  Tag,
  ArrowRight,
} from "lucide-react";

interface QuickTimerDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function QuickTimerDialog({
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}: QuickTimerDialogProps) {
  const storeOpen = useTimerStore((s) => s.isQuickModalOpen);
  const setStoreOpen = useTimerStore((s) => s.setQuickModalOpen);

  const isOpen = controlledOpen !== undefined ? controlledOpen : storeOpen;
  const setIsOpen = controlledOnOpenChange || setStoreOpen;

  const activeTimer = useTimerStore((s) => s.activeTimer);
  const isRunning = useTimerStore((s) => s.isRunning);
  const startSession = useTimerStore((s) => s.startSession);
  const togglePause = useTimerStore((s) => s.togglePause);
  const switchToBreak = useTimerStore((s) => s.switchToBreak);
  const switchToFocus = useTimerStore((s) => s.switchToFocus);
  const stopAndReset = useTimerStore((s) => s.stopAndReset);
  const updateNotes = useTimerStore((s) => s.updateNotes);

  // Form selections for starting new session
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<TimerMode>("pomodoro");
  const [selectedSessionType, setSelectedSessionType] = useState<TimerSessionType>("focus");
  const [customMinutes, setCustomMinutes] = useState<number>(45);

  // tRPC data queries
  const utils = trpc.useUtils();
  const { data: projectsData } = trpc.project.getProjects.useQuery();
  const { data: goalsData } = trpc.goals.list.useQuery();
  const { data: tasksData } = trpc.task.getTasks.useQuery(undefined, {
    staleTime: 30000,
  });

  const logSessionMutation = trpc.timer.logSession.useMutation({
    onSuccess: () => {
      utils.timer.getStats.invalidate();
      utils.timer.getRecentSessions.invalidate();
      utils.analytics.getDashboardStats.invalidate();
      utils.goals.list.invalidate();
      utils.task.getTasks.invalidate();
    },
  });

  const projects = (projectsData as any[]) || [];
  const goals = (goalsData as any[]) || [];
  const tasks = ((tasksData as any[]) || []).filter(
    (t: any) => t.status !== "done" && t.status !== "completed"
  );

  // Sync state if active timer already exists
  useEffect(() => {
    if (activeTimer) {
      if (activeTimer.projectId) setSelectedProjectId(activeTimer.projectId);
      if (activeTimer.taskId) setSelectedTaskId(activeTimer.taskId);
      if (activeTimer.goalId) setSelectedGoalId(activeTimer.goalId);
      if (activeTimer.notes) setNotes(activeTimer.notes);
    }
  }, [activeTimer]);

  const handleStart = () => {
    const proj = projects.find((p: any) => p.id === selectedProjectId);
    const task = tasks.find((t: any) => t.id === selectedTaskId);
    const goal = goals.find((g: any) => g.id === selectedGoalId);

    let targetSeconds = 25 * 60;
    if (selectedSessionType === "break") {
      targetSeconds = 5 * 60;
    } else if (selectedMode === "pomodoro") {
      targetSeconds = 25 * 60;
    } else if (selectedMode === "deep_work") {
      targetSeconds = 60 * 60;
    } else if (selectedMode === "sprint") {
      targetSeconds = 30 * 60;
    } else if (selectedMode === "stopwatch") {
      targetSeconds = 0;
    } else if (selectedMode === "custom") {
      targetSeconds = Math.max(1, customMinutes) * 60;
    }

    startSession({
      projectId: proj?.id,
      projectName: proj?.name,
      projectColor: proj?.color || "#a9927d",
      taskId: task?.id,
      taskTitle: task?.title,
      goalId: goal?.id,
      goalTitle: goal?.title,
      title: task?.title || proj?.name || goal?.title || "Focus Session",
      notes: notes.trim(),
      mode: selectedMode,
      sessionType: selectedSessionType,
      targetSeconds,
    });

    toast.success(
      selectedSessionType === "break"
        ? "Break started! Enjoy your recharge ☕"
        : `Focus started for ${proj?.name || task?.title || "Session"} 🎯`
    );
  };

  const handleFinishAndSave = (markCompleted = false) => {
    if (!activeTimer) return;

    const durationSec = Math.max(10, activeTimer.elapsedSeconds);
    const mins = Math.max(1, Math.round(durationSec / 60));

    logSessionMutation.mutate({
      durationSeconds: durationSec,
      projectId: activeTimer.projectId,
      taskId: activeTimer.taskId,
      goalId: activeTimer.goalId,
      sessionType: activeTimer.sessionType,
      title: activeTimer.title,
      notes: activeTimer.notes || notes,
      completed: markCompleted,
    });

    stopAndReset();
    setIsOpen(false);

    toast.success(
      activeTimer.sessionType === "break"
        ? `Break logged: ${mins} mins rested. Welcome back! ⚡`
        : `Session logged: ${mins} mins dedicated to "${activeTimer.projectName || activeTimer.title}" 🏆`
    );
  };

  // Timer formatted strings
  const elapsed = activeTimer ? activeTimer.elapsedSeconds : 0;
  const target = activeTimer ? activeTimer.targetSeconds : 0;

  const formatSec = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const remaining = target > 0 ? Math.max(0, target - elapsed) : 0;
  const progressRatio = target > 0 ? Math.min(1, elapsed / target) : 0;
  const isBreakActive =
    activeTimer?.sessionType === "break" ||
    activeTimer?.sessionType === "short_break" ||
    activeTimer?.sessionType === "long_break";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-[480px] bg-[#0c1017] border border-[#273549] text-white p-0 rounded-2xl shadow-2xl overflow-hidden select-none">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-white/5 bg-gradient-to-b from-white/[0.03] to-transparent">
          <div className="flex items-center gap-2.5">
            <div
              className={`p-2 rounded-xl border ${
                isBreakActive
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
              }`}
            >
              {isBreakActive ? <Coffee className="w-5 h-5" /> : <Timer className="w-5 h-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white tracking-tight">
                {activeTimer
                  ? isBreakActive
                    ? "Break Time Active"
                    : "Live Focus Session"
                  : "Launch Focus Timer"}
              </DialogTitle>
              <p className="text-xs text-gray-400 font-mono">
                {activeTimer
                  ? activeTimer.projectName || activeTimer.title
                  : "Account for work, projects & breaks"}
              </p>
            </div>
          </div>

          {activeTimer && (
            <span
              className={`text-[10px] font-mono px-2.5 py-1 rounded-full uppercase tracking-wider font-bold border ${
                isRunning
                  ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400 animate-pulse"
                  : "bg-amber-500/15 border-amber-500/30 text-amber-400"
              }`}
            >
              {isRunning ? "Running" : "Paused"}
            </span>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* If Timer is Active: Show Large Clock & Realtime Controls */}
          {activeTimer ? (
            <div className="flex flex-col items-center justify-center py-2 space-y-4">
              {/* Circular or Digital Clock */}
              <div className="relative flex flex-col items-center justify-center p-6 rounded-2xl bg-[#111722] border border-[#273549] w-full shadow-inner">
                <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-gray-400 mb-1">
                  {target > 0 ? "Remaining" : "Elapsed Time"}
                </span>

                <div className="font-mono text-5xl sm:text-6xl font-extrabold tracking-tight tabular-nums text-white">
                  {target > 0 ? formatSec(remaining) : formatSec(elapsed)}
                </div>

                {/* Progress Bar */}
                {target > 0 && (
                  <div className="w-full mt-4 bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                    <div
                      className={`h-full transition-all duration-500 rounded-full ${
                        isBreakActive ? "bg-amber-400" : "bg-emerald-400"
                      }`}
                      style={{ width: `${Math.round(progressRatio * 100)}%` }}
                    />
                  </div>
                )}

                <div className="flex items-center justify-between w-full mt-3 text-[11px] text-gray-400 font-mono">
                  <span>Elapsed: {formatSec(elapsed)}</span>
                  {activeTimer.projectName && (
                    <span className="flex items-center gap-1 text-gray-300">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: activeTimer.projectColor || "#a9927d" }}
                      />
                      {activeTimer.projectName}
                    </span>
                  )}
                  {target > 0 && <span>Target: {formatSec(target)}</span>}
                </div>
              </div>

              {/* Notes display / editor */}
              <div className="w-full">
                <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono block mb-1">
                  Current Activity / Notes:
                </label>
                <input
                  type="text"
                  value={activeTimer.notes || ""}
                  onChange={(e) => updateNotes(e.target.value)}
                  placeholder="What are you working on right now?"
                  className="w-full px-3 py-2 bg-[#111722] border border-[#273549] rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>

              {/* Active Controls */}
              <div className="flex items-center gap-2 w-full pt-1">
                <Button
                  onClick={togglePause}
                  className={`flex-1 h-11 rounded-xl font-mono text-xs font-semibold gap-2 border ${
                    isRunning
                      ? "bg-secondary/70 hover:bg-secondary text-white border-white/10"
                      : "bg-emerald-500 hover:bg-emerald-400 text-black border-transparent font-bold"
                  }`}
                >
                  {isRunning ? (
                    <>
                      <Pause className="w-4 h-4 text-amber-400" />
                      Pause Timer
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Resume
                    </>
                  )}
                </Button>

                {!isBreakActive ? (
                  <Button
                    onClick={() => switchToBreak(5)}
                    variant="outline"
                    className="h-11 px-4 rounded-xl bg-[#16202c] hover:bg-[#1c2938] text-amber-300 border-amber-500/20 font-mono text-xs gap-1.5"
                    title="Switch to 5-minute break"
                  >
                    <Coffee className="w-4 h-4" />
                    5m Break
                  </Button>
                ) : (
                  <Button
                    onClick={() => switchToFocus(25)}
                    variant="outline"
                    className="h-11 px-4 rounded-xl bg-[#16202c] hover:bg-[#1c2938] text-emerald-300 border-emerald-500/20 font-mono text-xs gap-1.5"
                    title="Switch back to Focus"
                  >
                    <Target className="w-4 h-4" />
                    Resume Focus
                  </Button>
                )}

                <Button
                  onClick={() => handleFinishAndSave(false)}
                  className="h-11 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-bold gap-1.5 shadow-lg shadow-emerald-900/30"
                >
                  <Square className="w-3.5 h-3.5 fill-current" />
                  Finish &amp; Log
                </Button>
              </div>

              {/* Mark Task/Goal Complete option */}
              {(activeTimer.taskId || activeTimer.goalId) && (
                <button
                  type="button"
                  onClick={() => handleFinishAndSave(true)}
                  className="text-xs text-gray-400 hover:text-emerald-400 flex items-center gap-1.5 transition-colors pt-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  <span>Finish session and mark {activeTimer.taskId ? "task" : "goal"} as Complete</span>
                </button>
              )}
            </div>
          ) : (
            /* Setup & Launcher Mode */
            <div className="space-y-4">
              {/* Type Switcher: Focus vs Break */}
              <div className="flex p-1 bg-[#111722] border border-[#273549] rounded-xl">
                <button
                  type="button"
                  onClick={() => setSelectedSessionType("focus")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                    selectedSessionType === "focus"
                      ? "bg-emerald-500 text-black font-bold shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Flame className="w-3.5 h-3.5" />
                  Focus Session
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSessionType("break")}
                  className={`flex-1 py-1.5 text-xs font-medium rounded-lg flex items-center justify-center gap-2 transition-all ${
                    selectedSessionType === "break"
                      ? "bg-amber-500 text-black font-bold shadow-md"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Coffee className="w-3.5 h-3.5" />
                  Break Time
                </button>
              </div>

              {/* Duration Presets */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono block mb-2">
                  Session Duration
                </label>
                {selectedSessionType === "focus" ? (
                  <div className="grid grid-cols-4 gap-2">
                    {[
                      { id: "pomodoro", label: "25m", sub: "Pomodoro" },
                      { id: "deep_work", label: "60m", sub: "Deep Work" },
                      { id: "sprint", label: "30m", sub: "Sprint" },
                      { id: "stopwatch", label: "Open", sub: "Stopwatch" },
                    ].map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setSelectedMode(preset.id as TimerMode)}
                        className={`p-2.5 rounded-xl border text-center transition-all ${
                          selectedMode === preset.id
                            ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-bold"
                            : "bg-[#111722] border-[#273549] text-gray-400 hover:text-white hover:border-white/20"
                        }`}
                      >
                        <div className="text-sm font-mono">{preset.label}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">{preset.sub}</div>
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode("custom");
                        setCustomMinutes(5);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        customMinutes === 5
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold"
                          : "bg-[#111722] border-[#273549] text-gray-400 hover:text-white"
                      }`}
                    >
                      <div className="text-base font-mono">5 Minutes</div>
                      <div className="text-[10px] text-gray-400">Short Coffee Break</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedMode("custom");
                        setCustomMinutes(15);
                      }}
                      className={`p-3 rounded-xl border text-center transition-all ${
                        customMinutes === 15
                          ? "bg-amber-500/15 border-amber-500/40 text-amber-300 font-bold"
                          : "bg-[#111722] border-[#273549] text-gray-400 hover:text-white"
                      }`}
                    >
                      <div className="text-base font-mono">15 Minutes</div>
                      <div className="text-[10px] text-gray-400">Long Rest &amp; Walk</div>
                    </button>
                  </div>
                )}
              </div>

              {/* Project Picker (Crucial user request!) */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono block mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FolderKanban className="w-3.5 h-3.5 text-emerald-400" />
                    Select Project
                  </span>
                  {selectedProjectId && (
                    <button
                      type="button"
                      onClick={() => setSelectedProjectId("")}
                      className="text-[10px] text-gray-400 hover:text-white"
                    >
                      Clear
                    </button>
                  )}
                </label>
                <select
                  value={selectedProjectId}
                  onChange={(e) => setSelectedProjectId(e.target.value)}
                  className="w-full px-3 py-2.5 bg-[#111722] border border-[#273549] rounded-xl text-xs text-white outline-none focus:border-emerald-500/60 transition-colors cursor-pointer"
                >
                  <option value="" className="bg-[#0c1017] text-gray-400">
                    -- General Focus (No specific project) --
                  </option>
                  {projects.map((p: any) => (
                    <option key={p.id} value={p.id} className="bg-[#0c1017] text-white">
                      📁 {p.name} {p.status ? `(${p.status})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Task or Goal association (optional) */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-mono block mb-1">
                    Link Task (Optional)
                  </label>
                  <select
                    value={selectedTaskId}
                    onChange={(e) => setSelectedTaskId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#111722] border border-[#273549] rounded-lg text-xs text-white outline-none focus:border-emerald-500/60 transition-colors"
                  >
                    <option value="" className="bg-[#0c1017] text-gray-400">
                      None
                    </option>
                    {tasks.map((t: any) => (
                      <option key={t.id} value={t.id} className="bg-[#0c1017] text-white">
                        ✓ {t.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[10px] uppercase tracking-wider text-gray-400 font-mono block mb-1">
                    Link Goal (Optional)
                  </label>
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full px-2.5 py-2 bg-[#111722] border border-[#273549] rounded-lg text-xs text-white outline-none focus:border-emerald-500/60 transition-colors"
                  >
                    <option value="" className="bg-[#0c1017] text-gray-400">
                      None
                    </option>
                    {goals.map((g: any) => (
                      <option key={g.id} value={g.id} className="bg-[#0c1017] text-white">
                        🎯 {g.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Freeform "What are you working on?" input */}
              <div>
                <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono block mb-1.5">
                  What are you working on?
                </label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Refactoring API endpoints, designing hero section..."
                  className="w-full px-3 py-2 bg-[#111722] border border-[#273549] rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/60 transition-colors"
                />
              </div>

              {/* Start Button */}
              <Button
                onClick={handleStart}
                className="w-full h-12 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-black font-mono font-bold text-sm shadow-lg shadow-emerald-500/20 gap-2 transition-all mt-2"
              >
                <Play className="w-4 h-4 fill-current" />
                Start {selectedSessionType === "break" ? "Break Session" : "Tracking Time"}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
