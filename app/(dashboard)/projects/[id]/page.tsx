"use client";

import { use, useState, useRef } from "react";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  Plus,
  MoreHorizontal,
  MessageSquare,
  CheckSquare,
  X,
  GripVertical,
  Loader2,
  CalendarDays,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

type TaskStatus = "not_started" | "in_progress" | "in_review" | "done";

const COLUMNS: {
  key: TaskStatus;
  title: string;
  badgeColor: string;
  dotColor: string;
  dropBg: string;
}[] = [
  {
    key: "not_started",
    title: "To Do",
    badgeColor: "bg-blue-500/15 text-blue-500",
    dotColor: "bg-blue-500",
    dropBg: "bg-blue-500/5 border-blue-500/30",
  },
  {
    key: "in_progress",
    title: "In Progress",
    badgeColor: "bg-amber-500/15 text-amber-500",
    dotColor: "bg-amber-500",
    dropBg: "bg-amber-500/5 border-amber-500/30",
  },
  {
    key: "in_review",
    title: "Review",
    badgeColor: "bg-purple-500/15 text-purple-500",
    dotColor: "bg-purple-500",
    dropBg: "bg-purple-500/5 border-purple-500/30",
  },
  {
    key: "done",
    title: "Complete",
    badgeColor: "bg-emerald-500/15 text-emerald-500",
    dotColor: "bg-emerald-500",
    dropBg: "bg-emerald-500/5 border-emerald-500/30",
  },
];

const PRIORITY_COLORS: Record<string, string> = {
  critical: "bg-red-500/15 text-red-500",
  high: "bg-orange-500/15 text-orange-500",
  medium: "bg-amber-500/15 text-amber-500",
  low: "bg-blue-500/15 text-blue-400",
};

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);
  const utils = trpc.useUtils();

  const {
    data: project,
    isLoading,
    isError,
  } = trpc.project.getProject.useQuery({ id }, { enabled: !!id, retry: 1 });

  // Optimistic local task ordering
  const [localTasks, setLocalTasks] = useState<any[] | null>(null);

  // Drag state
  const draggingId = useRef<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<TaskStatus | null>(null);

  // Add-task inline state per column
  const [addingInCol, setAddingInCol] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const updateTask = trpc.task.updateTask.useMutation({
    onSuccess: () => {
      utils.project.getProject.invalidate({ id });
      setLocalTasks(null);
    },
    onError: () => {
      toast.error("Failed to move task");
      setLocalTasks(null);
    },
  });

  const createTask = trpc.task.createTask.useMutation({
    onSuccess: () => {
      toast.success("Task added!");
      setLocalTasks(null);
      utils.project.getProject.invalidate({ id });
      setAddingInCol(null);
      setNewTaskTitle("");
    },
    onError: () => toast.error("Failed to add task"),
  });

  const deleteTask = trpc.task.deleteTask.useMutation({
    onSuccess: () => {
      toast.success("Task deleted!");
      setLocalTasks(null);
      utils.project.getProject.invalidate({ id });
    },
    onError: () => toast.error("Failed to delete task"),
  });

  // ── Drag handlers ────────────────────────────────────────────────────────
  function handleDragStart(taskId: string) {
    draggingId.current = taskId;
  }

  function handleDragOver(e: React.DragEvent, col: TaskStatus) {
    e.preventDefault();
    setDragOverCol(col);
  }

  function handleDrop(e: React.DragEvent, col: TaskStatus) {
    e.preventDefault();
    setDragOverCol(null);
    const taskId = draggingId.current;
    if (!taskId) return;

    const tasks = localTasks ?? project?.tasks ?? [];
    const task = tasks.find((t: any) => t.id === taskId);
    if (!task || task.status === col) return;

    // Optimistic update
    setLocalTasks(
      tasks.map((t: any) => (t.id === taskId ? { ...t, status: col } : t))
    );

    updateTask.mutate({ id: taskId, status: col });
    draggingId.current = null;
  }

  function handleDragEnd() {
    setDragOverCol(null);
    draggingId.current = null;
  }

  // ── Add task inline ──────────────────────────────────────────────────────
  function handleAddTask(colKey: TaskStatus) {
    if (!newTaskTitle.trim()) return;
    createTask.mutate({
      title: newTaskTitle.trim(),
      projectId: id,
      priority: "medium",
      type: "shallow_work",
      status: colKey,
    });
  }

  // ── Render ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="w-full space-y-6 animate-pulse p-6">
        <div className="h-8 w-64 bg-secondary rounded-2xl" />
        <div className="grid grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-96 bg-secondary/50 rounded-3xl" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !project) return notFound();

  const tasks: any[] = localTasks ?? project.tasks ?? [];

  const completedTasks = tasks.filter((t) => t.status === "done");

  return (
    <div className="w-full space-y-5 pb-12">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
            <Link
              href="/projects"
              className="hover:text-foreground transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" />
              Projects
            </Link>
            <span>/</span>
            <span className="text-foreground">{project.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
              {project.name}
            </h1>
            <span className="bg-emerald-500/15 text-emerald-500 text-xs font-bold px-3 py-1 rounded-full capitalize">
              {project.status.replace("_", " ")}
            </span>
          </div>
        </div>

        {/* Metrics strip */}
        <div className="flex items-center gap-6 text-sm">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <CheckSquare className="w-4 h-4" />
            <span className="font-semibold text-foreground">
              {completedTasks.length}
            </span>
            <span>/ {tasks.length}</span>
          </div>
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span className="font-semibold text-foreground">
              {Math.round((project.actualHoursSpent ?? 0) * 10) / 10}h
            </span>
          </div>
          {project.deadline && (
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays className="w-4 h-4" />
              <span className="font-semibold text-foreground">
                {new Date(project.deadline).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </div>
          )}
          {/* Progress pill */}
          <div className="hidden md:flex items-center gap-2 toota-card px-4 py-2">
            <div className="h-1.5 w-20 bg-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all"
                style={{ width: `${project.completionPercentage ?? 0}%` }}
              />
            </div>
            <span className="text-xs font-bold text-foreground">
              {Math.round(project.completionPercentage ?? 0)}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Kanban Board ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t: any) => {
            if (col.key === "not_started")
              return t.status === "not_started" || !t.status;
            if (col.key === "in_review")
              return t.status === "in_review" || t.status === "blocked";
            return t.status === col.key;
          });

          const isOver = dragOverCol === col.key;

          return (
            <div
              key={col.key}
              className="flex flex-col gap-3"
              onDragOver={(e) => handleDragOver(e, col.key)}
              onDrop={(e) => handleDrop(e, col.key)}
              onDragLeave={() => setDragOverCol(null)}
            >
              {/* Column header */}
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <span className={cn("w-2 h-2 rounded-full", col.dotColor)} />
                  <h2 className="text-sm font-bold text-foreground">
                    {col.title}
                  </h2>
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      col.badgeColor
                    )}
                  >
                    {colTasks.length}
                  </span>
                </div>
                <button
                  onClick={() => {
                    setAddingInCol(col.key);
                    setNewTaskTitle("");
                  }}
                  className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                  title={`Add task to ${col.title}`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Drop zone container */}
              <div
                className={cn(
                  "flex flex-col gap-3 min-h-[220px] rounded-2xl p-2 border-2 transition-all duration-150",
                  isOver
                    ? cn("border-dashed", col.dropBg)
                    : "border-transparent"
                )}
              >
                {/* Inline add-task form */}
                {addingInCol === col.key && (
                  <div className="toota-card p-3 space-y-2 border border-primary/30">
                    <input
                      autoFocus
                      type="text"
                      placeholder="Task title..."
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleAddTask(col.key);
                        if (e.key === "Escape") {
                          setAddingInCol(null);
                          setNewTaskTitle("");
                        }
                      }}
                      className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleAddTask(col.key)}
                        disabled={!newTaskTitle.trim() || createTask.isPending}
                        className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-semibold disabled:opacity-50 flex items-center gap-1"
                      >
                        {createTask.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Add"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setAddingInCol(null);
                          setNewTaskTitle("");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground px-2 py-1.5 rounded-lg"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Task cards */}
                {colTasks.map((task: any) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={() => handleDragStart(task.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      "toota-card p-4 space-y-3 cursor-grab active:cursor-grabbing",
                      "hover:translate-y-[-2px] hover:shadow-lg transition-all duration-150 group",
                      updateTask.isPending && draggingId.current === task.id
                        ? "opacity-50"
                        : "opacity-100"
                    )}
                  >
                    {/* Top row: priority + drag handle */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider",
                          PRIORITY_COLORS[task.priority] ??
                            "bg-secondary text-muted-foreground"
                        )}
                      >
                        {task.priority ?? "medium"}
                      </span>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <GripVertical className="w-3.5 h-3.5 text-muted-foreground" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                            <button className="p-0.5 text-muted-foreground hover:text-foreground rounded-md hover:bg-secondary">
                              <MoreHorizontal className="w-4 h-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuLabel className="text-[11px] text-muted-foreground">Move to...</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={() => {
                                updateTask.mutate({ id: task.id, status: "not_started" });
                              }}
                              className="text-xs font-semibold cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" /> To Do
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                updateTask.mutate({ id: task.id, status: "in_progress" });
                              }}
                              className="text-xs font-semibold cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" /> In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                updateTask.mutate({ id: task.id, status: "in_review" });
                              }}
                              className="text-xs font-semibold cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full bg-purple-500 mr-2" /> In Review
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                updateTask.mutate({ id: task.id, status: "done" });
                              }}
                              className="text-xs font-semibold cursor-pointer"
                            >
                              <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" /> Complete
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              variant="destructive"
                              onClick={() => {
                                if (confirm("Delete this task?")) {
                                  deleteTask.mutate({ id: task.id });
                                }
                              }}
                              className="text-xs font-semibold cursor-pointer text-rose-500"
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Task
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Title */}
                    <p className="text-sm font-semibold text-foreground leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                      {task.title}
                    </p>

                    {/* Status move quick-pills */}
                    <div className="flex flex-wrap gap-1">
                      {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                        <button
                          key={c.key}
                          onClick={() => {
                            const curTasks = localTasks ?? project.tasks ?? [];
                            setLocalTasks(
                              curTasks.map((t: any) =>
                                t.id === task.id ? { ...t, status: c.key } : t
                              )
                            );
                            updateTask.mutate({ id: task.id, status: c.key });
                          }}
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full transition-all",
                            "opacity-0 group-hover:opacity-100",
                            c.badgeColor,
                            "hover:scale-105"
                          )}
                          title={`Move to ${c.title}`}
                        >
                          → {c.title}
                        </button>
                      ))}
                    </div>

                    {/* Footer */}
                    <div className="flex items-center justify-between pt-1 border-t border-secondary/40 text-xs text-muted-foreground">
                      <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-black font-bold text-[9px]">
                        CJ
                      </div>
                      {task.dueDate && (
                        <span className="font-mono text-[10px]">
                          {new Date(task.dueDate).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {/* Empty drop hint */}
                {colTasks.length === 0 && addingInCol !== col.key && (
                  <div
                    className={cn(
                      "flex-1 flex items-center justify-center rounded-xl border-2 border-dashed min-h-[120px] text-xs font-medium transition-all",
                      isOver
                        ? cn("border-opacity-100", col.dropBg)
                        : "border-secondary/40 text-muted-foreground"
                    )}
                  >
                    {isOver ? "Drop here" : "No tasks yet"}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
