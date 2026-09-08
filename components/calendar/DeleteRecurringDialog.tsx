"use client";

import React, { useState } from "react";
import { format } from "date-fns";
import { Trash2, AlertCircle, RefreshCw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CalendarEvent } from "@/types/calendar";

interface DeleteRecurringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CalendarEvent | null;
  onConfirm: (scope: "this" | "all") => void;
  isDeleting?: boolean;
}

export function DeleteRecurringDialog({
  open,
  onOpenChange,
  event,
  onConfirm,
  isDeleting = false,
}: DeleteRecurringDialogProps) {
  const [selectedScope, setSelectedScope] = useState<"this" | "all">("this");

  if (!event) return null;

  const occurrenceDate = event.start ? new Date(event.start) : new Date();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px] bg-[#0c1017] border border-[#222f3e] text-white p-6 shadow-2xl rounded-2xl select-none">
        <DialogHeader className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center shrink-0">
              <Trash2 className="w-4 h-4 text-rose-400" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-white tracking-tight">
                Delete recurring event
              </DialogTitle>
              <p className="text-xs text-gray-400 mt-0.5">
                Choose how you want to delete this event
              </p>
            </div>
          </div>
        </DialogHeader>

        {/* Event Preview Card */}
        <div className="my-2 p-3 rounded-xl bg-white/[0.03] border border-white/[0.06] flex items-start gap-3">
          <div
            className="w-3.5 h-3.5 rounded mt-0.5 shrink-0"
            style={{ backgroundColor: event.color || "#3b82f6" }}
          />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-white truncate">
              {event.title}
            </div>
            <div className="text-xs font-mono text-gray-400 mt-0.5">
              {format(occurrenceDate, "EEEE, d MMMM yyyy")}
              {!event.allDay && ` • ${format(occurrenceDate, "h:mm a")}`}
            </div>
          </div>
        </div>

        {/* Options Radio List */}
        <div className="space-y-2.5 my-2">
          {/* Option 1: This event only */}
          <label
            onClick={() => setSelectedScope("this")}
            className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedScope === "this"
                ? "bg-rose-500/10 border-rose-500/40 text-white"
                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] text-gray-300"
            }`}
          >
            <input
              type="radio"
              name="recurring-scope"
              checked={selectedScope === "this"}
              onChange={() => setSelectedScope("this")}
              className="mt-1 text-rose-500 focus:ring-rose-500/20 bg-transparent border-gray-600"
            />
            <div className="flex-1">
              <div className="text-xs font-semibold text-white">
                This event
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Delete only this occurrence ({format(occurrenceDate, "MMM d")}). All other future and past events in the series will remain.
              </div>
            </div>
          </label>

          {/* Option 2: All events */}
          <label
            onClick={() => setSelectedScope("all")}
            className={`flex items-start gap-3.5 p-3.5 rounded-xl border cursor-pointer transition-all ${
              selectedScope === "all"
                ? "bg-rose-500/10 border-rose-500/40 text-white"
                : "bg-white/[0.02] border-white/5 hover:bg-white/[0.04] text-gray-300"
            }`}
          >
            <input
              type="radio"
              name="recurring-scope"
              checked={selectedScope === "all"}
              onChange={() => setSelectedScope("all")}
              className="mt-1 text-rose-500 focus:ring-rose-500/20 bg-transparent border-gray-600"
            />
            <div className="flex-1">
              <div className="text-xs font-semibold text-white">
                All events
              </div>
              <div className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
                Delete all events in this recurring series completely.
              </div>
            </div>
          </label>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 mt-4 pt-2 border-t border-white/5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
            className="text-gray-400 hover:text-white hover:bg-white/5 text-xs font-medium px-4 h-9"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={() => onConfirm(selectedScope)}
            disabled={isDeleting}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-4 h-9 shadow-lg shadow-rose-600/20 gap-1.5"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Deleting...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                {selectedScope === "this" ? "Delete this event" : "Delete all events"}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
