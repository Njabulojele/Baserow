"use client";

import React, { useState, useEffect } from "react";
import { format, addHours, addDays } from "date-fns";
import {
  X,
  Clock,
  Target,
  AlignLeft,
  ListTodo,
  Calendar as CalendarIcon,
  Users,
  Video,
  MapPin,
  AlertCircle,
  Repeat,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { CalendarEvent } from "@/types/calendar";
import { DEFAULT_CALENDAR_RESOURCES } from "./adapter";

export type RecurrenceType =
  | "none"
  | "daily"
  | "weekly"
  | "weekday"
  | "monthly"
  | "annual"
  | "custom";

interface GoogleCreateEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSlot?: {
    start: Date;
    end: Date;
    allDay?: boolean;
    resourceId?: string;
  } | null;
  eventToEdit?: CalendarEvent | null;
  existingEvents?: CalendarEvent[];
  onSave: (payload: {
    id?: string;
    title: string;
    type: "event" | "task" | "appointment" | "background";
    start: Date;
    end: Date;
    allDay?: boolean;
    isRecurring?: boolean;
    recurrenceRule?: string;
    description?: string;
    location?: string;
    attendees?: string[];
    meetingLink?: string;
    resourceId?: string;
    resourceTitle?: string;
    priority?: "low" | "medium" | "high" | "critical";
  }) => void;
  isSaving?: boolean;
}

export function GoogleCreateEventDialog({
  open,
  onOpenChange,
  initialSlot,
  eventToEdit,
  existingEvents = [],
  onSave,
  isSaving = false,
}: GoogleCreateEventDialogProps) {
  // Tab: Event vs Task vs Appointment
  const [activeTab, setActiveTab] = useState<"event" | "task" | "appointment">("task");

  // Form Fields
  const [title, setTitle] = useState("");
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(addHours(new Date(), 1));
  const [allDay, setAllDay] = useState(false);

  // Recurrence
  const [recurrence, setRecurrence] = useState<RecurrenceType>("none");
  const [customInterval, setCustomInterval] = useState(1);
  const [customUnit, setCustomUnit] = useState<"days" | "weeks" | "months">("weeks");
  const [customUntil, setCustomUntil] = useState<string>("");
  const [showCustomModal, setShowCustomModal] = useState(false);

  // Task specific
  const [hasDeadline, setHasDeadline] = useState(false);
  const [deadline, setDeadline] = useState<string>("");
  const [taskCategory, setTaskCategory] = useState("My Tasks");

  // Event specific
  const [guests, setGuests] = useState("");
  const [hasMeetLink, setHasMeetLink] = useState(false);
  const [location, setLocation] = useState("");
  const [resourceId, setResourceId] = useState<string>("none");

  // Common
  const [description, setDescription] = useState("");
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Initialize
  useEffect(() => {
    if (eventToEdit) {
      setTitle(eventToEdit.title || "");
      setActiveTab(eventToEdit.type === "task" ? "task" : "event");
      const s = eventToEdit.start ? new Date(eventToEdit.start) : new Date();
      const e = eventToEdit.end ? new Date(eventToEdit.end) : addHours(s, 1);
      setStartDate(s);
      setEndDate(e);
      setAllDay(!!eventToEdit.allDay);
      setDescription(eventToEdit.description || "");
      setLocation(eventToEdit.location || "");
      setResourceId(eventToEdit.resourceId || "none");
      if (eventToEdit.rrule) {
        setRecurrence("custom");
      } else {
        setRecurrence("none");
      }
    } else if (initialSlot) {
      setTitle("");
      const s = initialSlot.start;
      const e = initialSlot.end && initialSlot.end > s ? initialSlot.end : addHours(s, 1);
      setStartDate(s);
      setEndDate(e);
      setAllDay(!!initialSlot.allDay);
      setResourceId(initialSlot.resourceId || "none");
      setDescription("");
      setLocation("");
      setRecurrence("none");
      setHasMeetLink(false);
      setHasDeadline(false);
    } else {
      const now = new Date();
      now.setMinutes(0, 0, 0);
      setTitle("");
      setStartDate(now);
      setEndDate(addHours(now, 1));
      setAllDay(false);
      setRecurrence("none");
      setDescription("");
      setLocation("");
      setResourceId("none");
    }
  }, [eventToEdit, initialSlot, open]);

  // Conflict detection: Is picked slot occupied by existing events or background events?
  const conflictingEvent = React.useMemo(() => {
    if (allDay) return null;
    const sTime = startDate.getTime();
    const eTime = endDate.getTime();

    return existingEvents.find((ev) => {
      // Ignore itself when editing
      if (eventToEdit && ev.id === eventToEdit.id) return false;
      if (!ev.start || !ev.end) return false;

      const evStart = new Date(ev.start).getTime();
      const evEnd = new Date(ev.end).getTime();

      // Check if time ranges overlap
      const overlaps = Math.max(sTime, evStart) < Math.min(eTime, evEnd);
      return overlaps;
    });
  }, [startDate, endDate, allDay, existingEvents, eventToEdit]);

  // Build RRule string based on selection
  const buildRRule = (): string | undefined => {
    if (recurrence === "none") return undefined;

    const dayNames = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];
    const curDay = dayNames[startDate.getDay()];

    switch (recurrence) {
      case "daily":
        return "FREQ=DAILY;INTERVAL=1";
      case "weekly":
        return `FREQ=WEEKLY;INTERVAL=1;BYDAY=${curDay}`;
      case "weekday":
        return "FREQ=WEEKLY;INTERVAL=1;BYDAY=MO,TU,WE,TH,FR";
      case "monthly":
        return "FREQ=MONTHLY;INTERVAL=1";
      case "annual":
        return "FREQ=YEARLY;INTERVAL=1";
      case "custom": {
        let rule = `FREQ=${customUnit.toUpperCase()};INTERVAL=${customInterval}`;
        if (customUnit === "weeks") {
          rule += `;BYDAY=${curDay}`;
        }
        if (customUntil) {
          const uDate = new Date(customUntil);
          rule += `;UNTIL=${format(uDate, "yyyyMMdd'T'235959'Z'")}`;
        }
        return rule;
      }
      default:
        return undefined;
    }
  };

  const getRecurrenceLabel = () => {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const curDay = dayNames[startDate.getDay()];

    switch (recurrence) {
      case "none":
        return "Doesn't repeat";
      case "daily":
        return "Daily";
      case "weekly":
        return `Weekly on ${curDay}`;
      case "weekday":
        return "Every weekday (Monday to Friday)";
      case "monthly":
        return "Monthly";
      case "annual":
        return `Annually on ${format(startDate, "d MMMM")}`;
      case "custom":
        return `Repeats every ${customInterval} ${customUnit}${customUntil ? ` until ${customUntil}` : ""}`;
      default:
        return "Doesn't repeat";
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const rruleStr = buildRRule();
    const isRecur = recurrence !== "none";

    const selectedResource = DEFAULT_CALENDAR_RESOURCES.find((r) => r.id === resourceId);

    onSave({
      id: eventToEdit?.id,
      title: title.trim(),
      type: activeTab,
      start: startDate,
      end: endDate,
      allDay,
      isRecurring: isRecur,
      recurrenceRule: rruleStr,
      description: description.trim() || undefined,
      location: location.trim() || (selectedResource ? selectedResource.title : undefined),
      attendees: guests ? guests.split(",").map((g) => g.trim()).filter(Boolean) : undefined,
      meetingLink: hasMeetLink ? `https://meet.google.com/${Math.random().toString(36).substring(7)}` : undefined,
      resourceId: resourceId === "none" ? undefined : resourceId,
      resourceTitle: selectedResource ? selectedResource.title : undefined,
      priority: activeTab === "task" ? "medium" : undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[460px] sm:max-w-[490px] bg-[#0d1117] border border-[#2f3e46] text-white p-0 rounded-3xl shadow-2xl overflow-hidden select-none">
        <form onSubmit={handleSave}>
          {/* Top Bar: Close Button */}
          <div className="flex items-center justify-between px-6 pt-4 pb-2">
            <div className="w-6 h-1 rounded-full bg-gray-600/40 mx-auto" />
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="p-1 rounded-full text-gray-400 hover:text-white hover:bg-[#1a252f] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-6 pb-6 space-y-4">
            {/* Title Input with Blue Google Underline */}
            <div className="pt-1">
              <input
                type="text"
                placeholder="Add title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                autoFocus
                className="w-full text-xl sm:text-2xl font-normal bg-transparent text-white placeholder-gray-500 border-b-2 border-transparent focus:border-[#1a73e8] outline-hidden pb-1 transition-all"
              />
            </div>

            {/* Pill Tabs: Event | Task | Appointment schedule */}
            <div className="flex items-center gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => setActiveTab("event")}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTab === "event"
                    ? "bg-[#1a3a5f] text-[#a8c7fa] border border-[#1a73e8]/50 shadow-sm"
                    : "text-gray-300 hover:bg-[#1a252f]"
                }`}
              >
                Event
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("task")}
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${
                  activeTab === "task"
                    ? "bg-[#1a3a5f] text-[#a8c7fa] border border-[#1a73e8]/50 shadow-sm"
                    : "text-gray-300 hover:bg-[#1a252f]"
                }`}
              >
                Task
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("appointment")}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === "appointment"
                    ? "bg-[#1a3a5f] text-[#a8c7fa] border border-[#1a73e8]/50 shadow-sm"
                    : "text-gray-300 hover:bg-[#1a252f]"
                }`}
              >
                <span>Appointment schedule</span>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded-full bg-[#1a73e8] text-white">
                  New
                </span>
              </button>
            </div>

            {/* Conflict Warning Indicator */}
            {conflictingEvent && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="leading-tight">
                  <strong className="font-semibold">Occupied Time:</strong> Overlaps with "{conflictingEvent.title}".
                </span>
              </div>
            )}

            {/* Row 1: Date, Time & Recurrence (Clock Icon) */}
            <div className="flex items-start gap-3.5 pt-1">
              <Clock className="w-5 h-5 text-gray-400 shrink-0 mt-1" />
              <div className="flex-1 min-w-0">
                {/* Date & Time display */}
                <div
                  onClick={() => setShowTimePicker(!showTimePicker)}
                  className="text-xs font-medium text-gray-200 hover:text-white cursor-pointer py-0.5 rounded hover:bg-[#1a252f]/50 transition-colors"
                >
                  <span className="font-medium text-white">
                    {format(startDate, "EEEE, d MMMM")}
                  </span>
                  {!allDay && (
                    <span className="ml-2.5 text-gray-300 font-mono">
                      {format(startDate, "h:mma").toLowerCase()} – {format(endDate, "h:mma").toLowerCase()}
                    </span>
                  )}
                </div>

                {/* Inline Time Range Chooser */}
                {showTimePicker && (
                  <div className="mt-2 p-3 rounded-xl bg-[#1a252f] border border-[#2f3e46] space-y-2.5 animate-in fade-in-0 duration-150 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">
                          Starts
                        </label>
                        <input
                          type="datetime-local"
                          value={format(startDate, "yyyy-MM-dd'T'HH:mm")}
                          onChange={(e) => {
                            if (e.target.value) {
                              const s = new Date(e.target.value);
                              setStartDate(s);
                              if (s >= endDate) setEndDate(addHours(s, 1));
                            }
                          }}
                          className="w-full bg-[#0d1117] border border-[#2f3e46] rounded-md px-2 py-1 text-white text-xs font-mono"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="text-[10px] text-gray-400 uppercase font-mono block mb-1">
                          Ends
                        </label>
                        <input
                          type="datetime-local"
                          value={format(endDate, "yyyy-MM-dd'T'HH:mm")}
                          onChange={(e) => {
                            if (e.target.value) setEndDate(new Date(e.target.value));
                          }}
                          className="w-full bg-[#0d1117] border border-[#2f3e46] rounded-md px-2 py-1 text-white text-xs font-mono"
                        />
                      </div>
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-gray-300 pt-1">
                      <input
                        type="checkbox"
                        checked={allDay}
                        onChange={(e) => setAllDay(e.target.checked)}
                        className="rounded border-[#2f3e46] bg-[#0d1117]"
                      />
                      <span>All day event</span>
                    </label>
                  </div>
                )}

                {/* Recurrence Dropdown */}
                <div className="mt-1">
                  <select
                    value={recurrence}
                    onChange={(e) => {
                      const val = e.target.value as RecurrenceType;
                      setRecurrence(val);
                      if (val === "custom") setShowCustomModal(true);
                    }}
                    className="text-xs text-gray-400 hover:text-white bg-transparent outline-hidden cursor-pointer border-none py-0.5 hover:bg-[#1a252f] rounded transition-colors"
                  >
                    <option value="none" className="bg-[#0d1117] text-white">Doesn't repeat</option>
                    <option value="daily" className="bg-[#0d1117] text-white">Daily</option>
                    <option value="weekly" className="bg-[#0d1117] text-white">
                      Weekly on {format(startDate, "EEEE")}
                    </option>
                    <option value="weekday" className="bg-[#0d1117] text-white">
                      Every weekday (Monday to Friday)
                    </option>
                    <option value="monthly" className="bg-[#0d1117] text-white">Monthly</option>
                    <option value="annual" className="bg-[#0d1117] text-white">
                      Annually on {format(startDate, "d MMMM")}
                    </option>
                    <option value="custom" className="bg-[#0d1117] text-white">Custom...</option>
                  </select>
                </div>

                {/* Custom recurrence configuration panel */}
                {recurrence === "custom" && (
                  <div className="mt-2 p-2.5 rounded-lg bg-[#1a252f]/70 border border-[#2f3e46] text-xs space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Repeat every</span>
                      <input
                        type="number"
                        min={1}
                        max={99}
                        value={customInterval}
                        onChange={(e) => setCustomInterval(Number(e.target.value) || 1)}
                        className="w-14 bg-[#0d1117] border border-[#2f3e46] rounded px-1.5 py-0.5 text-center text-white"
                      />
                      <select
                        value={customUnit}
                        onChange={(e) => setCustomUnit(e.target.value as any)}
                        className="bg-[#0d1117] border border-[#2f3e46] rounded px-2 py-0.5 text-white"
                      >
                        <option value="days">days</option>
                        <option value="weeks">weeks</option>
                        <option value="months">months</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Ends on</span>
                      <input
                        type="date"
                        value={customUntil}
                        onChange={(e) => setCustomUntil(e.target.value)}
                        className="bg-[#0d1117] border border-[#2f3e46] rounded px-2 py-0.5 text-white text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* TASK MODE ROWS */}
            {activeTab === "task" && (
              <>
                {/* Deadline Row */}
                <div className="flex items-center gap-3.5">
                  <Target className="w-5 h-5 text-gray-400 shrink-0" />
                  {hasDeadline ? (
                    <div className="flex items-center gap-2 flex-1">
                      <input
                        type="date"
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="bg-[#1a252f] border border-[#2f3e46] rounded-md px-2.5 py-1 text-xs text-white"
                      />
                      <button
                        type="button"
                        onClick={() => setHasDeadline(false)}
                        className="text-gray-500 hover:text-white text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setHasDeadline(true)}
                      className="text-xs text-gray-400 hover:text-white transition-colors"
                    >
                      Add deadline
                    </button>
                  )}
                </div>

                {/* Description Row */}
                <div className="flex items-start gap-3.5">
                  <AlignLeft className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <textarea
                    rows={2}
                    placeholder="Add description or notes"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-gray-500 border-none outline-hidden resize-none hover:bg-[#1a252f]/40 p-1 rounded transition-colors"
                  />
                </div>

                {/* Task List Selector */}
                <div className="flex items-center gap-3.5">
                  <ListTodo className="w-5 h-5 text-gray-400 shrink-0" />
                  <select
                    value={taskCategory}
                    onChange={(e) => setTaskCategory(e.target.value)}
                    className="text-xs text-gray-300 bg-[#1a252f] border border-[#2f3e46] rounded-lg px-2.5 py-1 cursor-pointer outline-hidden"
                  >
                    <option value="My Tasks">My Tasks</option>
                    <option value="Work Projects">Work Projects</option>
                    <option value="Personal Goals">Personal Goals</option>
                    <option value="Deep Work">Deep Work Sprint</option>
                  </select>
                </div>
              </>
            )}

            {/* EVENT & APPOINTMENT MODE ROWS */}
            {activeTab !== "task" && (
              <>
                {/* Add Guests */}
                <div className="flex items-center gap-3.5">
                  <Users className="w-5 h-5 text-gray-400 shrink-0" />
                  <input
                    type="text"
                    placeholder="Add guests (emails or names)"
                    value={guests}
                    onChange={(e) => setGuests(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-gray-500 border-none outline-hidden hover:bg-[#1a252f]/40 p-1 rounded transition-colors"
                  />
                </div>

                {/* Google Meet Video Conferencing */}
                <div className="flex items-center gap-3.5">
                  <Video className="w-5 h-5 text-amber-400 shrink-0" />
                  {hasMeetLink ? (
                    <div className="flex items-center justify-between w-full bg-[#1a252f] border border-[#2f3e46] px-3 py-1.5 rounded-xl text-xs">
                      <span className="text-blue-400 font-mono font-medium">
                        meet.google.com/xyz-core-ops
                      </span>
                      <button
                        type="button"
                        onClick={() => setHasMeetLink(false)}
                        className="text-gray-500 hover:text-white"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setHasMeetLink(true)}
                      className="text-xs text-gray-300 hover:text-white transition-colors"
                    >
                      Add Google Meet video conferencing
                    </button>
                  )}
                </div>

                {/* Location / Room Assignment */}
                <div className="flex items-center gap-3.5">
                  <MapPin className="w-5 h-5 text-gray-400 shrink-0" />
                  <select
                    value={resourceId}
                    onChange={(e) => setResourceId(e.target.value)}
                    className="text-xs text-gray-300 bg-[#1a252f] border border-[#2f3e46] rounded-lg px-2.5 py-1 cursor-pointer outline-hidden flex-1"
                  >
                    <option value="none">Add location or select room...</option>
                    {DEFAULT_CALENDAR_RESOURCES.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.title} {r.occupancy ? `(${r.occupancy})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Description */}
                <div className="flex items-start gap-3.5">
                  <AlignLeft className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                  <textarea
                    rows={2}
                    placeholder="Add description or meeting agenda"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full bg-transparent text-xs text-white placeholder-gray-500 border-none outline-hidden resize-none hover:bg-[#1a252f]/40 p-1 rounded transition-colors"
                  />
                </div>
              </>
            )}

            {/* Calendar Identity Row (Njabulo Jele ●) */}
            <div className="flex items-center gap-3.5 pt-1 border-t border-[#2f3e46]/40">
              <CalendarIcon className="w-5 h-5 text-gray-400 shrink-0" />
              <div className="text-xs">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-gray-200">Njabulo Jele</span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#1a73e8] inline-block shadow-sm" />
                </div>
                <div className="text-[11px] text-gray-500">
                  {activeTab === "task" ? "Free • Private" : "Busy • Default visibility • Notify 30 minutes before"}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar: "More options" + Blue "Save" Button */}
          <div className="px-6 py-4 bg-[#0a0c10] border-t border-[#2f3e46] flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowTimePicker(!showTimePicker)}
              className="text-xs font-semibold text-gray-400 hover:text-white transition-colors"
            >
              {showTimePicker ? "Hide options" : "More options"}
            </button>

            <button
              type="submit"
              disabled={!title.trim() || isSaving}
              className="px-7 py-2 rounded-full bg-[#1a73e8] hover:bg-[#1557b0] text-white font-semibold text-xs transition-all shadow-md shadow-blue-500/20 disabled:opacity-50 cursor-pointer"
            >
              {isSaving ? "Saving..." : "Save"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
