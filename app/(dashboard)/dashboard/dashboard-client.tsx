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
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TaskList } from "@/components/tasks/TaskList";
import { trpc } from "@/lib/trpc/client";
import { UrgencyDashboard } from "@/components/dashboard/UrgencyDashboard";
import { SmartInsight } from "@/components/dashboard/SmartInsight";
import { StrategyAnalytics } from "@/components/strategy/StrategyAnalytics";

interface DashboardStats {
  todaysTasks: number;
  completedToday: number;
  activeProjects: number;
  hoursThisWeek: number;
  activeTimer: {
    id: string;
    title: string;
    currentTimerStart: Date | null;
    project: { name: string; color: string | null } | null;
  } | null;
}

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  dueDate: Date | null;
  scheduledDate: Date | null;
  estimatedMinutes: number | null;
  actualMinutes: number;
  timerRunning: boolean;
  currentTimerStart: Date | null;
  project: { id: string; name: string; color: string | null } | null;
}

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
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  loading?: boolean;
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
        <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
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
  // Use live data but fall back to initial for instant display
  const { data: activeTimer } = trpc.task.getActiveTimer.useQuery(undefined, {
    initialData: initialTimer,
    refetchInterval: 10000, // Refresh every 10s for accurate time
  });
  const utils = trpc.useUtils();

  // Live elapsed time state that updates every second
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!activeTimer?.currentTimerStart) {
      setElapsed(0);
      return;
    }

    // Calculate initial elapsed time
    const calculateElapsed = () => {
      const start = new Date(activeTimer.currentTimerStart!).getTime();
      return Math.floor((Date.now() - start) / 60000);
    };

    setElapsed(calculateElapsed());

    // Update every second
    const interval = setInterval(() => {
      setElapsed(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [activeTimer?.currentTimerStart]);

  const stopTimer = trpc.task.stopTimer.useMutation({
    // Optimistic update
    onMutate: async ({ id }) => {
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
    <Card className="border-primary/50 bg-primary/5 mb-8">
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

export function DashboardClient({ initialData }: DashboardClientProps) {
  // Use live data but initialize with server-prefetched data
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
    <div className="w-full max-w-full overflow-x-hidden p-6">
      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white-smoke">
          Dashboard
        </h1>
        <p className="text-sm sm:text-base text-muted-foreground mt-1 text-white-smoke/60">
          Your productivity at a glance
        </p>
      </div>

      {/* Smart Insights & Urgency */}
      <div className="space-y-6 min-w-0">
        <SmartInsight />
        <UrgencyDashboard />
        <div className="mb-8">
          <StrategyAnalytics />
        </div>
      </div>

      {/* Active Timer */}
      <ActiveTimerWidget initialTimer={initialData.activeTimer} />

      {/* Stats Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8 min-w-0">
        <StatsCard
          title="Tasks Due"
          value={stats?.todaysTasks ?? 0}
          subtitle={`${stats?.completedToday ?? 0} done`}
          icon={CheckCircle}
        />
        <StatsCard
          title="Projects"
          value={stats?.activeProjects ?? 0}
          subtitle="In progress"
          icon={FolderKanban}
        />
        <StatsCard
          title="Focus Hours"
          value={`${stats?.hoursThisWeek ?? 0}h`}
          subtitle="This week"
          icon={Clock}
        />
        <StatsCard
          title="Energy"
          value={energyValue}
          subtitle={energySubtitle}
          icon={Play}
        />
      </div>

      {/* Today's Tasks and Quick Actions */}
      <div className="grid gap-6 md:grid-cols-2 min-w-0">
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
            <Link href="/planning/review" className="w-full">
              <Button
                variant="outline"
                className="w-full justify-start h-11 sm:h-10 text-sm overflow-hidden"
              >
                <Target className="h-4 w-4 mr-2 text-orange-500 shrink-0" />
                <span className="truncate">Daily Review</span>
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
