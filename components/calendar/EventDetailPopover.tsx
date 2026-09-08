"use client";

import React, { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import {
  X,
  Clock,
  Calendar as CalendarIcon,
  Trash2,
  Zap,
  CheckCircle2,
  Tag,
  MapPin,
  AlignLeft,
  Edit2,
} from "lucide-react";
import { CalendarEvent } from "@/types/calendar";

interface EventDetailPopoverProps {
  event: CalendarEvent;
  anchorRect: DOMRect | null;
  onClose: () => void;
  onDelete?: (id: string, event: CalendarEvent) => void;
  onComplete?: (id: string) => void;
  onStartTimer?: (id: string) => void;
  onEdit?: (event: CalendarEvent) => void;
}

export function EventDetailPopover({
  event,
  anchorRect,
  onClose,
  onDelete,
  onComplete,
  onStartTimer,
  onEdit,
}: EventDetailPopoverProps) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState<{ top: number; left: number }>({
    top: 100,
    left: 100,
  });

  // Calculate intelligent viewport-bounded coordinates
  useEffect(() => {
    if (!anchorRect) return;

    const popoverWidth = 380;
    const popoverHeight = 340;
    const margin = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let left = anchorRect.right + margin;
    // If it overflows the right edge, place it to the left of the event
    if (left + popoverWidth > viewportWidth - margin) {
      left = anchorRect.left - popoverWidth - margin;
    }
    // If it still overflows left edge, clamp into screen
    if (left < margin) {
      left = Math.max(margin, Math.min(viewportWidth - popoverWidth - margin, anchorRect.left));
    }

    // Align with event top, but keep within viewport vertically
    let top = anchorRect.top;
    if (top + popoverHeight > viewportHeight - margin) {
      top = Math.max(margin + 50, viewportHeight - popoverHeight - margin);
    }
    if (top < margin + 50) {
      top = margin + 50;
    }

    setPosition({ top, left });
  }, [anchorRect]);

  // Close on outside click or Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [onClose]);

  const startDate = event.start ? new Date(event.start) : new Date();
  const endDate = event.end ? new Date(event.end) : new Date(startDate.getTime() + 30 * 60000);

  const durationMinutes = Math.round((endDate.getTime() - startDate.getTime()) / 60000);
  const durationText =
    durationMinutes >= 60
      ? `${Math.floor(durationMinutes / 60)}h ${durationMinutes % 60 > 0 ? `${durationMinutes % 60}m` : ""}`
      : `${durationMinutes}m`;

  const priorityColors: Record<string, string> = {
    low: "text-blue-400 bg-blue-500/15 border-blue-500/30",
    medium: "text-amber-400 bg-amber-500/15 border-amber-500/30",
    high: "text-rose-400 bg-rose-500/15 border-rose-500/30",
    critical: "text-rose-400 bg-rose-500/25 border-rose-500/50 animate-pulse",
  };

  const isCompleted = event.status === "completed" || event.status === "done";

  return (
    <div
      ref={popoverRef}
      style={{
        top: `${position.top}px`,
        left: `${position.left}px`,
      }}
      className="fixed z-50 w-[360px] sm:w-[390px] rounded-2xl bg-[#0d1117] border border-[#2f3e46] shadow-2xl shadow-black/80 backdrop-blur-xl p-5 text-white animate-in fade-in-0 zoom-in-95 duration-150 select-none"
    >
      {/* Top Action Header */}
      <div className="flex items-center justify-between border-b border-[#2f3e46]/60 pb-3 mb-4">
        <div className="flex items-center gap-1.5 text-gray-400">
          {onEdit && (
            <button
              onClick={() => onEdit(event)}
              title="Edit event"
              className="p-1.5 rounded-lg hover:bg-[#1a252f] hover:text-white transition-colors"
            >
              <Edit2 className="w-4 h-4" />
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => {
                onDelete(event.id, event);
                onClose();
              }}
              title="Delete event"
              className="p-1.5 rounded-lg hover:bg-rose-500/20 text-gray-400 hover:text-rose-400 transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {onStartTimer && (
            <button
              onClick={() => {
                onStartTimer(event.id);
                onClose();
              }}
              title="Start Focus Timer"
              className="p-1.5 rounded-lg hover:bg-amber-500/20 hover:text-amber-400 transition-colors text-amber-500/80"
            >
              <Zap className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          onClick={onClose}
          title="Close"
          className="p-1.5 rounded-full hover:bg-[#1a252f] text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Event Header with Color Swatch and Title */}
      <div className="flex items-start gap-3 mb-4">
        <div
          className="w-4 h-4 rounded-md mt-1 shrink-0 shadow-sm"
          style={{ backgroundColor: event.color || "#3b82f6" }}
        />
        <div className="flex-1 min-w-0">
          <h3 className={`text-base font-semibold text-white leading-snug break-words ${isCompleted ? "line-through text-gray-400" : ""}`}>
            {event.title}
          </h3>
          <p className="text-xs font-mono text-gray-400 mt-1">
            {event.allDay
              ? format(startDate, "EEEE, d MMMM")
              : `${format(startDate, "EEEE, d MMMM")} • ${format(startDate, "h:mm a")} – ${format(endDate, "h:mm a")}`}
          </p>
        </div>
      </div>

      {/* Event Details Rows (Google Calendar style) */}
      <div className="space-y-2.5 text-xs text-gray-300 py-2 border-y border-[#2f3e46]/40">
        {/* Description / Notes */}
        <div className="flex items-start gap-3">
          <AlignLeft className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
          <div className="text-gray-300 break-words leading-relaxed text-xs">
            {event.description || (
              <span className="text-gray-500 italic">No description provided</span>
            )}
          </div>
        </div>

        {/* Category / Calendar */}
        <div className="flex items-center gap-3">
          <CalendarIcon className="w-4 h-4 text-gray-400 shrink-0" />
          <span className="font-mono text-[11px] text-gray-300 capitalize">
            {event.type.replace("_", " ")} Calendar
          </span>
        </div>

        {/* Priority Badge */}
        {event.priority && (
          <div className="flex items-center gap-3">
            <Tag className="w-4 h-4 text-gray-400 shrink-0" />
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border font-bold ${
                priorityColors[event.priority] || "text-gray-400 border-gray-700"
              }`}
            >
              {event.priority} Priority
            </span>
          </div>
        )}

        {/* Resource / Room if assigned */}
        {(event.resourceTitle || event.resourceId) && (
          <div className="flex items-center gap-3">
            <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-mono text-[11px] text-emerald-300 font-medium">
              {event.resourceTitle || event.resourceId}
            </span>
          </div>
        )}

        {/* Duration */}
        {!event.allDay && (
          <div className="flex items-center gap-3">
            <Clock className="w-4 h-4 text-gray-400 shrink-0" />
            <span className="font-mono text-[11px] text-gray-400">
              {durationText} duration
            </span>
          </div>
        )}
      </div>

      {/* Footer Action Buttons */}
      <div className="mt-4 pt-1 flex items-center justify-between gap-2">
        {onComplete && (
          <button
            onClick={() => {
              onComplete(event.id);
              onClose();
            }}
            className={`flex-1 py-2 px-3 rounded-xl border font-mono text-xs font-bold flex items-center justify-center gap-1.5 transition-all ${
              isCompleted
                ? "bg-gray-800 text-gray-400 border-gray-700 hover:bg-gray-700"
                : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25"
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            {isCompleted ? "Completed" : "Mark Complete"}
          </button>
        )}

        {onStartTimer && (
          <button
            onClick={() => {
              onStartTimer(event.id);
              onClose();
            }}
            className="flex-1 py-2 px-3 rounded-xl bg-[#a9927d] hover:bg-[#a9927d]/90 text-[#0a0c10] font-mono text-xs font-extrabold flex items-center justify-center gap-1.5 shadow-md transition-all"
          >
            <Zap className="w-3.5 h-3.5 fill-[#0a0c10]" />
            Focus Session
          </button>
        )}
      </div>
    </div>
  );
}
