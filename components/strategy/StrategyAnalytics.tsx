"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Target,
  Trophy,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Helper to determine if goal is on-track based on time elapsed vs progress
function getGoalStatus(progress: number): {
  status: "ahead" | "on_track" | "behind";
  label: string;
  icon: React.ElementType;
  color: string;
} {
  // For now, using simple thresholds. In production, we'd compare against time elapsed in quarter/year.
  const currentMonth = new Date().getMonth();
  const monthProgress = ((currentMonth + 1) / 12) * 100; // Expected progress based on time

  if (progress >= monthProgress + 10) {
    return {
      status: "ahead",
      label: "Ahead",
      icon: TrendingUp,
      color: "text-green-500 bg-green-500/10",
    };
  } else if (progress >= monthProgress - 15) {
    return {
      status: "on_track",
      label: "On Track",
      icon: Minus,
      color: "text-blue-500 bg-blue-500/10",
    };
  } else {
    return {
      status: "behind",
      label: "Behind",
      icon: TrendingDown,
      color: "text-red-500 bg-red-500/10",
    };
  }
}

export function StrategyAnalytics() {
  const { data, isLoading } = trpc.analytics.getGoalProgressStats.useQuery();
  const { data: weeklyInsights } = trpc.analytics.getWeeklyInsights.useQuery();

  if (isLoading) {
    return <Skeleton className="h-[300px] w-full" />;
  }

  const AnnualView = () => (
    <div className="space-y-4 pt-4">
      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="p-3 bg-green-500/10 rounded-lg text-center">
          <p className="text-lg font-bold text-green-600">
            {weeklyInsights?.tasksCompleted || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Tasks This Week</p>
        </div>
        <div className="p-3 bg-blue-500/10 rounded-lg text-center">
          <p className="text-lg font-bold text-blue-600">
            {weeklyInsights?.focusHours || 0}h
          </p>
          <p className="text-[10px] text-muted-foreground">Focus Hours</p>
        </div>
        <div className="p-3 bg-purple-500/10 rounded-lg text-center">
          <p className="text-lg font-bold text-purple-600">
            {weeklyInsights?.productivityScore || 0}
          </p>
          <p className="text-[10px] text-muted-foreground">Productivity</p>
        </div>
      </div>

      {data?.annualGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-lg">
          <Trophy className="h-8 w-8 mb-2 opacity-50" />
          <p>No active annual goals found.</p>
        </div>
      ) : (
        data?.annualGoals.map((goal, idx) => {
          const status = getGoalStatus(goal.progress);
          const StatusIcon = status.icon;
          return (
            <div
              key={idx}
              className="space-y-2 p-3 rounded-lg border bg-card/50"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium truncate">{goal.title}</span>
                  <Badge
                    variant="outline"
                    className="text-[10px] h-5 px-1.5 shrink-0"
                  >
                    {goal.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    className={cn("text-[10px] h-5 px-1.5 gap-1", status.color)}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                  <span className="font-mono text-xs font-medium">
                    {goal.progress}%
                  </span>
                </div>
              </div>
              <Progress value={goal.progress} className="h-2" />
            </div>
          );
        })
      )}
    </div>
  );

  const QuarterlyView = () => (
    <div className="space-y-4 pt-4">
      {data?.quarterFocuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-muted-foreground border border-dashed rounded-lg">
          <Target className="h-8 w-8 mb-2 opacity-50" />
          <p>No quarterly focuses linked yet.</p>
        </div>
      ) : (
        data?.quarterFocuses.map((focus, idx) => {
          const status = getGoalStatus(focus.progress);
          const StatusIcon = status.icon;
          return (
            <div
              key={idx}
              className="space-y-2 p-3 rounded-lg border bg-card/50"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-medium truncate">{focus.title}</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px] h-5 px-1.5 shrink-0"
                  >
                    {focus.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge
                    className={cn("text-[10px] h-5 px-1.5 gap-1", status.color)}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {focus.progress}%
                  </span>
                </div>
              </div>
              <Progress value={focus.progress} className="h-2" />
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <Card className="col-span-full border-border/60 min-w-0 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          Goal Alignment
        </CardTitle>
        <CardDescription>
          Tracking against big picture objectives
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="quarter" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quarter">This Quarter</TabsTrigger>
            <TabsTrigger value="annual">Annual Goals</TabsTrigger>
          </TabsList>
          <TabsContent value="quarter">
            <QuarterlyView />
          </TabsContent>
          <TabsContent value="annual">
            <AnnualView />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
