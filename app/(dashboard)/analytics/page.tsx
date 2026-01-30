"use client";

import { ProductivityChart } from "@/components/analytics/ProductivityChart";
import { ProjectDistributionPie } from "@/components/analytics/ProjectDistributionPie";
import { TaskCompletionBar } from "@/components/analytics/TaskCompletionBar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { Activity, CheckCircle2, Clock, TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  const { data: stats } = trpc.analytics.getDashboardStats.useQuery();

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Analytics</h2>
        <div className="flex items-center space-x-2">
          {/* Date Range Picker could go here */}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Productivity Score
            </CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats
                ? Math.round(
                    stats.completedToday * 10 + stats.hoursThisWeek * 2,
                  )
                : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              Based on tasks & hours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hours Tracked</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.hoursThisWeek || 0}h
            </div>
            <p className="text-xs text-muted-foreground">
              +20.1% from last week
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Tasks Completed
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.completedToday || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              vs {stats?.todaysTasks || 0} due today
            </p>
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
            <p className="text-xs text-muted-foreground">
              Across all workspaces
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <ProductivityChart />
        <ProjectDistributionPie />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <TaskCompletionBar />
        {/* Could add another small chart here later */}
      </div>
    </div>
  );
}
