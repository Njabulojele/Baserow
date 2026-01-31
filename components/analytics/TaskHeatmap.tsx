"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useTheme } from "next-themes";
import { useMemo } from "react";
import {
  startOfYear,
  endOfYear,
  eachDayOfInterval,
  format,
  parseISO,
  isSameDay,
  subDays,
} from "date-fns";
import { cn } from "@/lib/utils";

export function TaskHeatmap() {
  const { data: heatmapData, isLoading } =
    trpc.analytics.getTaskHeatmap.useQuery();
  const { theme } = useTheme();

  const days = useMemo(() => {
    const today = new Date();
    const startDate = subDays(today, 365);
    return eachDayOfInterval({ start: startDate, end: today });
  }, []);

  if (isLoading) {
    return (
      <Card className="col-span-full">
        <CardHeader>
          <CardTitle>Consistency Graph</CardTitle>
          <CardDescription>
            Task completion history (Last 365 Days)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-[140px] w-full" />
        </CardContent>
      </Card>
    );
  }

  const getIntensity = (count: number) => {
    if (count === 0) return "bg-muted/40";
    if (count <= 2) return "bg-emerald-200 dark:bg-emerald-900";
    if (count <= 4) return "bg-emerald-300 dark:bg-emerald-700";
    if (count <= 6) return "bg-emerald-400 dark:bg-emerald-600";
    return "bg-emerald-500 dark:bg-emerald-500";
  };

  return (
    <Card className="col-span-full border-border/60">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Consistency Graph</CardTitle>
            <CardDescription>Every contribution counts.</CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Less</span>
            <div className="flex gap-1">
              <div className="w-3 h-3 rounded-sm bg-muted/40" />
              <div className="w-3 h-3 rounded-sm bg-emerald-200 dark:bg-emerald-900" />
              <div className="w-3 h-3 rounded-sm bg-emerald-400 dark:bg-emerald-600" />
              <div className="w-3 h-3 rounded-sm bg-emerald-500 dark:bg-emerald-500" />
            </div>
            <span>More</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full overflow-x-auto pb-2">
          <div className="flex flex-col gap-1 min-w-max h-[110px] flex-wrap content-start">
            {/* Grid rendering: We want columns (weeks) x 7 rows (days) */}
            {/* Flex-col with wrap + constrained height forces column-first layout if items are small enough */}
            {/* 7 rows * (10px height + 4px gap) ~= 100px. */}

            {days.map((day) => {
              const dateKey = format(day, "yyyy-MM-dd");
              const dataPoint = heatmapData?.find((d) => d.date === dateKey);
              const count = dataPoint?.count || 0;

              return (
                <TooltipProvider key={dateKey}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div
                        className={cn(
                          "w-3 h-3 rounded-[2px] transition-colors hover:ring-2 hover:ring-ring hover:ring-offset-1 hover:ring-offset-background",
                          getIntensity(count),
                        )}
                      />
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <div className="text-xs font-medium">
                        {count} tasks on {format(day, "MMM dd, yyyy")}
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
