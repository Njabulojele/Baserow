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
import {
  Sparkles,
  TrendingUp,
  Calendar,
  CheckCircle2,
  Timer,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function InsightsCard() {
  const { data, isLoading } = trpc.analytics.getWeeklyInsights.useQuery();

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full" />;
  }

  if (!data) return null;

  return (
    <Card className="h-full border-indigo-500/20 bg-linear-to-br from-indigo-500/5 to-purple-500/5 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
          <Sparkles className="w-5 h-5" />
          Weekly Pulse
        </CardTitle>
        <CardDescription>Your productivity snapshot</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Score */}
        <div className="flex items-end gap-1">
          <span className="text-5xl font-bold tracking-tight text-foreground">
            {data.productivityScore}
          </span>
          <span className="text-sm text-muted-foreground mb-1.5">/ 100</span>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Completed
            </div>
            <p className="text-xl font-semibold">
              {data.tasksCompleted}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                tasks
              </span>
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              <Timer className="w-3.5 h-3.5" />
              Deep Work
            </div>
            <p className="text-xl font-semibold">
              {data.focusHours}{" "}
              <span className="text-xs font-normal text-muted-foreground">
                hrs
              </span>
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              <Calendar className="w-3.5 h-3.5" />
              Best Day
            </div>
            <p className="text-base font-semibold truncate">
              {data.busiestDay}
            </p>
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground uppercase tracking-wider font-semibold">
              <TrendingUp className="w-3.5 h-3.5" />
              Trend
            </div>
            <p className="text-sm font-medium text-emerald-600">{data.trend}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
