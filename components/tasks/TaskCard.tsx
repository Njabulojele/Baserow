"use client";

import { Play, Pause, Clock, Flag, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";

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
  project: {
    id: string;
    name: string;
    color: string | null;
  } | null;
}

interface TaskCardProps {
  task: Task;
  onComplete?: () => void;
}

const priorityConfig = {
  critical: { color: "bg-red-500", label: "Critical" },
  high: { color: "bg-orange-500", label: "High" },
  medium: { color: "bg-yellow-500", label: "Medium" },
  low: { color: "bg-green-500", label: "Low" },
};

export function TaskCard({ task, onComplete }: TaskCardProps) {
  const utils = trpc.useUtils();

  const startTimer = trpc.task.startTimer.useMutation({
    // Optimistic update
    onMutate: async ({ id }) => {
      await utils.task.getTasks.cancel();
      const previousTasks = utils.task.getTasks.getData();

      utils.task.getTasks.setData(undefined, (old) =>
        old?.map((t) =>
          t.id === id
            ? {
                ...t,
                timerRunning: true,
                currentTimerStart: new Date(),
                status: "in_progress",
              }
            : { ...t, timerRunning: false },
        ),
      );

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      utils.task.getTasks.setData(undefined, context?.previousTasks);
    },
    onSettled: () => {
      utils.task.getTasks.invalidate();
      utils.task.getActiveTimer.invalidate();
      utils.analytics.getDashboardStats.invalidate();
    },
  });

  const stopTimer = trpc.task.stopTimer.useMutation({
    // Optimistic update
    onMutate: async ({ id }) => {
      await utils.task.getTasks.cancel();
      const previousTasks = utils.task.getTasks.getData();

      utils.task.getTasks.setData(undefined, (old) =>
        old?.map((t) =>
          t.id === id
            ? { ...t, timerRunning: false, currentTimerStart: null }
            : t,
        ),
      );

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      utils.task.getTasks.setData(undefined, context?.previousTasks);
    },
    onSettled: () => {
      utils.task.getTasks.invalidate();
      utils.task.getActiveTimer.invalidate();
      utils.analytics.getDashboardStats.invalidate();
    },
  });

  const completeTask = trpc.task.completeTask.useMutation({
    // Optimistic update
    onMutate: async ({ id }) => {
      await utils.task.getTasks.cancel();
      const previousTasks = utils.task.getTasks.getData();

      utils.task.getTasks.setData(undefined, (old) =>
        old?.map((t) =>
          t.id === id
            ? {
                ...t,
                status: "done",
                timerRunning: false,
                completedAt: new Date(),
              }
            : t,
        ),
      );

      return { previousTasks };
    },
    onError: (err, variables, context) => {
      utils.task.getTasks.setData(undefined, context?.previousTasks);
    },
    onSettled: () => {
      utils.task.getTasks.invalidate();
      utils.task.getTodaysTasks.invalidate();
      utils.analytics.getDashboardStats.invalidate();
      utils.planning.getDayPlan.invalidate();
      onComplete?.();
    },
  });

  const handleToggleTimer = () => {
    if (task.timerRunning) {
      stopTimer.mutate({ id: task.id });
    } else {
      startTimer.mutate({ id: task.id });
    }
  };

  const handleComplete = () => {
    completeTask.mutate({ id: task.id });
  };

  const formatTime = (minutes: number) => {
    const hrs = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return hrs > 0 ? `${hrs}h ${mins}m` : `${mins}m`;
  };

  const priority = priorityConfig[task.priority as keyof typeof priorityConfig];

  return (
    <div
      className={cn(
        "group flex items-center gap-4 p-4 rounded-xl border transition-all",
        "bg-card hover:bg-accent/50",
        task.status === "done" && "opacity-60",
        task.timerRunning && "ring-2 ring-primary",
      )}
    >
      {/* Checkbox */}
      <Checkbox
        checked={task.status === "done"}
        onCheckedChange={handleComplete}
        disabled={completeTask.isPending}
        className="h-5 w-5"
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3
            className={cn(
              "font-medium truncate",
              task.status === "done" && "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </h3>
          {priority && (
            <div
              className={cn("w-2 h-2 rounded-full", priority.color)}
              title={priority.label}
            />
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mt-1.5 text-xs sm:text-sm text-muted-foreground">
          {task.project && (
            <Badge
              variant="outline"
              style={{ borderColor: task.project.color || undefined }}
              className="text-[10px] sm:text-xs"
            >
              {task.project.name}
            </Badge>
          )}
          {task.scheduledDate && (
            <span
              className="flex items-center gap-1 text-blue-600 dark:text-blue-400 whitespace-nowrap"
              title="Scheduled Date"
            >
              <Calendar className="h-3 w-3" />
              {new Date(task.scheduledDate).toLocaleDateString()}
            </span>
          )}
          {task.dueDate && (
            <span
              className={cn(
                "flex items-center gap-1 whitespace-nowrap",
                task.dueDate < new Date() && "text-red-500",
              )}
              title="Due Date"
            >
              <Clock className="h-3 w-3" />
              {new Date(task.dueDate).toLocaleDateString()}
            </span>
          )}
          {task.actualMinutes > 0 && (
            <span className="flex items-center gap-1 whitespace-nowrap">
              <Flag className="h-3 w-3" />
              {formatTime(task.actualMinutes)}
            </span>
          )}
        </div>
      </div>

      {/* Timer Toggle */}
      {task.status !== "done" && (
        <Button
          variant={task.timerRunning ? "default" : "outline"}
          size="icon"
          onClick={handleToggleTimer}
          disabled={startTimer.isPending || stopTimer.isPending}
          className="shrink-0"
        >
          {task.timerRunning ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
      )}
    </div>
  );
}
