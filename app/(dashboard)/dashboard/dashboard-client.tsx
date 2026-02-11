"use client";

import { useState, useEffect } from "react";
import {
  CheckCircle,
  Clock,
  FolderKanban,
  Play,
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
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TaskList } from "@/components/tasks/TaskList";
import { trpc } from "@/lib/trpc/client";
import { UrgencyDashboard } from "@/components/dashboard/UrgencyDashboard";
import { SmartInsight } from "@/components/dashboard/SmartInsight";
import { StrategyAnalytics } from "@/components/strategy/StrategyAnalytics";
import { formatDistanceToNow } from "date-fns";

interface DashboardClientProps {
  initialData: {
    stats: any;
    todaysTasks: any[];
    activeTimer: any;
  };
}

function StatsCard({
  title,
  value,
  subtitle,
  icon: Icon,
  loading,
  accent,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  loading?: boolean;
  accent?: string;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-16 mb-1" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-w-0 overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
        <CardTitle className="text-sm font-medium truncate mr-2">
          {title}
        </CardTitle>
        <Icon
          className={`h-4 w-4 shrink-0 ${accent || "text-muted-foreground"}`}
        />
      </CardHeader>
      <CardContent className="px-3 sm:px-6">
        <div className="text-xl sm:text-2xl font-bold truncate">{value}</div>
        {subtitle && (
          <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
            {subtitle}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ActiveTimerWidget({ initialTimer }: { initialTimer: any }) {
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

    const calculateElapsed = () => {
      const start = new Date(activeTimer.currentTimerStart!).getTime();
      return Math.floor((Date.now() - start) / 60000);
    };

    setElapsed(calculateElapsed());

    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer?.currentTimerStart]);

  const stopTimer = trpc.task.stopTimer.useMutation({
    onMutate: async () => {
      await utils.task.getActiveTimer.cancel();
      const previous = utils.task.getActiveTimer.getData();
      utils.task.getActiveTimer.setData(undefined, null);
      return { previous };
    },
    onError: (err, variables, context) => {
      utils.task.getActiveTimer.setData(undefined, context?.previous);
    },
    onSettled: () => {
      utils.task.getActiveTimer.invalidate();
      utils.analytics.getDashboardStats.invalidate();
    },
  });

  if (!activeTimer) return null;

  return (
    <Card className="border-primary/50 bg-primary/5 mb-6">
      <CardContent className="p-4 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <div className="relative">
            <div className="p-3 bg-primary/10 rounded-full">
              <Timer className="h-6 w-6 sm:h-8 sm:w-8 text-primary animate-pulse" />
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-base sm:text-lg">
              {activeTimer.title}
            </h3>
            <p className="text-xs sm:text-sm text-muted-foreground">
              {activeTimer.project?.name || "No project"} •{" "}
              <span className="font-medium text-primary">{elapsed}m</span>{" "}
              elapsed
            </p>
          </div>
        </div>
        <Button
          variant="secondary"
          size="sm"
          className="w-full sm:w-auto font-medium"
          onClick={() => stopTimer.mutate({ id: activeTimer.id })}
          disabled={stopTimer.isPending}
        >
          Stop Timer
        </Button>
      </CardContent>
    </Card>
  );
}

function RevenueCard() {
  const { data, isLoading } = trpc.analytics.getRevenueOverview.useQuery();

  if (isLoading) {
    return <Skeleton className="h-[160px] w-full rounded-xl" />;
  }

  const formatZAR = (amount: number) =>
    `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;

  return (
    <Card className="min-w-0 overflow-hidden border-none bg-linear-to-br from-emerald-950/40 to-card">
      <CardHeader className="pb-2 px-4 sm:px-6">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-emerald-500" />
          Revenue Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 space-y-3">
        {/* Client Revenue (Won) */}
        <div>
          <p className="text-[10px] uppercase tracking-wider text-emerald-400/80 font-semibold">
            Client Revenue
          </p>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-400">
            {formatZAR(data?.clientRevenue ?? 0)}
          </p>
          <p className="text-[10px] text-muted-foreground">
            {data?.clientCount ?? 0} closed deals
          </p>
        </div>

        <div className="h-px bg-border/50" />

        {/* Pipeline + Leads */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-amber-400/80 font-semibold">
              Pipeline
            </p>
            <p className="text-lg font-bold text-amber-400">
              {formatZAR(data?.pipelineValue ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {data?.pipelineCount ?? 0} open deals
            </p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-blue-400/80 font-semibold">
              Lead Estimates
            </p>
            <p className="text-lg font-bold text-blue-400">
              {formatZAR(data?.leadEstimatedValue ?? 0)}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {data?.leadCount ?? 0} active leads
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TimeBreakdownCard() {
  const { data, isLoading } = trpc.analytics.getTimeBreakdown.useQuery();

  if (isLoading) {
    return <Skeleton className="h-[160px] w-full rounded-xl" />;
  }

  return (
    <Card className="min-w-0 overflow-hidden border-none bg-linear-to-br from-indigo-950/40 to-card">
      <CardHeader className="pb-2 px-4 sm:px-6">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-400" />
          Time This Week
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 space-y-3">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl sm:text-3xl font-bold">
            {data?.totalHours ?? 0}h
          </span>
          <span className="text-xs text-muted-foreground">total</span>
          {(data?.billableHours ?? 0) > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-emerald-500/30 text-emerald-400"
            >
              {data?.billableHours}h billable
            </Badge>
          )}
        </div>

        {data?.categories && data.categories.length > 0 ? (
          <div className="space-y-1.5">
            {data.categories.slice(0, 4).map((cat) => (
              <div
                key={cat.key}
                className="flex items-center justify-between text-xs"
              >
                <span className="text-muted-foreground truncate mr-2">
                  {cat.label}
                </span>
                <span className="font-medium shrink-0">{cat.hours}h</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground italic">
            No time logged this week
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function InactivityAlerts() {
  const { data, isLoading } = trpc.analytics.getInactivityAlerts.useQuery();

  if (isLoading) {
    return <Skeleton className="h-[120px] w-full rounded-xl" />;
  }

  if (!data || data.totalAlerts === 0) {
    return null;
  }

  return (
    <Card className="border-warning/30 bg-warning/5 mb-6">
      <CardHeader className="pb-2 px-4 sm:px-6">
        <CardTitle className="text-sm font-medium flex items-center gap-2 text-warning">
          <AlertTriangle className="h-4 w-4" />
          Needs Your Attention
          <Badge
            variant="outline"
            className="text-[10px] h-5 border-warning/30 text-warning ml-auto"
          >
            {data.totalAlerts} alert{data.totalAlerts !== 1 ? "s" : ""}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 space-y-2">
        {/* Stale Clients */}
        {data.staleClients.slice(0, 3).map((client) => (
          <Link
            key={client.id}
            href={`/clients/${client.id}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="p-1.5 bg-amber-500/10 rounded-full shrink-0">
              <Briefcase className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {client.name}
              </p>
              <p className="text-[10px] text-muted-foreground">
                {client.daysSince !== null
                  ? `No contact for ${client.daysSince} days`
                  : "Never contacted"}
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-amber-500/20 text-amber-500 shrink-0"
            >
              Client
            </Badge>
          </Link>
        ))}

        {/* Stale Leads */}
        {data.staleLeads.slice(0, 3).map((lead) => (
          <Link
            key={lead.id}
            href="/crm/leads"
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="p-1.5 bg-blue-500/10 rounded-full shrink-0">
              <Users className="h-3.5 w-3.5 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {lead.firstName} {lead.lastName}
                {lead.companyName ? ` · ${lead.companyName}` : ""}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Last engaged {lead.daysSince} days ago
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-blue-500/20 text-blue-500 shrink-0"
            >
              Lead
            </Badge>
          </Link>
        ))}

        {/* Stale Projects */}
        {data.staleProjects.slice(0, 2).map((project) => (
          <Link
            key={project.id}
            href={`/projects/${project.id}`}
            className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group"
          >
            <div className="p-1.5 bg-red-500/10 rounded-full shrink-0">
              <FolderKanban className="h-3.5 w-3.5 text-red-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                {project.name}
                {project.client ? ` · ${project.client.name}` : ""}
              </p>
              <p className="text-[10px] text-muted-foreground">
                No progress for {project.daysSince} days ·{" "}
                {Math.round(project.completionPercentage)}% done
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] h-5 border-red-500/20 text-red-500 shrink-0"
            >
              Project
            </Badge>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}

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

  let energySubtitle = "Stable";
  if (energyStats?.trend === "improving") energySubtitle = "Trending Up";
  if (energyStats?.trend === "declining") energySubtitle = "Trending Down";

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4 sm:p-6">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white-smoke">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 text-white-smoke/60">
          Your productivity at a glance
        </p>
      </div>

      {/* Active Timer */}
      <ActiveTimerWidget initialTimer={initialData.activeTimer} />

      {/* Inactivity Alerts */}
      <InactivityAlerts />

      {/* Revenue + Time Row */}
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 mb-6 min-w-0">
        <RevenueCard />
        <TimeBreakdownCard />
      </div>

      {/* Smart Insights & Urgency */}
      <div className="space-y-6 min-w-0 mb-6">
        <SmartInsight />
        <UrgencyDashboard />
        <StrategyAnalytics />
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6 min-w-0">
        <StatsCard
          title="Tasks Due"
          value={stats?.todaysTasks ?? 0}
          subtitle={`${stats?.completedToday ?? 0} done`}
          icon={CheckCircle}
          accent="text-emerald-500"
        />
        <StatsCard
          title="Projects"
          value={stats?.activeProjects ?? 0}
          subtitle="In progress"
          icon={FolderKanban}
          accent="text-blue-500"
        />
        <StatsCard
          title="Focus Hours"
          value={`${stats?.hoursThisWeek ?? 0}h`}
          subtitle="This week"
          icon={Clock}
          accent="text-indigo-500"
        />
        <StatsCard
          title="Energy"
          value={energyValue}
          subtitle={energySubtitle}
          icon={Play}
          accent="text-amber-500"
        />
      </div>

      {/* Today's Tasks and Quick Actions */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 lg:grid-cols-2 min-w-0">
        <Card className="flex flex-col min-w-0 overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-xl truncate">
              Today&apos;s Tasks
            </CardTitle>
            <Link href="/tasks">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs sm:text-sm"
              >
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 flex-1 overflow-hidden">
            <TaskList
              tasks={todaysTasks}
              emptyMessage="No tasks scheduled for today"
            />
          </CardContent>
        </Card>

        <Card className="flex flex-col min-w-0 overflow-hidden">
          <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
            <CardTitle className="text-xl">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 pt-0 sm:pt-0 grid gap-3 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 flex-1">
            <Link href="/tasks" className="w-full">
              <Button
                variant="outline"
                className="w-full justify-start h-11 sm:h-10 text-sm overflow-hidden"
              >
                <CheckCircle className="h-4 w-4 mr-2 text-primary shrink-0" />
                <span className="truncate">View All Tasks</span>
              </Button>
            </Link>
            <Link href="/projects" className="w-full">
              <Button
                variant="outline"
                className="w-full justify-start h-11 sm:h-10 text-sm overflow-hidden"
              >
                <FolderKanban className="h-4 w-4 mr-2 text-blue-500 shrink-0" />
                <span className="truncate">Manage Projects</span>
              </Button>
            </Link>
            <Link href="/planning/day" className="w-full">
              <Button
                variant="outline"
                className="w-full justify-start h-11 sm:h-10 text-sm overflow-hidden"
              >
                <Calendar className="h-4 w-4 mr-2 text-green-500 shrink-0" />
                <span className="truncate">Plan Your Day</span>
              </Button>
            </Link>
            <Link href="/crm" className="w-full">
              <Button
                variant="outline"
                className="w-full justify-start h-11 sm:h-10 text-sm overflow-hidden"
              >
                <Users className="h-4 w-4 mr-2 text-orange-500 shrink-0" />
                <span className="truncate">CRM Overview</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
