"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  CheckCircle,
  Clock,
  FolderKanban,
  Target,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Activity,
  Zap,
  Flame,
  ChevronRight,
  Sparkles,
  Play,
  Pause,
  Coffee,
  Laptop,
  Star,
  Plus,
  X,
  Eye,
} from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { useGoalStore } from "@/lib/goalStore";
import { useTimerStore } from "@/lib/timerStore";
import { toast } from "sonner";

interface DashboardClientProps {
  initialData?: {
    stats: any;
    todaysTasks: any[];
    activeTimer: any;
  };
}

interface TracklogData {
  working_hours_total: string;
  target_hours: number;
  productive_hours: string;
  focused_hours: string;
  unproductive_time: string;
  apps: Array<{
    name: string;
    duration: string;
    percent: number;
    color: string;
  }>;
  events: Array<{
    time: string;
    app: string;
    title: string;
    duration: string;
    status: string;
  }>;
}

export function DashboardClient({ initialData }: DashboardClientProps) {
  const [viewMode, setViewMode] = useState<"company" | "personal">("company");
  const [timeRange, setTimeRange] = useState<"3days" | "week" | "month">(
    "week",
  );
  const [isTracking, setIsTracking] = useState(true);
  const [breakTimerActive, setBreakTimerActive] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [showWelcomeBack, setShowWelcomeBack] = useState(true);
  const breakIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Global Timer Store Integration
  const hydrateFromBackend = useTimerStore((s) => s.hydrateFromBackend);
  const tick = useTimerStore((s) => s.tick);
  const activeTimer = useTimerStore((s) => s.activeTimer);

  const { data: activeTimerData } = trpc.task.getActiveTimer.useQuery();

  useEffect(() => {
    if (activeTimerData) {
      hydrateFromBackend(activeTimerData);
    }
  }, [activeTimerData, hydrateFromBackend]);

  useEffect(() => {
    const timer = setInterval(() => {
      tick();
    }, 1000);
    return () => clearInterval(timer);
  }, [tick]);

  // 1. Real tRPC Data Queries
  const { data: stats } = trpc.analytics.getDashboardStats.useQuery(undefined, {
    initialData: initialData?.stats,
  });

  const { data: taskStats } = trpc.analytics.getTaskStats.useQuery({
    period: timeRange === "month" ? "month" : "week",
  });

  const [showClosedDealsModal, setShowClosedDealsModal] = useState(false);

  const { data: revenueData } = trpc.analytics.getRevenueOverview.useQuery();
  const { data: closedDealsList } = trpc.analytics.getClosedDeals.useQuery();
  const { data: streakData } = trpc.habit.getStreaks.useQuery();
  const { data: remoteGoals } = (trpc as any).goals?.list?.useQuery?.(
    undefined,
    {
      refetchOnWindowFocus: false,
    },
  ) ?? { data: null };

  // Sync backend goals into Zustand goalStore
  useEffect(() => {
    if (Array.isArray(remoteGoals) && remoteGoals.length > 0) {
      useGoalStore.setState({ goals: remoteGoals as any });
    }
  }, [remoteGoals]);

  const { data: projectsData, isLoading: projectsLoading } =
    trpc.project.getProjects.useQuery();
  const { data: productivityTrends } =
    trpc.analytics.getProductivityTrends.useQuery({
      range: timeRange === "3days" ? "7d" : timeRange === "week" ? "7d" : "30d",
    });
  const [todayDate] = useState(() => new Date());
  const { data: dailyChecklist } = trpc.habit.getDailyChecklist.useQuery({
    date: todayDate,
  });
  // Task heatmap — last 72 days used to drive the working hours grid
  const { data: heatmapData } = trpc.analytics.getTaskHeatmap.useQuery();

  const clientRevenueZAR =
    revenueData?.clientRevenue ??
    revenueData?.pipelineValue ??
    revenueData?.monthlyRevenue ??
    0;

  // Goals store hook & explicit priority heuristic resolution
  const goals = useGoalStore((s) => s.goals);
  const startGoalSession = useGoalStore((s) => s.startGoalSession);
  const toggleGoalCompletion = useGoalStore((s) => s.toggleGoalCompletion);

  // Compute highest active streak across all goals to stay consistent with /goals page
  const maxGoalStreak = useMemo(() => {
    if (!Array.isArray(goals) || goals.length === 0) return 0;
    return goals.reduce((acc, g) => Math.max(acc, g.streak || 0), 0);
  }, [goals]);

  const currentStreak = Math.max(streakData?.currentStreak ?? 0, maxGoalStreak);

  // 2. Go Backend Tracklog Query
  const [tracklog, setTracklog] = useState<TracklogData | null>(null);
  const [tracklogLoading, setTracklogLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setTracklogLoading(true);
    fetch("/api/v1/tracklog")
      .then((r) => r.json())
      .then((d) => {
        if (active) {
          setTracklog(d);
          setTracklogLoading(false);
        }
      })
      .catch(() => {
        if (active) setTracklogLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  // Break Timer interval
  useEffect(() => {
    if (breakTimerActive) {
      breakIntervalRef.current = setInterval(() => {
        setBreakSeconds((s) => s + 1);
      }, 1000);
    } else if (breakIntervalRef.current) {
      clearInterval(breakIntervalRef.current);
      breakIntervalRef.current = null;
    }
    return () => {
      if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
    };
  }, [breakTimerActive]);

  const formatBreakTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  // Parse tracklog durations for real bar widths
  const parseDurationToMinutes = (dur: string): number => {
    if (!dur || dur === "—") return 0;
    let total = 0;
    const hMatch = dur.match(/(\d+)h/);
    const mMatch = dur.match(/(\d+)m/);
    if (hMatch) total += parseInt(hMatch[1]) * 60;
    if (mMatch) total += parseInt(mMatch[1]);
    return total;
  };
  const productiveMins = parseDurationToMinutes(
    tracklog?.productive_hours ?? "",
  );
  const focusedMins = parseDurationToMinutes(tracklog?.focused_hours ?? "");
  const unproductiveMins = parseDurationToMinutes(
    tracklog?.unproductive_time ?? "",
  );
  const totalMins = productiveMins + focusedMins + unproductiveMins;
  const productivePct =
    totalMins > 0 ? Math.round((productiveMins / totalMins) * 100) : 0;
  const focusedPct =
    totalMins > 0 ? Math.round((focusedMins / totalMins) * 100) : 0;
  const unproductivePct =
    totalMins > 0 ? Math.round((unproductiveMins / totalMins) * 100) : 0;

  const tracklogHours =
    productiveMins + focusedMins > 0 ? (productiveMins + focusedMins) / 60 : 0;
  const trendHoursSum = (productivityTrends || []).reduce(
    (acc, p) => acc + (p.hours || 0),
    0,
  );

  const projects = projectsData ?? [];
  const activeProjectsList = projects.filter(
    (p) => p.status === "active" || p.status === "planning",
  );
  const totalCompletedTasks =
    taskStats?.completed ?? stats?.completedToday ?? 0;

  const rawHours = stats?.hoursThisWeek || tracklogHours || trendHoursSum || 0;
  const hoursWorked = Math.round((rawHours + Number.EPSILON) * 10) / 10;

  /**
   * EXPLICIT FOCUS PRIORITY RESOLUTION HEURISTIC
   * 1. Scheduled Today & Uncompleted Goals: Ordered by lowest streak / highest urgency.
   * 2. Fallback to first configured active goal.
   */
  const topPriorityGoal = useMemo(() => {
    if (!Array.isArray(goals) || goals.length === 0) return null;

    const todayStr = new Date().toISOString().split("T")[0];
    const uncompletedToday = goals.filter((g) => {
      const dates = Array.isArray(g.completedDates) ? g.completedDates : [];
      return !dates.includes(todayStr);
    });

    if (uncompletedToday.length > 0) {
      return [...uncompletedToday].sort(
        (a, b) => (a.streak || 0) - (b.streak || 0),
      )[0];
    }

    return goals[0];
  }, [goals]);

  // Max value calculation for productivity trend bar chart
  const trendMax = Math.max(
    ...(productivityTrends?.map((p) => p.hours) ?? [1]),
    1,
  );

  // Build a date→count map from real heatmap data for the working hours grid
  const heatmapCountMap = new Map<string, number>();
  (heatmapData ?? []).forEach((d) => heatmapCountMap.set(d.date, d.count));
  const maxHeatCount = Math.max(...Array.from(heatmapCountMap.values()), 1);
  // Generate the last 72 days (reversed, newest last)
  const heatmapDays = Array.from({ length: 72 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (71 - i));
    return d.toISOString().split("T")[0];
  });

  const utils = trpc.useUtils();
  const startTimerMutation = trpc.task.startTimer.useMutation({
    onSuccess: () => {
      utils.task.getActiveTimer.invalidate();
      utils.analytics.getDashboardStats.invalidate();
      toast.success("Focus Sprint timer started! ⚡");
    },
  });
  const stopTimerMutation = trpc.task.stopTimer.useMutation({
    onSuccess: () => {
      useTimerStore.getState().clearTimer();
      utils.task.getActiveTimer.invalidate();
      utils.analytics.getDashboardStats.invalidate();
      toast.success("Focus Sprint stopped.");
    },
  });

  const isGoalTimerRunning =
    activeTimer?.goalId === topPriorityGoal?.id ||
    (activeTimer?.isRunning && activeTimer?.title === topPriorityGoal?.title);

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ──────────────────────────────────────────────
         TOP BAR: Title + Company/Personal Toggle + Time Range Pills
         ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground">
            Overview
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Solo Founder Command Center — Live Database Analytics & Tracklog
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Company / Personal Toggle Pill */}
          <div className="bg-secondary p-1 rounded-full flex items-center shadow-inner">
            <button
              onClick={() => setViewMode("company")}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200",
                viewMode === "company"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Company
            </button>
            <button
              onClick={() => setViewMode("personal")}
              className={cn(
                "px-5 py-2 rounded-full text-xs font-semibold transition-all duration-200",
                viewMode === "personal"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Personal
            </button>
          </div>

          {/* Time Range Pills */}
          <div className="bg-secondary p-1 rounded-full flex items-center shadow-inner">
            {(["3days", "week", "month"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-medium capitalize transition-all duration-200",
                  timeRange === r
                    ? "bg-primary text-primary-foreground font-semibold shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {r === "3days"
                  ? "Last 3 days"
                  : r === "week"
                    ? "Last Week"
                    : "Last Month"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
         1. WHAT DO I DO RIGHT NOW — SINGLE FOCUS HERO
         ────────────────────────────────────────────── */}
      <div className="toota-card bg-gradient-to-r from-amber-500/10 via-card to-emerald-500/10 border-amber-500/30 p-6 space-y-4 shadow-xl relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1">
                <Zap className="w-3 h-3 fill-current" /> Single Daily Focus
              </span>
              {activeTimer?.isRunning && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1">
                  ● Live Active Session (
                  {Math.floor((activeTimer.elapsedSeconds || 0) / 60)}m{" "}
                  {(activeTimer.elapsedSeconds || 0) % 60}s)
                </span>
              )}
            </div>

            <h2 className="text-2xl font-extrabold text-foreground tracking-tight flex items-center gap-2">
              {topPriorityGoal
                ? topPriorityGoal.title
                : "No active focus session scheduled"}
            </h2>

            {topPriorityGoal?.description && (
              <p className="text-xs text-muted-foreground line-clamp-1">
                {topPriorityGoal.description}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {topPriorityGoal && (
              <>
                <button
                  onClick={() => {
                    if (isGoalTimerRunning) {
                      stopTimerMutation.mutate(undefined as any);
                    } else {
                      startTimerMutation.mutate({
                        title: topPriorityGoal.title,
                      } as any);
                    }
                  }}
                  className={cn(
                    "px-5 py-2.5 rounded-xl font-extrabold text-xs font-mono flex items-center gap-2 shadow-lg transition-all hover:scale-[1.02]",
                    isGoalTimerRunning
                      ? "bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20 animate-pulse"
                      : "bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20",
                  )}
                >
                  {isGoalTimerRunning ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      Pause Sprint (
                      {Math.floor(
                        (activeTimer?.elapsedSeconds || 0) / 60,
                      )}m {(activeTimer?.elapsedSeconds || 0) % 60}s)
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      Start Focus Sprint ({topPriorityGoal.targetMinutes || 45}
                      m)
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    toggleGoalCompletion(topPriorityGoal.id);
                    toast.success(
                      `🎉 "${topPriorityGoal.title}" completed! Streak updated!`,
                    );
                  }}
                  className="px-4 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs font-mono flex items-center gap-1.5 border border-emerald-500/30 transition-all"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark Done Today
                </button>
              </>
            )}

            <div className="px-3 py-2 rounded-xl bg-secondary/80 text-muted-foreground font-mono text-[11px] flex items-center gap-1.5 border border-white/5">
              <span className="font-bold text-foreground">⌘K</span> Quick
              Commands
            </div>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
         FORGIVING WELCOME BACK BANNER
         ────────────────────────────────────────────── */}
      {showWelcomeBack && (
        <div className="toota-card bg-gradient-to-r from-emerald-500/10 via-card to-emerald-500/5 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-5 border border-emerald-500/20">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-foreground">
                Welcome Back! Zero Shame, Full Speed Ahead 🚀
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                No guilt for missed days. Here is where you left off:{" "}
                {(stats as any)?.todaysTasks ?? 0} tasks &{" "}
                {activeProjectsList.length} projects in flight.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {topPriorityGoal && (
              <button
                onClick={() => {
                  startGoalSession(topPriorityGoal);
                  toast.success(
                    `Picked up momentum on "${topPriorityGoal.title}" ⚡`,
                  );
                }}
                className="toota-pill-active shrink-0 text-xs px-4 py-2 bg-emerald-500 text-black hover:bg-emerald-400 font-bold"
              >
                Pick Up Where You Left Off 🚀
              </button>
            )}
            <button
              onClick={() => setShowWelcomeBack(false)}
              className="text-xs text-muted-foreground hover:text-foreground px-2"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* ──────────────────────────────────────────────
         HERO SECTION: Live Performance Trends + Active Projects
         ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Hero Card: Real Productivity Trends Over Time */}
        <div className="lg:col-span-2 toota-card space-y-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Work Performance Summary
              </p>
              <h2 className="text-4xl font-extrabold text-foreground mt-1 tracking-tight">
                {taskStats?.created
                  ? `${taskStats.completed}/${taskStats.created}`
                  : totalCompletedTasks}{" "}
                Tasks
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Completed vs Created (
                {timeRange === "month" ? "This Month" : "This Week"})
              </p>
            </div>
            <span className="bg-emerald-500/15 text-emerald-500 text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1">
              {taskStats?.completionRate ?? 100}% Completion Rate
            </span>
          </div>

          {/* Time Tracking Gradient Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs font-semibold text-foreground">
              <span>Time tracking ({timeRange})</span>
              <span className="font-mono">{hoursWorked}h total</span>
            </div>
            <div className="h-5 w-full bg-secondary rounded-full overflow-hidden p-1">
              <div
                className="h-full toota-gradient-bar rounded-full transition-all duration-500 relative"
                style={{ width: `${Math.min((hoursWorked / 40) * 100, 100)}%` }}
              >
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-black/60 rounded-full" />
              </div>
            </div>
          </div>

          {/* Trends Over Time Bar Chart Visualization */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="text-base font-bold text-foreground">
                Productivity Trends (Hours / Day)
              </span>
              <div className="flex items-center gap-3 font-mono text-[11px]">
                <span className="text-emerald-400">● Live DB Activity</span>
              </div>
            </div>

            {/* Vertical Bar Grid Chart */}
            <div className="h-28 flex items-end justify-between gap-1.5 pt-4 px-2">
              {productivityTrends && productivityTrends.length > 0 ? (
                productivityTrends.map((pt, i) => {
                  const heightPercent = Math.max(
                    (pt.hours / trendMax) * 100,
                    8,
                  );
                  return (
                    <div
                      key={i}
                      className="flex-1 flex flex-col justify-end h-full group relative"
                    >
                      <div
                        className="w-full rounded-t-sm bg-gradient-to-t from-emerald-500 to-teal-400 transition-all duration-300 hover:opacity-80"
                        style={{ height: `${heightPercent}%` }}
                      />
                      <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black text-white text-[10px] p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20 shadow-xl border border-secondary font-mono">
                        <p className="font-bold">{pt.date}</p>
                        <p className="text-emerald-400">
                          {pt.hours} hours logged
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                  No productivity trend data recorded for this timeframe yet.
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Hero Card: Active Projects from Database */}
        <div className="toota-card space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">
              Active Projects
            </h3>
            <Link
              href="/projects"
              className="text-xs text-emerald-500 font-medium hover:underline flex items-center gap-0.5"
            >
              View All <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projectsLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 w-full rounded-2xl" />
              ))}
            </div>
          ) : activeProjectsList.length === 0 ? (
            <div className="py-8 text-center space-y-2">
              <FolderKanban className="w-8 h-8 text-muted-foreground opacity-40 mx-auto" />
              <p className="text-xs text-muted-foreground">
                No active projects created yet.
              </p>
              <Link href="/projects">
                <button className="toota-pill-active text-xs py-2 px-4 mt-2 inline-flex items-center gap-1">
                  <Plus className="w-3.5 h-3.5" /> Create Project
                </button>
              </Link>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[300px] overflow-y-auto custom-scrollbar">
              {activeProjectsList.slice(0, 5).map((project: any) => {
                const taskCount =
                  project._count?.tasks ??
                  project.totalTasks ??
                  project.tasks?.length ??
                  0;
                const completionPct = project.completionPercentage ?? 0;

                return (
                  <Link
                    key={project.id}
                    href={`/projects/${project.id}`}
                    className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/80 transition-all"
                  >
                    <div className="space-y-1 min-w-0 flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor: project.color || "#10b981",
                          }}
                        />
                        <p className="text-xs font-bold text-foreground truncate">
                          {project.name}
                        </p>
                      </div>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {project.client?.name
                          ? `Client: ${project.client.name} • ${taskCount} tasks`
                          : `${taskCount} tasks`}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-mono font-bold text-emerald-500">
                        {completionPct}%
                      </span>
                      <div className="w-16 h-1.5 bg-secondary rounded-full overflow-hidden mt-1">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all"
                          style={{ width: `${completionPct}%` }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="pt-2 border-t border-secondary/50 flex justify-between text-xs text-muted-foreground font-mono">
            <span>{projects.length} total projects</span>
            <span>{activeProjectsList.length} active</span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
         METRICS ROW: 4 Toota Cards — Real Data
         ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Tasks Completed */}
        <div className="toota-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Tasks Completed
            </span>
            <span className="w-6 h-6 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs">
              ✓
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">
              {totalCompletedTasks}
            </span>
            <span className="bg-emerald-500/15 text-emerald-500 text-xs font-bold px-2.5 py-1 rounded-full">
              Live DB
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            {stats?.todaysTasks ?? 0} tasks due today
          </p>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all"
              style={{
                width: `${taskStats?.created ? Math.min(Math.round((totalCompletedTasks / taskStats.created) * 100), 100) : 0}%`,
              }}
            />
          </div>
        </div>

        {/* Metric 2: Time Tracked */}
        <div className="toota-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Time Tracked Week
            </span>
            <span className="w-6 h-6 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center font-bold text-xs">
              ⚡
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">
              {hoursWorked}h
            </span>
            <span className="bg-emerald-500/15 text-emerald-500 text-xs font-bold px-2.5 py-1 rounded-full">
              Active
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            Target: 40h / week
          </p>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full"
              style={{ width: `${Math.min((hoursWorked / 40) * 100, 100)}%` }}
            />
          </div>
        </div>

        {/* Metric 3: Revenue / Pipeline */}
        <div
          onClick={() => setShowClosedDealsModal(true)}
          className="toota-card p-5 space-y-3 cursor-pointer hover:border-emerald-500/50 transition-all group relative shadow-md"
          title="Click to inspect closed deals & client worth breakdown"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground group-hover:text-emerald-400 transition-colors">
              Revenue Overview
            </span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowClosedDealsModal(true);
              }}
              className="flex items-center gap-1.5 text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30 transition-all"
            >
              <Eye className="w-3 h-3 text-emerald-400" />
              Deals ({revenueData?.closedDeals ?? 0}) 🔍
            </button>
          </div>
          <div className="flex items-baseline justify-between pt-1">
            <div>
              <p className="text-[10px] text-muted-foreground font-mono">
                Closed Client Worth
              </p>
              <span className="text-3xl font-extrabold text-foreground">
                R{(revenueData?.clientRevenue ?? 0).toLocaleString()}
              </span>
            </div>
            {/* <span className="bg-emerald-500/10 text-emerald-400 text-xs font-mono font-bold px-2.5 py-1 rounded-lg border border-emerald-500/20">
              {revenueData?.closedDeals ?? 0} Closed Deals
            </span> */}
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs font-mono">
            <div>
              <p className="text-[10px] text-muted-foreground">Pipeline</p>
              <p className="font-extrabold text-amber-400">
                R{(revenueData?.pipelineValue ?? 0).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Lead Est.</p>
              <p className="font-extrabold text-indigo-400">
                R{(revenueData?.leadEst ?? 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between pt-1.5 text-[10px] font-mono text-emerald-400/80 group-hover:text-emerald-400 transition-colors">
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3 text-emerald-400" /> Click to view clients
              & deals breakdown
            </span>
            <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 4: Goal Streak */}
        <div className="toota-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Goal Streak
            </span>
            <span className="w-6 h-6 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center font-bold text-xs">
              🔥
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-3xl font-extrabold text-foreground">
              {currentStreak} Days
            </span>
            <span className="bg-amber-500/15 text-amber-500 text-xs font-bold px-2.5 py-1 rounded-full">
              Streak
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono">
            {streakData?.totalDaysTracked ?? 0} total days recorded
          </p>
          <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-amber-400 rounded-full transition-all"
              style={{
                width: `${streakData?.longestStreak ? Math.min(Math.round((currentStreak / streakData.longestStreak) * 100), 100) : currentStreak > 0 ? 100 : 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
         TRACKLOG WIDGETS SECTION — Live Go Backend Data
         ────────────────────────────────────────────── */}
      <div className="space-y-6 pt-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Activity className="w-5 h-5 text-emerald-500" />
            Activity & Tracklog Engine
          </h2>
          <Link
            href="/tracklog"
            className="text-xs font-semibold text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Open Full Tracklog <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        {/* 3-Column Grid for Working Hours, Time Breakdown, Apps Used */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Working Hours Heatmap Grid */}
          <div className="toota-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Working Hours
              </h3>
              <span className="text-xs font-mono text-emerald-500 font-semibold">
                {tracklogLoading ? "—" : tracklog?.working_hours_total} Total
              </span>
            </div>

            <div className="grid grid-cols-12 gap-1.5 py-2">
              {heatmapDays.map((day) => {
                const count = heatmapCountMap.get(day) ?? 0;
                const ratio = count / maxHeatCount;
                return (
                  <div
                    key={day}
                    title={`${day}: ${count} tasks`}
                    className={cn(
                      "aspect-square rounded-sm transition-all hover:scale-125 cursor-default",
                      count === 0 && "bg-secondary",
                      count > 0 && ratio < 0.33 && "bg-emerald-400/40",
                      count > 0 &&
                        ratio >= 0.33 &&
                        ratio < 0.66 &&
                        "bg-emerald-400/70",
                      count > 0 && ratio >= 0.66 && "bg-emerald-500",
                    )}
                  />
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-secondary/50">
              <div>
                <p className="text-xs font-bold text-foreground">
                  Target: {tracklog?.target_hours ?? 8} hrs
                </p>
                <p className="text-[10px] text-muted-foreground">
                  Range: 08:00 AM - 06:15 PM
                </p>
              </div>
              <button
                onClick={() => setIsTracking(!isTracking)}
                className={cn(
                  "toota-pill-active flex items-center gap-2 text-xs",
                  isTracking
                    ? "bg-emerald-500 text-white"
                    : "bg-primary text-primary-foreground",
                )}
              >
                {isTracking ? (
                  <Pause className="w-3 h-3" />
                ) : (
                  <Play className="w-3 h-3" />
                )}
                <span>{isTracking ? "Active" : "Start"}</span>
              </button>
            </div>
          </div>

          {/* Time Breakdown Ring Gauges */}
          <div className="toota-card space-y-4">
            <h3 className="text-sm font-bold text-foreground">
              Time Breakdown
            </h3>
            <div className="space-y-3 pt-1">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border-4 border-blue-500 flex items-center justify-center shrink-0">
                  <Laptop className="w-4 h-4 text-blue-500" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Productive
                    </span>
                    <span className="font-mono font-bold">
                      {tracklog?.productive_hours ?? "—"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${productivePct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border-4 border-emerald-500 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-emerald-500" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Focused
                    </span>
                    <span className="font-mono font-bold">
                      {tracklog?.focused_hours ?? "—"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-all"
                      style={{ width: `${focusedPct}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full border-4 border-amber-400 flex items-center justify-center shrink-0">
                  <Coffee className="w-4 h-4 text-amber-400" />
                </div>
                <div className="flex-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-foreground">
                      Unproductive
                    </span>
                    <span className="font-mono font-bold">
                      {tracklog?.unproductive_time ?? "—"}
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-secondary rounded-full mt-1 overflow-hidden">
                    <div
                      className="h-full bg-amber-400 rounded-full transition-all"
                      style={{ width: `${unproductivePct}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Apps Used Breakdown — Live from Go Backend */}
          <div className="toota-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Desktop Apps Tracked
              </h3>
              <span className="text-xs font-mono text-muted-foreground">
                Go Engine
              </span>
            </div>
            <div className="space-y-3">
              {tracklogLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-6 w-full rounded-xl" />
                  ))}
                </div>
              ) : !tracklog?.apps || tracklog.apps.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No app activity recorded yet.
                </p>
              ) : (
                tracklog.apps.map((app, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground truncate max-w-[150px]">
                        {app.name}
                      </span>
                      <span className="font-mono text-muted-foreground">
                        {app.duration}
                      </span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-300",
                          app.color,
                        )}
                        style={{ width: `${app.percent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Break Timer & Active Feed Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Break Timer Widget */}
          <div className="toota-card space-y-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <Coffee className="w-4 h-4 text-amber-500" />
                Break Timer
              </h3>
              <span className="text-xs font-mono text-muted-foreground">
                5-min rest
              </span>
            </div>

            <div className="flex items-center justify-around py-3">
              <div
                className={cn(
                  "w-20 h-20 rounded-full border-4 flex items-center justify-center shadow-lg transition-colors",
                  breakTimerActive ? "border-emerald-500" : "border-amber-400",
                )}
              >
                <span className="text-lg font-extrabold font-mono text-foreground">
                  {formatBreakTime(breakSeconds)}
                </span>
              </div>
              <div className="space-y-1 text-xs">
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <p className="font-bold text-foreground font-mono">
                    {breakTimerActive ? "In Progress" : "Ready"}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Audio Alerts</p>
                  <span className="bg-emerald-500/15 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    ENABLED
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setBreakTimerActive(!breakTimerActive);
                  if (!breakTimerActive) setBreakSeconds(0);
                }}
                className="toota-pill-active flex-1 py-2 text-xs text-center"
              >
                {breakTimerActive ? "Pause Break" : "Start Break"}
              </button>
            </div>
          </div>

          {/* Live Activity Window Log (2/3 width) */}
          <div className="md:col-span-2 toota-card space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground">
                Active Window Feed
              </h3>
              <span className="text-xs font-mono text-muted-foreground">
                Electron PowerMonitor
              </span>
            </div>
            <div className="space-y-2 max-h-[320px] overflow-y-auto custom-scrollbar pr-1">
              {tracklogLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-10 w-full rounded-2xl" />
                  ))}
                </div>
              ) : !tracklog?.events || tracklog.events.length === 0 ? (
                <p className="text-xs text-muted-foreground py-4 text-center">
                  No window events recorded.
                </p>
              ) : (
                tracklog.events.map((evt, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2.5 rounded-2xl bg-secondary/40 hover:bg-secondary transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-xs font-mono text-muted-foreground shrink-0">
                        {evt.time}
                      </span>
                      <span className="text-xs font-bold text-foreground shrink-0 w-24 truncate">
                        {evt.app}
                      </span>
                      <span className="text-xs text-muted-foreground truncate">
                        {evt.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-mono font-semibold">
                        {evt.duration}
                      </span>
                      <span className="bg-emerald-500/15 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {evt.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CLOSED DEALS & CLIENT WORTH DRILL-DOWN MODAL */}
      {showClosedDealsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
          <div className="relative w-full max-w-xl bg-[#0a0c10] border border-[#2f3e46] rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#2f3e46] shrink-0">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-2xl bg-emerald-500/10 text-emerald-400">
                  <DollarSign className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-foreground">
                    Closed Deals & Client Worth Breakdown
                  </h3>
                  <p className="text-xs text-muted-foreground font-mono">
                    Total Revenue: R
                    {(revenueData?.clientRevenue ?? 0).toLocaleString()} •{" "}
                    {closedDealsList?.length ?? 0} Closed Clients/Deals
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowClosedDealsModal(false)}
                className="p-2 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 space-y-3 custom-scrollbar pr-1">
              {closedDealsList && closedDealsList.length > 0 ? (
                closedDealsList.map((deal: any, idx: number) => (
                  <div
                    key={deal.id || idx}
                    className="p-4 rounded-2xl bg-secondary/30 border border-secondary/60 flex items-center justify-between gap-4 hover:border-emerald-500/40 transition-all"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground truncate">
                          {deal.name}
                        </p>
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                          {deal.status || "WON"}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {deal.company} {deal.email ? `• ${deal.email}` : ""}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-extrabold font-mono text-emerald-400">
                        +R{(deal.valueZar || 0).toLocaleString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {deal.closedAt
                          ? new Date(deal.closedAt).toLocaleDateString()
                          : "Closed"}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  No closed deals recorded yet.
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-[#2f3e46] flex items-center justify-between text-xs text-muted-foreground font-mono shrink-0">
              <span>Automated Lead-to-Client Sync</span>
              <Link
                href="/crm"
                className="text-emerald-400 hover:underline font-bold"
                onClick={() => setShowClosedDealsModal(false)}
              >
                Manage Leads & Pipeline in CRM →
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
