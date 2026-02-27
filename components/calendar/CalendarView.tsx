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
        "h-full w-full border-b border-dashed border-[#2f3e46] transition-colors",
        isOver && "bg-[#a9927d]/10 border-[#a9927d]/30",
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
  onEventClick?: (event: CalendarEvent) => void;
}

export function CalendarView({
  view,
  date,
  events,
  isLoading,
  onEventClick,
}: CalendarViewProps) {
  if (view === "month") {
    return (
      <MonthView date={date} events={events} onEventClick={onEventClick} />
    );
  } else if (view === "week") {
    return <WeekView date={date} events={events} onEventClick={onEventClick} />;
  } else {
    return <DayView date={date} events={events} onEventClick={onEventClick} />;
  }
}

function MonthView({
  date,
  events,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}) {
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
      <div className="grid grid-cols-7 border-b border-[#2f3e46] bg-[#0a0c10] min-w-[600px] sm:min-w-0">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="p-2 text-center text-[10px] font-mono uppercase tracking-widest text-[#a9927d]"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 h-full auto-rows-fr min-w-[600px] sm:min-w-0">
        {days.map((day) => {
          const dayEvents = events.filter((e) =>
            isSameDay(new Date(e.start), day),
          );
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-b border-r border-[#2f3e46] p-1.5 min-h-[100px] hover:bg-[#1a252f]/50 transition-colors flex flex-col gap-0.5",
                !isSameMonth(day, date) && "bg-[#0a0c10]/50 text-gray-600",
                isToday && "bg-[#a9927d]/5",
              )}
            >
              <div
                className={cn(
                  "text-[10px] font-mono w-6 h-6 flex items-center justify-center rounded-full mb-0.5",
                  isToday
                    ? "bg-[#a9927d] text-[#0a0c10] font-bold"
                    : "text-gray-400 font-light",
                )}
              >
                {format(day, "d")}
              </div>
              <div className="space-y-0.5 overflow-hidden flex-1">
                {dayEvents.slice(0, 4).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick?.(event)}
                    className="w-full text-left text-[9px] px-1.5 py-0.5 rounded truncate border-l-2 font-medium hover:brightness-125 transition-all cursor-pointer"
                    style={{
                      backgroundColor: `${event.color}18`,
                      borderColor: event.color,
                      color: event.color,
                    }}
                  >
                    {event.title}
                  </button>
                ))}
                {dayEvents.length > 4 && (
                  <div className="text-[9px] text-gray-500 pl-1 font-mono">
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

function WeekView({
  date,
  events,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const start = startOfWeek(date);
  const end = endOfWeek(date);
  const days = eachDayOfInterval({ start, end });
  const hours = eachHourOfInterval({
    start: startOfDay(date),
    end: setHours(startOfDay(date), 23),
  });

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
    <div className="flex flex-col h-full bg-[#0a0c10] overflow-x-auto">
      {/* Header */}
      <div className="grid grid-cols-8 border-b border-[#2f3e46] sticky top-0 z-30 bg-[#0a0c10] min-w-[700px] sm:min-w-0">
        <div className="w-12 sm:w-16 border-r border-[#2f3e46] bg-[#0a0c10] shrink-0"></div>
        {days.map((day) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "p-2 text-center text-[10px] font-mono border-r border-[#2f3e46] transition-colors",
                isToday && "bg-[#a9927d]/5",
              )}
            >
              <div
                className={cn(
                  "uppercase tracking-widest",
                  isToday ? "text-[#a9927d] font-medium" : "text-gray-500",
                )}
              >
                {format(day, "EEE")}
              </div>
              <div
                className={cn(
                  "text-base sm:text-lg w-8 h-8 flex items-center justify-center rounded-full mx-auto mt-1 transition-colors",
                  isToday
                    ? "bg-[#a9927d] text-[#0a0c10] font-bold"
                    : "text-gray-300 font-light",
                )}
              >
                {format(day, "d")}
              </div>
            </div>
          );
        })}
      </div>

      {/* Time Grid */}
      <div className="grid grid-cols-8 relative min-w-[700px] sm:min-w-0">
        {/* Time Labels */}
        <div className="w-12 sm:w-16 border-r border-[#2f3e46] bg-[#0a0c10] sticky left-0 z-20 shrink-0">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="h-20 text-[9px] font-mono uppercase tracking-widest text-gray-600 text-right pr-1.5 sm:pr-2 pt-1 border-b border-[#2f3e46]/50 relative"
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
          const isToday = isSameDay(day, new Date());
          return (
            <div
              key={day.toISOString()}
              className={cn(
                "border-r border-[#2f3e46]/50 relative min-h-[1920px]",
                isToday && "bg-[#a9927d]/[0.02]",
              )}
            >
              {hours.map((hour) => (
                <div key={hour.toISOString()} className="h-20">
                  <DroppableHourSlot date={day} hour={hour.getHours()} />
                </div>
              ))}

              {/* Events Overlay */}
              {layoutEvents.map((event) => (
                <button
                  key={event.id}
                  onClick={() => onEventClick?.(event)}
                  className="absolute z-10 hover:z-20 transition-all hover:scale-[1.02] group cursor-pointer text-left"
                  style={{
                    top: `${event.style.top}px`,
                    height: `${event.style.height}px`,
                    left: "2%",
                    width: "94%",
                    zIndex: (event as any).style.zIndex || 10,
                  }}
                >
                  <div
                    className="h-full w-full rounded-lg border-l-[3px] px-2 py-1 text-[10px] shadow-md overflow-hidden group-hover:shadow-lg transition-shadow"
                    style={{
                      backgroundColor: `${event.color}20`,
                      borderColor: event.color,
                    }}
                  >
                    <div
                      className="font-medium truncate text-[11px] leading-tight"
                      style={{ color: event.color }}
                    >
                      {event.title}
                    </div>
                    <div className="text-gray-500 truncate text-[9px] mt-0.5">
                      {format(new Date(event.start), "h:mm")} –{" "}
                      {format(new Date(event.end), "h:mm a")}
                    </div>
                  </div>
                </button>
              ))}

              {/* Current Time Indicator */}
              {isToday && (
                <div
                  className="absolute w-full h-[2px] bg-red-500 z-30 pointer-events-none flex items-center shadow-[0_0_8px_rgba(239,68,68,0.4)]"
                  style={{
                    top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * 80}px`,
                  }}
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-[5px] shadow-lg"></div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function DayView({
  date,
  events,
  onEventClick,
}: {
  date: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
}) {
  const hours = eachHourOfInterval({
    start: startOfDay(date),
    end: setHours(startOfDay(date), 23),
  });

  const layoutEvents = useMemo(() => {
    const dayEvents = events.filter((e) => isSameDay(new Date(e.start), date));
    return processEventsForLayout(dayEvents, 96);
  }, [events, date]);

  return (
    <ScrollArea className="h-full bg-[#0a0c10]">
      <div className="grid grid-cols-[60px_1fr] relative max-w-4xl mx-auto">
        <div className="border-r border-[#2f3e46] pt-4">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="h-24 text-[9px] font-mono uppercase tracking-widest text-gray-600 text-right pr-2 pt-2 border-b border-[#2f3e46]/50 relative"
            >
              <span className="-top-3 relative">{format(hour, "h a")}</span>
            </div>
          ))}
        </div>
        <div className="relative">
          {hours.map((hour) => (
            <div
              key={hour.toISOString()}
              className="h-24 border-b border-[#2f3e46]/50"
            >
              <DroppableHourSlot date={date} hour={hour.getHours()} />
            </div>
          ))}

          {layoutEvents.map((event) => (
            <button
              key={event.id}
              onClick={() => onEventClick?.(event)}
              className="absolute z-10 transition-all hover:scale-[1.01] cursor-pointer text-left group"
              style={{
                top: `${event.style.top}px`,
                height: `${event.style.height}px`,
                left: "1%",
                width: "97%",
                zIndex: (event as any).style.zIndex || 10,
              }}
            >
              <div
                className="h-full w-full rounded-xl border-l-4 px-4 py-3 shadow-lg overflow-hidden group-hover:shadow-xl transition-shadow"
                style={{
                  backgroundColor: `${event.color}20`,
                  borderColor: event.color,
                }}
              >
                <div
                  className="font-medium text-sm"
                  style={{ color: event.color }}
                >
                  {event.title}
                </div>
                <div className="text-gray-500 text-xs flex gap-2 items-center mt-1">
                  <span>
                    {format(new Date(event.start), "h:mm")} –{" "}
                    {format(new Date(event.end), "h:mm a")}
                  </span>
                  {event.priority && (
                    <span className="uppercase tracking-wider text-[9px] opacity-60 border border-gray-700 px-1.5 py-0.5 rounded-full">
                      {event.priority}
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}

          {/* Current Time Indicator */}
          {isSameDay(date, new Date()) && (
            <div
              className="absolute w-full h-[2px] bg-red-500 z-30 pointer-events-none flex items-center shadow-[0_0_8px_rgba(239,68,68,0.4)]"
              style={{
                top: `${((new Date().getHours() * 60 + new Date().getMinutes()) / 60) * 96}px`,
              }}
            >
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 -ml-[5px] shadow-lg"></div>
              <div className="ml-1.5 text-[10px] text-red-500 font-mono uppercase tracking-widest bg-[#0a0c10] px-1.5 py-0.5 rounded-full border border-red-500/20">
                {format(new Date(), "h:mm a")}
              </div>
            </div>
          )}
        </div>
      </div>
    </ScrollArea>
  );
}
