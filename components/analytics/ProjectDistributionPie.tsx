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
    <Card className="col-span-4 lg:col-span-3 min-w-0 overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <CardTitle className="text-xl">Project Distribution</CardTitle>
        <CardDescription className="text-white-smoke/60">
          Time spent across your projects.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-2 sm:p-6 shrink-0 min-h-0">
        <div className="h-[400px] sm:h-[450px] w-full min-w-0">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={120}
                  outerRadius={150}
                  paddingAngle={2}
                  dataKey="hours"
                  strokeWidth={0}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number) => [`${value}h`, "Tracked"]}
                  contentStyle={{
                    borderRadius: "8px",
                    backgroundColor: "hsl(var(--primary-background))",
                    borderColor: "hsl(var(--border))",
                    fontSize: "12px",
                    fontWeight: "500",
                    color: "hsl(var(--primary-foreground))",
                  }}
                />
                <Legend
                  layout="horizontal"
                  verticalAlign="bottom"
                  align="center"
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{
                    fontSize: "13px",
                    paddingTop: "30px",
                    width: "100%",
                    display: "flex",
                    justifyContent: "center",
                  }}
                  formatter={(value) => (
                    <span className="text-muted-foreground truncate max-w-[140px] sm:max-w-[200px]">
                      {value}
                    </span>
                  )}
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
      </CardContent>
    </Card>
  );
}
