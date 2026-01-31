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
  Badge,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
    critical: "border-l-red-500",
    high: "border-l-orange-500",
    medium: "border-l-yellow-500",
    low: "border-l-green-500",
  };

  const isCompleted = task.status === "done";
  const projectColor = task.project?.color || "#6366f1";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative p-2 rounded-md border-l-4 transition-all cursor-grab active:cursor-grabbing",
        "bg-card hover:bg-muted/50 hover:shadow-sm border border-border",
        priorityColors[task.priority] || "border-l-gray-400",
        isCompleted && "opacity-50",
        isDragging && "shadow-xl ring-2 ring-primary z-50",
      )}
      {...attributes}
      {...listeners}
    >
      {/* Drag handle in top-right corner */}
      <GripVertical className="absolute top-1 right-1 size-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />

      {/* Task content - vertical layout */}
      <div className="flex items-start gap-1.5">
        {isCompleted ? (
          <CheckCircle2 className="size-3.5 text-green-500 shrink-0 mt-0.5" />
        ) : (
          <Circle className="size-3.5 text-muted-foreground shrink-0 mt-0.5" />
        )}
        <div className="flex-1 min-w-0">
          <p
            className={cn(
              "text-xs font-medium leading-snug line-clamp-2",
              isCompleted && "line-through text-muted-foreground",
            )}
          >
            {task.title}
          </p>
          {/* Compact metadata row */}
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {task.project && (
              <span
                className="text-[10px] px-1 py-0.5 rounded text-white/90"
                style={{ backgroundColor: projectColor }}
              >
                {task.project.name}
              </span>
            )}
            {task.estimatedMinutes && (
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <Clock className="size-2.5" />
                {task.estimatedMinutes}m
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function DayColumn({
  dayName,
  date,
  tasks,
  isToday,
}: {
  dayName: string;
  date: Date;
  tasks: Task[];
  isToday: boolean;
  onScheduleTask: (taskId: string, date: Date) => void;
}) {
  return (
    <div className="flex flex-col h-full">
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

export function WeekPlan() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTask, setActiveTask] = useState<Task | null>(null);
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const [isFocusDialogOpen, setIsFocusDialogOpen] = useState(false);
  const [isReviewDialogOpen, setIsReviewDialogOpen] = useState(false);

  // Scheduling Data
  const {
    data: overview,
    refetch: refetchOverview,
    isLoading: overviewLoading,
  } = trpc.planning.getWeeklyOverview.useQuery({ weekStart });

  const { data: allTasks, isLoading: tasksLoading } =
    trpc.task.getTasks.useQuery({});

  const utils = trpc.useUtils();
  const isLoading = overviewLoading || tasksLoading;

  // Strategy Data
  const currentWeekPlanId = overview?.weekPlan?.id;
  const currentMonthPlanId = overview?.weekPlan?.monthPlanId;

  const { data: weekFocuses } = trpc.strategy.getWeekFocuses.useQuery(
    { weekPlanId: currentWeekPlanId || "" },
    { enabled: !!currentWeekPlanId },
  );

  const { data: monthFocuses } = trpc.strategy.getMonthFocuses.useQuery(
    { monthPlanId: currentMonthPlanId || "" },
    { enabled: !!currentMonthPlanId },
  );

  // Mutations
  const scheduleMutation = trpc.planning.scheduleTask.useMutation({
    onSuccess: () => {
      utils.planning.getWeeklyOverview.invalidate();
      utils.task.getTasks.invalidate();
      toast.success("Task scheduled!");
    },
    onError: (err) => toast.error("Schedule failed: " + err.message),
  });

  const upsertMutation = trpc.planning.upsertWeekPlan.useMutation({
    onSuccess: () => {
      utils.planning.getWeeklyOverview.invalidate();
      toast.success("Week plan updated!");
    },
  });

  const linkFocus = trpc.strategy.linkFocusToWeek.useMutation({
    onSuccess: () => {
      toast.success("Focus linked to week");
      setIsFocusDialogOpen(false);
      utils.strategy.getWeekFocuses.invalidate();
    },
  });

  const updateFocusProgress = trpc.strategy.updateFocusProgress.useMutation({
    onSuccess: () => utils.strategy.getWeekFocuses.invalidate(),
  });

  const updateReview = trpc.planning.upsertWeekPlan.useMutation({
    onSuccess: () => {
      toast.success("Weekly review saved");
      setIsReviewDialogOpen(false);
      utils.planning.getWeeklyOverview.invalidate();
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor),
  );

  const nextWeek = () => setCurrentDate(addWeeks(currentDate, 1));
  const prevWeek = () => setCurrentDate(subWeeks(currentDate, 1));
  const goToToday = () => setCurrentDate(new Date());

  const handleStartPlanning = () => {
    // Just creates the weekplan record if missing
    upsertMutation.mutate({
      weekStart,
      topOutcomes: ["Define your top outcome for the week"],
    });
  };

  function onLinkFocus(monthFocusId: string) {
    if (!currentWeekPlanId) {
      toast.error("Please start planning first to create a week plan");
      return;
    }
    linkFocus.mutate({
      monthFocusId,
      weekPlanId: currentWeekPlanId,
      priority: 1,
    });
  }

  const daysLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const tasksByDay = useMemo(() => {
    const result: Record<string, Task[]> = {};
    for (let i = 0; i < 7; i++) {
      const day = addDays(weekStart, i);
      const dayKey = format(day, "yyyy-MM-dd");
      result[dayKey] = [];
    }

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

  const unscheduledTasks = useMemo(() => {
    return ((allTasks || []) as Task[]).filter(
      (t) => !t.scheduledDate && t.status !== "done",
    );
  }, [allTasks]);

  const handleDragStart = (event: DragStartEvent) => {
    const taskId = event.active.id as string;
    const allFlatTasks = [
      ...unscheduledTasks,
      ...Object.values(tasksByDay).flat(),
    ];
    const task = allFlatTasks.find((t) => t.id === taskId);
    if (task) setActiveTask(task);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveTask(null);
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const overId = over.id as string;

    const dayMatch = overId.match(/^day-(\d{4}-\d{2}-\d{2})$/);
    if (dayMatch) {
      const targetDate = new Date(dayMatch[1]);
      scheduleMutation.mutate({ taskId, date: targetDate });
      return;
    }

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

  // Check available month focuses
  const availableFocuses = monthFocuses?.filter(
    (mf) => !weekFocuses?.some((wf) => wf.monthFocusId === mf.id),
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading week data...</p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-6">
        {/* Header Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handleStartPlanning}
              size="sm"
              className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
              disabled={upsertMutation.isPending}
            >
              <Target className="size-4 mr-1" />
              {overview?.weekPlan ? "Sync Plan" : "Start Planning"}
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-muted/20 p-2 rounded-lg border">
            <div className="px-3 border-r">
              <p className="text-[10px] text-muted-foreground uppercase">
                Tasks
              </p>
              <p className="text-sm font-bold">
                {overview?.stats?.completedTasks || 0}/
                {overview?.stats?.totalTasks || 0}
              </p>
            </div>
            <div className="px-3 border-r">
              <p className="text-[10px] text-muted-foreground uppercase">
                Progress
              </p>
              <p className="text-sm font-bold">{completionRate}%</p>
            </div>
            <div className="px-3 border-r">
              <p className="text-[10px] text-muted-foreground uppercase">
                Hours
              </p>
              <p className="text-sm font-bold">
                {overview?.stats?.hoursLogged || 0}h
              </p>
            </div>
            <div className="px-3">
              <p className="text-[10px] text-muted-foreground uppercase">
                Backlog
              </p>
              <p className="text-sm font-bold">{unscheduledTasks.length}</p>
            </div>
          </div>
        </div>

        {/* Strategy Layer: Weekly Focuses */}
        {currentWeekPlanId && (
          <div className="grid gap-4 md:grid-cols-4">
            {/* Focus List */}
            <Card className="col-span-3 border-indigo-500/10 bg-indigo-50/5">
              <CardHeader className="py-3 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-indigo-600 uppercase tracking-wider">
                  Weekly Priorities
                </CardTitle>
                <Dialog
                  open={isFocusDialogOpen}
                  onOpenChange={setIsFocusDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 text-xs bg-white/50 hover:bg-white text-indigo-600 shadow-sm border"
                    >
                      + Link Monthly Focus
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Select Monthly Focus</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2 mt-2">
                      {availableFocuses?.length === 0 ? (
                        <div className="text-center py-4 text-muted-foreground text-sm">
                          No available monthly focuses.
                        </div>
                      ) : (
                        availableFocuses?.map((mf) => (
                          <div
                            key={mf.id}
                            onClick={() => onLinkFocus(mf.id)}
                            className="p-3 border rounded-md hover:bg-muted cursor-pointer flex justify-between items-center group"
                          >
                            <span className="font-medium">
                              {mf.quarterFocus.goal.title}
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="opacity-0 group-hover:opacity-100"
                            >
                              Select
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent className="py-2 pb-4">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {weekFocuses?.map((wf) => (
                    <div
                      key={wf.id}
                      className="bg-card border rounded-md p-3 shadow-sm"
                    >
                      <p
                        className="font-medium text-sm truncate"
                        title={wf.monthFocus.quarterFocus.goal.title}
                      >
                        {wf.monthFocus.quarterFocus.goal.title}
                      </p>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="h-1.5 flex-1 bg-secondary rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500"
                            style={{ width: `${wf.progress}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-muted-foreground">
                          {wf.progress}%
                        </span>
                      </div>
                    </div>
                  ))}
                  {weekFocuses?.length === 0 && (
                    <div className="col-span-full text-center py-4 text-sm text-muted-foreground border border-dashed rounded-md bg-white/20">
                      No priorities set. Link a monthly focus to stay aligned!
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Review Card */}
            <Card className="col-span-1 border-amber-500/10 bg-amber-50/5">
              <CardHeader className="py-3">
                <CardTitle className="text-sm font-semibold text-amber-600 uppercase tracking-wider">
                  Weekly Review
                </CardTitle>
              </CardHeader>
              <CardContent className="py-2 pb-4 text-center">
                <p className="text-xs text-muted-foreground mb-3">
                  Reflect on wins, challenges, and lessons.
                </p>
                <Button
                  size="sm"
                  className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                  onClick={() => setIsReviewDialogOpen(true)}
                >
                  Open Review
                </Button>

                <Dialog
                  open={isReviewDialogOpen}
                  onOpenChange={setIsReviewDialogOpen}
                >
                  <DialogContent className="max-w-xl">
                    <DialogHeader>
                      <DialogTitle>Weekly Review</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Top Wins</p>
                        <p className="text-xs text-muted-foreground">
                          What went well?
                        </p>
                        <textarea
                          className="w-full min-h-[80px] p-2 border rounded-md text-sm bg-background"
                          placeholder="List your wins..."
                          defaultValue={overview?.weekPlan?.keyWins?.join("\n")}
                          id="reviewWins"
                        />
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">Lessons Learned</p>
                        <p className="text-xs text-muted-foreground">
                          What could be improved?
                        </p>
                        <textarea
                          className="w-full min-h-[80px] p-2 border rounded-md text-sm bg-background"
                          placeholder="Reflections..."
                          defaultValue={overview?.weekPlan?.lessonsLearned?.join(
                            "\n",
                          )}
                          id="reviewLessons"
                        />
                      </div>
                      <Button
                        className="w-full"
                        disabled={updateReview.isPending}
                        onClick={() => {
                          const wins = (
                            document.getElementById(
                              "reviewWins",
                            ) as HTMLTextAreaElement
                          ).value;
                          const lessons = (
                            document.getElementById(
                              "reviewLessons",
                            ) as HTMLTextAreaElement
                          ).value;

                          updateReview.mutate({
                            weekStart,
                            keyWins: wins.split("\n").filter(Boolean),
                            lessonsLearned: lessons.split("\n").filter(Boolean),
                          });
                        }}
                      >
                        {updateReview.isPending && (
                          <Clock className="mr-2 h-4 w-4 animate-spin" />
                        )}
                        Complete Review
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Calendar Grid */}
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
            {daysLabels.map((dayName, idx) => {
              const currentDay = addDays(weekStart, idx);
              const dayKey = format(currentDay, "yyyy-MM-dd");
              const dayTasks = tasksByDay[dayKey] || [];
              const isToday = dayKey === format(new Date(), "yyyy-MM-dd");
              return (
                <div
                  key={dayKey}
                  id={`day-${dayKey}`}
                  className="flex flex-col"
                >
                  {/* Mobile Header for Day */}
                  <div
                    className={cn(
                      "md:hidden flex items-center justify-between p-2 mb-2 rounded-lg border",
                      isToday
                        ? "bg-primary text-primary-foreground border-primary"
                        : "bg-muted/30 border-border",
                    )}
                  >
                    <span className="font-bold">
                      {format(currentDay, "EEEE, MMM d")}
                    </span>
                    {isToday && (
                      <Badge
                        // variant=""
                        className="text-xs bg-background/20 text-foreground"
                      >
                        Today
                      </Badge>
                    )}
                  </div>

                  <DayColumn
                    dayName={dayName}
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

          <Card className="bg-card/40 border-primary/10" id="backlog">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Backlog ({unscheduledTasks.length} unscheduled tasks)
              </CardTitle>
              <TaskForm
                onSuccess={() => {
                  toast.success("Task created!");
                  refetchOverview();
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
                  <p className="text-sm">All tasks scheduled!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DragOverlay>
        {activeTask && <DraggableTaskCard task={activeTask} isDragging />}
      </DragOverlay>
    </DndContext>
  );
}
