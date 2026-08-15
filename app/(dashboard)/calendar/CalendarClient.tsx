"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import {
  format,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  addDays,
  subDays,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfDay,
  endOfDay,
} from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  X,
  Clock,
  Tag,
  FolderKanban,
  Activity,
} from "lucide-react";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  useSensor,
  useSensors,
  MouseSensor,
  TouchSensor,
} from "@dnd-kit/core";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc/client";
import { CalendarView } from "@/components/calendar/CalendarView";
import { UnscheduledSidebar } from "@/components/calendar/UnscheduledSidebar";
import { TaskCalendarGrid } from "@/components/calendar/TaskCalendarGrid";
import { CalendarEvent } from "@/types/calendar";

type ViewMode = "grid" | "month" | "week" | "day";

export function CalendarClient() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("grid");
  const [activeDragItem, setActiveDragItem] = useState<any>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(
    null,
  );

  const utils = trpc.useUtils();
  const updateEvent = trpc.calendar.updateEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.task.getBacklogTasks.invalidate();
    },
  });

  const startTimerMutation = trpc.task.startTimer.useMutation({
    onSuccess: () => {
      utils.task.getActiveTimer.invalidate();
      toast.success("Timer started! ⚡");
    },
  });

  const completeTaskMutation = trpc.task.completeTask.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.task.getTasks.invalidate();
      toast.success("Marked as complete!");
      setSelectedEvent(null);
    },
  });

  const deleteTaskMutation = trpc.task.deleteTask.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.task.getTasks.invalidate();
      toast.success("Event deleted.");
      setSelectedEvent(null);
    },
  });

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    }),
  );

  const navigate = (direction: "prev" | "next" | "today") => {
    if (direction === "today") {
      setDate(new Date());
      return;
    }

    if (view === "month") {
      setDate(direction === "next" ? addMonths(date, 1) : subMonths(date, 1));
    } else if (view === "week") {
      setDate(direction === "next" ? addWeeks(date, 1) : subWeeks(date, 1));
    } else {
      setDate(direction === "next" ? addDays(date, 1) : subDays(date, 1));
    }
  };

  const getRange = () => {
    if (view === "month") {
      return { start: startOfMonth(date), end: endOfMonth(date) };
    } else if (view === "week") {
      return { start: startOfWeek(date), end: endOfWeek(date) };
    } else {
      return { start: startOfDay(date), end: endOfDay(date) };
    }
  };

  const { start, end } = getRange();

  const { data: events, isLoading } = trpc.calendar.getEvents.useQuery({
    start,
    end,
  });
  const calendarEvents = (events as unknown as CalendarEvent[]) || [];

  const handleDragStart = (event: any) => {
    setActiveDragItem(event.active.data.current);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveDragItem(null);

    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("task-") && overId.startsWith("slot-")) {
      const taskId = activeId.replace("task-", "");
      const slotData = overId.replace("slot-", "");
      const lastDashIndex = slotData.lastIndexOf("-");
      const dateStr = slotData.substring(0, lastDashIndex);
      const hourStr = slotData.substring(lastDashIndex + 1);

      if (!dateStr || !hourStr) return;

      const newDate = new Date(dateStr);
      newDate.setHours(parseInt(hourStr), 0, 0, 0);

      updateEvent.mutate({
        id: taskId,
        start: newDate,
        end: new Date(newDate.getTime() + 30 * 60000),
      });
    }
  };

  const eventTypeConfig: Record<string, { label: string; color: string }> = {
    task: { label: "Task", color: "#a9927d" },
    time_block: { label: "Time Block", color: "#818cf8" },
    event: { label: "Event", color: "#34d399" },
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-[calc(100vh-3.5rem)] sm:h-[calc(100vh-4rem)] flex flex-col">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-[#2f3e46] bg-[#0a0c10] gap-3 shrink-0">
          <div className="flex items-center justify-between sm:justify-start gap-3 w-full sm:w-auto">
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-[#0a0c10] border-[#2f3e46] text-gray-400 hover:text-white hover:border-[#a9927d]/50 transition-colors"
                onClick={() => navigate("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                className="h-8 text-[10px] font-mono uppercase tracking-widest bg-[#0a0c10] border-[#2f3e46] text-gray-400 hover:text-white hover:border-[#a9927d]/50 transition-colors"
                onClick={() => navigate("today")}
              >
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 bg-[#0a0c10] border-[#2f3e46] text-gray-400 hover:text-white hover:border-[#a9927d]/50 transition-colors"
                onClick={() => navigate("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-sm font-mono font-medium truncate text-white">
              {format(date, view === "day" ? "EEEE, MMMM do" : "MMMM yyyy")}
            </h2>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <SelectTrigger className="w-full sm:w-[120px] h-8 bg-[#0a0c10] border-[#2f3e46] text-white text-[10px] font-mono uppercase tracking-wider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a252f] border-[#2f3e46] text-gray-300">
                <SelectItem
                  value="grid"
                  className="focus:bg-[#0a0c10] focus:text-white cursor-pointer text-xs font-bold text-emerald-400"
                >
                  7-Day Schedule Grid
                </SelectItem>
                <SelectItem
                  value="week"
                  className="focus:bg-[#0a0c10] focus:text-white cursor-pointer text-xs"
                >
                  Timeline Week
                </SelectItem>
                <SelectItem
                  value="month"
                  className="focus:bg-[#0a0c10] focus:text-white cursor-pointer text-xs"
                >
                  Month View
                </SelectItem>
                <SelectItem
                  value="day"
                  className="focus:bg-[#0a0c10] focus:text-white cursor-pointer text-xs"
                >
                  Day View
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
          {/* Main Calendar Grid */}
          <div className="flex-1 overflow-auto bg-[#0a0c10] relative min-w-0 transition-all duration-300">
            {view === "grid" ? (
              <div className="p-4 sm:p-6 h-full overflow-y-auto">
                <TaskCalendarGrid />
              </div>
            ) : (
              <CalendarView
                view={view}
                date={date}
                events={calendarEvents}
                isLoading={isLoading}
                onEventClick={(event) => setSelectedEvent(event)}
              />
            )}
          </div>

          {/* Event Detail Panel — Slide-out on right */}
          {selectedEvent && (
            <div className="w-full lg:w-96 border-l border-[#2f3e46] bg-[#0a0c10] flex flex-col overflow-hidden shrink-0 animate-in slide-in-from-right-5 duration-300">
              <div className="flex items-center justify-between px-5 py-4 border-b border-[#2f3e46]">
                <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#a9927d]">
                  Event Details
                </h3>
                <button
                  onClick={() => setSelectedEvent(null)}
                  className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#2f3e46] transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-5">
                <div>
                  <div
                    className="w-full h-1 rounded-full mb-4"
                    style={{ backgroundColor: selectedEvent.color }}
                  />
                  <h2 className="text-lg font-medium text-white leading-tight">
                    {selectedEvent.title}
                  </h2>
                </div>

                <div className="flex items-center gap-2">
                  <Activity className="h-3.5 w-3.5 text-gray-500" />
                  <span
                    className="text-[10px] font-mono uppercase tracking-widest px-2 py-1 rounded-full border"
                    style={{
                      color: eventTypeConfig[selectedEvent.type]?.color || "#a9927d",
                      borderColor: `${eventTypeConfig[selectedEvent.type]?.color || "#a9927d"}30`,
                      backgroundColor: `${eventTypeConfig[selectedEvent.type]?.color || "#a9927d"}10`,
                    }}
                  >
                    {eventTypeConfig[selectedEvent.type]?.label || selectedEvent.type}
                  </span>
                </div>

                <div className="flex items-start gap-3 p-3 rounded-xl bg-[#1a252f] border border-[#2f3e46]">
                  <Clock className="h-4 w-4 text-[#a9927d] mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm text-white">
                      {format(new Date(selectedEvent.start), "EEEE, MMMM d")}
                    </p>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">
                      {format(new Date(selectedEvent.start), "h:mm a")} –{" "}
                      {format(new Date(selectedEvent.end), "h:mm a")}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-[#2f3e46] space-y-2.5">
                  <button
                    onClick={() => {
                      startTimerMutation.mutate({ taskId: selectedEvent.id });
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-black font-extrabold text-xs font-mono flex items-center justify-center gap-2 shadow-lg transition-all"
                  >
                    Start Focus Session ⚡
                  </button>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => {
                        completeTaskMutation.mutate({ id: selectedEvent.id });
                      }}
                      className="py-2 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 font-bold text-xs font-mono border border-emerald-500/30 transition-all text-center"
                    >
                      Mark Complete
                    </button>

                    <button
                      onClick={() => {
                        if (confirm("Delete this event/task?")) {
                          deleteTaskMutation.mutate({ id: selectedEvent.id });
                        }
                      }}
                      className="py-2 px-3 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 font-bold text-xs font-mono border border-rose-500/30 transition-all text-center"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Unscheduled Tasks Bar - Positioned at bottom of calendar container */}
        <UnscheduledSidebar />
      </div>
      {/* Drag Overlay */}
      {createPortal(
        <DragOverlay>
          {activeDragItem ? (
            <div className="p-3 bg-[#1a252f] border border-[#a9927d]/40 rounded-xl shadow-2xl w-64 opacity-90 rotate-2 cursor-grabbing">
              <div className="font-light text-sm text-white">
                {activeDragItem.title}
              </div>
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}
