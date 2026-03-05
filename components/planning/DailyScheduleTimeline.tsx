"use client";

import { useMemo } from "react";
import { format, addHours, startOfDay, isWithinInterval } from "date-fns";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";

interface DailyScheduleTimelineProps {
  date: Date;
}

const SCHEDULE_BLOCKS = [
  {
    start: 7,
    end: 7.5,
    label: "Morning Reset",
    color: "#6b7280",
    pillar: null,
  },
  {
    start: 7.5,
    end: 8.25,
    label: "Lead Generation",
    color: "#ef4444",
    pillar: "Leads",
  },
  {
    start: 8.25,
    end: 9.25,
    label: "Client Delivery",
    color: "#3b82f6",
    pillar: "Clients",
  },
  {
    start: 9.25,
    end: 10.25,
    label: "Product / Dev",
    color: "#10b981",
    pillar: "Products",
  },
  { start: 10.25, end: 10.5, label: "Break", color: "#374151", pillar: null },
  {
    start: 10.5,
    end: 11.25,
    label: "Content Creation",
    color: "#f59e0b",
    pillar: "Content",
  },
  {
    start: 11.25,
    end: 11.75,
    label: "Content Publish",
    color: "#f59e0b",
    pillar: "Content",
  },
  {
    start: 11.75,
    end: 12.25,
    label: "Review + Admin",
    color: "#8b5cf6",
    pillar: "Review",
  },
  {
    start: 12.25,
    end: 17,
    label: "Deep Client Work",
    color: "#3b82f6",
    pillar: "Clients",
  },
];

export function DailyScheduleTimeline({ date }: DailyScheduleTimelineProps) {
  const now = new Date();
  const currentHour = now.getHours() + now.getMinutes() / 60;
  const isToday = format(date, "yyyy-MM-dd") === format(now, "yyyy-MM-dd");

  // Fetch calendar events for this day
  const dayStart = startOfDay(date);
  const dayEnd = addHours(dayStart, 24);
  const { data: calendarEvents } = trpc.calendar.getEvents.useQuery({
    start: dayStart,
    end: dayEnd,
  });

  const formatHour = (h: number) => {
    const hours = Math.floor(h);
    const minutes = (h % 1) * 60;
    const period = hours >= 12 ? "PM" : "AM";
    const displayHour = hours > 12 ? hours - 12 : hours === 0 ? 12 : hours;
    return minutes > 0
      ? `${displayHour}:${String(Math.round(minutes)).padStart(2, "0")}`
      : `${displayHour} ${period}`;
  };

  return (
    <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-[#2f3e46]/50">
        <Clock className="w-3.5 h-3.5 text-[#a9927d]" />
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d]">
          Daily Schedule
        </h3>
      </div>

      <div className="p-2 space-y-0.5 max-h-[400px] overflow-y-auto custom-scrollbar">
        {SCHEDULE_BLOCKS.map((block, i) => {
          const durationMin = (block.end - block.start) * 60;
          const isPast = isToday && currentHour > block.end;
          const isCurrent =
            isToday && currentHour >= block.start && currentHour < block.end;

          // Check if there are any calendar events overlapping this time
          const hasCalEvent = calendarEvents?.some((evt: any) => {
            const evtStart = new Date(evt.start);
            const evtEnd = new Date(evt.end);
            const blockStart = addHours(dayStart, block.start);
            const blockEnd = addHours(dayStart, block.end);
            return evtStart < blockEnd && evtEnd > blockStart;
          });

          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-300",
                isCurrent && "bg-white/[0.06] ring-1",
                isPast && "opacity-40",
                hasCalEvent && !isCurrent && "opacity-50",
              )}
              style={{
                ringColor: isCurrent ? `${block.color}60` : undefined,
              }}
            >
              {/* Time */}
              <span className="text-[10px] font-mono text-gray-500 w-12 shrink-0">
                {formatHour(block.start)}
              </span>

              {/* Color pip */}
              <div
                className={cn(
                  "w-1.5 rounded-full shrink-0 transition-all",
                  isCurrent ? "h-6" : "h-4",
                )}
                style={{ backgroundColor: block.color }}
              />

              {/* Label */}
              <div className="flex-1 min-w-0">
                <span
                  className={cn(
                    "text-xs font-medium truncate block",
                    isCurrent ? "text-white" : "text-gray-400",
                  )}
                >
                  {block.label}
                </span>
                {block.pillar && (
                  <span
                    className="text-[9px] font-mono uppercase tracking-wider"
                    style={{ color: `${block.color}80` }}
                  >
                    {block.pillar} · {Math.round(durationMin)}m
                  </span>
                )}
              </div>

              {/* Current indicator */}
              {isCurrent && (
                <span className="relative flex h-2 w-2 shrink-0">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ backgroundColor: block.color }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ backgroundColor: block.color }}
                  />
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
