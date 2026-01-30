"use client";

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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
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

  const elapsed = activeTimer.currentTimerStart
    ? Math.floor(
        (Date.now() - new Date(activeTimer.currentTimerStart).getTime()) /
          60000,
      )
    : 0;

  return (
    <Card className="border-primary/50 bg-primary/5 mb-6">
      <CardContent className="p-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="relative">
            <Timer className="h-8 w-8 text-primary animate-pulse" />
          </div>
          <div>
            <h3 className="font-semibold">{activeTimer.title}</h3>
            <p className="text-sm text-muted-foreground">
              {activeTimer.project?.name || "No project"} • {elapsed}m elapsed
            </p>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
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
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white-smoke">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1 text-white-smoke/60">
          Your productivity at a glance
        </p>
      </div>

      {/* Active Timer */}
      <ActiveTimerWidget initialTimer={initialData.activeTimer} />

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard
          title="Tasks Due Today"
          value={stats?.todaysTasks ?? 0}
          subtitle={`${stats?.completedToday ?? 0} completed`}
          icon={CheckCircle}
        />
        <StatsCard
          title="Active Projects"
          value={stats?.activeProjects ?? 0}
          subtitle="In progress"
          icon={FolderKanban}
        />
        <StatsCard
          title="Hours This Week"
          value={`${stats?.hoursThisWeek ?? 0}h`}
          subtitle="Time tracked"
          icon={Clock}
        />
        <StatsCard
          title="Energy Level"
          value={energyValue}
          subtitle={energySubtitle}
          icon={Play}
        />
      </div>

      {/* Today's Tasks */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Today&apos;s Tasks</CardTitle>
            <Link href="/tasks">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={todaysTasks}
              emptyMessage="No tasks scheduled for today"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Link href="/tasks">
              <Button variant="outline" className="w-full justify-start">
                <CheckCircle className="h-4 w-4 mr-2" />
                View All Tasks
              </Button>
            </Link>
            <Link href="/projects">
              <Button variant="outline" className="w-full justify-start">
                <FolderKanban className="h-4 w-4 mr-2" />
                Manage Projects
              </Button>
            </Link>
            <Link href="/planning/day">
              <Button variant="outline" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Plan Your Day
              </Button>
            </Link>
            <Link href="/planning/review">
              <Button variant="outline" className="w-full justify-start">
                <Target className="h-4 w-4 mr-2" />
                Complete Daily Review
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
