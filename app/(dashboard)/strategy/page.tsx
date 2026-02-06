"use client";
import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import { Target, Calendar, ArrowRight, TrendingUp, Layout } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { YearPlan } from "@/components/strategy/YearPlan";
import { QuarterPlan } from "@/components/strategy/QuarterPlan";
import { MonthPlan } from "@/components/strategy/MonthPlan";
import { WeekPlan } from "@/components/strategy/WeekPlan";
import { StrategyAnalytics } from "@/components/strategy/StrategyAnalytics";

export default function StrategyPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentQuarter = Math.floor(currentMonth / 3) + 1;

  const { data: yearPlan, isLoading: yearLoading } =
    trpc.strategy.getYearPlan.useQuery({
      year: currentYear,
    });

  const { data: quarterPlan, isLoading: quarterLoading } =
    trpc.strategy.getQuarterPlan.useQuery({
      year: currentYear,
      quarter: currentQuarter,
    });

  if (yearLoading || quarterLoading) {
    return (
      <div className="space-y-6 p-8 pt-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
          Strategy Hub
        </h2>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <TabsList className="flex w-full min-w-[500px] sm:min-w-0 sm:grid sm:grid-cols-5 lg:w-[600px]">
            <TabsTrigger value="overview" className="flex-1">
              Overview
            </TabsTrigger>
            <TabsTrigger value="year" className="flex-1">
              Year
            </TabsTrigger>
            <TabsTrigger value="quarter" className="flex-1">
              Quarter
            </TabsTrigger>
            <TabsTrigger value="month" className="flex-1">
              Month
            </TabsTrigger>
            <TabsTrigger value="week" className="flex-1">
              Week
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-6">
          <StrategyAnalytics />
          <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
            {/* Year Plan Card */}
            <Card className="md:col-span-1 lg:col-span-1 bg-indigo-50/80 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2 text-indigo-900 dark:text-indigo-100">
                    <Target className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                    {currentYear} Vision
                  </CardTitle>
                </div>
                <CardDescription className="text-indigo-600/80 dark:text-indigo-400/80">
                  Long-term direction & focus
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {yearPlan ? (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-indigo-900/70 dark:text-indigo-200/70 mb-1">
                        Theme
                      </h3>
                      <p className="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
                        {yearPlan.theme}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium text-indigo-900/70 dark:text-indigo-200/70">
                        Goals Progress
                      </h3>
                      <div className="space-y-1">
                        {yearPlan.goals.slice(0, 3).map((goal) => (
                          <div
                            key={goal.id}
                            className="flex items-center justify-between text-sm"
                          >
                            <span
                              className={
                                goal.status === "completed"
                                  ? "line-through text-indigo-900/50 dark:text-indigo-200/50"
                                  : "text-indigo-800 dark:text-indigo-200"
                              }
                            >
                              {goal.title}
                            </span>
                            <Badge
                              variant={
                                goal.status === "completed"
                                  ? "secondary"
                                  : "outline"
                              }
                              className="text-[10px] h-5 border-indigo-200 dark:border-indigo-700 text-indigo-700 dark:text-indigo-300"
                            >
                              {goal.status}
                            </Badge>
                          </div>
                        ))}
                        {yearPlan.goals.length === 0 && (
                          <span className="text-indigo-500 text-sm italic">
                            No goals set yet
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-indigo-500/70">
                    <p>No plan for {currentYear} yet.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quarter Plan Card */}
            <Card className="md:col-span-1 lg:col-span-1 bg-emerald-50/80 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800">
              <CardHeader className="space-y-1">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl flex items-center gap-2 text-emerald-900 dark:text-emerald-100">
                    <Layout className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                    Q{currentQuarter} Strategy
                  </CardTitle>
                </div>
                <CardDescription className="text-emerald-600/80 dark:text-emerald-400/80">
                  Quarterly objectives (OKRs)
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {quarterPlan ? (
                  <>
                    <div>
                      <h3 className="text-sm font-medium text-emerald-900/70 dark:text-emerald-200/70 mb-1">
                        Theme
                      </h3>
                      <p className="text-lg font-semibold text-emerald-900 dark:text-emerald-100">
                        {quarterPlan.theme}
                      </p>
                    </div>
                    <div className="space-y-2 text-sm">
                      <h3 className="text-sm font-medium text-emerald-900/70 dark:text-emerald-200/70">
                        Top Objectives
                      </h3>
                      <ul className="space-y-2">
                        {quarterPlan.objectives.slice(0, 3).map((obj) => (
                          <li key={obj.id} className="flex items-start gap-2">
                            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 mt-0.5" />
                            <span className="text-emerald-800 dark:text-emerald-200 line-clamp-2">
                              {obj.title}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6 text-emerald-500/70">
                    <p>No plan for Q{currentQuarter}.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions Card */}
            <Card className="md:col-span-1 lg:col-span-1 border-dashed">
              <CardHeader className="space-y-1">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-sky-600" />
                  Tactical Focus
                </CardTitle>
                <CardDescription>Planning detail entry points</CardDescription>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => setActiveTab("year")}
                >
                  Go to Year Plan
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => setActiveTab("quarter")}
                >
                  Go to Quarter Plan
                </Button>
                <Button
                  variant="outline"
                  className="justify-start"
                  onClick={() => setActiveTab("month")}
                >
                  Go to Month Plan
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="year" className="space-y-4 pt-4">
          <YearPlan />
        </TabsContent>

        <TabsContent value="quarter" className="space-y-4 pt-4">
          <QuarterPlan />
        </TabsContent>

        <TabsContent value="month" className="space-y-4 pt-4">
          <MonthPlan />
        </TabsContent>

        <TabsContent value="week" className="space-y-4 pt-4">
          <WeekPlan />
        </TabsContent>
      </Tabs>
    </div>
  );
}
