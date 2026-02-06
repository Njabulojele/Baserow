"use client";

import {
  Users,
  Target,
  Heart,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Activity,
  ArrowRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { formatDistanceToNow, isPast, isToday } from "date-fns";

export default function CRMPage() {
  // Fetch stats for dashboard cards
  const { data: leadStats, isLoading: leadsLoading } =
    trpc.crmLead.getStats.useQuery();
  const { data: dealStats, isLoading: dealsLoading } =
    trpc.deal.getStats.useQuery({});
  const { data: healthSummary, isLoading: healthLoading } =
    trpc.clientHealth.getSummary.useQuery();
  const { data: atRiskClients, isLoading: atRiskLoading } =
    trpc.clientHealth.listAtRisk.useQuery();
  const { data: recentActivities, isLoading: activitiesLoading } =
    trpc.crmActivity.list.useQuery({ limit: 10 });
  const { data: overdueTasks, isLoading: overdueLoading } =
    trpc.task.getOverdueTasks.useQuery();
  const { data: todaysTasks, isLoading: todaysTasksLoading } =
    trpc.task.getTodaysTasks.useQuery();

  const isLoading = leadsLoading || dealsLoading || healthLoading;

  return (
    <div className="p-4 md:p-8 pt-6 overflow-hidden w-full min-w-0 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">CRM Dashboard</h2>
          <p className="text-muted-foreground">
            Overview of your business performance
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/crm/leads">
            <Button>View Leads</Button>
          </Link>
          <Link href="/crm/activities">
            <Button variant="outline">Log Activity</Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Active Leads */}
        <Link href="/crm/leads">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Active Leads
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    {leadStats?.total ?? 0}
                  </div>
                  <div className="flex items-center gap-1 text-sm mt-1">
                    <TrendingUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">Active Pipeline</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Pipeline Value */}
        <Link href="/crm/pipeline">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Pipeline Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold">
                    ${(dealStats?.pipelineValue ?? 0).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {dealStats?.openDeals ?? 0} open deals
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Clients At Risk (Metric) */}
        <Link href="/clients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-transparent hover:border-l-red-500">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Clients at Risk
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-red-600">
                    {healthSummary?.atRiskCount ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Needs attention
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Win Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Win Rate
            </CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {Math.round((dealStats?.winRate ?? 0) * 100)}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {dealStats?.wonDeals} deals won
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Lower Section Grid */}
      <div className="grid gap-4 md:grid-cols-12">
        {/* Recent Activities Feed (Left) */}
        <Card className="md:col-span-8 lg:col-span-8">
          <CardHeader>
            <CardTitle>Recent Activities</CardTitle>
            <CardDescription>
              Latest interactions with leads and clients
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {recentActivities?.map((activity) => (
                <div key={activity.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 ring-4 ring-white">
                      <Activity className="h-4 w-4" />
                    </div>
                    <div className="w-px h-full bg-border mt-2" />
                  </div>
                  <div className="flex-1 pb-4 border-b last:border-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-sm">
                          {activity.subject}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(activity.completedAt), {
                            addSuffix: true,
                          })}
                        </p>
                      </div>
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground uppercase tracking-wide">
                        {activity.type}
                      </span>
                    </div>

                    {activity.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2 bg-muted/30 p-2 rounded-md">
                        {activity.description}
                      </p>
                    )}

                    <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
                      {activity.lead && (
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {activity.lead.firstName} {activity.lead.lastName}{" "}
                          (Lead)
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {recentActivities?.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No recent activities
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar Widgets (Right) */}
        <div className="md:col-span-4 lg:col-span-4 space-y-4">
          {/* Overdue Tasks */}
          <Card className="border-l-4 border-l-red-500">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                Overdue Tasks
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {overdueTasks?.map((task) => (
                  <div
                    key={task.id}
                    className="text-sm flex flex-col gap-1 p-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-medium line-clamp-1">
                        {task.title}
                      </span>
                      <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded shrink-0">
                        {task.dueDate
                          ? formatDistanceToNow(new Date(task.dueDate), {
                              addSuffix: true,
                            })
                          : "Overdue"}
                      </span>
                    </div>
                  </div>
                ))}
                {(!overdueTasks || overdueTasks.length === 0) && (
                  <div className="text-xs text-muted-foreground py-2 italic">
                    Great! No overdue tasks.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Today's Tasks */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                Today&apos;s Schedule
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {todaysTasks?.map((task) => (
                  <div
                    key={task.id}
                    className="text-sm flex items-center gap-2 p-1"
                  >
                    <div
                      className={`h-2 w-2 rounded-full shrink-0 ${task.priority === "critical" ? "bg-red-500" : task.priority === "high" ? "bg-orange-500" : "bg-blue-500"}`}
                    />
                    <span className="line-clamp-1 flex-1">{task.title}</span>
                    <CheckCircle2 className="h-3.5 w-3.5 text-muted-foreground hover:text-green-500 cursor-pointer" />
                  </div>
                ))}
                {(!todaysTasks || todaysTasks.length === 0) && (
                  <div className="text-xs text-muted-foreground py-2 italic">
                    No tasks scheduled for today.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* At Risk List Panel */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4 text-red-500" />
                At-Risk Clients
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {atRiskClients?.slice(0, 3).map((score) => (
                  <div
                    key={score.id}
                    className="flex items-center justify-between p-2 border rounded-md bg-red-50/50 hover:bg-red-50 transition-colors"
                  >
                    <div className="overflow-hidden">
                      <h4 className="font-semibold text-xs truncate">
                        {score.client.name}
                      </h4>
                      <p className="text-[10px] text-red-600 font-medium">
                        Health: {score.overallScore}/100
                      </p>
                    </div>
                    <Link href={`/clients`}>
                      <Button size="icon" variant="ghost" className="h-6 w-6">
                        <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                ))}

                {(!atRiskClients || atRiskClients.length === 0) && (
                  <div className="text-center py-4 text-muted-foreground flex flex-col items-center">
                    <TrendingUp className="h-6 w-6 text-green-500 mb-1 opacity-50" />
                    <p className="text-[10px]">All clients look healthy!</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
