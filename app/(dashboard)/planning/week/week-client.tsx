"use client";

import { useState, useMemo } from "react";
import { format, addWeeks, subWeeks, startOfWeek, addDays } from "date-fns";
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  useSortable,
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  CheckCircle2,
  Target,
  GripVertical,
  Circle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { TaskForm } from "@/components/tasks/TaskForm";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Task {
  id: string;
  title: string;
  status: string;
  priority: string;
  estimatedMinutes: number | null;
  scheduledDate: Date | null;
  project?: { id: string; name: string; color: string | null } | null;
}

// Draggable Task Card Component
function DraggableTaskCard({
  task,
  isDragging,
}: {
  task: Task;
  isDragging?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } =
    useSortable({
      id: task.id,
    });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priorityColors: Record<string, string> = {
    critical: "bg-red-500",
    high: "bg-orange-500",
    medium: "bg-yellow-500",
    low: "bg-green-500",
  };

  const isCompleted = task.status === "done";
  const projectColor = task.project?.color || "#6366f1";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 p-3 rounded-lg border transition-all cursor-grab active:cursor-grabbing",
        "bg-card hover:bg-card/80 hover:shadow-md",
        isCompleted && "opacity-50",
        isDragging && "shadow-xl ring-2 ring-primary z-50",
      )}
      {...attributes}
      {...listeners}
    >
      {/* Drag Handle */}
      <GripVertical className="size-4 text-muted-foreground/50 shrink-0 mt-0.5" />

      {/* Project Color Bar */}
      <div
        className="w-1 h-full min-h-[40px] rounded-full shrink-0"
        style={{ backgroundColor: projectColor }}
      />

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          {isCompleted ? (
            <CheckCircle2 className="size-4 text-green-500 shrink-0 mt-0.5" />
          ) : (
            <Circle className="size-4 text-muted-foreground shrink-0 mt-0.5" />
          )}
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium leading-tight",
                isCompleted && "line-through text-muted-foreground",
              )}
            >
              {task.title}
            </p>

            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              {/* Priority */}
              <span
                className={cn(
                  "size-2 rounded-full",
                  priorityColors[task.priority],
                )}
                title={task.priority}
              />

              {/* Project name */}
              {task.project && (
                <span className="text-xs text-muted-foreground bg-accent/50 px-1.5 py-0.5 rounded">
                  {task.project.name}
                </span>
              )}

              {/* Estimated time */}
              {task.estimatedMinutes && (
                <span className="text-xs text-muted-foreground flex items-center gap-1 ml-auto">
                  <Clock className="size-3" />
                  {task.estimatedMinutes}m
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Droppable Day Column
function DayColumn({
  dayName,
  date,
  tasks,
  isToday,
  onScheduleTask,
}: {
  dayName: string;
  date: Date;
  tasks: Task[];
  isToday: boolean;
  onScheduleTask: (taskId: string, date: Date) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Day Header */}
      <div
        className={cn(
          "p-3 rounded-t-lg text-center border-b transition-colors shrink-0",
          isToday ? "bg-primary/20 border-primary" : "bg-card/50 border-muted",
        )}
      >
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {dayName}
        </div>
        <div className={cn("text-xl font-bold", isToday && "text-primary")}>
          {format(date, "d")}
        </div>
        <div className="text-[10px] text-muted-foreground">
          {format(date, "MMM")}
        </div>
      </div>

      {/* Tasks Area - Scrollable */}
      <div className="flex-1 p-2 bg-card/30 rounded-b-lg border border-t-0 min-h-[200px] overflow-y-auto space-y-2">
        <SortableContext
          items={tasks.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {tasks.map((task) => (
            <DraggableTaskCard key={task.id} task={task} />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-full text-xs text-muted-foreground italic py-8">
            Drop tasks here
          </div>
        )}
      </div>
    </div>
  );
}

export function WeekPlanningClient() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = addDays(weekStart, 6);

  // Fetch weekly overview for week plan and stats
  const {
    data: overview,
    refetch,
    isLoading: overviewLoading,
    error: overviewError,
  } = trpc.planning.getWeeklyOverview.useQuery({ weekStart });

  // Also fetch ALL tasks directly using the query we KNOW works
  const {
    data: allTasks,
    isLoading: tasksLoading,
    error: tasksError,
  } = trpc.task.getTasks.useQuery({});

  const utils = trpc.useUtils();

  const isLoading = overviewLoading || tasksLoading;
  const error = overviewError || tasksError;

  const scheduleMutation = trpc.planning.scheduleTask.useMutation({
    onSuccess: () => {
      utils.planning.getWeeklyOverview.invalidate();
      utils.task.getTasks.invalidate();
      toast.success("Task scheduled!");
    },
    onError: (err) => {
      toast.error("Failed: " + err.message);
    },
  });

  const upsertMutation = trpc.planning.upsertWeekPlan.useMutation({
    onSuccess: () => {
      utils.planning.getWeeklyOverview.invalidate();
      toast.success("Week plan updated!");
    },
    onError: (err) => {
      toast.error("Failed: " + err.message);
    },
  });

  // DnD Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleStartPlanning = () => {
    upsertMutation.mutate({
      weekStart,
      topOutcomes: ["Define your top outcome for the week"],
    });
  };

  const days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  // Debug: Log tasks data
  console.log("All tasks from getTasks:", allTasks);
  console.log("Tasks count:", allTasks?.length || 0);

  // Group tasks by day using allTasks from the WORKING query
  const tasksByDay = useMemo(() => {
    const result: Record<string, Task[]> = {};
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayKey = format(day, "yyyy-MM-dd");
      result[dayKey] = [];
    }

    // Use allTasks (from getTasks which works) instead of overview.tasksByDay
    (allTasks || []).forEach((task: any) => {
      if (task.scheduledDate) {
        const taskDate = new Date(task.scheduledDate);
        const dayKey = format(taskDate, "yyyy-MM-dd");
        if (result[dayKey]) {
          result[dayKey].push(task as Task);
        }
      }
    });

    return result;
  }, [allTasks, weekStart]);

  // Unscheduled tasks - tasks with no scheduledDate and not done
  const unscheduledTasks = useMemo(() => {
    return ((allTasks || []) as Task[]).filter(
      (t) => !t.scheduledDate && t.status !== "done",
    );
  }, [allTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const allTasks = [...unscheduledTasks, ...Object.values(tasksByDay).flat()];
    const task = allTasks.find((t) => t.id === taskId);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    // Check if dropped on a day column (over.id will be the day key)
    const dayMatch = overId.match(/^day-(\d{4}-\d{2}-\d{2})$/);
    if (dayMatch) {
      const targetDate = new Date(dayMatch[1]);
      scheduleMutation.mutate({ taskId, date: targetDate });
      return;
    }

    // Check if dropped on backlog
    if (overId === "backlog") {
      scheduleMutation.mutate({ taskId, date: undefined as any });
      return;
    }
  };

  const completionRate = overview?.stats?.totalTasks
    ? Math.round(
        (overview.stats.completedTasks / overview.stats.totalTasks) * 100,
      )
    : 0;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-background">
        <div className="container mx-auto py-6 px-4">
          {/* Show loading state */}
          {isLoading && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading week data...</p>
              </div>
            </div>
          )}

          {/* Show error state */}
          {error && (
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="text-center text-red-500">
                <p className="font-bold">Error loading data</p>
                <p className="text-sm">{error.message}</p>
              </div>
            </div>
          )}

          {/* Main content only when loaded */}
          {!isLoading && !error && (
            <>
              {/* Header */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-6 gap-4">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight">
                    Week Planning
                  </h1>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Drag tasks to schedule them for the week
                  </p>
                </div>

                <div className="flex items-center gap-3 flex-wrap">
                  <Button
                    onClick={handleStartPlanning}
                    size="sm"
                    className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
                    disabled={upsertMutation.isPending}
                  >
                    <Target className="size-4 mr-1" />
                    {overview?.weekPlan ? "Update Outcomes" : "Start Planning"}
                  </Button>

                  <div className="flex items-center gap-2 border-l pl-3 border-muted">
                    <Button variant="outline" size="sm" onClick={goToToday}>
                      Today
                    </Button>
                    <div className="flex items-center border rounded-md">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={prevWeek}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="px-3 text-sm font-medium min-w-[130px] text-center">
                        {format(weekStart, "MMM d")} –{" "}
                        {format(addDays(weekStart, 6), "MMM d")}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={nextWeek}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-4 gap-3 mb-6">
                <div className="bg-card/50 border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Tasks
                    </p>
                    <p className="text-lg font-bold">
                      {overview?.stats?.completedTasks || 0}/
                      {overview?.stats?.totalTasks || 0}
                    </p>
                  </div>
                  <CheckCircle2 className="h-6 w-6 text-green-500/50" />
                </div>
                <div className="bg-card/50 border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Progress
                    </p>
                    <p className="text-lg font-bold">{completionRate}%</p>
                  </div>
                  <Progress value={completionRate} className="w-12 h-1.5" />
                </div>
                <div className="bg-card/50 border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Hours
                    </p>
                    <p className="text-lg font-bold">
                      {overview?.stats?.hoursLogged || 0}h
                    </p>
                  </div>
                  <Clock className="h-6 w-6 text-secondary/50" />
                </div>
                <div className="bg-card/50 border rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase">
                      Backlog
                    </p>
                    <p className="text-lg font-bold">
                      {unscheduledTasks.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Main Layout - Week Grid Full Width, Backlog Below */}
              <div className="space-y-6">
                {/* 7-Day Week Grid - Full Width */}
                <div className="grid grid-cols-7 gap-3">
                  {days.map((dayName, idx) => {
                    const currentDay = addDays(weekStart, idx);
                    const dayKey = format(currentDay, "yyyy-MM-dd");
                    const dayTasks = tasksByDay[dayKey] || [];
                    const isToday = dayKey === format(new Date(), "yyyy-MM-dd");

                    return (
                      <div key={dayKey} id={`day-${dayKey}`}>
                        <DayColumn
                          dayName={dayName.slice(0, 3)}
                          date={currentDay}
                          tasks={dayTasks}
                          isToday={isToday}
                          onScheduleTask={(taskId, date) =>
                            scheduleMutation.mutate({ taskId, date })
                          }
                        />
                      </div>
                    );
                  })}
                </div>

                {/* Backlog Panel - Full Width Below */}
                <Card className="bg-card/40 border-primary/10" id="backlog">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between">
                    <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                      Backlog ({unscheduledTasks.length} unscheduled tasks)
                    </CardTitle>
                    <TaskForm
                      onSuccess={() => {
                        toast.success("Task created!");
                        refetch();
                      }}
                    />
                  </CardHeader>
                  <CardContent>
                    {unscheduledTasks.length > 0 ? (
                      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                        <SortableContext
                          items={unscheduledTasks.map((t) => t.id)}
                          strategy={verticalListSortingStrategy}
                        >
                          {unscheduledTasks.map((task) => (
                            <DraggableTaskCard key={task.id} task={task} />
                          ))}
                        </SortableContext>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <CheckCircle2 className="size-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">
                          All tasks scheduled! Great job!
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeTask && <DraggableTaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
