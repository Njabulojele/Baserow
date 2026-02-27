"use client";

import { useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Moon,
  ChevronLeft,
  ChevronRight,
  Target,
  Heart,
  Plus,
  Clock,
  CheckCircle2,
  Circle,
  Flag,
  AlertTriangle,
  Play,
  TrendingUp,
  Trophy,
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
import { DayPlanOnboarding } from "@/components/planning/DayPlanOnboarding";

interface DayPlanningClientProps {
  initialData: any;
}

// Removed priority matrix quadrant helper

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

  // Calculate metrics
  const completedTasks = dayPlan?.completedTasks || 0;
  const totalTasks = dayPlan?.totalTasks || 0;
  const completionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Focus score based on completion rate (0-100)
  const focusScore = completionRate;

  // Get tasks from our new endpoints for the specific date
  // We use the 'dayPlan' data which already has the tasks for 'currentDate'
  const todaysTasks = dayPlan?.tasks || [];

  // We also want backlog tasks to populate the right column
  const { data: backlogTasks } = trpc.task.getBacklogTasks.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
  });

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
          <h1 className="text-sm font-mono font-bold uppercase tracking-widest text-alabaster">
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
              className="w-full bg-[#1a252f] border border-[#a9927d]/50 text-[#a9927d] hover:bg-[#a9927d] hover:text-[#1a252f] transition-all font-mono tracking-widest uppercase text-[10px] shadow-xl"
            >
              <Heart className="size-3 mr-2" />
              Daily Review
            </Button>
          </Link>
          <div className="flex items-center justify-between sm:justify-start gap-1 border border-[#2f3e46] rounded-lg p-1 bg-[#0a0c10]">
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
              className="px-3 text-[10px] font-mono uppercase tracking-widest text-gray-400 hover:text-white hover:bg-[#1a252f]"
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
              className="w-full sm:w-auto border-[#2f3e46] bg-[#0a0c10] text-gray-300 hover:text-white hover:border-[#a9927d] font-mono tracking-widest uppercase text-[10px]"
              onClick={() => setIsReviewOpen(true)}
            >
              <Moon className="size-3 mr-2" />
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
            className="pl-10 h-11 sm:h-10 bg-[#0a0c10] border-[#2f3e46] text-white focus-visible:ring-[#a9927d] font-light placeholder:text-gray-600"
          />
        </div>
        <Button
          type="submit"
          disabled={createTaskMutation.isPending}
          className="h-11 sm:h-10 bg-[#1a252f] border border-[#2f3e46] text-[#a9927d] hover:bg-[#a9927d] hover:text-[#1a252f] transition-all font-mono tracking-widest uppercase text-[10px]"
        >
          <Plus className="h-3 w-3 mr-2" />
          Add Task
        </Button>
      </form>

      {/* First-use onboarding */}
      <DayPlanOnboarding />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Metrics & Focus */}
        <div className="lg:col-span-3 space-y-6">
          {/* Today's Metrics */}
          <Card className="bg-[#1a252f] border-[#2f3e46] shadow-xl">
            <CardHeader className="pb-2 border-b border-[#2f3e46]/50 mb-4">
              <CardTitle className="text-xs font-mono uppercase tracking-widest flex items-center gap-2 text-white">
                <TrendingUp className="h-4 w-4 text-[#a9927d]" />
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
                        <stop offset="0%" stopColor="#a9927d" />
                        <stop offset="100%" stopColor="#d4c4b7" />
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
                <div className="text-center p-3 rounded-lg bg-[#0a0c10] border border-[#2f3e46] shadow-inner">
                  <div className="text-2xl font-light text-white">
                    {completedTasks}
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-[#a9927d] mt-1">
                    Completed
                  </div>
                </div>
                <div className="text-center p-3 rounded-lg bg-[#0a0c10] border border-[#2f3e46] shadow-inner">
                  <div className="text-2xl font-light text-white">
                    {totalTasks - completedTasks}
                  </div>
                  <div className="text-[10px] uppercase font-mono tracking-widest text-gray-500 mt-1">
                    Remaining
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Goal Progress - Shows goals linked to today's tasks */}
          <Card className="bg-[#1a252f] border-[#2f3e46] shadow-xl">
            <CardHeader className="pb-2 border-b border-[#2f3e46]/50 mb-3">
              <CardTitle className="text-xs font-mono uppercase tracking-widest flex items-center gap-2 text-white">
                <Target className="h-4 w-4 text-[#a9927d]" />
                Today's Goal Progress
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {dayPlan?.tasks?.filter((t: any) => t.keyStepId).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No goal-linked tasks today. Link tasks to goals for progress
                  tracking.
                </p>
              ) : (
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    Tasks linked to goals:{" "}
                    {dayPlan?.tasks?.filter((t: any) => t.keyStepId).length ||
                      0}
                  </p>
                  <p>Complete tasks to update goal progress automatically.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Daily Win */}
          <Card className="bg-[#1a252f] border-[#2f3e46] shadow-xl">
            <CardHeader className="pb-2 border-b border-[#2f3e46]/50 mb-3">
              <CardTitle className="text-xs font-mono uppercase tracking-widest flex items-center gap-2 text-white">
                <Trophy className="h-4 w-4 text-[#a9927d]" />
                Daily Win
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="p-4 rounded-lg bg-[#0a0c10] border border-[#a9927d]/30 italic text-sm text-gray-300 font-serif">
                {dayPlan?.dayPlan?.dailyWin ||
                  todayWellbeing?.dailyWin ||
                  "What's your one big win for today?"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Center Column: Today's Agenda */}
        <div className="lg:col-span-5 space-y-6">
          <Card className="bg-[#1a252f] border-[#2f3e46] shadow-xl flex flex-col h-[500px] lg:h-[calc(100vh-220px)]">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#2f3e46]/50 mb-4 shrink-0">
              <div>
                <CardTitle className="text-xs font-mono uppercase tracking-widest text-white flex items-center gap-2">
                  <Flag className="h-4 w-4 text-[#a9927d]" />
                  Today's Agenda
                </CardTitle>
                <CardDescription className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mt-1">
                  {completedTasks} of {totalTasks} completed ({completionRate}%)
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <TaskList
                tasks={todaysTasks}
                emptyMessage="No tasks scheduled for today. Add one above or pull from the backlog!"
                variant="agenda"
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Backlog */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="bg-[#1a252f] border-[#2f3e46] shadow-xl flex flex-col h-[500px] lg:h-[calc(100vh-220px)] opacity-90">
            <CardHeader className="flex flex-row items-center justify-between pb-3 border-b border-[#2f3e46]/50 mb-4 shrink-0">
              <div>
                <CardTitle className="text-xs font-mono uppercase tracking-widest text-white flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-gray-400" />
                  Backlog & Overdue
                </CardTitle>
                <CardDescription className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mt-1">
                  Unscheduled Tasks
                </CardDescription>
              </div>
              <Button
                size="sm"
                variant="outline"
                asChild
                className="h-7 text-[10px] font-mono border-[#2f3e46] bg-transparent text-gray-400 hover:text-white pb-0"
              >
                <Link href="/tasks">View All</Link>
              </Button>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <TaskList
                tasks={backlogTasks}
                emptyMessage="Inbox is zero. Excellent work!"
                variant="backlog"
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
