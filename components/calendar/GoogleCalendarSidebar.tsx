"use client";

import React, { useState } from "react";
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
import {
  Plus,
  ChevronLeft,
  ChevronRight,
  Search,
  Check,
  ChevronDown,
  Layers,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export interface CalendarCategoryFilter {
  id: string;
  name: string;
  color: string;
  enabled: boolean;
}

interface GoogleCalendarSidebarProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  onCreateClick: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  categories: CalendarCategoryFilter[];
  onToggleCategory: (id: string) => void;
  isOpen: boolean;
  onToggleOpen: () => void;
}

export function GoogleCalendarSidebar({
  selectedDate,
  onSelectDate,
  onCreateClick,
  searchQuery,
  onSearchChange,
  categories,
  onToggleCategory,
  isOpen,
}: GoogleCalendarSidebarProps) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  const [isMyCalendarsOpen, setIsMyCalendarsOpen] = useState(true);

  if (!isOpen) return null;

  // Build mini-calendar grid
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday start like Google Calendar
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 0 });

  const days: Date[] = [];
  let day = calStart;
  while (day <= calEnd) {
    days.push(day);
    day = addDays(day, 1);
  }

  const weekDayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  return (
    <div className="w-64 sm:w-72 shrink-0 border-r border-[#2f3e46] bg-[#0a0c10] flex flex-col h-full overflow-y-auto px-4 py-3 select-none transition-all duration-300">
      {/* 1. Google-Style "+ Create" Pill Button */}
      <div className="mb-5">
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2.5 px-6 py-3 rounded-full bg-[#1a252f] hover:bg-[#2f3e46] border border-[#2f3e46] text-white shadow-lg hover:shadow-xl transition-all duration-200 group cursor-pointer"
        >
          <div className="w-6 h-6 rounded-full bg-[#a9927d] text-[#0a0c10] flex items-center justify-center font-bold">
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90 duration-200" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-white">
            Create
          </span>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 ml-1" />
        </button>
      </div>

      {/* 2. Mini-Calendar Date Picker */}
      <div className="mb-6 bg-[#0d1117]/60 p-3 rounded-xl border border-[#2f3e46]/50">
        {/* Month Navigation */}
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-semibold text-gray-200">
            {format(currentMonth, "MMMM yyyy")}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#1a252f] transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#1a252f] transition-colors"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 text-center mb-1">
          {weekDayLabels.map((l, i) => (
            <span
              key={i}
              className="text-[10px] font-mono text-gray-500 py-0.5 font-medium"
            >
              {l}
            </span>
          ))}
        </div>

        {/* Month Day Grid */}
        <div className="grid grid-cols-7 gap-0.5">
          {days.map((d, i) => {
            const isSelected = isSameDay(d, selectedDate);
            const isCurrentMonth = isSameMonth(d, currentMonth);
            const isCurDay = isToday(d);

            return (
              <button
                key={i}
                onClick={() => {
                  onSelectDate(d);
                }}
                className={cn(
                  "h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-mono transition-all mx-auto",
                  !isCurrentMonth && "text-gray-600",
                  isCurrentMonth &&
                    !isSelected &&
                    "text-gray-300 hover:bg-[#1a252f] hover:text-white",
                  isSelected && "bg-[#a9927d] text-[#0a0c10] font-bold shadow-sm",
                  isCurDay &&
                    !isSelected &&
                    "ring-1 ring-[#3b82f6] text-[#3b82f6] font-bold",
                )}
              >
                {format(d, "d")}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Search Filter */}
      <div className="mb-5">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search events & tasks..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#2f3e46] text-xs text-white placeholder-gray-500 focus:outline-hidden focus:border-[#a9927d] transition-colors"
          />
        </div>
      </div>

      {/* 4. "My Calendars" Category Toggles (Google Calendar style) */}
      <div className="space-y-3">
        <button
          onClick={() => setIsMyCalendarsOpen(!isMyCalendarsOpen)}
          className="flex items-center justify-between w-full text-xs font-semibold text-gray-300 hover:text-white transition-colors"
        >
          <span className="font-mono text-[11px] uppercase tracking-wider text-gray-400">
            My Calendars
          </span>
          <ChevronDown
            className={cn(
              "w-3.5 h-3.5 text-gray-500 transition-transform",
              !isMyCalendarsOpen && "-rotate-90",
            )}
          />
        </button>

        {isMyCalendarsOpen && (
          <div className="space-y-1 pl-1">
            {categories.map((cat) => (
              <label
                key={cat.id}
                className="flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-[#1a252f]/50 cursor-pointer text-xs text-gray-300 transition-colors group"
              >
                <div
                  onClick={() => onToggleCategory(cat.id)}
                  style={{
                    backgroundColor: cat.enabled ? cat.color : "transparent",
                    borderColor: cat.color,
                  }}
                  className="w-4 h-4 rounded border flex items-center justify-center transition-all shrink-0"
                >
                  {cat.enabled && (
                    <Check className="w-3 h-3 text-[#0a0c10] stroke-[3]" />
                  )}
                </div>
                <span
                  onClick={() => onToggleCategory(cat.id)}
                  className={cn(
                    "truncate group-hover:text-white transition-colors",
                    !cat.enabled && "line-through text-gray-500",
                  )}
                >
                  {cat.name}
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* 5. Features Quick Legend / Footer */}
      <div className="mt-auto pt-6 border-t border-[#2f3e46]/40 text-[10px] font-mono text-gray-500 space-y-1">
        <div className="flex items-center gap-1 text-[#a9927d]">
          <Sparkles className="w-3 h-3" />
          <span>Unified Engine</span>
        </div>
        <p>Supports Timeline, Resources, Year, D&D, and Background Focus.</p>
      </div>
    </div>
  );
}
