"use client";

import { trpc } from "@/lib/trpc/client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export function UrgencyDashboard() {
  const { data, isLoading } = trpc.project.getUrgencySummary.useQuery();

  if (isLoading) {
    return <Skeleton className="h-[200px] w-full rounded-xl" />;
  }

  if (
    !data ||
    (data.critical.length === 0 &&
      data.urgent.length === 0 &&
      data.attention.length === 0)
  ) {
    return null; // Don't show if nothing is urgent
  }

  return (
    <div className="space-y-4 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h3 className="text-lg font-semibold tracking-tight">
          Focus & Attention
        </h3>
        <span className="text-xs sm:text-sm text-muted-foreground whitespace-nowrap">
          {data.critical.length} Critical · {data.urgent.length} Urgent
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Critical Column */}
        {data.critical.length > 0 && (
          <Card className="border-red-500/50 bg-red-50/50 dark:bg-red-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                Critical Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.critical.map((project) => (
                <div
                  key={project.id}
                  className="p-3 bg-background rounded-lg border shadow-sm space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm line-clamp-1">
                      {project.name}
                    </span>
                    <Badge variant="destructive" className="text-[10px] h-5">
                      {project.daysUntil < 0
                        ? "Overdue"
                        : `${project.daysUntil} days`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Progress value={project.progress} className="h-1" />
                    <span className="w-8 text-right">{project.progress}%</span>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="w-full h-7 text-xs"
                  >
                    <Link href={`/projects/${project.id}`}>View Project</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Urgent Column */}
        {data.urgent.length > 0 && (
          <Card className="border-orange-500/50 bg-orange-50/50 dark:bg-orange-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-orange-600 dark:text-orange-400">
                <Clock className="h-4 w-4" />
                Urgent (Due Soon)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.urgent.map((project) => (
                <div
                  key={project.id}
                  className="p-3 bg-background rounded-lg border shadow-sm space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm line-clamp-1">
                      {project.name}
                    </span>
                    <span className="text-orange-600 text-xs font-semibold">
                      {project.daysUntil} days left
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Progress
                      value={project.progress}
                      className="h-1 bg-orange-100 dark:bg-orange-950"
                      indicatorClassName="bg-orange-500"
                    />
                    <span className="w-8 text-right">{project.progress}%</span>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-xs hover:bg-orange-100 dark:hover:bg-orange-900/50"
                  >
                    <Link href={`/projects/${project.id}`}>View Details</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Attention Column */}
        {data.attention.length > 0 && (
          <Card className="border-yellow-500/50 bg-yellow-50/50 dark:bg-yellow-950/20">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-yellow-600 dark:text-yellow-400">
                <AlertTriangle className="h-4 w-4" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.attention.map((project) => (
                <div
                  key={project.id}
                  className="p-3 bg-background rounded-lg border shadow-sm space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-medium text-sm line-clamp-1">
                      {project.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      Slow progress
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Progress
                      value={project.progress}
                      className="h-1 bg-yellow-100 dark:bg-yellow-950"
                      indicatorClassName="bg-yellow-500"
                    />
                    <span className="w-8 text-right">{project.progress}%</span>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-xs hover:bg-yellow-100 dark:hover:bg-yellow-900/50"
                  >
                    <Link href={`/projects/${project.id}`}>Check Status</Link>
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
