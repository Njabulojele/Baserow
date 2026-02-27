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
    <Alert className="mb-6 bg-[#1a252f] border-[#a9927d]/30 shadow-xl backdrop-blur-sm transition-all hover:border-[#a9927d]/50">
      <Sparkles className="h-4 w-4 text-[#a9927d]" />
      <AlertTitle className="text-white flex items-center gap-2 font-mono uppercase tracking-widest text-xs">
        Smart Insight
      </AlertTitle>
      <AlertDescription className="mt-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="text-gray-300 font-light text-sm leading-relaxed">
          <p>
            You&apos;re currently working on{" "}
            <span className="font-medium text-white">
              {stats.activeTimer.project?.name}
            </span>
            . Based on your recent velocity ({prediction.velocity} tasks/day),
            we predict you&apos;ll finish the remaining{" "}
            {prediction.remainingTasks} tasks by{" "}
            <span className="font-medium text-[#a9927d]">
              {format(new Date(prediction.predictedDate), "MMM do")}
            </span>
            .
          </p>
        </div>

        {prediction.daysRemaining > 0 && (
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-[#a9927d] bg-[#0a0c10] border border-[#2f3e46] px-3 py-1.5 rounded-full whitespace-nowrap shadow-inner">
            <TrendingUp className="h-3 w-3" />
            {prediction.daysRemaining} days to go
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
}
