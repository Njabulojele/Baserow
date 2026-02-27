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
        <h3 className="text-sm font-mono uppercase tracking-widest text-[#a9927d]">
          Focus & Attention
        </h3>
        <span className="text-[10px] font-mono uppercase tracking-wider text-gray-400 whitespace-nowrap">
          {data.critical.length} Critical · {data.urgent.length} Urgent
        </span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {/* Critical Column */}
        {data.critical.length > 0 && (
          <Card className="border-red-500/20 bg-[#1a252f] shadow-xl h-[340px] flex flex-col">
            <CardHeader className="pb-3 border-b border-[#2f3e46]/50 mb-3 shrink-0">
              <CardTitle className="text-xs font-mono uppercase tracking-widest flex items-center gap-2 text-red-400">
                <AlertCircle className="h-4 w-4" />
                Critical Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 overflow-y-auto pr-2">
              {data.critical.map((project) => (
                <div
                  key={project.id}
                  className="p-3 bg-[#0a0c10] rounded-lg border border-[#2f3e46] shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-light text-sm text-white line-clamp-1">
                      {project.name}
                    </span>
                    <Badge
                      variant="outline"
                      className="text-[10px] h-5 border-red-500/30 text-red-400 uppercase tracking-widest font-mono"
                    >
                      {project.daysUntil < 0
                        ? "Overdue"
                        : `${project.daysUntil} days`}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                    <Progress
                      value={project.progress}
                      className="h-1 bg-[#2f3e46]"
                      indicatorClassName="bg-red-500"
                    />
                    <span className="w-8 text-right">{project.progress}%</span>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-[10px] font-mono tracking-widest uppercase bg-[#1a252f] border-[#2f3e46] text-gray-300 hover:text-white hover:border-[#a9927d]"
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
          <Card className="border-orange-500/20 bg-[#1a252f] shadow-xl h-[340px] flex flex-col">
            <CardHeader className="pb-3 border-b border-[#2f3e46]/50 mb-3 shrink-0">
              <CardTitle className="text-xs font-mono uppercase tracking-widest flex items-center gap-2 text-orange-400">
                <Clock className="h-4 w-4" />
                Urgent (Due Soon)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 overflow-y-auto pr-2">
              {data.urgent.map((project) => (
                <div
                  key={project.id}
                  className="p-3 bg-[#0a0c10] rounded-lg border border-[#2f3e46] shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-light text-sm text-white line-clamp-1">
                      {project.name}
                    </span>
                    <span className="text-orange-400 text-[10px] font-mono uppercase tracking-widest">
                      {project.daysUntil} days left
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                    <Progress
                      value={project.progress}
                      className="h-1 bg-[#2f3e46]"
                      indicatorClassName="bg-orange-500"
                    />
                    <span className="w-8 text-right">{project.progress}%</span>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-[10px] font-mono tracking-widest uppercase bg-[#1a252f] border-[#2f3e46] text-gray-300 hover:text-white hover:border-[#a9927d]"
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
          <Card className="border-amber-500/20 bg-[#1a252f] shadow-xl h-[340px] flex flex-col">
            <CardHeader className="pb-3 border-b border-[#2f3e46]/50 mb-3 shrink-0">
              <CardTitle className="text-xs font-mono uppercase tracking-widest flex items-center gap-2 text-amber-400">
                <AlertTriangle className="h-4 w-4" />
                Needs Attention
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 flex-1 overflow-y-auto pr-2">
              {data.attention.map((project) => (
                <div
                  key={project.id}
                  className="p-3 bg-[#0a0c10] rounded-lg border border-[#2f3e46] shadow-sm space-y-3"
                >
                  <div className="flex justify-between items-start">
                    <span className="font-light text-sm text-white line-clamp-1">
                      {project.name}
                    </span>
                    <span className="text-[10px] font-mono tracking-widest uppercase text-amber-400">
                      Slow
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-gray-400">
                    <Progress
                      value={project.progress}
                      className="h-1 bg-[#2f3e46]"
                      indicatorClassName="bg-yellow-500"
                    />
                    <span className="w-8 text-right">{project.progress}%</span>
                  </div>
                  <Button
                    asChild
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-[10px] font-mono tracking-widest uppercase bg-[#1a252f] border-[#2f3e46] text-gray-300 hover:text-white hover:border-[#a9927d]"
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
