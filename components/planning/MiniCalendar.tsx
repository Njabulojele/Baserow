"use client";

import { useState } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  addMonths,
  subMonths,
  isSameDay,
  isSameMonth,
  isToday,
} from "date-fns";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface MiniCalendarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  completedDates?: string[]; // yyyy-MM-dd format
}

export function MiniCalendar({
  selectedDate,
  onSelectDate,
  completedDates = [],
}: MiniCalendarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDays = ["M", "T", "W", "T", "F", "S", "S"];

  return (
    <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] p-3">
      {/* Month header */}
      <div className="flex items-center justify-between mb-3">
        <button
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          className="p-1 rounded-md hover:bg-[#0a0c10] text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>
        <span className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d]">
          {format(currentMonth, "MMMM yyyy")}
        </span>
        <button
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          className="p-1 rounded-md hover:bg-[#0a0c10] text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {weekDays.map((d, i) => (
          <div
            key={i}
            className="text-center text-[9px] font-mono text-gray-600 py-1"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-0.5">
        {days.map((d, i) => {
          const dateStr = format(d, "yyyy-MM-dd");
          const isSelected = isSameDay(d, selectedDate);
          const isCurrentMonth = isSameMonth(d, currentMonth);
          const hasCompletion = completedDates.includes(dateStr);
          const isCurrentDay = isToday(d);

          return (
            <button
              key={i}
              onClick={() => onSelectDate(d)}
              className={cn(
                "relative w-full aspect-square rounded-md flex items-center justify-center text-[11px] font-mono transition-all duration-150",
                !isCurrentMonth && "text-gray-700",
                isCurrentMonth &&
                  !isSelected &&
                  "text-gray-400 hover:bg-[#0a0c10] hover:text-white",
                isSelected && "bg-[#a9927d] text-[#0a0c10] font-bold",
                isCurrentDay &&
                  !isSelected &&
                  "ring-1 ring-[#a9927d]/40 text-[#a9927d]",
              )}
            >
              {format(d, "d")}
              {/* Completion dot */}
              {hasCompletion && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
