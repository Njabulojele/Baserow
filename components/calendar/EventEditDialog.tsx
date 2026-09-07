"use client";

import React, { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  Calendar as CalendarIcon,
  Clock,
  Tag,
  MapPin,
  AlignLeft,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CalendarEvent } from "@/types/calendar";
import { DEFAULT_CALENDAR_RESOURCES } from "./adapter";

interface EventEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventToEdit?: CalendarEvent | null;
  initialSlot?: {
    start: Date;
    end: Date;
    allDay?: boolean;
    resourceId?: string;
  } | null;
  onSave: (eventData: {
    id?: string;
    title: string;
    start: Date;
    end: Date;
    type: "task" | "time_block" | "event" | "background";
    priority: "low" | "medium" | "high" | "critical";
    resourceId?: string;
    resourceTitle?: string;
    description?: string;
    allDay?: boolean;
  }) => void;
  isSaving?: boolean;
}

export function EventEditDialog({
  open,
  onOpenChange,
  eventToEdit,
  initialSlot,
  onSave,
  isSaving = false,
}: EventEditDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<"task" | "time_block" | "event" | "background">("task");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [startDateStr, setStartDateStr] = useState("");
  const [endDateStr, setEndDateStr] = useState("");
  const [resourceId, setResourceId] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [allDay, setAllDay] = useState(false);

  // Format date to datetime-local input string YYYY-MM-DDTHH:mm
  const toDateTimeLocal = (date: Date) => {
    const pad = (n: number) => n.toString().padStart(2, "0");
    const y = date.getFullYear();
    const m = pad(date.getMonth() + 1);
    const d = pad(date.getDate());
    const h = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${y}-${m}-${d}T${h}:${min}`;
  };

  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title);
      setType(eventToEdit.type || "task");
      setPriority((eventToEdit.priority as any) || "medium");
      setStartDateStr(toDateTimeLocal(new Date(eventToEdit.start)));
      setEndDateStr(toDateTimeLocal(new Date(eventToEdit.end)));
      setResourceId(eventToEdit.resourceId || "none");
      setDescription(eventToEdit.description || "");
      setAllDay(!!eventToEdit.allDay);
    } else if (initialSlot) {
      setTitle("");
      setType("task");
      setPriority("medium");
      setStartDateStr(toDateTimeLocal(initialSlot.start));
      setEndDateStr(toDateTimeLocal(initialSlot.end));
      setResourceId(initialSlot.resourceId || "none");
      setDescription("");
      setAllDay(!!initialSlot.allDay);
    } else {
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 60 * 60000);
      setTitle("");
      setType("task");
      setPriority("medium");
      setStartDateStr(toDateTimeLocal(now));
      setEndDateStr(toDateTimeLocal(inOneHour));
      setResourceId("none");
      setDescription("");
      setAllDay(false);
    }
  }, [eventToEdit, initialSlot, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !startDateStr || !endDateStr) return;

    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    const selectedRes = DEFAULT_CALENDAR_RESOURCES.find((r) => r.id === resourceId);

    onSave({
      id: eventToEdit?.id,
      title: title.trim(),
      start,
      end,
      type,
      priority,
      resourceId: resourceId === "none" ? undefined : resourceId,
      resourceTitle: selectedRes ? selectedRes.title : undefined,
      description: description.trim() || undefined,
      allDay,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1117] border-[#2f3e46] text-white sm:max-w-lg p-6 rounded-2xl shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-sm font-mono uppercase tracking-widest text-[#a9927d] flex items-center gap-2">
            <CalendarIcon className="w-4 h-4" />
            {eventToEdit ? "Edit Event / Schedule" : "Create New Event"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Title input */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1.5">
              Event Title *
            </label>
            <Input
              placeholder="e.g., Team Sprint Planning, Product Review..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="bg-[#1a252f] border-[#2f3e46] text-white text-sm focus:border-[#a9927d]"
              autoFocus
            />
          </div>

          {/* Type & Priority Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1.5">
                Type
              </label>
              <Select value={type} onValueChange={(v: any) => setType(v)}>
                <SelectTrigger className="bg-[#1a252f] border-[#2f3e46] text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a252f] border-[#2f3e46] text-gray-200">
                  <SelectItem value="task">📋 Task</SelectItem>
                  <SelectItem value="event">🤝 Event / Meeting</SelectItem>
                  <SelectItem value="time_block">⏱️ Time Block</SelectItem>
                  <SelectItem value="background">🛡️ Focus Zone (Background)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1.5">
                Priority
              </label>
              <Select value={priority} onValueChange={(v: any) => setPriority(v)}>
                <SelectTrigger className="bg-[#1a252f] border-[#2f3e46] text-white text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1a252f] border-[#2f3e46] text-gray-200">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical 🚨</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Start & End Date Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1.5">
                Starts At
              </label>
              <Input
                type="datetime-local"
                value={startDateStr}
                onChange={(e) => setStartDateStr(e.target.value)}
                className="bg-[#1a252f] border-[#2f3e46] text-white text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1.5">
                Ends At
              </label>
              <Input
                type="datetime-local"
                value={endDateStr}
                onChange={(e) => setEndDateStr(e.target.value)}
                className="bg-[#1a252f] border-[#2f3e46] text-white text-xs"
              />
            </div>
          </div>

          {/* Resource Room Assignment (Matches resource-view and resource-time-grid) */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1.5">
              Room / Resource (Optional)
            </label>
            <Select value={resourceId} onValueChange={(v) => setResourceId(v)}>
              <SelectTrigger className="bg-[#1a252f] border-[#2f3e46] text-white text-xs">
                <SelectValue placeholder="Assign Room..." />
              </SelectTrigger>
              <SelectContent className="bg-[#1a252f] border-[#2f3e46] text-gray-200">
                <SelectItem value="none">None (Standard Calendar)</SelectItem>
                {DEFAULT_CALENDAR_RESOURCES.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.title} {r.occupancy ? `(${r.occupancy})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Description */}
          <div>
            <label className="text-[10px] font-mono uppercase tracking-wider text-gray-400 block mb-1.5">
              Description / Agenda
            </label>
            <textarea
              placeholder="Add details, video call link, notes or agenda..."
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-md bg-[#1a252f] border border-[#2f3e46] text-white text-xs p-2.5 focus:outline-hidden focus:border-[#a9927d] transition-colors resize-none"
            />
          </div>

          <DialogFooter className="pt-2 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="bg-transparent border-[#2f3e46] text-gray-300 hover:text-white hover:bg-[#1a252f]"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || isSaving}
              className="bg-[#a9927d] hover:bg-[#a9927d]/90 text-[#0a0c10] font-mono font-bold text-xs"
            >
              {isSaving ? "Saving..." : eventToEdit ? "Update Event" : "Create Event"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
