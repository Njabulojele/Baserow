"use client";

import React, { useState, useEffect } from "react";
import { useTimerStore, TimerMode, TimerSessionType } from "@/lib/timerStore";
import { useTimerDisplay } from "@/hooks/useTimerDisplay";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  Timer,
  Play,
  Pause,
  Square,
  RotateCcw,
  Coffee,
  Flame,
  FolderKanban,
  Target,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Calendar,
  Layers,
  ArrowUpRight,
  Activity,
  History,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";

export default function TimerPage() {
  const {
    activeTimer,
    isRunning,
    startSession,
    switchToBreak,
    switchToFocus,
    togglePause,
    stopAndReset,
    updateNotes,
    accumulatedMs,
  } = useTimerStore();

  const display = useTimerDisplay();

  // Selected parameters for starting/adjusting
  const [selectedProjectId, setSelectedProjectId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [selectedMode, setSelectedMode] = useState<TimerMode>("pomodoro");
  const [activeTab, setActiveTab] = useState<"timer" | "history">("timer");

  // tRPC utils & data queries
  const utils = trpc.useUtils();
  const { data: statsData, isLoading: statsLoading } = trpc.timer.getStats.useQuery(undefined, {
    refetchInterval: 15000,
  });
  const { data: recentSessionsData, isLoading: sessionsLoading } =
    trpc.timer.getRecentSessions.useQuery({ limit: 30 }, { refetchInterval: 15000 });
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

  const logVisitMutation = trpc.timer.logVisit.useMutation();

  // Log user activity visit on mount
  useEffect(() => {
    logVisitMutation.mutate({ page: "timer" });
  }, []);

  const projects = Array.isArray(projectsData) ? projectsData : [];
  const goals = Array.isArray(goalsData) ? goalsData : [];
  const tasks = Array.isArray(tasksData)
    ? tasksData.filter(
        (t: any) => t.status !== "done" && t.status !== "completed"
      )
    : [];
  const recentSessions = Array.isArray(recentSessionsData)
    ? (recentSessionsData as any[])
    : Array.isArray((recentSessionsData as any)?.json)
    ? (recentSessionsData as any).json
    : [];

  // Sync active timer fields if already running
  useEffect(() => {
    if (activeTimer) {
      if (activeTimer.projectId) setSelectedProjectId(activeTimer.projectId);
      if (activeTimer.taskId) setSelectedTaskId(activeTimer.taskId);
      if (activeTimer.goalId) setSelectedGoalId(activeTimer.goalId);
      if (activeTimer.notes) setNotes(activeTimer.notes);
      setSelectedMode(activeTimer.mode);
    }
  }, [activeTimer]);

  const elapsed = activeTimer ? activeTimer.elapsedSeconds : Math.floor(accumulatedMs / 1000);
  const target = activeTimer ? activeTimer.targetSeconds : 0;
  const isBreakActive =
    activeTimer?.sessionType === "break" ||
    activeTimer?.sessionType === "short_break" ||
    activeTimer?.sessionType === "long_break";

  const remaining = target > 0 ? Math.max(0, target - elapsed) : 0;
  const progressRatio = target > 0 ? Math.min(1, elapsed / target) : 0;

  const formatSec = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  const handleStartFocus = (mode: TimerMode = selectedMode) => {
    const proj = projects.find((p: any) => p.id === selectedProjectId);
    const task = tasks.find((t: any) => t.id === selectedTaskId);
    const goal = goals.find((g: any) => g.id === selectedGoalId);

    let targetSeconds = 25 * 60;
    if (mode === "pomodoro") targetSeconds = 25 * 60;
    else if (mode === "deep_work") targetSeconds = 60 * 60;
    else if (mode === "sprint") targetSeconds = 30 * 60;
    else if (mode === "stopwatch") targetSeconds = 0;

    startSession({
      projectId: proj?.id,
      projectName: proj?.name,
      projectColor: proj?.color || "#a9927d",
      taskId: task?.id,
      taskTitle: task?.title,
      goalId: goal?.id,
      goalTitle: goal?.title,
      title: task?.title || proj?.name || goal?.title || "Deep Work Focus",
      notes: notes.trim(),
      mode,
      sessionType: "focus",
      targetSeconds,
    });

    toast.success(`Focus session started: ${proj?.name || task?.title || "Focus Block"} 🎯`);
  };

  const handleFinishAndSave = (markCompleted = false) => {
    if (!activeTimer && elapsed <= 0) return;

    const durationSec = Math.max(15, elapsed);
    const mins = Math.max(1, Math.round(durationSec / 60));

    logSessionMutation.mutate({
      durationSeconds: durationSec,
      projectId: activeTimer?.projectId || selectedProjectId || undefined,
      taskId: activeTimer?.taskId || selectedTaskId || undefined,
      goalId: activeTimer?.goalId || selectedGoalId || undefined,
      sessionType: activeTimer?.sessionType || "focus",
      title: activeTimer?.title || "Focus Session",
      notes: activeTimer?.notes || notes,
      completed: markCompleted,
    });

    stopAndReset();

    toast.success(
      isBreakActive
        ? `Break logged: ${mins} mins rested. Welcome back! ☕`
        : `Session saved: ${mins} mins logged to database 🏆`
    );
  };

  // Stats formatting
  const todayFocusHours = statsData ? (statsData.todayFocusSeconds / 3600).toFixed(1) : "0.0";
  const todayBreakMins = statsData ? Math.round(statsData.todayBreakSeconds / 60) : 0;
  const weekFocusHours = statsData ? (statsData.weekFocusSeconds / 3600).toFixed(1) : "0.0";
  const streakDays = statsData?.streakDays || 0;
  const completedGoals = statsData?.completedGoals || 0;
  const daysActive = statsData?.daysActive || 1;

  return (
    <div className="min-h-full max-w-7xl mx-auto px-4 sm:px-6 py-6 space-y-8 select-none">
      {/* 1. Metric Overview Header */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-4 rounded-2xl bg-[#0e131d] border border-white/5 relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-1">
            <span>Today's Focus</span>
            <Flame className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            {todayFocusHours} <span className="text-sm font-normal text-gray-400">hrs</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 flex items-center gap-1 font-mono">
            <span>Week total:</span>
            <span className="text-emerald-400 font-semibold">{weekFocusHours} hrs</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e131d] border border-white/5 relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-1">
            <span>Breaks Accounted</span>
            <Coffee className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            {todayBreakMins} <span className="text-sm font-normal text-gray-400">mins</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-mono">
            Rest &amp; recovery logged
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e131d] border border-white/5 relative overflow-hidden group hover:border-blue-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-1">
            <span>Goal Streak</span>
            <Target className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            {streakDays} <span className="text-sm font-normal text-gray-400">days</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-mono">
            {completedGoals} total completed
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0e131d] border border-white/5 relative overflow-hidden group hover:border-purple-500/30 transition-all">
          <div className="flex items-center justify-between text-xs text-gray-400 font-mono mb-1">
            <span>Activity &amp; Visits</span>
            <Activity className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-white tracking-tight">
            {daysActive} <span className="text-sm font-normal text-gray-400">active days</span>
          </div>
          <div className="text-[11px] text-gray-400 mt-1 font-mono">
            Session tracking live
          </div>
        </div>
      </div>

      {/* 2. Main Workspace: Timer Command Center */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Interactive Timer Console (8 cols) */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-6 sm:p-10 rounded-3xl bg-[#0b0e14] border border-[#1f2937] relative overflow-hidden shadow-2xl">
          {/* Ambient Glow */}
          <div
            className={`absolute w-96 h-96 rounded-full blur-[140px] pointer-events-none transition-all duration-1000 ${
              isBreakActive
                ? "bg-amber-500/15 scale-110"
                : isRunning
                ? "bg-emerald-500/20 scale-120"
                : "bg-white/[0.03] scale-100"
            }`}
          />

          {/* Mode Selector Header Bar */}
          <div className="w-full max-w-lg flex items-center justify-between gap-1 p-1 rounded-2xl bg-[#111620] border border-[#232f3e] mb-8 z-10">
            {[
              { id: "pomodoro", label: "Pomodoro (25m)", icon: Flame },
              { id: "deep_work", label: "Deep Work (1h)", icon: Clock },
              { id: "sprint", label: "Sprint (30m)", icon: Sparkles },
              { id: "stopwatch", label: "Stopwatch", icon: Timer },
            ].map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMode === m.id && !isBreakActive;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setSelectedMode(m.id as TimerMode);
                    if (!isRunning) {
                      handleStartFocus(m.id as TimerMode);
                    }
                  }}
                  className={`flex-1 py-2 px-2 rounded-xl text-xs font-mono font-medium flex items-center justify-center gap-1.5 transition-all ${
                    isSelected
                      ? "bg-emerald-500 text-black font-bold shadow-lg shadow-emerald-500/20"
                      : "text-gray-400 hover:text-white"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>

          {/* Center Digital / Radial Timer Display */}
          <div className="relative flex flex-col items-center justify-center my-4 z-10">
            {/* Status Pill */}
            <div className="flex items-center gap-2 mb-3">
              <span
                className={`relative flex h-2.5 w-2.5 rounded-full ${
                  isRunning
                    ? isBreakActive
                      ? "bg-amber-400"
                      : "bg-emerald-400"
                    : "bg-gray-500"
                }`}
              >
                {isRunning && (
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isBreakActive ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                )}
              </span>
              <span className="text-xs font-mono uppercase tracking-[0.25em] text-gray-400 font-semibold">
                {isBreakActive
                  ? "Recharge Break Active"
                  : isRunning
                  ? "Focus Session Active"
                  : "Ready To Focus"}
              </span>
            </div>

            {/* Giant Digits */}
            <h1
              className={`font-mono text-7xl sm:text-8xl lg:text-9xl font-black tracking-tight tabular-nums transition-colors duration-500 ${
                isBreakActive
                  ? "text-amber-400"
                  : isRunning
                  ? "text-emerald-400"
                  : "text-white/80"
              }`}
            >
              {target > 0 ? formatSec(remaining) : display}
            </h1>

            {/* Associated Project / Task Badge */}
            {(activeTimer?.projectName || activeTimer?.taskTitle || selectedProjectId) && (
              <div className="flex items-center gap-2 mt-4 px-4 py-1.5 rounded-full bg-[#111620] border border-[#232f3e] text-xs font-mono text-gray-300">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor:
                      activeTimer?.projectColor ||
                      projects.find((p: any) => p.id === selectedProjectId)?.color ||
                      "#a9927d",
                  }}
                />
                <span className="font-semibold text-white">
                  {activeTimer?.projectName ||
                    projects.find((p: any) => p.id === selectedProjectId)?.name ||
                    activeTimer?.taskTitle}
                </span>
                {activeTimer?.taskTitle && (
                  <span className="text-gray-400">• {activeTimer.taskTitle}</span>
                )}
              </div>
            )}

            {/* Linear Progress Bar */}
            {target > 0 && (
              <div className="w-72 sm:w-96 mt-6 bg-white/5 rounded-full h-2 overflow-hidden border border-white/5">
                <div
                  className={`h-full transition-all duration-500 rounded-full ${
                    isBreakActive ? "bg-amber-400" : "bg-emerald-400"
                  }`}
                  style={{ width: `${Math.round(progressRatio * 100)}%` }}
                />
              </div>
            )}

            <div className="flex items-center justify-between w-72 sm:w-96 mt-2 text-[11px] font-mono text-gray-400">
              <span>Elapsed: {formatSec(elapsed)}</span>
              {target > 0 && <span>Target: {formatSec(target)}</span>}
            </div>
          </div>

          {/* Primary Action Controls */}
          <div className="flex flex-wrap items-center justify-center gap-3 mt-8 z-10">
            {!isRunning ? (
              <Button
                onClick={() => (activeTimer ? togglePause() : handleStartFocus())}
                size="lg"
                className="h-14 px-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-sm font-bold gap-2 shadow-xl shadow-emerald-500/20 transition-all hover:scale-105"
              >
                <Play className="w-5 h-5 fill-current" />
                {activeTimer ? "Resume Session" : "Start Focus"}
              </Button>
            ) : (
              <Button
                onClick={togglePause}
                size="lg"
                className="h-14 px-10 rounded-full bg-[#18212e] hover:bg-[#202b3c] text-white border border-[#2a384c] font-mono text-sm font-bold gap-2 shadow-lg transition-all"
              >
                <Pause className="w-5 h-5 text-amber-400" />
                Pause
              </Button>
            )}

            {/* Break Mode Switcher */}
            {!isBreakActive ? (
              <Button
                onClick={() => switchToBreak(5)}
                size="lg"
                variant="outline"
                className="h-14 px-6 rounded-full bg-[#151d27] hover:bg-[#1c2734] border border-amber-500/30 text-amber-300 font-mono text-sm gap-2"
              >
                <Coffee className="w-4 h-4 text-amber-400" />
                Take a Break
              </Button>
            ) : (
              <Button
                onClick={() => switchToFocus(25)}
                size="lg"
                variant="outline"
                className="h-14 px-6 rounded-full bg-[#151d27] hover:bg-[#1c2734] border border-emerald-500/30 text-emerald-300 font-mono text-sm gap-2"
              >
                <Target className="w-4 h-4 text-emerald-400" />
                Resume Focus
              </Button>
            )}

            {(isRunning || elapsed > 0) && (
              <Button
                onClick={() => handleFinishAndSave(false)}
                size="lg"
                className="h-14 px-8 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-sm font-bold gap-2 shadow-lg shadow-emerald-900/40"
              >
                <Square className="w-4 h-4 fill-current" />
                Finish &amp; Log
              </Button>
            )}

            {(isRunning || elapsed > 0) && (
              <Button
                onClick={stopAndReset}
                size="lg"
                variant="ghost"
                className="h-14 w-14 rounded-full text-gray-400 hover:text-white hover:bg-white/5"
                title="Reset without saving"
              >
                <RotateCcw className="w-5 h-5" />
              </Button>
            )}
          </div>
        </div>

        {/* Right Column: Project Picker, What are you working on & Task Link (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          {/* Target & Project Context Card */}
          <div className="p-5 rounded-3xl bg-[#0b0e14] border border-[#1f2937] space-y-4 shadow-xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-white tracking-tight border-b border-white/5 pb-3">
              <FolderKanban className="w-4 h-4 text-emerald-400" />
              <span>Project &amp; Activity Picker</span>
            </div>

            {/* Project Picker */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono block mb-1.5">
                Assign to Project:
              </label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#111620] border border-[#232f3e] rounded-xl text-xs text-white outline-none focus:border-emerald-500/60 transition-colors cursor-pointer"
              >
                <option value="" className="bg-[#0c1017] text-gray-400">
                  -- Select Project --
                </option>
                {projects.map((p: any) => (
                  <option key={p.id} value={p.id} className="bg-[#0c1017] text-white">
                    📁 {p.name} {p.status ? `(${p.status})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Task Link */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono block mb-1.5">
                Link to Task (Optional):
              </label>
              <select
                value={selectedTaskId}
                onChange={(e) => setSelectedTaskId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#111620] border border-[#232f3e] rounded-xl text-xs text-white outline-none focus:border-emerald-500/60 transition-colors cursor-pointer"
              >
                <option value="" className="bg-[#0c1017] text-gray-400">
                  -- None --
                </option>
                {tasks.map((t: any) => (
                  <option key={t.id} value={t.id} className="bg-[#0c1017] text-white">
                    ✓ {t.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Goal Link */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono block mb-1.5">
                Link to Goal (Optional):
              </label>
              <select
                value={selectedGoalId}
                onChange={(e) => setSelectedGoalId(e.target.value)}
                className="w-full px-3 py-2.5 bg-[#111620] border border-[#232f3e] rounded-xl text-xs text-white outline-none focus:border-emerald-500/60 transition-colors cursor-pointer"
              >
                <option value="" className="bg-[#0c1017] text-gray-400">
                  -- None --
                </option>
                {goals.map((g: any) => (
                  <option key={g.id} value={g.id} className="bg-[#0c1017] text-white">
                    🎯 {g.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes / What are you working on */}
            <div>
              <label className="text-[11px] uppercase tracking-wider text-gray-400 font-mono block mb-1.5">
                What are you working on?
              </label>
              <textarea
                value={notes}
                onChange={(e) => {
                  setNotes(e.target.value);
                  updateNotes(e.target.value);
                }}
                rows={3}
                placeholder="Log your thoughts, task details, or research milestones..."
                className="w-full px-3 py-2.5 bg-[#111620] border border-[#232f3e] rounded-xl text-xs text-white placeholder-gray-500 outline-none focus:border-emerald-500/60 transition-colors resize-none"
              />
            </div>
          </div>

          {/* Quick Presets Guide */}
          <div className="p-5 rounded-3xl bg-[#0b0e14] border border-[#1f2937] space-y-3 text-xs">
            <div className="font-semibold text-white tracking-tight flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <span>Session Strategies</span>
            </div>
            <div className="space-y-2 text-gray-400 text-[11px] leading-relaxed">
              <p>
                • <strong className="text-white">Pomodoro (25m)</strong>: High-intensity sprint followed by a 5m break to prevent fatigue.
              </p>
              <p>
                • <strong className="text-white">Deep Work (60m)</strong>: Flow state block for architectural reviews and coding.
              </p>
              <p>
                • <strong className="text-white">Account for Breaks</strong>: Clicking "Take a Break" automatically categorizes recovery time so your total day is accurately accounted for.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Activity & Recent Sessions History */}
      <div className="p-6 rounded-3xl bg-[#0b0e14] border border-[#1f2937] space-y-4 shadow-xl">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2 text-base font-bold text-white tracking-tight">
            <History className="w-5 h-5 text-emerald-400" />
            <span>Recorded Sessions &amp; Breaks</span>
          </div>
          <span className="text-xs text-gray-400 font-mono">
            {recentSessions.length} total logged sessions
          </span>
        </div>

        {recentSessions.length === 0 ? (
          <div className="text-center py-10 text-gray-500 font-mono text-xs">
            No timer sessions recorded yet. Start your first focus or break session above! ⚡
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/5 text-[11px] font-mono uppercase text-gray-400 tracking-wider">
                  <th className="pb-3 font-semibold">Type</th>
                  <th className="pb-3 font-semibold">Project / Task</th>
                  <th className="pb-3 font-semibold">Notes</th>
                  <th className="pb-3 font-semibold">Duration</th>
                  <th className="pb-3 font-semibold text-right">Logged At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {recentSessions.map((s: any) => {
                  const isBreak =
                    s.sessionType === "break" ||
                    s.sessionType === "short_break" ||
                    s.sessionType === "long_break";
                  const mins = Math.max(1, Math.round(s.durationSeconds / 60));

                  return (
                    <tr key={s.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-mono uppercase font-bold border ${
                            isBreak
                              ? "bg-amber-500/10 border-amber-500/20 text-amber-300"
                              : "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {isBreak ? (
                            <Coffee className="w-3 h-3" />
                          ) : (
                            <Flame className="w-3 h-3" />
                          )}
                          {isBreak ? "Break" : "Focus"}
                        </span>
                      </td>

                      <td className="py-3">
                        <div className="flex items-center gap-2">
                          {s.projectName ? (
                            <span className="flex items-center gap-1.5 font-medium text-white">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: s.projectColor || "#a9927d" }}
                              />
                              {s.projectName}
                            </span>
                          ) : s.taskTitle ? (
                            <span className="text-white font-medium">✓ {s.taskTitle}</span>
                          ) : s.goalTitle ? (
                            <span className="text-white font-medium">🎯 {s.goalTitle}</span>
                          ) : (
                            <span className="text-gray-400 italic">General Focus</span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 text-gray-300 max-w-xs truncate">
                        {s.notes || s.title || "—"}
                      </td>

                      <td className="py-3 font-mono font-semibold text-white">
                        {mins >= 60
                          ? `${(mins / 60).toFixed(1)} hrs`
                          : `${mins} mins`}
                      </td>

                      <td className="py-3 text-right text-gray-400 font-mono text-[11px]">
                        {s.startedAt
                          ? format(new Date(s.startedAt), "MMM d, h:mm a")
                          : "Recently"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
