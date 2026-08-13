"use client";

import { useState } from "react";
import {
  Target,
  Flame,
  AlertTriangle,
  Play,
  Plus,
  CheckCircle2,
  Calendar as CalendarIcon,
  Clock,
  Trash2,
  Edit3,
  Sparkles,
  Zap,
  Check,
} from "lucide-react";
import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useGoalStore, Goal, DayOfWeek } from "@/lib/goalStore";
import { CreateGoalDialog } from "@/components/goals/CreateGoalDialog";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

const DAY_KEYS: { key: DayOfWeek; label: string; full: string }[] = [
  { key: "mon", label: "M", full: "Monday" },
  { key: "tue", label: "T", full: "Tuesday" },
  { key: "wed", label: "W", full: "Wednesday" },
  { key: "thu", label: "T", full: "Thursday" },
  { key: "fri", label: "F", full: "Friday" },
  { key: "sat", label: "S", full: "Saturday" },
  { key: "sun", label: "S", full: "Sunday" },
];

function getTodayDayKey(): DayOfWeek {
  const dayIndex = new Date().getDay(); // 0 is Sunday, 1 is Monday...
  const map: Record<number, DayOfWeek> = {
    0: "sun",
    1: "mon",
    2: "tue",
    3: "wed",
    4: "thu",
    5: "fri",
    6: "sat",
  };
  return map[dayIndex] || "mon";
}

function getTodayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export default function GoalsPage() {
  const utils = trpc.useUtils();
  const goals = useGoalStore((s) => s.goals);
  const deleteGoalLocal = useGoalStore((s) => s.deleteGoal);
  const toggleGoalCompletionLocal = useGoalStore((s) => s.toggleGoalCompletion);
  const startGoalSession = useGoalStore((s) => s.startGoalSession);

  // Fetch real goals from Go backend DB
  const { data: remoteGoals } = trpc.goals.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });

  // Sync DB goals into Zustand store when fetched
  useEffect(() => {
    if (Array.isArray(remoteGoals) && remoteGoals.length > 0) {
      useGoalStore.setState({ goals: remoteGoals as unknown as Goal[] });
    }
  }, [remoteGoals]);

  const deleteGoalMutation = trpc.goals.delete.useMutation({
    onSuccess: () => utils.goals.list.invalidate(),
  });

  const toggleGoalMutation = trpc.goals.toggle.useMutation({
    onSuccess: () => utils.goals.list.invalidate(),
  });

  const handleDelete = (id: string) => {
    deleteGoalLocal(id);
    deleteGoalMutation.mutate({ id });
  };

  const handleToggle = (id: string) => {
    toggleGoalCompletionLocal(id);
    toggleGoalMutation.mutate({ id, date: getTodayStr() });
  };

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);

  const handleOpenCreate = () => {
    setEditingGoal(null);
    setIsCreateOpen(true);
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setIsCreateOpen(true);
  };
  const todayKey = getTodayDayKey();
  const todayStr = getTodayStr();

  // Filter today's scheduled goals
  const todayGoals = goals.filter((g) => {
    if (g.frequency === "daily") return true;
    const days = Array.isArray(g.scheduledDays) ? g.scheduledDays : [];
    return days.includes(todayKey);
  });

  const completedTodayCount = todayGoals.filter((g) => {
    const dates = Array.isArray(g.completedDates) ? g.completedDates : [];
    return dates.includes(todayStr);
  }).length;

  const todayCompletionRate =
    todayGoals.length > 0
      ? Math.round((completedTodayCount / todayGoals.length) * 100)
      : 0;

  // Highest active streak across all goals
  const maxStreak = goals.reduce((acc, g) => Math.max(acc, g.streak || 0), 0);

  const neglectedGoals = todayGoals.filter((g) => {
    const dates = Array.isArray(g.completedDates) ? g.completedDates : [];
    return !dates.includes(todayStr);
  });

  return (
    <div className="w-full space-y-6 pb-12">
      {/* CREATE DIALOG */}
      <CreateGoalDialog open={isCreateOpen} onOpenChange={setIsCreateOpen} />

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Target className="w-7 h-7 text-amber-500" />
            Goals & Consistency Engine
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Schedule daily/recurring goals, perform timed focus sessions, maintain streaks, and track performance.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="toota-pill-active flex items-center justify-center gap-2 text-xs font-bold py-2.5 px-5 bg-amber-500 text-black hover:bg-amber-400 shrink-0 shadow-md"
        >
          <Plus className="w-4 h-4" /> Create New Goal
        </button>
      </div>

      {/* BANNER METRICS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="toota-card p-5 space-y-1.5 col-span-2 md:col-span-1 border-amber-500/20 bg-amber-500/5">
          <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5">
            <Flame className="w-4 h-4 text-amber-500" /> Consistency Streak
          </p>
          <div className="flex items-baseline gap-2">
            <p className="text-4xl font-extrabold text-foreground">{maxStreak}</p>
            <span className="text-xs font-bold text-amber-500 font-mono">DAYS ACTIVE</span>
          </div>
          <p className="text-[11px] text-muted-foreground font-mono">
            Highest current goal streak
          </p>
        </div>

        <div className="toota-card p-5 space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Today's Goal Completion</p>
          <p className="text-4xl font-extrabold text-foreground">{todayCompletionRate}%</p>
          <p className="text-[11px] text-emerald-500 font-mono font-bold">
            {completedTodayCount} of {todayGoals.length} done today
          </p>
        </div>

        <div className="toota-card p-5 space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Scheduled Today</p>
          <p className="text-4xl font-extrabold text-foreground">{todayGoals.length}</p>
          <p className="text-[11px] text-muted-foreground font-mono">
            {todayKey.toUpperCase()} recurring goals
          </p>
        </div>

        <div className="toota-card p-5 space-y-1.5">
          <p className="text-xs text-muted-foreground font-medium">Total Active Goals</p>
          <p className="text-4xl font-extrabold text-foreground">{goals.length}</p>
          <p className="text-[11px] text-muted-foreground font-mono">Configured in system</p>
        </div>
      </div>

      {/* NEGLECT WARNING — shown if scheduled goals remain unperformed */}
      {neglectedGoals.length > 0 && (
        <div className="toota-card bg-rose-500/10 border border-rose-500/20 p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-foreground">
                Unperformed Goal Alert: &quot;{neglectedGoals[0].title}&quot;
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {neglectedGoals.length} goal{neglectedGoals.length > 1 ? "s" : ""} scheduled for today still need attention to protect your streak.
              </p>
            </div>
          </div>
          <button
            onClick={() => startGoalSession(neglectedGoals[0])}
            className="toota-pill-active bg-rose-500 text-white hover:bg-rose-600 flex items-center gap-2 text-xs font-bold shrink-0 shadow-md"
          >
            <Play className="w-3.5 h-3.5 fill-white" /> Perform Goal Now
          </button>
        </div>
      )}

      {/* WEEKLY SCHEDULE CALENDAR RHYTHM */}
      <div className="toota-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-extrabold text-foreground flex items-center gap-2">
            <CalendarIcon className="w-4 h-4 text-amber-500" />
            Weekly Goal Schedule & Rhythm
          </h3>
          <span className="text-[11px] text-muted-foreground font-mono">
            Today is <strong className="text-foreground">{DAY_KEYS.find(d => d.key === todayKey)?.full}</strong>
          </span>
        </div>

        <div className="grid grid-cols-7 gap-2 pt-1">
          {DAY_KEYS.map(({ key, label, full }) => {
            const isToday = key === todayKey;
            const scheduledForDay = goals.filter((g) => {
              if (g.frequency === "daily") return true;
              const days = Array.isArray(g.scheduledDays) ? g.scheduledDays : [];
              return days.includes(key);
            });

            return (
              <div
                key={key}
                className={cn(
                  "p-3 rounded-2xl border text-center space-y-2 transition-all",
                  isToday
                    ? "bg-amber-500/10 border-amber-500/40 ring-2 ring-amber-500/30"
                    : "bg-secondary/30 border-white/5"
                )}
              >
                <div className="flex flex-col items-center">
                  <span
                    className={cn(
                      "text-xs font-black",
                      isToday ? "text-amber-400" : "text-muted-foreground"
                    )}
                  >
                    {label}
                  </span>
                  <span className="text-[10px] text-muted-foreground/70 font-mono hidden md:inline">
                    {full.substring(0, 3)}
                  </span>
                </div>

                <div className="text-[11px] font-extrabold text-foreground">
                  {scheduledForDay.length}
                </div>

                <div className="flex items-center justify-center gap-1">
                  {scheduledForDay.slice(0, 3).map((g) => {
                    const dates = Array.isArray(g.completedDates) ? g.completedDates : [];
                    const isDone = dates.includes(todayStr) && isToday;
                    return (
                      <span
                        key={g.id}
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          isDone ? "bg-emerald-400" : "bg-amber-500/40"
                        )}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* GOALS GRID */}
      <div className="space-y-3">
        <h3 className="text-base font-extrabold text-foreground flex items-center justify-between">
          <span>Active Goals ({goals.length})</span>
        </h3>

        {goals.length === 0 ? (
          <div className="toota-card py-16 text-center space-y-4">
            <Target className="w-12 h-12 text-muted-foreground opacity-40 mx-auto" />
            <p className="text-sm font-semibold text-foreground">No goals configured</p>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              Create your first goal with daily or specific day schedules to start tracking performance and maintaining streaks.
            </p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="toota-pill-active text-xs py-2.5 px-6 bg-amber-500 text-black hover:bg-amber-400 font-bold"
            >
              + Create First Goal
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {goals.map((goal) => {
              const completedDates = Array.isArray(goal.completedDates) ? goal.completedDates : [];
              const scheduledDays = Array.isArray(goal.scheduledDays) ? goal.scheduledDays : [];
              const isCompletedToday = completedDates.includes(todayStr);
              const isScheduledToday =
                goal.frequency === "daily" || scheduledDays.includes(todayKey);

              return (
                <div
                  key={goal.id}
                  className={cn(
                    "toota-card p-6 space-y-5 flex flex-col justify-between hover:shadow-xl transition-all border",
                    isCompletedToday
                      ? "border-emerald-500/30 bg-emerald-500/5"
                      : isScheduledToday
                      ? "border-amber-500/20 bg-background"
                      : "border-white/5 bg-background opacity-85"
                  )}
                >
                  <div className="space-y-3">
                    {/* BADGES ROW */}
                    <div className="flex items-center justify-between text-[10px] font-bold">
                      <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground font-mono uppercase tracking-wider">
                        {goal.pillar}
                      </span>

                      <div className="flex items-center gap-1.5">
                        {goal.mode === "pomodoro" ? (
                          <span className="px-2 py-0.5 rounded-full bg-indigo-500/15 text-indigo-400 font-mono flex items-center gap-1">
                            <Sparkles className="w-3 h-3" /> Pomodoro
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 font-mono flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Timer
                          </span>
                        )}
                        <button
                          onClick={() => handleEditGoal(goal)}
                          className="p-1 rounded hover:bg-amber-500/20 text-muted-foreground hover:text-amber-400 transition-colors"
                          title="Edit Goal"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(goal.id)}
                          className="p-1 rounded hover:bg-rose-500/20 text-muted-foreground hover:text-rose-400 transition-colors"
                          title="Delete Goal"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* TITLE & DESCRIPTION */}
                    <div>
                      <h2 className="text-lg font-extrabold text-foreground leading-snug">
                        {goal.title}
                      </h2>
                      {goal.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {goal.description}
                        </p>
                      )}
                    </div>

                    {/* METRICS */}
                    <div className="flex items-center justify-between pt-1 border-t border-white/5">
                      <div className="flex items-center gap-1 text-amber-400 text-xs font-extrabold font-mono">
                        <Flame className="w-4 h-4 fill-amber-500" />
                        <span>{goal.streak} Day Streak</span>
                      </div>

                      <span className="text-xs font-mono font-bold text-muted-foreground">
                        {goal.targetMinutes} mins
                      </span>
                    </div>

                    {/* SCHEDULE DAYS PILL */}
                    <div className="flex items-center gap-1 pt-1">
                      <span className="text-[10px] text-muted-foreground font-mono mr-1">
                        Days:
                      </span>
                      {DAY_KEYS.map(({ key, label }) => {
                        const active =
                          goal.frequency === "daily" || scheduledDays.includes(key);
                        return (
                          <span
                            key={key}
                            className={cn(
                              "w-5 h-5 rounded-md flex items-center justify-center font-mono text-[9px] font-bold border",
                              active
                                ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                : "bg-muted/10 text-muted-foreground/30 border-transparent"
                            )}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  {/* BOTTOM ACTIONS */}
                  <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                    <button
                      onClick={() => handleToggle(goal.id)}
                      className={cn(
                        "py-2.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all border",
                        isCompletedToday
                          ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                          : "bg-secondary/50 text-muted-foreground border-white/5 hover:text-foreground"
                      )}
                      title={isCompletedToday ? "Completed for today" : "Mark as completed"}
                    >
                      <CheckCircle2
                        className={cn(
                          "w-4 h-4",
                          isCompletedToday ? "text-emerald-400 fill-emerald-400/20" : ""
                        )}
                      />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
