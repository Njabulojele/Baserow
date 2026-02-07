"use client";

import { trpc } from "@/lib/trpc/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Loader2 } from "lucide-react";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";

function DraggableTask({ task }: { task: any }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `task-${task.id}`,
      data: task,
    });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="p-3 bg-card border rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors group touch-none"
    >
      <div className="flex justify-between items-start mb-2">
        <span className="text-sm font-medium line-clamp-2">{task.title}</span>
        <Badge variant="outline" className="text-[10px] h-5">
          {task.estimatedMinutes || 30}m
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className={task.priority === "critical" ? "text-red-500" : ""}>
          {task.priority}
        </span>
        {task.project && <span>• {task.project.name}</span>}
        {task.scheduledDate && (
          <Badge
            variant="secondary"
            className="text-[9px] h-4 py-0 px-1 ml-auto"
          >
            Scheduled
          </Badge>
        )}
      </div>
    </div>
  );
}

export function UnscheduledSidebar() {
  const { data: tasks, isLoading } = trpc.task.getBacklogTasks.useQuery();
  // I need to create getBacklogTasks in taskRouter!
  // Or reuse getTasks with filter?
  // Let's assume I will add getBacklogTasks or use generic getTasks filtering for scheduledDate: null.

  // Placeholder implementation assuming endpoint will exist.

  if (isLoading) {
    return (
      <div className="p-4 flex justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold flex items-center gap-2">
          <LayoutGrid className="h-4 w-4" />
          Unscheduled Tasks
        </h3>
        <p className="text-xs text-muted-foreground mt-1">
          Drag tasks to the calendar to schedule them.
        </p>
      </div>

      <ScrollArea className="flex-1 p-4 overflow-y-auto">
        <div className="space-y-3">
          {tasks?.map(
            (
              task: any, // Using any for now until endpoint defined
            ) => (
              <DraggableTask key={task.id} task={task} />
            ),
          )}

          {(!tasks || tasks.length === 0) && (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No unscheduled tasks found.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
