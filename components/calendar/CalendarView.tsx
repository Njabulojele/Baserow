"use client";

import { CalendarEvent } from "@/types/calendar";
import {
  format,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addDays,
  startOfDay,
  eachHourOfInterval,
  setHours,
} from "date-fns";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDroppable } from "@dnd-kit/core";
import { useMemo } from "react";

// Droppable Slot Component
function DroppableHourSlot({ date, hour }: { date: Date; hour: number }) {
  const dateStr = format(date, "yyyy-MM-dd");
  const id = `slot-${dateStr}-${hour}`;
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "h-full w-full border-b border-dashed border-muted/50 transition-colors",
        isOver && "bg-primary/10 border-primary/30",
      )}
    ></div>
  );
}

// Layout Helper for Overlapping Events
interface LayoutEvent extends CalendarEvent {
  style: {
    top: number; // pixels
    height: number; // pixels
    left: number; // percentage
    width: number; // percentage
    zIndex?: number;
  };
}

function processEventsForLayout(
  events: CalendarEvent[],
  hourHeight: number,
): LayoutEvent[] {
  // Sort by start time, then duration (longest first to avoid weird gaps)
  const sorted = [...events].sort((a, b) => {
    const startA = new Date(a.start).getTime();
    const startB = new Date(b.start).getTime();
    if (startA !== startB) return startA - startB;

    const durA = new Date(a.end).getTime() - startA;
    const durB = new Date(b.end).getTime() - startB;
    return durB - durA;
  });

  const result: LayoutEvent[] = [];

  // Track the furthest "visual end time" for the current chain of overlapping events
  // This allows us to push the next overlapping event below the previous one.
  let lastVisualEndMin = -1;

  sorted.forEach((ev, index) => {
    const start = new Date(ev.start);
    const end = new Date(ev.end);

    // Physical start/end based on actual time
    const startMin = start.getHours() * 60 + start.getMinutes();
    const durationMin = (end.getTime() - start.getTime()) / 60000;

    // Default top based on actual time
    let visualTopMin = startMin;

    // If this event starts before the "visual end" of the previous event,
    // we push it down to start exactly where the previous one ends visually.
    if (visualTopMin < lastVisualEndMin) {
      visualTopMin = lastVisualEndMin;
    }

    const top = (visualTopMin / 60) * hourHeight;
    const height = Math.max((durationMin / 60) * hourHeight, 30); // Min height 30px for readability

    lastVisualEndMin = visualTopMin + (height / hourHeight) * 60;

    result.push({
      ...ev,
      style: {
        top,
        height,
        left: 0,
        width: 100, // Full width, sequential!
        zIndex: 10 + index,
      },
    });
  });

  return result;
}

interface CalendarViewProps {
  view: "month" | "week" | "day";
  date: Date;
  events: CalendarEvent[];
  isLoading: boolean;
}

export function CalendarView({
  view,
  date,
  events,
  isLoading,
}: CalendarViewProps) {
  if (view === "month") {
    return <MonthView date={date} events={events} />;
  } else if (view === "week") {
    return <WeekView date={date} events={events} />;
  } else {
    return <DayView date={date} events={events} />;
  }
}

function MonthView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const start = startOfWeek(startOfDay(date));
  const monthStart = startOfWeek(
    new Date(date.getFullYear(), date.getMonth(), 1),
  );
  const monthEnd = endOfWeek(
    new Date(date.getFullYear(), date.getMonth() + 1, 0),
  );

  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  return (
    <div className="grid grid-cols-7 h-full grid-rows-[auto_1fr]">
      <div className="grid grid-cols-7 border-b bg-muted/5 min-w-[600px] sm:min-w-0">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-xs sm:text-sm font-medium text-muted-foreground"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 h-full auto-rows-fr min-w-[600px] sm:min-w-0">
        {days.map((day, i) => {
          const dayEvents = events.filter((e) =>
            isSameDay(new Date(e.start), day),
          );
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r p-1 min-h-[100px] hover:bg-muted/5 transition-colors flex flex-col gap-1",
                !isSameMonth(day, date) && "bg-muted/10 text-muted-foreground",
              )}
            >
              <div
                className={cn(
                  "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full mb-1",
                  isSameDay(day, new Date()) &&
                    "bg-primary text-primary-foreground",
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-1 overflow-hidden">
                {dayEvents.slice(0, 4).map((event) => (
                  <div
                    key={event.id}
                    className="text-[10px] px-1.5 py-0.5 rounded truncate border-l-2 shadow-sm font-medium"
                    style={{
                      backgroundColor: `${event.color}15`, // very light bg
                      borderColor: event.color,
                      color: "hsl(var(--foreground))",
                    }}
                  >
                    {event.title}
                  </div>
                ))}
                {dayEvents.length > 4 && (
                  <div className="text-[10px] text-muted-foreground pl-1">
                    +{dayEvents.length - 4} more
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

function WeekView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  const days = eachDayOfInterval({ start, end });
  const hours = eachHourOfInterval({
    start: startOfDay(date),
    end: setHours(startOfDay(date), 23),
  });

  // Process events per day to avoid global reprocessing
  const dayEventsMap = useMemo(() => {
    const map = new Map<string, LayoutEvent[]>();
    days.forEach((day) => {
      const rawDayEvents = events.filter((e) =>
        isSameDay(new Date(e.start), day),
      );
      map.set(day.toISOString(), processEventsForLayout(rawDayEvents, 80));
    });
    return map;
  }, [events, days]);

  return (
    <div className="flex flex-col h-full bg-background overflow-x-auto">
      {/* Header */}
      <div className="grid grid-cols-8 border-b sticky top-0 z-30 bg-background min-w-[700px] sm:min-w-0">
        <div className="w-12 sm:w-16 border-r bg-muted/5 shrink-0"></div>
        {days.map((day) => (
          <div
            key={day.toISOString()}
            className={cn(
              "p-2 text-center text-xs sm:text-sm border-r",
              isSameDay(day, new Date()) && "bg-primary/5",
            )}
          >
            <div className="font-medium text-muted-foreground">
              {format(day, "EEE")}
            </div>
            <div
              className={cn(
                "text-base sm:text-xl font-semibold w-7 h-7 sm:w-8 sm:h-8 flex items-center justify-center rounded-full mx-auto mt-1",
                isSameDay(day, new Date()) &&
                  "bg-primary text-primary-foreground",
              )}
            >
              {format(day, "d")}
            </div>
          </div>
        ))}
      </div>

      {/* Time Grid */}
      <div className="grid grid-cols-8 relative min-w-[700px] sm:min-w-0">
        {/* Time Labels */}
        <div className="w-12 sm:w-16 border-r bg-background sticky left-0 z-20 shrink-0">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="h-20 text-[10px] sm:text-xs text-muted-foreground text-right pr-1 sm:pr-2 pt-1 border-b relative"
            >
              <span className="-top-2 relative translate-y-[-50%] block">
                {format(hour, "h a")}
              </span>
            </div>
          ))}
        </div>

        {/* Days Columns */}
        {days.map((day) => {
          const layoutEvents = dayEventsMap.get(day.toISOString()) || [];
          return (
            <div
              key={day.toISOString()}
              className="border-r relative min-h-[1920px]"
            >
              {hours.map((hour) => (
                <div key={hour.toISOString()} className="h-20">
                  <DroppableHourSlot date={day} hour={hour.getHours()} />
                </div>
              ))}

              {/* Events Overlay */}
              {layoutEvents.map((event) => (
                <div
                  key={event.id}
                  className="absolute z-10 hover:z-20 transition-all hover:scale-[1.01] group cursor-pointer"
                  style={{
                    top: `${event.style.top}px`,
                    height: `${event.style.height}px`,
                    left: `${event.style.left}%`,
                    width: `${event.style.width}%`,
                    zIndex: (event as any).style.zIndex || 10,
                  }}
                >
                  {/* Inner Card with Spacing/Gap */}
                  <div
                    className="h-full w-full rounded border px-2 py-1 text-xs shadow-sm overflow-hidden border-r-2"
                    style={{
                      marginRight: "4%", // Increased visual gap
                      width: "96%", // Shrink to fit gap
                      backgroundColor: event.color
                        ? `${event.color}25` // Slightly lighter for better contrast
                        : "hsl(var(--primary)/0.15)",
                      borderColor: event.color || "hsl(var(--primary))",
                      borderLeftWidth: "4px",
                    }}
                  >
                    <div className="font-semibold truncate text-[11px] leading-tight">
                      {event.title}
                    </div>
                    <div className="opacity-75 truncate text-[10px]">
                      {format(new Date(event.start), "h:mm")} -{" "}
                      {format(new Date(event.end), "h:mm a")}
                    </div>
                  </div>
                </div>
              ))}

              {/* Current Time Indicator for Today */}
              {isSameDay(day, new Date()) && (
                <div
                  className="absolute w-full h-0.5 bg-red-500 z-30 pointer-events-none flex items-center"
                  style={{
                    top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * 80}px`,
                  }}
                >
                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({ date, events }: { date: Date; events: CalendarEvent[] }) {
  const hours = eachHourOfInterval({
    start: startOfDay(date),
    end: setHours(startOfDay(date), 23),
  });

  const layoutEvents = useMemo(() => {
    const dayEvents = events.filter((e) => isSameDay(new Date(e.start), date));
    return processEventsForLayout(dayEvents, 96); // 96px/hr for day view
  }, [events, date]);

  return (
    <ScrollArea className="h-full bg-background">
      <div className="grid grid-cols-[60px_1fr] relative max-w-4xl mx-auto">
        <div className="border-r pt-4">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="h-24 text-xs text-muted-foreground text-right pr-2 pt-2 border-b relative"
            >
              <span className="-top-3 relative">{format(hour, "h a")}</span>
            </div>
          ))}
        </div>
        <div className="relative">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="h-24 border-b border-muted/30"
            >
              <DroppableHourSlot date={date} hour={hour.getHours()} />
            </div>
          ))}

          {layoutEvents.map((event) => (
            <div
              key={event.id}
              className="absolute z-10 transition-all hover:scale-[1.01] cursor-pointer"
              style={{
                top: `${event.style.top}px`,
                height: `${event.style.height}px`,
                left: `${event.style.left}%`,
                width: `${event.style.width}%`,
                zIndex: (event as any).style.zIndex || 10,
              }}
            >
              <div
                className="h-full w-full rounded-md border px-3 py-2 text-sm shadow-md overflow-hidden border-r-4"
                style={{
                  marginRight: "5%",
                  width: "95%",
                  backgroundColor: event.color
                    ? `${event.color}25`
                    : "hsl(var(--primary)/0.15)", // 15% opacity
                  borderColor: event.color || "hsl(var(--primary))",
                  borderLeftWidth: "4px",
                }}
              >
                <div className="font-semibold text-xs md:text-sm">
                  {event.title}
                </div>
                <div className="text-muted-foreground text-[10px] md:text-xs flex gap-2 items-center mt-0.5">
                  <span>
                    {format(new Date(event.start), "h:mm")} -{" "}
                    {format(new Date(event.end), "h:mm a")}
                  </span>
                  {event.priority && (
                    <span className="uppercase tracking-tighter opacity-70 border px-1 rounded-[2px]">
                      {event.priority}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Current Time Indicator for Today */}
          {isSameDay(date, new Date()) && (
            <div
              className="absolute w-full h-0.5 bg-red-500 z-30 pointer-events-none flex items-center"
              style={{
                top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * 96}px`,
              }}
            >
              <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
              <div className="ml-1 text-[10px] text-red-500 font-medium bg-background px-1 rounded">
                {format(new Date(), "h:mm a")}
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
