"use client";

import { useState, useMemo } from "react";
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
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Flag,
  AlertTriangle,
  Play,
} from "lucide-react";
import Link from "next/link";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TaskList } from "@/components/tasks/TaskList";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
// import { toast } from "sonner";
import { EveningReview } from "@/components/dashboard/EveningReview";
import { NoteEditor } from "@/components/notes/NoteEditor";

interface DayPlanningClientProps {
  initialData: any;
}

// Priority matrix quadrant helper
function getQuadrant(priority: string, dueDate: Date | null, today: Date) {
  const isUrgent = dueDate && dueDate <= today;
  const isImportant = priority === "critical" || priority === "high";

  if (isUrgent && isImportant) return "do";
  if (!isUrgent && isImportant) return "schedule";
  if (isUrgent && !isImportant) return "delegate";
  return "eliminate";
}

export function DayPlanningClient({ initialData }: DayPlanningClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [quickTask, setQuickTask] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const utils = trpc.useUtils();

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
      staleTime: 1000 * 60 * 5,
    },
  );

  const createTaskMutation = trpc.task.createTask.useMutation({
    onSuccess: () => {
      toast.success("Task added");
      setQuickTask("");
      utils.planning.getDayPlan.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

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

  // Calculate metrics
  const completedTasks = dayPlan?.completedTasks || 0;
  const totalTasks = dayPlan?.totalTasks || 0;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Calculate focus score (average of energy, mood, focus)
  const focusScore = Math.round(
    ((energyLevel + moodLevel + focusLevel) / 3) * 10,
  );

  // Organize tasks by priority matrix quadrants
  const quadrants = useMemo(() => {
    const tasks = dayPlan?.tasks || [];
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    return {
      do: tasks.filter(
        (t: any) =>
          getQuadrant(
            t.priority,
            t.dueDate ? new Date(t.dueDate) : null,
            today,
          ) === "do",
      ),
      schedule: tasks.filter(
        (t: any) =>
          getQuadrant(
            t.priority,
            t.dueDate ? new Date(t.dueDate) : null,
            today,
          ) === "schedule",
      ),
      delegate: tasks.filter(
        (t: any) =>
          getQuadrant(
            t.priority,
            t.dueDate ? new Date(t.dueDate) : null,
            today,
          ) === "delegate",
      ),
      eliminate: tasks.filter(
        (t: any) =>
          getQuadrant(
            t.priority,
            t.dueDate ? new Date(t.dueDate) : null,
            today,
          ) === "eliminate",
      ),
    };
  }, [dayPlan?.tasks]);

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTask.trim()) return;

    createTaskMutation.mutate({
      title: quickTask.trim(),
      scheduledDate: currentDate,
      priority: "medium",
    });
  };

  return (
    <div className="container mx-auto py-6 px-4 space-y-6">
      {/* Header with Quick Actions */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Day Navigation
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {format(currentDate, "EEEE, MMMM do, yyyy")}
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <Link href="/planning/review" className="w-full sm:w-auto">
            <Button
              size="sm"
              className="w-full bg-linear-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white shadow-lg"
            >
              <Heart className="size-4 mr-2" />
              Daily Review
            </Button>
          </Link>
          <div className="flex items-center justify-between sm:justify-start gap-1 border rounded-lg p-1 bg-card">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={prevDay}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="px-3 text-xs sm:text-sm"
              onClick={() => setCurrentDate(new Date())}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={nextDay}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>

          {format(currentDate, "yyyy-MM-dd") ===
            format(new Date(), "yyyy-MM-dd") && (
            <Button
              variant="outline"
              className="w-full sm:w-auto border-indigo-500/30 text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-950"
              onClick={() => setIsReviewOpen(true)}
            >
              <Moon className="size-4 mr-2" />
              Evening Review
            </Button>
          )}

          <NoteEditor
            dayPlanId={dayPlan?.dayPlan?.id}
            title={format(currentDate, "MMM do")}
          />
        </div>
      </div>

      <EveningReview open={isReviewOpen} onOpenChange={setIsReviewOpen} />

      {/* Quick Add Bar */}
      <form
        onSubmit={handleQuickAdd}
        className="flex flex-col sm:flex-row gap-3"
      >
        <div className="relative flex-1">
          <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Quick add task..."
            value={quickTask}
            onChange={(e) => setQuickTask(e.target.value)}
            className="pl-10 h-11 sm:h-10"
          />
        </div>
        <Button
          type="submit"
          disabled={createTaskMutation.isPending}
          className="h-11 sm:h-10"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Task
        </Button>
      </form>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Metrics & Focus */}
        <div className="lg:col-span-3 space-y-6">
          {/* Today's Metrics */}
          <Card className="bg-linear-to-br from-indigo-500/10 to-purple-500/10 border-indigo-500/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-indigo-500" />
                Today's Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-4">
                <div className="relative">
                  <svg className="w-32 h-32" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-muted/20"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="none"
                      stroke="url(#gradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${focusScore * 2.51} 251`}
                      transform="rotate(-90 50 50)"
                    />
                    <defs>
                      <linearGradient
                        id="gradient"
                        x1="0%"
                        y1="0%"
                        x2="100%"
                        y2="0%"
                      >
                        <stop offset="0%" stopColor="#6366f1" />
                        <stop offset="100%" stopColor="#a855f7" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <span className="text-3xl font-bold">{focusScore}</span>
                      <span className="text-sm text-muted-foreground block">
                        Focus
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-3 rounded-lg bg-green-500/10">
                  <div className="text-2xl font-bold text-green-600">
                    {completedTasks}
                  </div>
                  <div className="text-xs text-muted-foreground">Completed</div>
                </div>
                <div className="text-center p-3 rounded-lg bg-amber-500/10">
                  <div className="text-2xl font-bold text-amber-600">
                    {totalTasks - completedTasks}
                  </div>
                  <div className="text-xs text-muted-foreground">Remaining</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Vitals */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5 text-yellow-500" />
                Vitals
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

          {/* Daily Win */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-emerald-500" />
                Daily Win
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 italic text-sm">
                {dayPlan?.dayPlan?.dailyWin ||
                  todayWellbeing?.dailyWin ||
                  "What's your one big win for today?"}
              </div>
            </CardContent>
          </Card>

          {/* Habits */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-500" />
                Habits
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="flex items-center gap-2 text-sm">
                  <Dumbbell className="size-4 text-blue-400" /> Exercise
                </span>
                <Badge variant="secondary" className="text-xs">
                  {todayWellbeing?.exerciseMinutes || 0}m
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="flex items-center gap-2 text-sm">
                  <Moon className="size-4 text-indigo-400" /> Sleep
                </span>
                <Badge variant="secondary" className="text-xs">
                  {todayWellbeing?.sleepHours || 0}h
                </Badge>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors">
                <span className="flex items-center gap-2 text-sm">
                  <BookOpen className="size-4 text-purple-400" /> Learning
                </span>
                <Badge variant="secondary" className="text-xs">
                  Track
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column: Priority Matrix & Tasks */}
        <div className="lg:col-span-9 space-y-6">
          {/* Priority Matrix */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Flag className="h-5 w-5 text-rose-500" />
                Priority Matrix
              </CardTitle>
              <CardDescription>Eisenhower Decision Matrix</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Do First */}
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 min-h-[100px] sm:min-h-[120px]">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    <span className="text-xs font-semibold text-red-600 uppercase">
                      Do First
                    </span>
                    <Badge
                      variant="destructive"
                      className="ml-auto text-[10px]"
                    >
                      {quadrants.do.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {quadrants.do.slice(0, 3).map((task: any) => (
                      <div
                        key={task.id}
                        className="text-xs truncate text-muted-foreground"
                      >
                        • {task.title}
                      </div>
                    ))}
                    {quadrants.do.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{quadrants.do.length - 3} more
                      </div>
                    )}
                    {quadrants.do.length === 0 && (
                      <div className="text-[10px] italic text-muted-foreground opacity-50">
                        No critical tasks
                      </div>
                    )}
                  </div>
                </div>

                {/* Schedule */}
                <div className="p-3 rounded-lg bg-blue-500/10 border border-blue-500/20 min-h-[100px] sm:min-h-[120px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-blue-500" />
                    <span className="text-xs font-semibold text-blue-600 uppercase">
                      Schedule
                    </span>
                    <Badge className="ml-auto text-[10px] bg-blue-500">
                      {quadrants.schedule.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {quadrants.schedule.slice(0, 3).map((task: any) => (
                      <div
                        key={task.id}
                        className="text-xs truncate text-muted-foreground"
                      >
                        • {task.title}
                      </div>
                    ))}
                    {quadrants.schedule.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{quadrants.schedule.length - 3} more
                      </div>
                    )}
                    {quadrants.schedule.length === 0 && (
                      <div className="text-[10px] italic text-muted-foreground opacity-50">
                        Nothing scheduled
                      </div>
                    )}
                  </div>
                </div>

                {/* Delegate */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 min-h-[100px] sm:min-h-[120px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Play className="h-4 w-4 text-amber-500" />
                    <span className="text-xs font-semibold text-amber-600 uppercase">
                      Delegate
                    </span>
                    <Badge
                      variant="outline"
                      className="ml-auto text-[10px] border-amber-500 text-amber-600"
                    >
                      {quadrants.delegate.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {quadrants.delegate.slice(0, 3).map((task: any) => (
                      <div
                        key={task.id}
                        className="text-xs truncate text-muted-foreground"
                      >
                        • {task.title}
                      </div>
                    ))}
                    {quadrants.delegate.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{quadrants.delegate.length - 3} more
                      </div>
                    )}
                    {quadrants.delegate.length === 0 && (
                      <div className="text-[10px] italic text-muted-foreground opacity-50">
                        Nothing at risk
                      </div>
                    )}
                  </div>
                </div>

                {/* Eliminate */}
                <div className="p-3 rounded-lg bg-gray-500/10 border border-gray-500/20 min-h-[100px] sm:min-h-[120px]">
                  <div className="flex items-center gap-2 mb-2">
                    <Circle className="h-4 w-4 text-gray-500" />
                    <span className="text-xs font-semibold text-gray-600 uppercase">
                      Later
                    </span>
                    <Badge variant="outline" className="ml-auto text-[10px]">
                      {quadrants.eliminate.length}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    {quadrants.eliminate.slice(0, 3).map((task: any) => (
                      <div
                        key={task.id}
                        className="text-xs truncate text-muted-foreground"
                      >
                        • {task.title}
                      </div>
                    ))}
                    {quadrants.eliminate.length > 3 && (
                      <div className="text-xs text-muted-foreground">
                        +{quadrants.eliminate.length - 3} more
                      </div>
                    )}
                    {quadrants.eliminate.length === 0 && (
                      <div className="text-[10px] italic text-muted-foreground opacity-50">
                        Inbox is clear
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* All Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-lg">Today's Tasks</CardTitle>
                <CardDescription>
                  {completedTasks} of {totalTasks} completed ({completionRate}%)
                </CardDescription>
              </div>
              <Button size="sm" variant="outline" asChild>
                <Link href="/tasks">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              <TaskList
                tasks={dayPlan?.tasks}
                emptyMessage="No tasks scheduled for today. Add one above!"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
