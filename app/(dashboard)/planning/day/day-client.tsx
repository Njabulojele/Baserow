"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Zap,
  Smile,
  Brain,
  Moon,
  Dumbbell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Target,
  Heart,
} from "lucide-react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TaskList } from "@/components/tasks/TaskList";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

interface DayPlanningClientProps {
  initialData: any;
}

export function DayPlanningClient({ initialData }: DayPlanningClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());

  const { data: dayPlan } = trpc.planning.getDayPlan.useQuery(
    { date: currentDate },
    { initialData: initialData },
  );

  const { data: todayWellbeing } = trpc.wellbeing.getTodayEntry.useQuery(
    undefined,
    {
      enabled: !!(
        format(currentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd")
      ),
      staleTime: 1000 * 60 * 5, // 5 minutes cache
    },
  );

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const energyLevel = todayWellbeing?.morningEnergy || 0;
  const moodLevel = todayWellbeing?.mood || 0;
  const focusLevel = todayWellbeing?.focusQuality || 0;

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white-smoke">
            Day Navigation
          </h1>
          <p className="text-muted-foreground mt-1">
            {format(currentDate, "EEEE, MMMM do, yyyy")}
          </p>
        </div>
        <Link href="/planning/review">
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20 flex items-center gap-2"
          >
            <Heart className="size-4" />
            Complete Daily Review
          </Button>
        </Link>
        <div className="flex items-center gap-2 ml-2 border-l pl-4 border-muted">
          <Button variant="outline" size="icon" onClick={prevDay}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentDate(new Date())}
          >
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={nextDay}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Well-being & Focus */}
        <div className="space-y-6">
          <Card className="bg-card/50 border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Zap className="size-3 text-yellow-500" /> Energy
                  </span>
                  <span>{energyLevel}/10</span>
                </div>
                <Progress value={energyLevel * 10} className="h-1.5" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Smile className="size-3 text-pink-500" /> Mood
                  </span>
                  <span>{moodLevel}/10</span>
                </div>
                <Progress value={moodLevel * 10} className="h-1.5" />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <Brain className="size-3 text-blue-500" /> Focus
                  </span>
                  <span>{focusLevel}/10</span>
                </div>
                <Progress value={focusLevel * 10} className="h-1.5" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-secondary" />
                Daily Win
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-accent/20 border border-primary/20 italic">
                {dayPlan?.dayPlan?.dailyWin ||
                  todayWellbeing?.dailyWin ||
                  "What's your one big win for today?"}
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/50 border-primary/10">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Habits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors">
                <span className="flex items-center gap-3 text-sm">
                  <Dumbbell className="size-4 text-blue-400" /> Exercise
                </span>
                <span className="text-xs text-muted-foreground">
                  {todayWellbeing?.exerciseMinutes || 0}m
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors">
                <span className="flex items-center gap-3 text-sm">
                  <BookOpen className="size-4 text-purple-400" /> Learning
                </span>
                <span className="text-xs text-muted-foreground">
                  Logged in Well-being
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded hover:bg-accent/50 transition-colors">
                <span className="flex items-center gap-3 text-sm">
                  <Moon className="size-4 text-yellow-200" /> Sleep
                </span>
                <span className="text-xs text-muted-foreground">
                  {todayWellbeing?.sleepHours || 0}h
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center/Right Column: Tasks & Time Blocks */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-card/40 border-primary/10 h-full">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Schedule & Tasks</CardTitle>
              <div className="text-sm font-medium text-muted-foreground">
                {dayPlan?.completedTasks} / {dayPlan?.totalTasks} Completed
              </div>
            </CardHeader>
            <CardContent>
              <div className="mb-8">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Highlights
                </h3>
                <TaskList
                  tasks={dayPlan?.tasks}
                  emptyMessage="No tasks scheduled for this day."
                />
              </div>

              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground mb-4">
                  Time Blocks
                </h3>
                {(dayPlan?.dayPlan?.timeBlocks?.length ?? 0) > 0 ? (
                  <div className="space-y-3">
                    {dayPlan?.dayPlan?.timeBlocks?.map((block: any) => (
                      <div
                        key={block.id}
                        className="flex items-center gap-4 p-3 rounded-lg bg-accent/5 border group hover:bg-accent/10 transition-colors"
                      >
                        <div className="text-xs font-mono text-muted-foreground w-20">
                          {format(new Date(block.startTime), "HH:mm")} -{" "}
                          {format(new Date(block.endTime), "HH:mm")}
                        </div>
                        <div className="flex-1">
                          <div className="font-medium text-sm">
                            {block.task?.title || block.type.replace("_", " ")}
                          </div>
                          <div className="text-[10px] text-muted-foreground uppercase">
                            {block.type}
                          </div>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          {block.duration}m
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground italic border border-dashed rounded-xl">
                    No time blocks planned.
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
