"use client";

import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { LayoutGrid, Loader2, Calendar } from "lucide-react";
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
      className="shrink-0 w-64 p-2.5 bg-[#1a252f] border border-[#2f3e46] rounded-xl shadow-md cursor-grab active:cursor-grabbing hover:border-[#a9927d]/60 transition-all group touch-none"
    >
      <div className="flex justify-between items-start mb-1 gap-2">
        <span className="text-[11px] font-mono font-medium text-white line-clamp-1 truncate">
          {task.title}
        </span>
        <Badge
          variant="outline"
          className="text-[9px] h-4 py-0 px-1 border-[#2f3e46] font-mono text-[#a9927d] shrink-0"
        >
          {task.estimatedMinutes || 30}m
        </Badge>
      </div>
      <div className="flex items-center gap-2 text-[9px] font-mono text-gray-400 uppercase tracking-wider">
        <span className={task.priority === "critical" || task.priority === "high" ? "text-red-400 font-bold" : ""}>
          {task.priority || "Medium"}
        </span>
        {task.project && <span className="truncate max-w-[80px]">• {task.project.name}</span>}
      </div>
    </div>
  );
}

export function UnscheduledSidebar() {
  const { data: tasks, isLoading } = trpc.task.getBacklogTasks.useQuery();

  if (isLoading) {
    return (
      <div className="p-3 flex items-center justify-center gap-2 text-xs font-mono text-gray-500 bg-[#0a0c10]">
        <Loader2 className="w-4 h-4 animate-spin text-[#a9927d]" />
        Loading unscheduled tasks...
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0a0c10] border-t border-[#2f3e46] p-3 space-y-2 shrink-0">
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <LayoutGrid className="h-3.5 w-3.5 text-[#a9927d]" />
          <h3 className="font-mono text-[11px] uppercase tracking-widest text-white font-bold">
            Unscheduled Tasks
          </h3>
          <span className="text-[10px] font-mono text-gray-500 hidden sm:inline">
            — Drag tasks to the calendar grid to schedule them
          </span>
        </div>
        {tasks && (
          <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
            {tasks.length} available
          </span>
        )}
      </div>

      {/* Horizontal Draggable Tasks Strip */}
      <div className="flex items-center gap-3 overflow-x-auto custom-scrollbar py-1 px-1">
        {tasks?.map((task: any) => (
          <DraggableTask key={task.id} task={task} />
        ))}

        {(!tasks || tasks.length === 0) && (
          <div className="w-full text-center py-2 text-[10px] uppercase tracking-widest font-mono text-gray-500 flex items-center justify-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-gray-600" />
            No unscheduled tasks found. All clear!
          </div>
        )}
      </div>
    </div>
  );
}
