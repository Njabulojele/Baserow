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
import { formatDistanceToNow } from "date-fns";
import { CRMContextSidebar } from "@/components/crm/CRMContextSidebar";

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

  const isLoading = leadsLoading || dealsLoading || healthLoading;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white-smoke">
            Dashboard
          </h2>
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
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Active Leads */}
        <Link href="/crm/leads">
          <Card className="hover:shadow-md transition-shadow cursor-pointer bg-card border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Active Leads
              </CardTitle>
              <Users className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-white-smoke">
                    {leadStats?.total ?? 0}
                  </div>
                  <div className="flex items-center gap-1 text-sm mt-1">
                    <TrendingUp className="h-3 w-3 text-secondary" />
                    <span className="text-secondary">Growth focus</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Pipeline Value */}
        <Link href="/crm/pipeline">
          <Card className="hover:shadow-md transition-shadow cursor-pointer bg-card border-none">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Pipeline Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-accent" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-24" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-white-smoke">
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

        {/* Churn Risk Indicator */}
        <Link href="/clients">
          <Card className="hover:shadow-md transition-shadow cursor-pointer bg-card border-none border-l-4 border-l-danger/50">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
                Churn Risk
              </CardTitle>
              <AlertTriangle className="h-4 w-4 text-danger" />
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-7 w-16" />
              ) : (
                <>
                  <div className="text-2xl font-bold text-danger">
                    {healthSummary?.atRiskCount ?? 0}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 lowercase">
                    Needs immediate attention
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </Link>

        {/* Win Rate */}
        <Card className="bg-card border-none">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
              Win Rate
            </CardTitle>
            <Target className="h-4 w-4 text-accent" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold text-white-smoke">
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

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Main Content Area (Left) */}
        <div className="md:col-span-8 flex flex-col space-y-6">
          <Card className="bg-card border-none">
            <CardHeader>
              <CardTitle className="text-white-smoke">
                Recent Activities
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Latest interactions with leads and clients recorded in the
                system
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {recentActivities?.map((activity) => (
                  <div key={activity.id} className="flex gap-4">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent ring-2 ring-accent/20">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div className="w-px h-full bg-border mt-2" />
                    </div>
                    <div className="flex-1 pb-4 border-b border-border/50 last:border-0">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-white-smoke">
                            {activity.subject}
                          </h4>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatDistanceToNow(
                              new Date(activity.completedAt),
                              {
                                addSuffix: true,
                              },
                            )}
                          </p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-secondary/10 text-secondary uppercase tracking-widest border border-secondary/20">
                          {activity.type}
                        </span>
                      </div>

                      {activity.description && (
                        <p className="text-sm text-muted-foreground mt-3 leading-relaxed bg-black/20 p-3 rounded-lg border border-border/30">
                          {activity.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground font-medium">
                        {activity.lead && (
                          <span className="flex items-center gap-1.5 px-2 py-1 bg-muted rounded-md text-foreground/80">
                            <Users className="h-3 w-3 text-accent" />
                            {activity.lead.firstName} {activity.lead.lastName}{" "}
                            <span className="text-[10px] opacity-60 uppercase">
                              Lead
                            </span>
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
                <div className="mt-4 pt-4 text-center">
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
        <div className="md:col-span-4 h-fit sticky top-6">
          <CRMContextSidebar />
        </div>
      </div>
    </div>
  );
}
