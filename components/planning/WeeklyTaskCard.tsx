"use client";

import { CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface WeeklyTaskCardProps {
  task: {
    id: string;
    title: string;
    status: string;
    priority: string;
    estimatedMinutes: number | null;
    project?: {
      id: string;
      name: string;
      color: string | null;
    } | null;
  };
}

const priorityColors: Record<string, string> = {
  critical: "bg-red-500",
  high: "bg-orange-500",
  medium: "bg-yellow-500",
  low: "bg-green-500",
};

export function WeeklyTaskCard({ task }: WeeklyTaskCardProps) {
  const utils = trpc.useUtils();
  const completeMutation = trpc.task.completeTask.useMutation({
    onMutate: async () => {
      // Optimistic update
      await utils.planning.getWeeklyOverview.cancel();
    },
    onSuccess: () => {
      utils.planning.getWeeklyOverview.invalidate();
      toast.success("Task completed!");
    },
    onError: (err) => {
      toast.error("Failed: " + err.message);
    },
  });

  const isCompleted = task.status === "done";
  const projectColor = task.project?.color || "#6366f1";

  return (
    <div
      className={cn(
        "group relative flex items-start gap-2 p-2 rounded-lg border transition-all",
        "bg-card/60 hover:bg-card/80 hover:shadow-sm",
        isCompleted && "opacity-60",
      )}
      style={{ borderLeftColor: projectColor, borderLeftWidth: 3 }}
    >
      {/* Checkbox */}
      <button
        onClick={() => !isCompleted && completeMutation.mutate({ id: task.id })}
        className="mt-0.5 shrink-0"
        disabled={isCompleted || completeMutation.isPending}
      >
        {isCompleted ? (
          <CheckCircle2 className="size-4 text-green-500" />
        ) : (
          <Circle className="size-4 text-muted-foreground hover:text-primary transition-colors" />
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className={cn(
            "text-sm font-medium leading-tight truncate",
            isCompleted && "line-through text-muted-foreground",
          )}
        >
          {task.title}
        </p>

        <div className="flex items-center gap-2 mt-1">
          {/* Priority dot */}
          <span
            className={cn("size-2 rounded-full", priorityColors[task.priority])}
            title={task.priority}
          />

          {/* Project name */}
          {task.project && (
            <span className="text-[10px] text-muted-foreground truncate max-w-[80px]">
              {task.project.name}
            </span>
          )}

          {/* Estimated time */}
          {task.estimatedMinutes && (
            <span className="text-[10px] text-muted-foreground ml-auto">
              {task.estimatedMinutes}m
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
