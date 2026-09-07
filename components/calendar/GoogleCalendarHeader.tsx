"use client";

import React from "react";
import {
  ChevronLeft,
  ChevronRight,
  Menu,
  Calendar as CalendarIcon,
  Layers,
  ChevronDown,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

export type CalendarViewType =
  | "dayGridMonth"
  | "timeGridWeek"
  | "timeGridDay"
  | "multiMonthYear"
  | "listWeek"
  | "resourceTimelineWeek"
  | "resourceTimeGridDay";

interface GoogleCalendarHeaderProps {
  title: string;
  currentView: CalendarViewType;
  onViewChange: (view: CalendarViewType) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  isLoading?: boolean;
}

const VIEW_OPTIONS: { id: CalendarViewType; label: string; badge?: string }[] = [
  { id: "dayGridMonth", label: "Month" },
  { id: "timeGridWeek", label: "Week" },
  { id: "timeGridDay", label: "Day" },
  { id: "multiMonthYear", label: "Year View" },
  { id: "listWeek", label: "Agenda (List)" },
  { id: "resourceTimelineWeek", label: "Resource Timeline", badge: "Demo" },
  { id: "resourceTimeGridDay", label: "Resource Time Grid", badge: "Demo" },
];

export function GoogleCalendarHeader({
  title,
  currentView,
  onViewChange,
  onPrev,
  onNext,
  onToday,
  onToggleSidebar,
  isLoading,
}: GoogleCalendarHeaderProps) {
  const currentViewLabel =
    VIEW_OPTIONS.find((v) => v.id === currentView)?.label || "Month";

  return (
    <header className="h-14 shrink-0 px-4 flex items-center justify-between border-b border-[#2f3e46] bg-[#0a0c10] select-none">
      {/* Left Section: Menu Toggle, Brand, Today, Nav Arrows, Title */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Toggle Sidebar */}
        <button
          onClick={onToggleSidebar}
          title="Toggle Main Menu"
          className="p-2 rounded-full hover:bg-[#1a252f] text-gray-400 hover:text-white transition-colors"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand / Title Icon */}
        <div className="hidden sm:flex items-center gap-2 mr-2">
          <div className="w-8 h-8 rounded-lg bg-[#a9927d]/15 border border-[#a9927d]/30 flex items-center justify-center text-[#a9927d]">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <span className="font-semibold text-white tracking-tight text-sm">
            Calendar
          </span>
        </div>

        {/* "Today" Button */}
        <Button
          variant="outline"
          onClick={onToday}
          className="h-9 px-4 rounded-xl border-[#2f3e46] bg-[#1a252f]/60 hover:bg-[#1a252f] text-xs font-semibold text-gray-200 hover:text-white transition-colors"
        >
          Today
        </Button>

        {/* Previous & Next Navigation Arrows */}
        <div className="flex items-center">
          <button
            onClick={onPrev}
            title="Previous"
            className="p-1.5 rounded-full hover:bg-[#1a252f] text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            title="Next"
            className="p-1.5 rounded-full hover:bg-[#1a252f] text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Calendar Title (e.g., September 2026) */}
        <h2 className="text-base sm:text-lg font-medium text-white tracking-tight ml-1">
          {title || "Calendar"}
        </h2>

        {isLoading && (
          <span className="hidden md:inline-block text-[10px] font-mono text-[#a9927d] animate-pulse">
            Syncing...
          </span>
        )}
      </div>

      {/* Right Section: View Selector Dropdown (Month, Week, Day, Year, Resource Timeline, etc.) */}
      <div className="flex items-center gap-2">
        <Select
          value={currentView}
          onValueChange={(val) => onViewChange(val as CalendarViewType)}
        >
          <SelectTrigger className="h-9 px-3 rounded-xl border-[#2f3e46] bg-[#1a252f]/60 hover:bg-[#1a252f] text-xs font-semibold text-gray-200 focus:ring-0 focus:border-[#a9927d] transition-colors w-[155px] sm:w-[190px]">
            <SelectValue>{currentViewLabel}</SelectValue>
          </SelectTrigger>
          <SelectContent className="bg-[#0d1117] border-[#2f3e46] text-gray-200 shadow-2xl rounded-xl">
            {VIEW_OPTIONS.map((opt) => (
              <SelectItem
                key={opt.id}
                value={opt.id}
                className="text-xs font-medium cursor-pointer hover:bg-[#1a252f] focus:bg-[#1a252f] focus:text-white flex items-center justify-between"
              >
                <span>{opt.label}</span>
                {opt.badge && (
                  <span className="ml-2 text-[9px] font-mono uppercase px-1.5 py-0.2 rounded bg-[#a9927d]/20 text-[#a9927d] border border-[#a9927d]/30">
                    {opt.badge}
                  </span>
                )}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </header>
  );
}
