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
  LayoutGrid,
  List,
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
import { CalendarEvent } from "@/types/calendar";

type ViewMode = "month" | "week" | "day";

export function CalendarClient() {
  const [date, setDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("week");
  const [activeDragItem, setActiveDragItem] = useState<any>(null); // For overlay

  const utils = trpc.useUtils();
  const updateEvent = trpc.calendar.updateEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.task.getBacklogTasks.invalidate();
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

  // Calculate query range based on view
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

  // Fetch events for the current view
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

    // DEBUG: Log the raw IDs
    console.log("Drag End Event:", { activeId: active.id, overId: over?.id });

    if (!over) {
      console.log("No drop target found.");
      return;
    }

    const activeId = String(active.id);
    const overId = String(over.id);

    // Handle Task Drop from Sidebar -> Calendar Slot
    if (activeId.startsWith("task-") && overId.startsWith("slot-")) {
      const taskId = activeId.replace("task-", "");

      // Pattern: slot-YYYY-MM-DD-HH
      const slotData = overId.replace("slot-", ""); // YYYY-MM-DD-HH
      const lastDashIndex = slotData.lastIndexOf("-");
      const dateStr = slotData.substring(0, lastDashIndex); // YYYY-MM-DD
      const hourStr = slotData.substring(lastDashIndex + 1); // HH

      console.log("Parsed Drop Details:", { taskId, dateStr, hourStr });

      if (!dateStr || !hourStr) {
        console.warn("Invalid slot ID structure:", overId);
        return;
      }

      const newDate = new Date(dateStr);
      newDate.setHours(parseInt(hourStr), 0, 0, 0);

      console.log("Constructed Date:", newDate.toString());

      updateEvent.mutate({
        id: taskId,
        start: newDate,
        end: new Date(newDate.getTime() + 30 * 60000), // Default 30 min
      });
    } else {
      console.log("Drop ignored (not a task-to-slot drop).", {
        activeId,
        overId,
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="h-[calc(100vh-4rem)] flex flex-col">
        {/* Toolbar */}
        <div className="flex items-center justify-between px-6 py-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("prev")}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={() => navigate("today")}>
                Today
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => navigate("next")}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
            <h2 className="text-xl font-semibold min-w-[200px]">
              {format(date, view === "day" ? "MMMM do, yyyy" : "MMMM yyyy")}
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <Select value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="month">Month</SelectItem>
                <SelectItem value="week">Week</SelectItem>
                <SelectItem value="day">Day</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Main Calendar Grid */}
          <div className="flex-1 overflow-auto bg-muted/20 relative">
            <CalendarView
              view={view}
              date={date}
              events={calendarEvents}
              isLoading={isLoading}
            />
          </div>

          {/* Unscheduled Sidebar */}
          <div className="w-80 border-l bg-background flex flex-col overflow-hidden">
            <UnscheduledSidebar />
          </div>
        </div>
      </div>
      {/* Drag Overlay for visual feedback */}
      {createPortal(
        <DragOverlay>
          {activeDragItem ? (
            <div className="p-3 bg-card border rounded-lg shadow-xl w-64 opacity-80 rotate-3 cursor-grabbing">
              <div className="font-medium text-sm">{activeDragItem.title}</div>
            </div>
          ) : null}
        </DragOverlay>,
        document.body,
      )}
    </DndContext>
  );
}
