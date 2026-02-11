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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { CRMContextSidebar } from "@/components/crm/CRMContextSidebar";

const MAX_VISIBLE_ACTIVITIES = 4;

export default function CRMPage() {
  // Fetch stats for dashboard cards
  const { data: leadStats, isLoading: leadsLoading } =
    trpc.crmLead.getStats.useQuery();
  const { data: dealStats, isLoading: dealsLoading } =
    trpc.deal.getStats.useQuery({});
  const { data: healthSummary, isLoading: healthLoading } =
    trpc.clientHealth.getSummary.useQuery();
  const { data: recentActivities, isLoading: activitiesLoading } =
    trpc.crmActivity.list.useQuery({ limit: 10 });
  const { data: timeData } = trpc.analytics.getTimeBreakdown.useQuery();

  const isLoading = leadsLoading || dealsLoading || healthLoading;

  const formatZAR = (amount: number) =>
    `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white-smoke">
            Dashboard
          </h2>
          <p className="text-sm text-muted-foreground">
            Overview of your business performance
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <Link href="/crm/leads" className="flex-1 sm:flex-none">
            <Button className="w-full sm:w-auto">View Leads</Button>
          </Link>
          <Link href="/crm/activities" className="flex-1 sm:flex-none">
            <Button variant="outline" className="w-full sm:w-auto">
              Log Activity
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-5 min-w-0">
        {/* Active Leads */}
        <Link href="/crm/leads">
          <Card className="hover:shadow-md transition-shadow cursor-pointer bg-card border-none h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Active Leads
              </CardTitle>
              <Users className="h-4 w-4 text-accent shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold text-white-smoke">
                    {leadStats?.total ?? 0}
                  </div>
                  <div className="flex items-center gap-1 text-xs mt-1">
                    <TrendingUp className="h-3 w-3 text-secondary" />
                    <span className="text-secondary text-[10px] sm:text-xs">
                      Growth focus
                    </span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Client Revenue (Won) */}
        <Card className="bg-card border-none border-l-4 border-l-emerald-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Client Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-500 shrink-0" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            {isLoading ? (
              <Skeleton className="h-7 w-24" />
            ) : (
              <>
                <div className="text-xl sm:text-2xl font-bold text-emerald-400">
                  {formatZAR(dealStats?.wonValue ?? 0)}
                </div>
                <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                  {dealStats?.wonDeals ?? 0} deals won
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pipeline Value (Pending) */}
        <Link href="/crm/pipeline">
          <Card className="hover:shadow-md transition-shadow cursor-pointer bg-card border-none border-l-4 border-l-amber-500/50 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Pipeline
              </CardTitle>
              <TrendingUp className="h-4 w-4 text-amber-500 shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold text-amber-400">
                    {formatZAR(dealStats?.pipelineValue ?? 0)}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
                    {dealStats?.openDeals ?? 0} open deals
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Churn Risk Indicator */}
        <Link href="/clients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer bg-card border-none border-l-4 border-l-danger/50 h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
              <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Churn Risk
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-danger shrink-0" />
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <>
                  <div className="text-xl sm:text-2xl font-bold text-danger">
                    {healthSummary?.atRiskCount ?? 0}
                  </div>
                  <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 lowercase">
                    Needs attention
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Time Spent This Week */}
        <Card className="bg-card border-none border-l-4 border-l-indigo-500/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-3 sm:px-6">
            <CardTitle className="text-[10px] sm:text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Hours Logged
            </CardTitle>
            <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
          </CardHeader>
          <CardContent className="px-3 sm:px-6">
            <div className="text-xl sm:text-2xl font-bold text-indigo-400">
              {timeData?.totalHours ?? 0}h
            </div>
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {timeData?.billableHours ?? 0}h billable
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start min-w-0">
        {/* Main Content Area (Left) */}
        <div className="md:col-span-8 flex flex-col space-y-6 min-w-0">
          <Card className="bg-card border-none max-h-[420px] overflow-y-auto">
            <CardHeader>
              <CardTitle className="text-white-smoke">
                Recent Activities
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Latest interactions with leads and clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentActivities
                  ?.slice(0, MAX_VISIBLE_ACTIVITIES)
                  .map((activity) => (
                    <div key={activity.id} className="flex gap-3">
                      <div className="flex flex-col items-center shrink-0">
                        <div className="h-8 w-8 rounded-full bg-accent/10 flex items-center justify-center text-accent ring-2 ring-accent/20">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div className="w-px h-full bg-border mt-1.5" />
                      </div>
                      <div className="flex-1 pb-3 border-b border-border/50 last:border-0 min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h4 className="font-semibold text-sm text-white-smoke truncate">
                              {activity.subject}
                            </h4>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {formatDistanceToNow(
                                new Date(activity.completedAt),
                                { addSuffix: true },
                              )}
                            </p>
                          </div>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary uppercase tracking-widest border border-secondary/20 shrink-0">
                            {activity.type}
                          </span>
                        </div>

                        {activity.description && (
                          <p className="text-xs text-muted-foreground mt-2 leading-relaxed bg-black/20 p-2 rounded-lg border border-border/30 line-clamp-3">
                            {activity.description}
                          </p>
                        )}

                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground font-medium">
                          {activity.lead && (
                            <span className="flex items-center gap-1.5 px-2 py-0.5 bg-muted rounded-md text-foreground/80 text-[10px]">
                              <Users className="h-3 w-3 text-accent" />
                              {activity.lead.firstName} {activity.lead.lastName}
                              <span className="opacity-60 uppercase">Lead</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                {recentActivities?.length === 0 && (
                  <div className="text-center text-muted-foreground py-12 flex flex-col items-center">
                    <Activity className="h-12 w-12 opacity-20 mb-4" />
                    <p>No activity recorded yet for this period.</p>
                  </div>
                )}
                <div className="mt-3 pt-3 text-center">
                  <Link
                    href="/crm/activities"
                    className="text-sm font-bold text-accent hover:text-accent/80 transition-colors inline-flex items-center"
                  >
                    View Full Activity Log{" "}
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Local Page Sidebar (Right) */}
        <div className="md:col-span-4 h-fit sticky top-6 min-w-0">
          <CRMContextSidebar />
        </div>
      </div>
    </div>
  );
}
