"use client";

import { useState, useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskForm } from "@/components/tasks/TaskForm";
import { trpc } from "@/lib/trpc/client";
import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  isPast,
  isFuture,
  startOfDay,
  parseISO,
} from "date-fns";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  AlertCircle,
  TrendingUp,
  ListTodo,
  Calendar,
  ChevronDown,
  ChevronUp,
  Circle,
  Play,
  Pause,
  MoreHorizontal,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  dueDate: Date | null;
  scheduledDate: Date | null;
  estimatedMinutes: number | null;
  actualMinutes: number;
  timerRunning: boolean;
  currentTimerStart: Date | null;
  project: { id: string; name: string; color: string | null } | null;
}

interface TasksClientProps {
  initialTasks: any[];
}

// Helper function to get date label
function getDateLabel(date: Date | null): string {
  if (!date) return "Unscheduled";
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  if (isYesterday(d)) return "Yesterday";
  return format(d, "EEEE, MMM d");
}

// Helper function to get date badge variant
function getDateBadgeStyle(date: Date | null): string {
  if (!date) return "bg-muted text-muted-foreground";
  const d = new Date(date);
  if (isToday(d)) return "bg-blue-500/10 text-blue-600 border-blue-500/20";
  if (isTomorrow(d))
    return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
  if (isPast(d)) return "bg-red-500/10 text-red-600 border-red-500/20";
  return "bg-violet-500/10 text-violet-600 border-violet-500/20";
}

// Priority colors
const priorityColors: Record<string, string> = {
  critical: "text-red-500",
  high: "text-orange-500",
  medium: "text-yellow-500",
  low: "text-blue-500",
};

export function TasksClient({ initialTasks }: TasksClientProps) {
  const [status, setStatus] = useState<string>("all");
  const [expandedDates, setExpandedDates] = useState<Set<string>>(
    new Set(["Today", "Tomorrow", "Unscheduled"]),
  );

  const utils = trpc.useUtils();

  // Use server-prefetched data for 'all', fetch fresh for filtered views
  const { data: tasks, isLoading } = trpc.task.getTasks.useQuery(
    status === "all"
      ? undefined
      : { status: status as "not_started" | "in_progress" | "done" },
    {
      initialData: status === "all" ? initialTasks : undefined,
    },
  );

  const completeTask = trpc.task.completeTask.useMutation({
    onSuccess: () => {
      toast.success("Task completed!");
      utils.task.getTasks.invalidate();
    },
  });

  const startTimer = trpc.task.startTimer.useMutation({
    onSuccess: () => utils.task.getTasks.invalidate(),
  });

  const stopTimer = trpc.task.stopTimer.useMutation({
    onSuccess: () => utils.task.getTasks.invalidate(),
  });

  // Group tasks by date
  const groupedTasks = useMemo(() => {
    if (!tasks) return {};

    const groups: Record<string, Task[]> = {};

    tasks.forEach((task: Task) => {
      const dateKey = getDateLabel(task.scheduledDate || task.dueDate);
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(task);
    });

    // Sort each group by priority
    Object.keys(groups).forEach((key) => {
      groups[key].sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
        return (
          (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) -
          (priorityOrder[b.priority as keyof typeof priorityOrder] || 2)
        );
      });
    });

    return groups;
  }, [tasks]);

  // Order for date labels
  const dateOrder = useMemo(() => {
    const labels = Object.keys(groupedTasks);
    const order: string[] = [];

    // Today first
    if (labels.includes("Today")) order.push("Today");
    if (labels.includes("Tomorrow")) order.push("Tomorrow");
    if (labels.includes("Yesterday")) order.push("Yesterday");

    // Then other dates sorted
    const otherDates = labels
      .filter(
        (l) => !["Today", "Tomorrow", "Yesterday", "Unscheduled"].includes(l),
      )
      .sort((a, b) => {
        // Parse dates and compare
        try {
          return new Date(a).getTime() - new Date(b).getTime();
        } catch {
          return 0;
        }
      });

    order.push(...otherDates);

    // Unscheduled last
    if (labels.includes("Unscheduled")) order.push("Unscheduled");

    return order;
  }, [groupedTasks]);

  // Stats
  const stats = useMemo(() => {
    if (!tasks) return { total: 0, completed: 0, inProgress: 0, overdue: 0 };
    const completed = tasks.filter((t: Task) => t.status === "done").length;
    const inProgress = tasks.filter(
      (t: Task) => t.status === "in_progress",
    ).length;
    const overdue = tasks.filter((t: Task) => {
      if (!t.dueDate || t.status === "done") return false;
      return isPast(new Date(t.dueDate));
    }).length;
    return { total: tasks.length, completed, inProgress, overdue };
  }, [tasks]);

  const completionRate =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  function toggleDate(dateLabel: string) {
    setExpandedDates((prev) => {
      const next = new Set(prev);
      if (next.has(dateLabel)) {
        next.delete(dateLabel);
      } else {
        next.add(dateLabel);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4 space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-[400px]" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your work
          </p>
        </div>
        <TaskForm />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <ListTodo className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Total Tasks</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5 border-green-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-xs text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border-amber-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-500/20 rounded-lg">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-xs text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500/10 to-red-500/5 border-red-500/20">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.overdue}</p>
                <p className="text-xs text-muted-foreground">Overdue</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Bar */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Overall Progress</span>
            <span className="text-sm text-muted-foreground">
              {completionRate}%
            </span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </CardContent>
      </Card>

      {/* Filter Tabs */}
      <Tabs value={status} onValueChange={setStatus} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" className="gap-2">
            <ListTodo className="h-4 w-4" />
            All
          </TabsTrigger>
          <TabsTrigger value="not_started" className="gap-2">
            <Circle className="h-4 w-4" />
            To Do
          </TabsTrigger>
          <TabsTrigger value="in_progress" className="gap-2">
            <Play className="h-4 w-4" />
            In Progress
          </TabsTrigger>
          <TabsTrigger value="done" className="gap-2">
            <CheckCircle2 className="h-4 w-4" />
            Completed
          </TabsTrigger>
        </TabsList>

        <TabsContent value={status} className="space-y-4">
          {dateOrder.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-12 text-center">
                <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">
                  {status === "all"
                    ? "No tasks yet. Create your first task!"
                    : `No ${status.replace("_", " ")} tasks`}
                </p>
              </CardContent>
            </Card>
          ) : (
            dateOrder.map((dateLabel) => (
              <Card key={dateLabel} className="overflow-hidden">
                <button
                  onClick={() => toggleDate(dateLabel)}
                  className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-sm font-medium",
                        getDateBadgeStyle(
                          dateLabel === "Today"
                            ? new Date()
                            : dateLabel === "Tomorrow"
                              ? new Date(Date.now() + 86400000)
                              : dateLabel === "Yesterday"
                                ? new Date(Date.now() - 86400000)
                                : dateLabel === "Unscheduled"
                                  ? null
                                  : new Date(dateLabel),
                        ),
                      )}
                    >
                      {dateLabel}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {groupedTasks[dateLabel]?.length || 0} task
                      {groupedTasks[dateLabel]?.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  {expandedDates.has(dateLabel) ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>

                {expandedDates.has(dateLabel) && (
                  <CardContent className="pt-0 pb-4">
                    <div className="space-y-2">
                      {groupedTasks[dateLabel]?.map((task: Task) => (
                        <div
                          key={task.id}
                          className={cn(
                            "flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors",
                            task.status === "done" && "opacity-60",
                          )}
                        >
                          {/* Complete Button */}
                          <button
                            onClick={() => {
                              if (task.status !== "done") {
                                completeTask.mutate({ id: task.id });
                              }
                            }}
                            className={cn(
                              "flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors",
                              task.status === "done"
                                ? "bg-green-500 border-green-500 text-white"
                                : "border-muted-foreground/30 hover:border-green-500",
                            )}
                          >
                            {task.status === "done" && (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                          </button>

                          {/* Task Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span
                                className={cn(
                                  "font-medium truncate",
                                  task.status === "done" && "line-through",
                                )}
                              >
                                {task.title}
                              </span>
                              {task.priority && (
                                <span
                                  className={cn(
                                    "text-xs",
                                    priorityColors[task.priority],
                                  )}
                                >
                                  ●
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              {task.project && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px]"
                                  style={{
                                    backgroundColor: task.project.color
                                      ? `${task.project.color}20`
                                      : undefined,
                                    color: task.project.color || undefined,
                                  }}
                                >
                                  {task.project.name}
                                </Badge>
                              )}
                              {task.estimatedMinutes && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {task.estimatedMinutes}m
                                </span>
                              )}
                              {task.dueDate && (
                                <span className="text-xs text-muted-foreground">
                                  Due {format(new Date(task.dueDate), "MMM d")}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Timer Button */}
                          <div className="flex items-center gap-2">
                            {task.status !== "done" && (
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (task.timerRunning) {
                                    stopTimer.mutate({ id: task.id });
                                  } else {
                                    startTimer.mutate({ id: task.id });
                                  }
                                }}
                              >
                                {task.timerRunning ? (
                                  <Pause className="h-4 w-4 text-amber-500" />
                                ) : (
                                  <Play className="h-4 w-4" />
                                )}
                              </Button>
                            )}
                            {task.actualMinutes > 0 && (
                              <span className="text-xs text-muted-foreground">
                                {task.actualMinutes}m
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
