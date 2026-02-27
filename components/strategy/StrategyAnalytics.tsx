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
import Link from "next/link";

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
      color: "text-emerald-400 bg-[#0a0c10] border border-emerald-500/20",
    };
  } else if (progress >= monthProgress - 15) {
    return {
      status: "on_track",
      label: "On Track",
      icon: Minus,
      color: "text-blue-400 bg-[#0a0c10] border border-blue-500/20",
    };
  } else {
    return {
      status: "behind",
      label: "Behind",
      icon: TrendingDown,
      color: "text-red-400 bg-[#0a0c10] border border-red-500/20",
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
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="p-3 bg-[#0a0c10] border border-[#2f3e46] rounded-lg text-center shadow-inner">
          <p className="text-xl font-light text-white">
            {weeklyInsights?.tasksCompleted || 0}
          </p>
          <p className="text-[10px] uppercase font-mono tracking-widest text-[#a9927d] mt-1">
            Tasks
          </p>
        </div>
        <div className="p-3 bg-[#0a0c10] border border-[#2f3e46] rounded-lg text-center shadow-inner">
          <p className="text-xl font-light text-white">
            {weeklyInsights?.focusHours || 0}h
          </p>
          <p className="text-[10px] uppercase font-mono tracking-widest text-[#a9927d] mt-1">
            Focus
          </p>
        </div>
        <div className="p-3 bg-[#0a0c10] border border-[#2f3e46] rounded-lg text-center shadow-inner">
          <p className="text-xl font-light text-white">
            {weeklyInsights?.productivityScore || 0}
          </p>
          <p className="text-[10px] uppercase font-mono tracking-widest text-[#a9927d] mt-1">
            Score
          </p>
        </div>
      </div>

      {data?.annualGoals.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 border border-[#2f3e46] border-dashed rounded-lg bg-[#0a0c10]">
          <Trophy className="h-8 w-8 mb-3 opacity-30 text-[#a9927d]" />
          <p className="text-xs font-mono uppercase tracking-widest">
            No active annual goals.
          </p>
        </div>
      ) : (
        data?.annualGoals.map((goal, idx) => {
          const status = getGoalStatus(goal.progress);
          const StatusIcon = status.icon;
          return (
            <Link
              key={goal.id || idx}
              href={`/strategy/goal/${goal.id}`}
              className="block space-y-3 p-4 rounded-lg border border-[#2f3e46] bg-[#0a0c10] hover:border-[#a9927d]/40 transition-colors shadow-sm"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-light text-sm text-white truncate">
                    {goal.title}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono tracking-widest uppercase h-5 px-1.5 shrink-0 bg-[#1a252f] border-[#2f3e46] text-gray-400"
                  >
                    {goal.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-mono uppercase tracking-widest h-5 px-2 gap-1.5",
                      status.color,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                  <span className="font-mono text-xs font-medium text-[#a9927d]">
                    {goal.progress}%
                  </span>
                </div>
              </div>
              <Progress
                value={goal.progress}
                className="h-1 bg-[#2f3e46]"
                indicatorClassName="bg-[#a9927d]"
              />
            </Link>
          );
        })
      )}
    </div>
  );

  const QuarterlyView = () => (
    <div className="space-y-4 pt-4">
      {data?.quarterFocuses.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 border border-[#2f3e46] border-dashed rounded-lg bg-[#0a0c10]">
          <Target className="h-8 w-8 mb-3 opacity-30 text-[#a9927d]" />
          <p className="text-xs font-mono uppercase tracking-widest">
            No quarterly focuses linked yet.
          </p>
        </div>
      ) : (
        data?.quarterFocuses.map((focus, idx) => {
          const status = getGoalStatus(focus.progress);
          const StatusIcon = status.icon;
          return (
            <div
              key={idx}
              className="space-y-3 p-4 rounded-lg border border-[#2f3e46] bg-[#0a0c10] shadow-sm"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="font-light text-sm text-white truncate">
                    {focus.title}
                  </span>
                  <Badge
                    variant="outline"
                    className="text-[10px] font-mono tracking-widest uppercase h-5 px-1.5 shrink-0 bg-[#1a252f] border-[#2f3e46] text-gray-400"
                  >
                    {focus.category}
                  </Badge>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-mono uppercase tracking-widest h-5 px-2 gap-1.5",
                      status.color,
                    )}
                  >
                    <StatusIcon className="h-3 w-3" />
                    {status.label}
                  </Badge>
                  <span className="font-mono text-xs font-medium text-[#a9927d]">
                    {focus.progress}%
                  </span>
                </div>
              </div>
              <Progress
                value={focus.progress}
                className="h-1 bg-[#2f3e46]"
                indicatorClassName="bg-[#a9927d]"
              />
            </div>
          );
        })
      )}
    </div>
  );

  return (
    <Card className="col-span-full border-[#2f3e46] bg-[#1a252f] shadow-xl min-w-0 overflow-hidden">
      <CardHeader className="pb-3 border-b border-[#2f3e46]/50 mb-3">
        <CardTitle className="text-xs font-mono uppercase tracking-widest flex items-center gap-2 text-white">
          <Target className="w-4 h-4 text-[#a9927d]" />
          Goal Alignment
        </CardTitle>
        <CardDescription className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mt-1">
          Tracking against big picture objectives
        </CardDescription>
      </CardHeader>
      <CardContent className="px-4 sm:px-6">
        <Tabs defaultValue="quarter" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-[#0a0c10] border border-[#2f3e46] p-1 rounded-md mb-2">
            <TabsTrigger
              value="quarter"
              className="text-xs font-mono uppercase tracking-widest data-[state=active]:bg-[#1a252f] data-[state=active]:text-white text-gray-400"
            >
              This Quarter
            </TabsTrigger>
            <TabsTrigger
              value="annual"
              className="text-xs font-mono uppercase tracking-widest data-[state=active]:bg-[#1a252f] data-[state=active]:text-white text-gray-400"
            >
              Annual Goals
            </TabsTrigger>
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
