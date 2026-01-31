"use client";

import { ProductivityChart } from "@/components/analytics/ProductivityChart";
import { ProjectDistributionPie } from "@/components/analytics/ProjectDistributionPie";
import { TaskCompletionBar } from "@/components/analytics/TaskCompletionBar";
import { InsightsCard } from "@/components/analytics/InsightsCard";
import { TaskHeatmap } from "@/components/analytics/TaskHeatmap";
import { GoalProgressChart } from "@/components/analytics/GoalProgressChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { Activity, CheckCircle2, Clock, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  const { data: stats } = trpc.analytics.getDashboardStats.useQuery();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
      </div>

      {/* Row 1: Weekly Pulse (Insights) & Quick Stats */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Insights Card - Takes prominent spot */}
        <div className="md:col-span-6 lg:col-span-5">
          <InsightsCard />
        </div>

        {/* Quick KPI Grid */}
        <div className="md:col-span-6 lg:col-span-7 grid grid-cols-2 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Hours Tracked
              </CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.hoursThisWeek || 0}h
              </div>
              <p className="text-xs text-muted-foreground">this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tasks Done</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.completedToday || 0}
              </div>
              <p className="text-xs text-muted-foreground">today</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Active Projects
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.activeProjects || 0}
              </div>
              <p className="text-xs text-muted-foreground">running</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Due Today</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats?.todaysTasks || 0}
              </div>
              <p className="text-xs text-muted-foreground">remaining</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2: Consistency (Heatmap) */}
      <div className="grid gap-4">
        <TaskHeatmap />
      </div>

      {/* Row 3: Goals & Trends */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <ProductivityChart />
        </div>
        <div className="col-span-3">
          <GoalProgressChart />
        </div>
      </div>

      {/* Row 4: Details */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <TaskCompletionBar />
        </div>
        <div className="col-span-3">
          <ProjectDistributionPie />
        </div>
      </div>
    </div>
  );
}
