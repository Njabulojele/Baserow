"use client";

import { ProductivityChart } from "@/components/analytics/ProductivityChart";
import { ProjectDistributionPie } from "@/components/analytics/ProjectDistributionPie";
import { TaskCompletionBar } from "@/components/analytics/TaskCompletionBar";
import { InsightsCard } from "@/components/analytics/InsightsCard";
import { TaskHeatmap } from "@/components/analytics/TaskHeatmap";
import { StrategyAnalytics } from "@/components/strategy/StrategyAnalytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { Activity, CheckCircle2, Clock, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  const { data: stats } = trpc.analytics.getDashboardStats.useQuery();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6 w-full max-w-full overflow-x-hidden">
      <div className="mb-4">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white-smoke">
          Analytics
        </h2>
      </div>

      {/* Row 1: Weekly Pulse (Insights) & Quick Stats */}
      <div className="grid gap-4 md:grid-cols-12 min-w-0">
        {/* Insights Card - Takes prominent spot */}
        <div className="md:col-span-6 lg:col-span-5 min-w-0">
          <InsightsCard />
        </div>

        {/* Quick KPI Grid */}
        <div className="md:col-span-6 lg:col-span-7 grid grid-cols-2 gap-4 min-w-0">
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm font-medium truncate">
                Hours Tracked
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.hoursThisWeek || 0}h
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                this week
              </p>
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm font-medium truncate">
                Tasks Done
              </CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.completedToday || 0}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                today
              </p>
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm font-medium truncate">
                Active Projects
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.activeProjects || 0}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                running
              </p>
            </CardContent>
          </Card>
          <Card className="min-w-0 overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-sm font-medium truncate">
                Due Today
              </CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="text-xl sm:text-2xl font-bold">
                {stats?.todaysTasks || 0}
              </div>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate">
                remaining
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2: Consistency (Heatmap) */}
      <div className="grid gap-4 min-w-0">
        <TaskHeatmap />
      </div>

      {/* Rows 3 & 4: Deep Dives (Full Width) */}
      <div className="space-y-6">
        <ProductivityChart />
        <StrategyAnalytics />
        <TaskCompletionBar />
        <ProjectDistributionPie />
      </div>
    </div>
  );
}
