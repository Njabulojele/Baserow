"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  Clock,
  FolderKanban,
  Timer,
  Target,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Users,
  Briefcase,
  ArrowRight,
  Activity,
  Zap,
  Flame,
  BarChart3,
  Sparkles,
  ChevronRight,
  Search,
  FileText,
  LayoutGrid,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TaskList } from "@/components/tasks/TaskList";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";

interface DashboardClientProps {
  initialData: {
    stats: any;
    todaysTasks: any[];
    activeTimer: any;
  };
}

/* ──────────────────────────────────────────────
   METRICS ROW — Compact stat cards
   ────────────────────────────────────────────── */
function MetricPill({
  label,
  value,
  accent = "text-[#a9927d]",
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | number;
  accent?: string;
  icon: React.ElementType;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a252f] border border-[#2f3e46]">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <div className="flex-1">
          <Skeleton className="h-3 w-16 mb-1.5" />
          <Skeleton className="h-5 w-10" />
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-center gap-3 px-4 py-3 rounded-xl bg-[#1a252f] border border-[#2f3e46] hover:border-[#a9927d]/30 transition-all duration-300 cursor-default">
      <div className="p-2 rounded-lg bg-[#0a0c10] border border-[#2f3e46] group-hover:border-[#a9927d]/20 transition-colors">
        <Icon className={`h-4 w-4 ${accent}`} />
      </div>
      <div>
        <p className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500">
          {label}
        </p>
        <p className="text-lg font-light text-white leading-none mt-0.5">
          {value}
        </p>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   ACTIVE TIMER — Full-width banner
   ────────────────────────────────────────────── */
function ActiveTimerBanner({ initialTimer }: { initialTimer: any }) {
  const { data: activeTimer } = trpc.task.getActiveTimer.useQuery(undefined, {
    initialData: initialTimer,
    refetchInterval: 10000,
  });
  const utils = trpc.useUtils();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer?.currentTimerStart) {
      setElapsed(0);
      return;
    }
    const calc = () =>
      Math.floor(
        (Date.now() - new Date(activeTimer.currentTimerStart!).getTime()) /
          1000,
      );
    setElapsed(calc());
    const interval = setInterval(() => setElapsed(calc()), 1000);
    return () => clearInterval(interval);
  }, [activeTimer?.currentTimerStart]);

  const stopTimer = trpc.task.stopTimer.useMutation({
    onMutate: async () => {
      await utils.task.getActiveTimer.cancel();
      const previous = utils.task.getActiveTimer.getData();
      utils.task.getActiveTimer.setData(undefined, null);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      utils.task.getActiveTimer.setData(undefined, context?.previous);
    },
    onSettled: () => {
      utils.task.getActiveTimer.invalidate();
      utils.analytics.getDashboardStats.invalidate();
    },
  });

  if (!activeTimer) return null;

  const mins = Math.floor(elapsed / 60);
  const secs = elapsed % 60;

  return (
    <div className="relative overflow-hidden rounded-xl border border-[#a9927d]/30 bg-gradient-to-r from-[#a9927d]/5 via-[#1a252f] to-[#a9927d]/5 p-4 mb-6 shadow-xl">
      <div className="absolute inset-0 bg-[#a9927d]/3 animate-pulse" />
      <div className="relative flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="p-3 bg-[#a9927d]/10 rounded-full border border-[#a9927d]/20">
              <Timer className="h-6 w-6 text-[#a9927d] animate-pulse" />
            </div>
            <div className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-[#a9927d] animate-ping" />
          </div>
          <div>
            <h3 className="font-medium text-white text-base">
              {activeTimer.title}
            </h3>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-400">
                {activeTimer.project?.name || "No project"}
              </span>
              <span className="text-[#a9927d] font-mono text-sm font-medium tabular-nums">
                {mins}:{secs.toString().padStart(2, "0")}
              </span>
            </div>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-[#a9927d] hover:bg-[#d4c4b7] text-[#0a0c10] font-mono tracking-widest uppercase text-[10px] h-9 px-6"
          onClick={() => stopTimer.mutate({ id: activeTimer.id })}
          disabled={stopTimer.isPending}
        >
          Stop Timer
        </Button>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────
   REVENUE CARD — Consistent height
   ────────────────────────────────────────────── */
function RevenueCard() {
  const { data, isLoading } = trpc.analytics.getRevenueOverview.useQuery();

  const formatZAR = (amount: number) =>
    `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;

  return (
    <Card className="h-[220px] flex flex-col border-[#2f3e46] bg-[#1a252f] shadow-xl overflow-hidden">
      <CardHeader className="pb-2 px-5 pt-5 shrink-0">
        <CardTitle className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-500/80 flex items-center gap-2">
          <DollarSign className="h-3.5 w-3.5" />
          Revenue Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 flex-1 flex flex-col justify-between pb-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-4 w-24" />
          </div>
        ) : (
          <>
            <div>
              <p className="text-3xl font-light text-emerald-400 leading-tight">
                {formatZAR(data?.clientRevenue ?? 0)}
              </p>
              <p className="text-[10px] font-mono text-emerald-400/50 mt-1 uppercase tracking-wider">
                {data?.clientCount ?? 0} closed deals
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-3 border-t border-[#2f3e46]">
              <div>
                <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-0.5">
                  Pipeline
                </p>
                <p className="text-base font-light text-amber-400">
                  {formatZAR(data?.pipelineValue ?? 0)}
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-widest text-gray-500 mb-0.5">
                  Lead Est.
                </p>
                <p className="text-base font-light text-blue-400">
                  {formatZAR(data?.leadEstimatedValue ?? 0)}
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────
   TIME BREAKDOWN CARD — Consistent height
   ────────────────────────────────────────────── */
function TimeBreakdownCard() {
  const { data, isLoading } = trpc.analytics.getTimeBreakdown.useQuery();

  return (
    <Card className="h-[220px] flex flex-col border-[#2f3e46] bg-[#1a252f] shadow-xl overflow-hidden">
      <CardHeader className="pb-2 px-5 pt-5 shrink-0">
        <CardTitle className="text-[10px] font-mono uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
          <Clock className="h-3.5 w-3.5" />
          Time This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 flex-1 flex flex-col justify-between pb-5">
        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
          </div>
        ) : (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-light text-white">
                {data?.totalHours ?? 0}h
              </span>
              {(data?.billableHours ?? 0) > 0 && (
                <Badge
                  variant="outline"
                  className="text-[9px] h-5 border-emerald-500/20 bg-emerald-500/5 text-emerald-400 uppercase tracking-widest"
                >
                  {data?.billableHours}h billable
                </Badge>
              )}
            </div>
            <div className="space-y-2 pt-2">
              {data?.categories?.slice(0, 3).map((cat) => (
                <div key={cat.key} className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 rounded-full bg-[#0a0c10] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400"
                      style={{
                        width: `${Math.min((cat.hours / (data?.totalHours || 1)) * 100, 100)}%`,
                      }}
                    />
                  </div>
                  <span className="text-[9px] font-mono text-gray-400 uppercase tracking-wider w-20 text-right truncate">
                    {cat.label}
                  </span>
                  <span className="text-[10px] font-mono text-indigo-400 w-8 text-right">
                    {cat.hours}h
                  </span>
                </div>
              ))}
              {(!data?.categories || data.categories.length === 0) && (
                <p className="text-[10px] font-mono text-gray-500 italic uppercase tracking-widest">
                  No time logged yet
                </p>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────
   ATTENTION REQUIRED — Always renders
   ────────────────────────────────────────────── */
function AttentionRequired() {
  const { data, isLoading } = trpc.analytics.getInactivityAlerts.useQuery();

  return (
    <Card className="h-[220px] flex flex-col border-[#2f3e46] bg-[#1a252f] shadow-xl overflow-hidden">
      <CardHeader className="pb-2 px-5 pt-5 shrink-0">
        <CardTitle className="text-[10px] font-mono uppercase tracking-[0.2em] flex items-center gap-2 text-red-400">
          <AlertTriangle className="h-3.5 w-3.5" />
          Needs Attention
          {data && data.totalAlerts > 0 && (
            <Badge
              variant="outline"
              className="text-[9px] h-5 border-red-500/20 bg-red-500/5 text-red-400 ml-auto"
            >
              {data.totalAlerts}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-5 flex-1 overflow-y-auto pb-4 custom-scrollbar">
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !data || data.totalAlerts === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="p-3 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <p className="text-xs text-emerald-400 font-medium">
              All caught up!
            </p>
            <p className="text-[10px] text-gray-500 mt-1">
              No stale clients, leads or projects
            </p>
          </div>
        ) : (
          <div className="space-y-1.5">
            {data.staleClients.slice(0, 3).map((client) => (
              <Link
                key={client.id}
                href={`/clients/${client.id}`}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#0a0c10] transition-colors group"
              >
                <div className="p-1 bg-amber-500/10 rounded shrink-0">
                  <Briefcase className="h-3 w-3 text-amber-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate group-hover:text-[#a9927d] transition-colors">
                    {client.name}
                  </p>
                  <p className="text-[9px] text-gray-500">
                    {client.daysSince !== null
                      ? `${client.daysSince}d silent`
                      : "Never contacted"}
                  </p>
                </div>
              </Link>
            ))}
            {data.staleLeads.slice(0, 2).map((lead) => (
              <Link
                key={lead.id}
                href="/crm/leads"
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#0a0c10] transition-colors group"
              >
                <div className="p-1 bg-blue-500/10 rounded shrink-0">
                  <Users className="h-3 w-3 text-blue-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate group-hover:text-[#a9927d] transition-colors">
                    {lead.firstName} {lead.lastName}
                  </p>
                  <p className="text-[9px] text-gray-500">
                    {lead.daysSince}d ago
                  </p>
                </div>
              </Link>
            ))}
            {data.staleProjects.slice(0, 2).map((project) => (
              <Link
                key={project.id}
                href={`/projects/${project.id}`}
                className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-[#0a0c10] transition-colors group"
              >
                <div className="p-1 bg-red-500/10 rounded shrink-0">
                  <FolderKanban className="h-3 w-3 text-red-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate group-hover:text-[#a9927d] transition-colors">
                    {project.name}
                  </p>
                  <p className="text-[9px] text-gray-500">
                    {project.daysSince}d idle ·{" "}
                    {Math.round(project.completionPercentage)}%
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ──────────────────────────────────────────────
   SHORTCUT CARDS — Visual quick actions
   ────────────────────────────────────────────── */
const shortcuts = [
  {
    label: "Tasks",
    href: "/tasks",
    icon: CheckCircle,
    accent: "text-emerald-400",
    glow: "group-hover:shadow-emerald-500/10",
  },
  {
    label: "Projects",
    href: "/projects",
    icon: FolderKanban,
    accent: "text-blue-400",
    glow: "group-hover:shadow-blue-500/10",
  },
  {
    label: "Day Plan",
    href: "/planning/day",
    icon: Calendar,
    accent: "text-amber-400",
    glow: "group-hover:shadow-amber-500/10",
  },
  {
    label: "CRM",
    href: "/crm",
    icon: Users,
    accent: "text-purple-400",
    glow: "group-hover:shadow-purple-500/10",
  },
  {
    label: "Research",
    href: "/research",
    icon: Search,
    accent: "text-cyan-400",
    glow: "group-hover:shadow-cyan-500/10",
  },
  {
    label: "Strategy",
    href: "/strategy",
    icon: Target,
    accent: "text-rose-400",
    glow: "group-hover:shadow-rose-500/10",
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: LayoutGrid,
    accent: "text-indigo-400",
    glow: "group-hover:shadow-indigo-500/10",
  },
  {
    label: "Canvas",
    href: "/canvas",
    icon: FileText,
    accent: "text-orange-400",
    glow: "group-hover:shadow-orange-500/10",
  },
];

/* ──────────────────────────────────────────────
   MAIN DASHBOARD
   ────────────────────────────────────────────── */
export function DashboardClient({ initialData }: DashboardClientProps) {
  const { data: stats } = trpc.analytics.getDashboardStats.useQuery(undefined, {
    initialData: initialData.stats,
  });
  const { data: todaysTasks } = trpc.task.getTodaysTasks.useQuery(undefined, {
    initialData: initialData.todaysTasks,
  });
  const { data: energyStats } = trpc.wellbeing.getEnergyStats.useQuery({
    days: 7,
  });

  const energyValue = energyStats?.avgEnergy
    ? `${energyStats.avgEnergy}/10`
    : "—";

  const completedToday = stats?.completedToday ?? 0;
  const totalToday = stats?.todaysTasks ?? 0;
  const focusScore =
    totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-transparent min-h-screen">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
              Dashboard
            </h1>
            <p className="text-[10px] font-mono text-[#a9927d] uppercase tracking-[0.2em] mt-1">
              {new Date().toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a252f] border border-[#2f3e46]">
              <Flame className="h-3.5 w-3.5 text-[#a9927d]" />
              <span className="text-[10px] font-mono text-white uppercase tracking-wider">
                Focus {focusScore}%
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#1a252f] border border-[#2f3e46]">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[10px] font-mono text-white uppercase tracking-wider">
                Energy {energyValue}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Active Timer */}
      <ActiveTimerBanner initialTimer={initialData.activeTimer} />

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <MetricPill
          label="Tasks Due"
          value={stats?.todaysTasks ?? 0}
          icon={CheckCircle}
          accent="text-emerald-400"
        />
        <MetricPill
          label="Completed"
          value={stats?.completedToday ?? 0}
          icon={TrendingUp}
          accent="text-[#a9927d]"
        />
        <MetricPill
          label="Projects"
          value={stats?.activeProjects ?? 0}
          icon={FolderKanban}
          accent="text-blue-400"
        />
        <MetricPill
          label="Focus Hours"
          value={`${stats?.hoursThisWeek ?? 0}h`}
          icon={Clock}
          accent="text-indigo-400"
        />
      </div>

      {/* Main Content: 3-column on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <RevenueCard />
        <TimeBreakdownCard />
        <AttentionRequired />
      </div>

      {/* Today's Tasks */}
      <Card className="border-[#2f3e46] bg-[#1a252f] shadow-xl mb-6 overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-5 pb-3 border-b border-[#2f3e46]/50">
          <CardTitle className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#a9927d] flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" />
            Today&apos;s Tasks
          </CardTitle>
          <Link href="/tasks">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[9px] uppercase font-mono tracking-widest text-gray-500 hover:text-white hover:bg-[#2f3e46] gap-1"
            >
              All
              <ChevronRight className="h-3 w-3" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-5 pt-3">
          <TaskList
            tasks={todaysTasks}
            emptyMessage="No tasks scheduled for today"
          />
        </CardContent>
      </Card>

      {/* Quick Actions Grid */}
      <div className="mb-2">
        <h2 className="text-[10px] font-mono uppercase tracking-[0.2em] text-gray-500 mb-3 px-1">
          Quick Access
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
          {shortcuts.map((s) => (
            <Link key={s.href} href={s.href}>
              <div
                className={`group flex flex-col items-center justify-center gap-2 p-4 rounded-xl bg-[#1a252f] border border-[#2f3e46] hover:border-[#a9927d]/30 transition-all duration-300 shadow-lg ${s.glow} cursor-pointer`}
              >
                <s.icon className={`h-5 w-5 ${s.accent}`} />
                <span className="text-[9px] font-mono uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors">
                  {s.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
