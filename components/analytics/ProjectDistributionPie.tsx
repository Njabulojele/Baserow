"use client";

import { useMemo } from "react";
import {
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  Cell,
  Legend,
} from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Loader2 } from "lucide-react";

const COLORS = [
  "#0ea5e9", // sky-500
  "#22c55e", // green-500
  "#eab308", // yellow-500
  "#f97316", // orange-500
  "#ef4444", // red-500
  "#a855f7", // purple-500
  "#ec4899", // pink-500
  "#64748b", // slate-500
];

export function ProjectDistributionPie() {
  const { data, isLoading } = trpc.analytics.getProjectDistribution.useQuery();

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((item, index) => ({
      ...item,
      fill:
        item.color && item.color.startsWith("#")
          ? item.color
          : COLORS[index % COLORS.length],
    }));
  }, [data]);

  const totalHours = useMemo(() => {
    return chartData.reduce((acc, curr) => acc + (curr.hours || 0), 0);
  }, [chartData]);

  if (isLoading) {
    return (
      <Card className="col-span-full min-w-0 overflow-hidden">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-[200px] w-[200px] rounded-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-full min-w-0 overflow-hidden border-border/60">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl">Project Distribution</CardTitle>
            <CardDescription className="text-muted-foreground">
              Time spent across your {chartData.length} active projects.
            </CardDescription>
          </div>
          <span className="text-xs font-mono font-bold px-3 py-1 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            Total: {totalHours.toFixed(1)}h Tracked
          </span>
        </div>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Pie Chart View */}
          <div className="lg:col-span-5 h-[320px] sm:h-[360px] w-full min-w-0 flex items-center justify-center">
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="hours"
                    strokeWidth={0}
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [`${value}h`, "Time Spent"]}
                    contentStyle={{
                      borderRadius: "8px",
                      backgroundColor: "#0a0c10",
                      borderColor: "#2f3e46",
                      fontSize: "12px",
                      fontWeight: "500",
                      color: "#ffffff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-2 opacity-20" />
                <p>No project data available</p>
              </div>
            )}
          </div>

          {/* Detailed 22 Active Projects Grid */}
          <div className="lg:col-span-7 space-y-3 max-h-[380px] overflow-y-auto custom-scrollbar pr-2">
            <h4 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-2">
              Active Project Breakdown ({chartData.length})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {chartData.map((project, idx) => {
                const percent = totalHours > 0 ? Math.round(((project.hours || 0) / totalHours) * 100) : 0;
                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-secondary/30 border border-secondary/60 hover:border-emerald-500/40 transition-all flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center justify-between min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: project.fill }}
                        />
                        <span className="text-xs font-bold text-foreground truncate" title={project.name}>
                          {project.name}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono font-semibold text-muted-foreground shrink-0">
                        {project.count || 0} tasks
                      </span>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-emerald-400 font-bold">{project.hours || 0}h</span>
                        <span className="text-muted-foreground">{percent}%</span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(percent, 4)}%`, backgroundColor: project.fill }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
