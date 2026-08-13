"use client";

import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import {
  CheckCircle2,
  Clock,
  ListTodo,
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  MoreHorizontal,
  Plus,
  Search,
  Kanban,
  Calendar as CalendarIcon,
  List,
  Trash2,
  Loader2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { TaskForm } from "@/components/tasks/TaskForm";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Skeleton } from "@/components/ui/skeleton";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type?: string;
  dueDate: Date | null;
  scheduledDate: Date | null;
  estimatedMinutes: number | null;
  actualMinutes: number;
  timerRunning?: boolean;
  project?: { id: string; name: string; color: string | null } | null;
}

interface TasksClientProps {
  initialTasks?: any[];
}

export function TasksClient({ initialTasks }: TasksClientProps) {
  const [viewMode, setViewMode] = useState<"list" | "kanban" | "calendar">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentCalendarDate, setCurrentCalendarDate] = useState(new Date());
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["todo", "in_progress", "in_review", "completed"]),
  );

  // Inline Quick-Add Task State
  const [addingInCol, setAddingInCol] = useState<string | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState("");

  const utils = trpc.useUtils();

  const { data: tasksData, isLoading } = trpc.task.getTasks.useQuery(undefined, {
    initialData: initialTasks,
    staleTime: 1000 * 60 * 5,
    refetchOnWindowFocus: false,
  });

  const taskList: Task[] = useMemo(() => {
    const raw = tasksData ?? initialTasks;
    if (Array.isArray(raw)) return raw;
    if (raw && typeof raw === "object" && Array.isArray((raw as any).tasks)) {
      return (raw as any).tasks;
    }
    return [];
  }, [tasksData, initialTasks]);

  const completeTask = trpc.task.completeTask.useMutation({
    onSuccess: () => {
      toast.success("Task updated!");
      utils.task.getTasks.invalidate();
    },
  });

  const updateTask = trpc.task.updateTask.useMutation({
    onSuccess: () => {
      toast.success("Task moved!");
      utils.task.getTasks.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to update task"),
  });

  const deleteTask = trpc.task.deleteTask.useMutation({
    onSuccess: () => {
      toast.success("Task deleted!");
      utils.task.getTasks.invalidate();
    },
    onError: (err) => toast.error(err.message || "Failed to delete task"),
  });

  const createTask = trpc.task.createTask.useMutation({
    onSuccess: () => {
      toast.success("Task added!");
      utils.task.getTasks.invalidate();
      setAddingInCol(null);
      setNewTaskTitle("");
    },
    onError: (err) => toast.error(err.message || "Failed to add task"),
  });

  function handleQuickAddTask(colKey: string) {
    if (!newTaskTitle.trim()) return;
    const targetStatus =
      colKey === "todo"
        ? "not_started"
        : colKey === "completed"
        ? "done"
        : colKey;

    createTask.mutate({
      title: newTaskTitle.trim(),
      status: targetStatus,
      priority: "medium",
      type: "shallow_work",
    });
  }

  // Group tasks into 4 stages: To Do, In Progress, In Review, Completed
  const groupedTasks = useMemo(() => {
    const filtered = taskList.filter(
      (t) => t && t.title && t.title.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    return {
      todo: filtered.filter(
        (t) =>
          !t.status ||
          t.status === "not_started" ||
          t.status === "todo" ||
          t.status === "to_do" ||
          t.status === "pending",
      ),
      in_progress: filtered.filter(
        (t) => t.status === "in_progress" || t.status === "doing",
      ),
      in_review: filtered.filter(
        (t) => t.status === "in_review" || t.status === "review",
      ),
      completed: filtered.filter(
        (t) => t.status === "done" || t.status === "completed" || t.status === "finished",
      ),
    };
  }, [taskList, searchQuery]);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  };

  const sectionsConfig = [
    { key: "todo", title: "To Do", tasks: groupedTasks.todo, badgeColor: "bg-blue-500/15 text-blue-500", dotColor: "bg-blue-500", rawStatus: "not_started" },
    { key: "in_progress", title: "In Progress", tasks: groupedTasks.in_progress, badgeColor: "bg-amber-500/15 text-amber-500", dotColor: "bg-amber-500", rawStatus: "in_progress" },
    { key: "in_review", title: "In Review", tasks: groupedTasks.in_review, badgeColor: "bg-purple-500/15 text-purple-500", dotColor: "bg-purple-500", rawStatus: "in_review" },
    { key: "completed", title: "Completed", tasks: groupedTasks.completed, badgeColor: "bg-emerald-500/15 text-emerald-500", dotColor: "bg-emerald-500", rawStatus: "done" },
  ];

  // Calendar week days calculations
  const weekStart = startOfWeek(currentCalendarDate, { weekStartsOn: 1 });
  const weekDays = Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i));

  return (
    <div className="w-full space-y-6 pb-12">
      {/* Top Header & View Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <ListTodo className="w-7 h-7 text-emerald-500" />
            Tasks & Workspace
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Kanban workflow, Calendar schedule, and List breakdown
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* View Switcher Pills */}
          <div className="bg-secondary p-1 rounded-full flex items-center shadow-inner">
            <button
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200",
                viewMode === "kanban"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Kanban className="w-3.5 h-3.5" /> Kanban
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200",
                viewMode === "list"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <List className="w-3.5 h-3.5" /> List
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold transition-all duration-200",
                viewMode === "calendar"
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <CalendarIcon className="w-3.5 h-3.5" /> Calendar
            </button>
          </div>

          {/* Search Bar Pill */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-secondary text-foreground text-xs rounded-full pl-9 pr-4 py-2 w-44 focus:w-60 focus:outline-none transition-all placeholder:text-muted-foreground"
            />
          </div>

          <TaskForm />
        </div>
      </div>

      {/* LOADING SKELETON */}
      {isLoading && taskList.length === 0 && (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-5 min-w-[1200px] items-start">
            {[1, 2, 3, 4].map((col) => (
              <div key={col} className="w-80 shrink-0 toota-card p-4 space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-secondary/50">
                  <Skeleton className="h-5 w-28 rounded-full bg-white/10" />
                  <Skeleton className="h-4 w-6 rounded-full bg-white/10" />
                </div>
                <div className="space-y-3">
                  <Skeleton className="h-20 w-full rounded-2xl bg-white/5" />
                  <Skeleton className="h-20 w-full rounded-2xl bg-white/5" />
                  <Skeleton className="h-20 w-full rounded-2xl bg-white/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 1: KANBAN BOARD */}
      {viewMode === "kanban" && (
        <div className="w-full overflow-x-auto pb-4 custom-scrollbar">
          <div className="flex gap-5 min-w-[1200px] items-start">
            {sectionsConfig.map((sec) => (
              <div
                key={sec.key}
                className="w-80 shrink-0 toota-card p-4 space-y-4 flex flex-col max-h-[calc(100vh-220px)]"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-secondary/50">
                  <div className="flex items-center gap-2">
                    <span className={cn("w-2.5 h-2.5 rounded-full", sec.dotColor)} />
                    <h2 className="text-sm font-extrabold text-foreground">{sec.title}</h2>
                    <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full font-mono", sec.badgeColor)}>
                      {sec.tasks.length}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setAddingInCol(sec.key);
                      setNewTaskTitle("");
                    }}
                    className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors"
                    title={`Add task to ${sec.title}`}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>

                {/* Inline Add Task Form */}
                {addingInCol === sec.key && (
                  <div className="toota-card p-3 space-y-2 border border-emerald-500/40 bg-secondary/40">
                    <input
                      autoFocus
                      type="text"
                      placeholder={`Add task to ${sec.title}...`}
                      value={newTaskTitle}
                      onChange={(e) => setNewTaskTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleQuickAddTask(sec.key);
                        if (e.key === "Escape") {
                          setAddingInCol(null);
                          setNewTaskTitle("");
                        }
                      }}
                      className="w-full bg-transparent text-xs font-semibold text-foreground placeholder:text-muted-foreground outline-none"
                    />
                    <div className="flex items-center gap-2 pt-1">
                      <button
                        onClick={() => handleQuickAddTask(sec.key)}
                        disabled={!newTaskTitle.trim() || createTask.isPending}
                        className="text-xs bg-emerald-500 hover:bg-emerald-400 text-black font-bold px-3 py-1 rounded-lg disabled:opacity-50 flex items-center gap-1"
                      >
                        {createTask.isPending ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          "Add Task"
                        )}
                      </button>
                      <button
                        onClick={() => {
                          setAddingInCol(null);
                          setNewTaskTitle("");
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground p-1"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* Scrollable Tasks Container */}
                <div className="overflow-y-auto space-y-3.5 pr-1 flex-1 custom-scrollbar min-h-[200px]">
                  {sec.tasks.length === 0 && addingInCol !== sec.key ? (
                    <div className="p-8 text-center text-xs text-muted-foreground border-2 border-dashed border-secondary/60 rounded-3xl my-2">
                      No tasks in {sec.title.toLowerCase()}
                    </div>
                  ) : (
                    sec.tasks.map((task, idx) => {
                      const isDone = sec.key === "completed";

                      return (
                        <div
                          key={task.id || idx}
                          className="toota-card p-4 space-y-3 hover:translate-y-[-2px] transition-all shadow-sm group bg-secondary/30 hover:bg-secondary/60 relative"
                        >
                          {/* Priority Tag & Interactive Dropdown Menu */}
                          <div className="flex items-center justify-between text-xs">
                            <span
                              className={cn(
                                "text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize",
                                task.priority === "critical" || task.priority === "high"
                                  ? "bg-rose-500/15 text-rose-500"
                                  : task.priority === "medium"
                                  ? "bg-amber-500/15 text-amber-500"
                                  : "bg-blue-500/15 text-blue-500",
                              )}
                            >
                              {task.priority || "Medium"}
                            </span>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                <button className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
                                  <MoreHorizontal className="w-4 h-4" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                                  Move task to...
                                </DropdownMenuLabel>
                                <DropdownMenuItem
                                  onClick={() => updateTask.mutate({ id: task.id, status: "not_started" })}
                                  className="text-xs font-semibold cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" /> To Do
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateTask.mutate({ id: task.id, status: "in_progress" })}
                                  className="text-xs font-semibold cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" /> In Progress
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateTask.mutate({ id: task.id, status: "in_review" })}
                                  className="text-xs font-semibold cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-purple-500 mr-2" /> In Review
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => updateTask.mutate({ id: task.id, status: "done" })}
                                  className="text-xs font-semibold cursor-pointer"
                                >
                                  <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" /> Mark Complete
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  variant="destructive"
                                  onClick={() => {
                                    if (confirm("Are you sure you want to delete this task?")) {
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

                          {/* Task Title */}
                          <div className="flex items-start gap-2.5">
                            <button
                              onClick={() => completeTask.mutate({ id: task.id })}
                              className={cn(
                                "mt-0.5 w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0",
                                isDone
                                  ? "bg-emerald-500 border-emerald-500 text-white"
                                  : "border-muted-foreground/40 hover:border-emerald-500",
                              )}
                            >
                              {isDone && <CheckCircle2 className="w-3 h-3" />}
                            </button>
                            <h3 className={cn("text-xs font-bold text-foreground leading-snug", isDone && "line-through text-muted-foreground")}>
                              {task.title}
                            </h3>
                          </div>

                          {/* Description snippet */}
                          {task.description && (
                            <p className="text-[11px] text-muted-foreground line-clamp-2 pl-6">
                              {task.description}
                            </p>
                          )}

                          {/* Hover Move Quick Action Pills */}
                          <div className="flex flex-wrap gap-1 pt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {sectionsConfig
                              .filter((s) => s.key !== sec.key)
                              .map((s) => (
                                <button
                                  key={s.key}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateTask.mutate({ id: task.id, status: s.rawStatus });
                                  }}
                                  className={cn(
                                    "text-[10px] font-extrabold px-2 py-0.5 rounded-full transition-all hover:scale-105",
                                    s.badgeColor,
                                  )}
                                  title={`Move to ${s.title}`}
                                >
                                  → {s.title}
                                </button>
                              ))}
                          </div>

                          {/* Footer Info */}
                          <div className="flex items-center justify-between pt-2 border-t border-secondary/50 text-[11px] text-muted-foreground">
                            <div className="flex items-center gap-2">
                              {task.project && (
                                <span className="bg-secondary text-foreground text-[10px] font-medium px-2 py-0.5 rounded-full max-w-[100px] truncate">
                                  {task.project.name}
                                </span>
                              )}
                              {task.dueDate && (
                                <span className="font-mono text-[10px] text-muted-foreground flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-amber-500" />
                                  {format(new Date(task.dueDate), "MMM d")}
                                </span>
                              )}
                            </div>

                            <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-black font-bold text-[9px] shrink-0">
                              CJ
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW 2: CALENDAR SCHEDULE */}
      {viewMode === "calendar" && (
        <div className="toota-card p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-foreground">
                Week of {format(weekStart, "MMMM d, yyyy")}
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentCalendarDate(addDays(currentCalendarDate, -7))}
                className="toota-pill p-2 text-xs hover:bg-secondary"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setCurrentCalendarDate(new Date())}
                className="toota-pill text-xs px-3 py-1.5"
              >
                Today
              </button>
              <button
                onClick={() => setCurrentCalendarDate(addDays(currentCalendarDate, 7))}
                className="toota-pill p-2 text-xs hover:bg-secondary"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day, idx) => {
              const isToday = isSameDay(day, new Date());
              const dayTasks = (taskList || []).filter((t: Task) =>
                t && t.dueDate ? isSameDay(new Date(t.dueDate), day) : false,
              );

              return (
                <div
                  key={idx}
                  className={cn(
                    "p-3 rounded-2xl border min-h-[220px] flex flex-col gap-2 transition-all",
                    isToday
                      ? "bg-emerald-500/10 border-emerald-500/30"
                      : "bg-secondary/30 border-secondary/50",
                  )}
                >
                  <div className="flex justify-between items-center pb-2 border-b border-secondary/50">
                    <span className="text-xs font-bold text-muted-foreground">{format(day, "EEE")}</span>
                    <span
                      className={cn(
                        "text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center",
                        isToday ? "bg-emerald-500 text-white" : "text-foreground",
                      )}
                    >
                      {format(day, "d")}
                    </span>
                  </div>

                  <div className="space-y-2 overflow-y-auto max-h-[160px] custom-scrollbar">
                    {dayTasks.length === 0 ? (
                      <p className="text-[10px] text-muted-foreground/60 text-center py-4">No tasks</p>
                    ) : (
                      dayTasks.map((t: Task, tIdx: number) => (
                        <div
                          key={t.id || tIdx}
                          className="bg-secondary p-2 rounded-xl text-xs space-y-1 hover:border-emerald-500/40 border border-transparent transition-colors"
                        >
                          <p className="font-semibold text-foreground truncate text-[11px]">{t.title}</p>
                          <span className="text-[9px] font-mono text-emerald-500 block">
                            {t.estimatedMinutes ? `${t.estimatedMinutes}m` : "Task"}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: LIST VIEW */}
      {viewMode === "list" && (
        <div className="space-y-6">
          {sectionsConfig.map((sec) => {
            const isExpanded = expandedSections.has(sec.key);
            return (
              <div key={sec.key} className="toota-card space-y-3 p-5">
                <button
                  onClick={() => toggleSection(sec.key)}
                  className="w-full flex items-center justify-between py-1 group cursor-pointer"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-1 rounded-lg text-muted-foreground group-hover:text-foreground transition-colors">
                      {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <h2 className="text-base font-bold text-foreground">{sec.title}</h2>
                    <span className={cn("text-xs font-bold px-2.5 py-0.5 rounded-full font-mono", sec.badgeColor)}>
                      {sec.tasks.length}
                    </span>
                  </div>

                  <span className="text-xs text-muted-foreground font-mono">
                    {sec.tasks.length === 1 ? "1 task" : `${sec.tasks.length} tasks`}
                  </span>
                </button>

                {isExpanded && (
                  <div className="pt-2 overflow-x-auto">
                    {sec.tasks.length === 0 ? (
                      <div className="py-6 text-center text-xs text-muted-foreground bg-secondary/30 rounded-2xl">
                        No tasks in {sec.title.toLowerCase()}
                      </div>
                    ) : (
                      <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                          <tr className="text-[11px] font-semibold text-muted-foreground border-b border-secondary/50">
                            <th className="pb-3 pl-2 w-24">Task ID</th>
                            <th className="pb-3">Task Name</th>
                            <th className="pb-3 w-32">Assignee</th>
                            <th className="pb-3 w-36">Project</th>
                            <th className="pb-3 w-28">Deadline</th>
                            <th className="pb-3 w-24">Priority</th>
                            <th className="pb-3 pr-2 w-10 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-secondary/40 text-xs">
                          {sec.tasks.map((task, idx) => {
                            const isDone = sec.key === "completed";

                            return (
                              <tr key={task.id || idx} className="hover:bg-secondary/40 transition-colors group">
                                <td className="py-3 pl-2 font-mono text-muted-foreground text-[11px]">
                                  #{task.id?.slice(0, 6).toUpperCase() || `TSK-${100 + idx}`}
                                </td>

                                <td className="py-3 font-semibold text-foreground pr-4">
                                  <div className="flex items-center gap-2">
                                    <button
                                      onClick={() => completeTask.mutate({ id: task.id })}
                                      className={cn(
                                        "w-4 h-4 rounded-full border flex items-center justify-center transition-colors shrink-0",
                                        isDone
                                          ? "bg-emerald-500 border-emerald-500 text-white"
                                          : "border-muted-foreground/40 hover:border-emerald-500",
                                      )}
                                    >
                                      {isDone && <CheckCircle2 className="w-3 h-3" />}
                                    </button>
                                    <span className={cn(isDone && "line-through text-muted-foreground")}>
                                      {task.title}
                                    </span>
                                  </div>
                                </td>

                                <td className="py-3">
                                  <div className="flex items-center gap-2">
                                    <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-black font-bold text-[9px]">
                                      CJ
                                    </div>
                                    <span className="text-muted-foreground text-[11px]">Clement</span>
                                  </div>
                                </td>

                                <td className="py-3">
                                  <span className="bg-secondary text-foreground text-[11px] font-medium px-2.5 py-1 rounded-full truncate block max-w-[130px]">
                                    {task.project?.name || "General OS"}
                                  </span>
                                </td>

                                <td className="py-3 font-mono text-[11px] text-muted-foreground">
                                  {task.dueDate ? format(new Date(task.dueDate), "MMM d") : "No Date"}
                                </td>

                                <td className="py-3">
                                  <span
                                    className={cn(
                                      "text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize",
                                      task.priority === "critical" || task.priority === "high"
                                        ? "bg-rose-500/15 text-rose-500"
                                        : task.priority === "medium"
                                        ? "bg-amber-500/15 text-amber-500"
                                        : "bg-blue-500/15 text-blue-500",
                                    )}
                                  >
                                    {task.priority || "Medium"}
                                  </span>
                                </td>

                                <td className="py-3 pr-2 text-right">
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                                      <button className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
                                        <MoreHorizontal className="w-4 h-4" />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                      <DropdownMenuLabel className="text-[11px] text-muted-foreground">
                                        Move task to...
                                      </DropdownMenuLabel>
                                      <DropdownMenuItem
                                        onClick={() => updateTask.mutate({ id: task.id, status: "not_started" })}
                                        className="text-xs font-semibold cursor-pointer"
                                      >
                                        <span className="w-2 h-2 rounded-full bg-blue-500 mr-2" /> To Do
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => updateTask.mutate({ id: task.id, status: "in_progress" })}
                                        className="text-xs font-semibold cursor-pointer"
                                      >
                                        <span className="w-2 h-2 rounded-full bg-amber-500 mr-2" /> In Progress
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => updateTask.mutate({ id: task.id, status: "in_review" })}
                                        className="text-xs font-semibold cursor-pointer"
                                      >
                                        <span className="w-2 h-2 rounded-full bg-purple-500 mr-2" /> In Review
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => updateTask.mutate({ id: task.id, status: "done" })}
                                        className="text-xs font-semibold cursor-pointer"
                                      >
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 mr-2" /> Mark Complete
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        variant="destructive"
                                        onClick={() => {
                                          if (confirm("Are you sure you want to delete this task?")) {
                                            deleteTask.mutate({ id: task.id });
                                          }
                                        }}
                                        className="text-xs font-semibold cursor-pointer text-rose-500"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Task
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
