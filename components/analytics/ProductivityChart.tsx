"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useTheme } from "next-themes";
import { format, parseISO } from "date-fns";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";
import { Loader2 } from "lucide-react";

export function ProductivityChart() {
  const { theme } = useTheme();
  const [range, setRange] = useState<"today" | "7d" | "30d" | "90d">("7d");

  const { data, isLoading } = trpc.analytics.getProductivityTrends.useQuery({
    range,
  });

  const chartData = useMemo(() => {
    if (!data) return [];
    return data.map((item) => ({
      ...item,
      label:
        range === "today"
          ? item.date
          : format(parseISO(item.date), range === "7d" ? "EEE" : "MMM d"),
    }));
  }, [data, range]);

  if (isLoading) {
    return (
      <Card className="col-span-full min-w-0 overflow-hidden">
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="h-[300px] flex items-center justify-center">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="col-span-4 min-w-0 overflow-hidden">
      <CardHeader className="p-4 sm:p-6 pb-2 sm:pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Productivity Trends</CardTitle>
            <CardDescription className="text-white-smoke/60">
              Hours tracked{" "}
              {range === "today"
                ? "today"
                : `${
                    range === "7d"
                      ? "this week"
                      : range === "30d"
                        ? "this month"
                        : "last 3 months"
                  }`}
            </CardDescription>
          </div>
          <Select value={range} onValueChange={(v: any) => setRange(v)}>
            <SelectTrigger className="w-full sm:w-[130px] h-8 sm:h-9">
              <SelectValue placeholder="Select range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-2 pb-2 sm:px-6 sm:pb-6">
        <div className="h-[280px] sm:h-[300px] w-full min-w-0">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorHours" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  className="stroke-muted"
                  vertical={false}
                />
                <XAxis
                  dataKey="label"
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  minTickGap={10}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={10}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(value) => `${value}h`}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-background/95 backdrop-blur-sm p-2 shadow-md">
                          <div className="flex flex-col gap-1">
                            <span className="text-[10px] uppercase text-muted-foreground font-medium">
                              {payload[0].payload.date}
                            </span>
                            <span className="text-xs font-bold text-white-smoke">
                              {payload[0].value}h Tracked
                            </span>
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="hours"
                  stroke="#6366f1"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#colorHours)"
                  animationDuration={1000}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mb-2 opacity-20" />
              <p>No data available for this period</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
