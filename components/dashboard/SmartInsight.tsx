"use client";

import { trpc } from "@/lib/trpc/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Sparkles, ArrowRight, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

export function SmartInsight() {
  const { data: stats } = trpc.analytics.getDashboardStats.useQuery();

  const projectId = stats?.activeTimer?.projectId;

  const { data: prediction, isLoading } =
    trpc.analytics.getCompletionPrediction.useQuery(
      { projectId: projectId! },
      { enabled: !!projectId },
    );

  if (!projectId || !stats?.activeTimer) return null;
  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!prediction || !prediction.predictedDate) return null;

  return (
    <Alert className="mb-6 bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
      <Sparkles className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
      <AlertTitle className="text-indigo-900 dark:text-indigo-100 flex items-center gap-2">
        Smart Insight
      </AlertTitle>
      <AlertDescription className="mt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-indigo-800 dark:text-indigo-200">
          <p>
            You&apos;re currently working on{" "}
            <span className="font-semibold">
              {stats.activeTimer.project?.name}
            </span>
            . Based on your recent velocity ({prediction.velocity} tasks/day),
            we predict you&apos;ll finish the remaining{" "}
            {prediction.remainingTasks} tasks by{" "}
            <span className="font-semibold">
              {format(new Date(prediction.predictedDate), "MMM do")}
            </span>
            .
          </p>
        </div>

        {prediction.daysRemaining > 0 && (
          <div className="flex items-center gap-2 text-xs font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-900/50 px-3 py-1 rounded-full whitespace-nowrap">
            <TrendingUp className="h-3 w-3" />
            {prediction.daysRemaining} days to go
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
