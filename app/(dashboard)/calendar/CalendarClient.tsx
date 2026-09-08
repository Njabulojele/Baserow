"use client";

import React, { useState, useMemo, useRef, useCallback } from "react";
import { subMonths, addMonths } from "date-fns";
import { toast } from "sonner";

import { trpc } from "@/lib/trpc/client";
import { AppCalendar, AppCalendarRef } from "@/components/calendar/AppCalendar";
import { GoogleCalendarHeader, CalendarViewType } from "@/components/calendar/GoogleCalendarHeader";
import {
  GoogleCalendarSidebar,
  CalendarCategoryFilter,
} from "@/components/calendar/GoogleCalendarSidebar";
import { EventDetailPopover } from "@/components/calendar/EventDetailPopover";
import { GoogleCreateEventDialog } from "@/components/calendar/GoogleCreateEventDialog";
import { DeleteRecurringDialog } from "@/components/calendar/DeleteRecurringDialog";
import { CalendarEvent } from "@/types/calendar";

export function CalendarClient() {
  const calendarRef = useRef<AppCalendarRef>(null);

  // Layout & View States
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [currentView, setCurrentView] = useState<CalendarViewType>("dayGridMonth");
  const [calendarTitle, setCalendarTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState("");

  // Popover State (Google-style positioned popup)
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedAnchorRect, setSelectedAnchorRect] = useState<DOMRect | null>(null);
  const [recurringEventToDelete, setRecurringEventToDelete] = useState<CalendarEvent | null>(null);

  // Create / Edit Dialog State
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [createSlot, setCreateSlot] = useState<{
    start: Date;
    end: Date;
    allDay?: boolean;
    resourceId?: string;
  } | null>(null);

  // Category Filters (My Calendars checkboxes)
  const [categories, setCategories] = useState<CalendarCategoryFilter[]>([
    { id: "task", name: "Tasks", color: "#a9927d", enabled: true },
    { id: "event", name: "Meetings & Events", color: "#34d399", enabled: true },
    { id: "time_block", name: "Time Blocks", color: "#818cf8", enabled: true },
    { id: "background", name: "Focus Zones (Background)", color: "#6366f1", enabled: true },
    { id: "resources", name: "Auditoriums & Rooms (Demo)", color: "#f59e0b", enabled: true },
    { id: "holidays", name: "Holidays & Observances", color: "#10b981", enabled: true },
  ]);

  // Query Date Range
  const [dateRange, setDateRange] = useState({
    start: subMonths(new Date(), 2),
    end: addMonths(new Date(), 6),
  });

  const utils = trpc.useUtils();

  // Mutations
  const updateEvent = trpc.calendar.updateEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.task.getBacklogTasks.invalidate();
      toast.success("Schedule updated! 📅");
    },
    onError: (err) => {
      toast.error(`Update failed: ${err.message}`);
    },
  });

  const createCalendarEventMutation = trpc.calendar.createEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      toast.success("Event created & scheduled! 📅");
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      setCreateSlot(null);
    },
    onError: (err) => {
      toast.error(`Failed to create event: ${err.message}`);
    },
  });

  const createTaskMutation = trpc.task.createTask.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.task.getTasks.invalidate();
      toast.success("Task created successfully!");
      setIsEditDialogOpen(false);
      setEditingEvent(null);
      setCreateSlot(null);
    },
    onError: (err) => {
      toast.error(`Failed to create task: ${err.message}`);
    },
  });

  const startTimerMutation = trpc.task.startTimer.useMutation({
    onSuccess: () => {
      utils.task.getActiveTimer.invalidate();
      toast.success("Focus timer started! ⚡");
    },
  });

  const completeTaskMutation = trpc.task.completeTask.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.task.getTasks.invalidate();
      toast.success("Marked as complete!");
      setSelectedEvent(null);
      setSelectedAnchorRect(null);
    },
  });

  const deleteTaskMutation = trpc.task.deleteTask.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.task.getTasks.invalidate();
      toast.success("Event deleted.");
      setSelectedEvent(null);
      setSelectedAnchorRect(null);
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  const deleteCalendarEventMutation = trpc.calendar.deleteEvent.useMutation({
    onSuccess: () => {
      utils.calendar.getEvents.invalidate();
      utils.task.getTasks.invalidate();
      toast.success("Event deleted.");
      setSelectedEvent(null);
      setSelectedAnchorRect(null);
    },
    onError: (err) => {
      toast.error(`Failed to delete: ${err.message}`);
    },
  });

  // Query events from backend database
  const { data: rawEvents, isLoading } = trpc.calendar.getEvents.useQuery({
    start: dateRange.start,
    end: dateRange.end,
  });

  // Real events only — from database. No mock/demo events.
  const visibleEvents: CalendarEvent[] = useMemo(() => {
    const dbEvents = (rawEvents as unknown as CalendarEvent[]) || [];

    const enabledCategories = new Set(
      categories.filter((c) => c.enabled).map((c) => c.id),
    );

    return dbEvents.filter((ev) => {
      // Category filter
      if (ev.type === "background") {
        return enabledCategories.has("background");
      }
      if (ev.resourceId && !enabledCategories.has("resources")) return false;
      if (!enabledCategories.has(ev.type)) return false;

      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = ev.title.toLowerCase().includes(q);
        const matchesDesc = ev.description?.toLowerCase().includes(q);
        const matchesResource = ev.resourceTitle?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc && !matchesResource) return false;
      }

      return true;
    });
  }, [rawEvents, categories, searchQuery]);

  // Header Toolbar Handlers
  const handleToday = useCallback(() => {
    calendarRef.current?.today();
    setSelectedDate(new Date());
  }, []);

  const handlePrev = useCallback(() => {
    calendarRef.current?.prev();
  }, []);

  const handleNext = useCallback(() => {
    calendarRef.current?.next();
  }, []);

  const handleViewChange = useCallback((newView: CalendarViewType) => {
    setCurrentView(newView);
    calendarRef.current?.changeView(newView);
  }, []);

  // Mini-Calendar Date Click
  const handleSelectMiniDate = useCallback((date: Date) => {
    setSelectedDate(date);
    calendarRef.current?.gotoDate(date);
  }, []);

  // Event Click Handler (triggers Google Calendar-style popup)
  const handleEventClick = useCallback(
    (event: CalendarEvent, anchorRect?: DOMRect) => {
      setSelectedEvent(event);
      setSelectedAnchorRect(anchorRect || null);
    },
    [],
  );

  // Date Slot Drag / Select Handler (selectable-dates.png)
  const handleSelectSlot = useCallback(
    (slot: { start: Date; end: Date; allDay: boolean; resourceId?: string }) => {
      setCreateSlot(slot);
      setEditingEvent(null);
      setIsEditDialogOpen(true);
    },
    [],
  );

  // Drag & Drop / Resize Handler (drag-n-drop.png)
  const handleEventChange = useCallback(
    async (updated: { id: string; start: Date; end: Date; resourceId?: string }) => {
      await updateEvent.mutateAsync({
        id: updated.id,
        start: updated.start,
        end: updated.end,
      });
    },
    [updateEvent],
  );

  // Save from Edit / Create Dialog
  const handleSaveEvent = useCallback(
    (data: {
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
    }) => {
      const durationMinutes = Math.max(
        15,
        Math.round((data.end.getTime() - data.start.getTime()) / 60000),
      );

      if (data.id) {
        // Update existing
        updateEvent.mutate({
          id: data.id,
          start: data.start,
          end: data.end,
        });
        setIsEditDialogOpen(false);
        setSelectedEvent(null);
      } else if (data.type === "task" && !data.isRecurring) {
        // Single task
        createTaskMutation.mutate({
          title: data.title,
          scheduledDate: data.start,
          estimatedMinutes: durationMinutes,
          priority: data.priority || "medium",
        });
      } else {
        // Calendar Event (or recurring event/task)
        createCalendarEventMutation.mutate({
          title: data.title,
          description: data.description,
          start: data.start,
          end: data.end,
          type: data.type,
          allDay: data.allDay,
          isRecurring: data.isRecurring,
          recurrenceRule: data.recurrenceRule,
          priority: data.priority,
          location: data.location,
        });
      }
    },
    [updateEvent, createTaskMutation, createCalendarEventMutation],
  );

  // Category Toggle Handler
  const handleToggleCategory = useCallback((id: string) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)),
    );
  }, []);

  // Delete Request Handler (checks for recurring events)
  const handleDeleteRequest = useCallback(
    (id: string, event?: CalendarEvent) => {
      const target = event || visibleEvents.find((e) => e.id === id);
      if (target && (target.isRecurring || target.rrule)) {
        setRecurringEventToDelete(target);
        setSelectedEvent(null);
        setSelectedAnchorRect(null);
      } else {
        if (target?.type === "task") {
          deleteTaskMutation.mutate({ id });
        } else {
          deleteCalendarEventMutation.mutate({ id, scope: "all" });
        }
        setSelectedEvent(null);
        setSelectedAnchorRect(null);
      }
    },
    [visibleEvents, deleteTaskMutation, deleteCalendarEventMutation],
  );

  // Confirm Deletion of Recurring Event (this vs all)
  const handleConfirmDeleteRecurring = useCallback(
    (scope: "this" | "all") => {
      if (!recurringEventToDelete) return;
      deleteCalendarEventMutation.mutate({
        id: recurringEventToDelete.id,
        scope,
        occurrenceDate: recurringEventToDelete.start,
      });
      setRecurringEventToDelete(null);
    },
    [recurringEventToDelete, deleteCalendarEventMutation],
  );

  return (
    <div className="h-full w-full flex flex-col bg-[#0a0c10] overflow-hidden select-none">
      {/* 1. Google-Style Top Navigation Header */}
      <GoogleCalendarHeader
        title={calendarTitle}
        currentView={currentView}
        onViewChange={handleViewChange}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
        isSidebarOpen={isSidebarOpen}
        isLoading={isLoading}
      />

      {/* 2. Main Workspace: Sidebar + FullCalendar Grid */}
      <div className="flex-1 flex overflow-hidden min-h-0 relative">
        {/* Google Calendar Left Sidebar */}
        <GoogleCalendarSidebar
          selectedDate={selectedDate}
          onSelectDate={handleSelectMiniDate}
          onCreateClick={() => {
            setCreateSlot(null);
            setEditingEvent(null);
            setIsEditDialogOpen(true);
          }}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          categories={categories}
          onToggleCategory={handleToggleCategory}
          isOpen={isSidebarOpen}
          onToggleOpen={() => setIsSidebarOpen((prev) => !prev)}
        />

        {/* Calendar Grid Container */}
        <div className="flex-1 p-2 sm:p-3 overflow-hidden relative flex flex-col min-h-0 bg-[#0a0c10]">
          <AppCalendar
            ref={calendarRef}
            events={visibleEvents}
            initialView="dayGridMonth"
            isLoading={isLoading}
            onEventClick={handleEventClick}
            onEventChange={handleEventChange}
            onSelectSlot={handleSelectSlot}
            onDatesSet={(arg) => {
              setCalendarTitle(arg.view.title);
              if (arg.start && arg.end) {
                setDateRange({
                  start: subMonths(new Date(arg.start), 1),
                  end: addMonths(new Date(arg.end), 1),
                });
              }
            }}
          />
        </div>

        {/* 3. Google Calendar-Style Event Detail Popover */}
        {selectedEvent && (
          <EventDetailPopover
            event={selectedEvent}
            anchorRect={selectedAnchorRect}
            onClose={() => {
              setSelectedEvent(null);
              setSelectedAnchorRect(null);
            }}
            onDelete={handleDeleteRequest}
            onComplete={(id) => completeTaskMutation.mutate({ id })}
            onStartTimer={(id) => startTimerMutation.mutate({ id })}
            onEdit={(ev) => {
              setEditingEvent(ev);
              setIsEditDialogOpen(true);
              setSelectedEvent(null);
            }}
          />
        )}

        {/* 4. Google Calendar Event & Task Creator Dialog */}
        <GoogleCreateEventDialog
          open={isEditDialogOpen}
          onOpenChange={(open) => {
            setIsEditDialogOpen(open);
            if (!open) {
              setEditingEvent(null);
              setCreateSlot(null);
            }
          }}
          eventToEdit={editingEvent}
          initialSlot={createSlot}
          existingEvents={visibleEvents}
          onSave={handleSaveEvent}
          isSaving={
            createTaskMutation.isPending ||
            createCalendarEventMutation.isPending ||
            updateEvent.isPending
          }
        />

        {/* 5. Google Calendar Recurring Event Delete Dialog */}
        <DeleteRecurringDialog
          open={!!recurringEventToDelete}
          onOpenChange={(open) => {
            if (!open) setRecurringEventToDelete(null);
          }}
          event={recurringEventToDelete}
          onConfirm={handleConfirmDeleteRecurring}
          isDeleting={deleteCalendarEventMutation.isPending}
        />
      </div>
    </div>
  );
}
