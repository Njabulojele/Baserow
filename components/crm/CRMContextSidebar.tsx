"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Heart,
  TrendingUp,
  ArrowRight,
  AlertCircle,
  Calendar,
  CheckCircle2,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export function CRMContextSidebar() {
  const { data: overdueTasks } = trpc.task.getOverdueTasks.useQuery();
  const { data: todaysTasks } = trpc.task.getTodaysTasks.useQuery();
  const { data: atRiskClients } = trpc.clientHealth.listAtRisk.useQuery();

  return (
    <div className="space-y-4">
      {/* Overdue Tasks */}
      <Card className="border-l-4 border-l-red-500 shadow-sm">
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
                  <span className="font-medium line-clamp-1">{task.title}</span>
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
      <Card className="shadow-sm">
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
      <Card className="shadow-sm">
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
  );
}
