"use client";

import { useState, useMemo } from "react";
import {
  format,
  startOfWeek,
  addDays,
  isSameDay,
  isToday as checkIsToday,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Tag,
  FolderKanban,
  X,
  Play,
  Trash2,
  Target,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useTimerStore } from "@/lib/timerStore";

export interface CalendarTaskItem {
  id: string;
  title: string;
  description?: string | null;
  status?: string;
  priority?: string;
  type?: "task" | "goal";
  dueDate?: Date | string | null;
  scheduledDate?: Date | string | null;
  estimatedMinutes?: number | null;
  actualMinutes?: number;
  project?: { id: string; name: string; color: string | null } | null;
  streakDays?: number;
}

interface TaskCalendarGridProps {
  initialDate?: Date;
  onDateChange?: (date: Date) => void;
  className?: string;
}

export function TaskCalendarGrid({
  initialDate,
  className,
}: TaskCalendarGridProps) {
  const [currentDate, setCurrentDate] = useState(initialDate || new Date());
  const [selectedItem, setSelectedItem] = useState<CalendarTaskItem | null>(null);

  const utils = trpc.useUtils();
  const startTimerStore = useTimerStore((s) => s.start);

  // Queries
  const { data: tasksData, isLoading: tasksLoading } = trpc.task.getTasks.useQuery();
  const { data: goalsData } = trpc.goals.list.useQuery();

  // Mutations
  const completeTask = trpc.task.completeTask.useMutation({
    onSuccess: () => {
      toast.success("Task marked complete! 🎉");
      utils.task.getTasks.invalidate();
      utils.calendar.getEvents.invalidate();
    },
  });

  const deleteTask = trpc.task.deleteTask.useMutation({
    onSuccess: () => {
      toast.success("Task deleted.");
      utils.task.getTasks.invalidate();
      utils.calendar.getEvents.invalidate();
      setSelectedItem(null);
    },
  });

  const toggleGoal = trpc.goals.toggle.useMutation({
    onSuccess: () => {
      toast.success("Goal streak updated! 🔥");
      utils.goals.list.invalidate();
      utils.calendar.getEvents.invalidate();
    },
  });

  // Calculate week days
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = useMemo(
    () => Array.from({ length: 7 }).map((_, i) => addDays(weekStart, i)),
    [weekStart],
  );

  // Combine tasks & goals
  const allItems: CalendarTaskItem[] = useMemo(() => {
    const items: CalendarTaskItem[] = [];

    // Process Tasks
    const rawTasks = Array.isArray(tasksData)
      ? tasksData
      : (tasksData as any)?.tasks || [];
    rawTasks.forEach((t: any) => {
      if (!t) return;
      items.push({
        id: t.id,
        title: t.title,
        description: t.description,
        status: t.status || "not_started",
        priority: t.priority || "medium",
        type: "task",
        dueDate: t.dueDate || t.scheduledDate || t.createdAt,
        scheduledDate: t.scheduledDate || t.dueDate,
        estimatedMinutes: t.estimatedMinutes || 30,
        actualMinutes: t.actualMinutes || 0,
        project: t.project,
      });
    });

    // Process Goals
    const rawGoals = Array.isArray(goalsData)
      ? goalsData
      : (goalsData as any)?.goals || [];
    rawGoals.forEach((g: any) => {
      if (!g) return;
      items.push({
        id: g.id,
        title: `🎯 ${g.title}`,
        description: g.category ? `Category: ${g.category}` : "Daily Goal",
        status: g.completed ? "done" : "in_progress",
        priority: "high",
        type: "goal",
        dueDate: g.lastLoggedAt || g.createdAt || new Date(),
        estimatedMinutes: 45,
        streakDays: g.streakDays || 0,
      });
    });

    return items;
  }, [tasksData, goalsData]);

  const startTimerMutation = trpc.task.startTimer.useMutation({
    onSuccess: () => {
      startTimerStore();
      utils.task.getActiveTimer.invalidate();
      toast.success(`Focus timer active! ⚡`);
    },
    onError: () => {
      startTimerStore();
      toast.success(`Started local focus timer! ⚡`);
    },
  });

  const handleStartTimer = (item: CalendarTaskItem) => {
    startTimerMutation.mutate({ taskId: item.id });
  };

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-secondary/30 p-4 rounded-2xl border border-secondary/60">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-500">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">
              Week of {format(weekStart, "MMMM d, yyyy")}
            </h2>
            <p className="text-xs text-muted-foreground font-mono">
              7-Day Task & Goal Schedule
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setCurrentDate(addDays(currentDate, -7))}
            className="p-2 rounded-xl border border-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setCurrentDate(new Date())}
            className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-emerald-500 hover:bg-emerald-400 text-black shadow-lg shadow-emerald-500/20 transition-all"
          >
            Today
          </button>
          <button
            onClick={() => setCurrentDate(addDays(currentDate, 7))}
            className="p-2 rounded-xl border border-secondary/80 hover:bg-secondary text-muted-foreground hover:text-foreground transition-all"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 7-Column Day Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        {weekDays.map((day, idx) => {
          const isToday = checkIsToday(day);
          const dayItems = allItems.filter((item) => {
            if (!item.dueDate) return false;
            return isSameDay(new Date(item.dueDate), day);
          });

          return (
            <div
              key={idx}
              className={cn(
                "p-3 rounded-2xl border min-h-[260px] flex flex-col gap-3 transition-all",
                isToday
                  ? "bg-emerald-500/10 border-emerald-500/40 shadow-lg shadow-emerald-500/5"
                  : "bg-secondary/20 border-secondary/50 hover:border-secondary/80",
              )}
            >
              {/* Day Header */}
              <div className="flex justify-between items-center pb-2.5 border-b border-secondary/50">
                <span
                  className={cn(
                    "text-xs font-bold font-mono uppercase tracking-wider",
                    isToday ? "text-emerald-400" : "text-muted-foreground",
                  )}
                >
                  {format(day, "EEE")}
                </span>
                <span
                  className={cn(
                    "text-xs font-mono font-bold w-7 h-7 rounded-full flex items-center justify-center transition-all",
                    isToday
                      ? "bg-emerald-500 text-black shadow-md shadow-emerald-500/30"
                      : "bg-secondary text-foreground",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Day Items List */}
              <div className="space-y-2 overflow-y-auto max-h-[320px] custom-scrollbar flex-1 pr-1">
                {dayItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest">
                      No items
                    </p>
                  </div>
                ) : (
                  dayItems.map((item, tIdx) => {
                    const isDone = item.status === "done" || item.status === "completed";
                    const isGoal = item.type === "goal";

                    return (
                      <div
                        key={item.id || tIdx}
                        onClick={() => setSelectedItem(item)}
                        className={cn(
                          "group relative p-2.5 rounded-xl border text-xs space-y-1.5 cursor-pointer transition-all duration-200 hover:scale-[1.02] shadow-sm",
                          isGoal
                            ? "bg-amber-500/10 border-amber-500/30 hover:border-amber-400"
                            : isDone
                            ? "bg-secondary/40 border-emerald-500/20 opacity-75"
                            : "bg-secondary/80 border-secondary hover:border-emerald-500/50 hover:bg-secondary",
                        )}
                      >
                        <div className="flex items-start justify-between gap-1.5">
                          <p
                            className={cn(
                              "font-semibold text-foreground truncate text-[11px] leading-tight flex-1",
                              isDone && "line-through text-muted-foreground",
                            )}
                          >
                            {item.title}
                          </p>
                          <span
                            className={cn(
                              "w-1.5 h-1.5 rounded-full shrink-0 mt-1",
                              isGoal
                                ? "bg-amber-400"
                                : isDone
                                ? "bg-emerald-400"
                                : item.priority === "critical" || item.priority === "high"
                                ? "bg-rose-400"
                                : "bg-blue-400",
                            )}
                          />
                        </div>

                        <div className="flex items-center justify-between text-[9px] font-mono text-muted-foreground pt-0.5">
                          <span className="truncate max-w-[90px]">
                            {item.project?.name || (isGoal ? "Goal" : "Task")}
                          </span>
                          <span className="text-emerald-400 font-bold shrink-0">
                            {item.estimatedMinutes ? `${item.estimatedMinutes}m` : "45m"}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* EXPANDED ITEM INSPECTOR MODAL */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="relative w-full max-w-md bg-[#0a0c10] border border-[#2f3e46] rounded-3xl p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2f3e46]">
              <div className="flex items-center gap-2">
                {selectedItem.type === "goal" ? (
                  <Target className="w-5 h-5 text-amber-400" />
                ) : (
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                )}
                <span className="text-xs font-mono uppercase tracking-widest text-muted-foreground">
                  {selectedItem.type === "goal" ? "Goal Details" : "Task Details"}
                </span>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="p-1.5 rounded-full hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <h3 className="text-xl font-bold text-foreground leading-snug">
                {selectedItem.title}
              </h3>
              {selectedItem.description && (
                <p className="text-xs text-muted-foreground bg-secondary/30 p-3 rounded-xl border border-secondary/50">
                  {selectedItem.description}
                </p>
              )}
            </div>

            {/* Metadata Grid */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-secondary/30 border border-secondary/50 space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                  <Clock className="w-3 h-3 text-emerald-400" /> Scheduled
                </span>
                <p className="font-semibold text-foreground">
                  {selectedItem.dueDate
                    ? format(new Date(selectedItem.dueDate), "MMM d, yyyy")
                    : "Today"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-secondary/50 space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                  <Tag className="w-3 h-3 text-amber-400" /> Priority
                </span>
                <p className="font-semibold text-foreground capitalize">
                  {selectedItem.priority || "Medium"}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-secondary/50 space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                  <FolderKanban className="w-3 h-3 text-blue-400" /> Project / Category
                </span>
                <p className="font-semibold text-foreground truncate">
                  {selectedItem.project?.name || (selectedItem.type === "goal" ? "Goal" : "General")}
                </p>
              </div>

              <div className="p-3 rounded-xl bg-secondary/30 border border-secondary/50 space-y-1">
                <span className="text-[10px] font-mono uppercase text-muted-foreground flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Status
                </span>
                <p className="font-semibold text-foreground capitalize">
                  {selectedItem.status?.replace(/_/g, " ") || "In Progress"}
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="pt-2 space-y-2">
              <button
                onClick={() => {
                  handleStartTimer(selectedItem);
                  setSelectedItem(null);
                }}
                className="w-full py-3 px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs font-mono flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                <Play className="w-4 h-4 fill-current" />
                Start Focus Session ⚡
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    if (selectedItem.type === "goal") {
                      toggleGoal.mutate({ id: selectedItem.id });
                    } else {
                      completeTask.mutate({ id: selectedItem.id });
                    }
                    setSelectedItem(null);
                  }}
                  className="py-2.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs font-mono border border-emerald-500/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Mark Done
                </button>

                <button
                  onClick={() => {
                    if (confirm("Are you sure you want to delete this task?")) {
                      deleteTask.mutate({ id: selectedItem.id });
                    }
                  }}
                  className="py-2.5 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold text-xs font-mono border border-rose-500/30 transition-all flex items-center justify-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
