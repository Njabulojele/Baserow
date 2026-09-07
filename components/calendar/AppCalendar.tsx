"use client";

import React, { useRef, useMemo, forwardRef, useImperativeHandle } from "react";
import FullCalendar from "@fullcalendar/react";
import {
  DateSelectArg,
  EventClickArg,
  EventDropArg,
  DatesSetArg,
} from "@fullcalendar/core";
import { calendarPlugins, SCHEDULER_LICENSE_KEY } from "./plugins";
import {
  toFullCalendarEvents,
  extractResourcesFromEvents,
  fromFullCalendarMutation,
  CalendarResource,
} from "./adapter";
import { CalendarEvent } from "@/types/calendar";
import "./calendar.css";

export interface AppCalendarRef {
  getApi: () => any;
  gotoDate: (date: Date) => void;
  changeView: (view: string) => void;
  prev: () => void;
  next: () => void;
  today: () => void;
}

export interface AppCalendarProps {
  events: CalendarEvent[];
  initialView?: string;
  initialDate?: Date;
  resources?: CalendarResource[];
  isLoading?: boolean;
  onEventClick?: (
    event: CalendarEvent,
    anchorRect?: DOMRect,
    jsEvent?: MouseEvent,
  ) => void;
  onEventChange?: (updated: {
    id: string;
    start: Date;
    end: Date;
    resourceId?: string;
  }) => Promise<void> | void;
  onSelectSlot?: (slot: {
    start: Date;
    end: Date;
    allDay: boolean;
    resourceId?: string;
  }) => void;
  onDateClick?: (arg: { date: Date; allDay: boolean; resourceId?: string }) => void;
  onExternalReceive?: (received: {
    id: string;
    title: string;
    start: Date;
    end: Date;
    resourceId?: string;
  }) => Promise<void> | void;
  onDatesSet?: (arg: DatesSetArg) => void;
  customButtons?: Record<string, any>;
  headerToolbar?: any;
}

export const AppCalendar = forwardRef<AppCalendarRef, AppCalendarProps>(
  function AppCalendar(
    {
      events,
      initialView = "dayGridMonth",
      initialDate,
      resources,
      isLoading = false,
      onEventClick,
      onEventChange,
      onSelectSlot,
      onDateClick,
      onExternalReceive,
      onDatesSet,
      headerToolbar = false,
    },
    ref,
  ) {
    const internalCalendarRef = useRef<any>(null);

    // Expose imperative API to parent component
    useImperativeHandle(ref, () => ({
      getApi: () => internalCalendarRef.current?.getApi(),
      gotoDate: (date: Date) => internalCalendarRef.current?.getApi()?.gotoDate(date),
      changeView: (view: string) => internalCalendarRef.current?.getApi()?.changeView(view),
      prev: () => internalCalendarRef.current?.getApi()?.prev(),
      next: () => internalCalendarRef.current?.getApi()?.next(),
      today: () => internalCalendarRef.current?.getApi()?.today(),
    }));

    // Map application events to FullCalendar EventInput format
    const fcEvents = useMemo(() => toFullCalendarEvents(events), [events]);

    // Extract or use custom resources for Timeline / Resource views
    const fcResources = useMemo(
      () => extractResourcesFromEvents(events, resources),
      [events, resources],
    );

    // 1. Handle Event Click with anchor bounding box
    const handleEventClick = (info: EventClickArg) => {
      if (info.event.display === "background") return; // Ignore background clicks

      const raw = info.event.extendedProps?.rawEvent as CalendarEvent;
      const rect = info.el.getBoundingClientRect();

      const eventData: CalendarEvent = raw || {
        id: info.event.id,
        title: info.event.title,
        start: info.event.start?.toISOString() || "",
        end: info.event.end?.toISOString() || "",
        type: info.event.extendedProps?.type || "event",
        status: info.event.extendedProps?.status || "scheduled",
        priority: info.event.extendedProps?.priority || "medium",
        color: info.event.backgroundColor || "#3b82f6",
        draggable: info.event.startEditable ?? true,
        resizable: info.event.durationEditable ?? true,
        allDay: info.event.allDay,
        description: info.event.extendedProps?.description,
        resourceId: info.event.extendedProps?.resourceId,
        resourceTitle: info.event.extendedProps?.resourceTitle,
      };

      if (onEventClick) {
        onEventClick(eventData, rect, info.jsEvent);
      }
    };

    // 2. Handle Drag & Drop (Event Move)
    const handleEventDrop = async (info: EventDropArg) => {
      const payload = fromFullCalendarMutation(info.event);
      if (!onEventChange) return;

      try {
        await onEventChange(payload);
      } catch (err) {
        console.error("Failed to move event, reverting:", err);
        info.revert();
      }
    };

    // 3. Handle Event Resize
    const handleEventResize = async (info: any) => {
      const payload = fromFullCalendarMutation(info.event);
      if (!onEventChange) return;

      try {
        await onEventChange(payload);
      } catch (err) {
        console.error("Failed to resize event, reverting:", err);
        info.revert();
      }
    };

    // 4. Handle Date Slot Selection (Selectable dates)
    const handleSelect = (info: DateSelectArg) => {
      if (onSelectSlot) {
        onSelectSlot({
          start: info.start,
          end: info.end,
          allDay: info.allDay,
          resourceId: info.resource?.id,
        });
      }
    };

    // 5. Handle External Task Receive
    const handleEventReceive = async (info: any) => {
      const rawData = info.draggedEl?.getAttribute("data-event");
      let parsedData: any = {};
      if (rawData) {
        try {
          parsedData = JSON.parse(rawData);
        } catch (e) {
          console.error("Error parsing dragged event data:", e);
        }
      }

      const id = parsedData.id || info.event.id;
      const title = parsedData.title || info.event.title;
      const start = info.event.start || new Date();
      const end =
        info.event.end || new Date(start.getTime() + (parsedData.duration || 30) * 60000);
      const resourceId = info.event.getResources?.()[0]?.id;

      if (onExternalReceive) {
        try {
          await onExternalReceive({
            id,
            title,
            start,
            end,
            resourceId,
          });
        } catch (err) {
          console.error("Failed to schedule dropped external task:", err);
          info.event.remove();
        }
      }
    };

    // Custom Event Card Rendering matching Google Calendar & Baserow styles
    const renderEventContent = (eventInfo: any) => {
      const isBackground = eventInfo.event.display === "background";
      if (isBackground) {
        return (
          <div className="p-1.5 text-[10px] font-mono text-gray-400 italic truncate flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
            <span className="truncate">{eventInfo.event.title}</span>
          </div>
        );
      }

      const isAllDay = eventInfo.event.allDay;
      const viewType = eventInfo.view.type;
      const isMonthView = viewType === "dayGridMonth" || viewType === "multiMonthYear";
      const priority = eventInfo.event.extendedProps?.priority;
      const eventColor = eventInfo.event.backgroundColor || "#3b82f6";

      // Google Calendar Month View Style:
      // For all-day events: solid rounded pill
      // For timed events: colored circular dot + time + title
      if (isMonthView && !isAllDay) {
        return (
          <div className="flex items-center gap-1.5 px-1 py-0.5 overflow-hidden text-xs leading-tight w-full cursor-pointer hover:opacity-90">
            <span
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: eventColor }}
            />
            {eventInfo.timeText && (
              <span className="text-[10px] font-mono text-gray-400 shrink-0">
                {eventInfo.timeText}
              </span>
            )}
            <span className="font-semibold text-gray-200 truncate text-[11px]">
              {eventInfo.event.title}
            </span>
          </div>
        );
      }

      // Solid Card (All Day / TimeGrid / Resource Views)
      return (
        <div className="flex flex-col h-full w-full justify-center px-1.5 py-1 overflow-hidden leading-tight rounded cursor-pointer">
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-white truncate text-xs">
              {eventInfo.event.title}
            </span>
            {priority && (
              <span
                className={`text-[8px] font-mono uppercase px-1 py-0.2 rounded font-bold ${
                  priority === "critical" || priority === "high"
                    ? "bg-rose-500/20 text-rose-300 border border-rose-500/40"
                    : "bg-black/30 text-gray-300"
                }`}
              >
                {priority}
              </span>
            )}
          </div>
          {eventInfo.timeText && !isAllDay && (
            <span className="text-[10px] font-mono text-gray-300/90 truncate mt-0.5">
              {eventInfo.timeText}
            </span>
          )}
        </div>
      );
    };

    const FullCalendarComponent = FullCalendar as unknown as React.ComponentType<any>;

    return (
      <div className="h-full w-full flex flex-col bg-[#0a0c10] relative select-none">
        {isLoading && (
          <div className="absolute inset-0 bg-[#0a0c10]/50 backdrop-blur-xs flex items-center justify-center z-40 pointer-events-none">
            <div className="text-xs font-mono text-[#a9927d] animate-pulse">
              Syncing calendar...
            </div>
          </div>
        )}

        <div className="flex-1 min-h-0 h-full">
          <FullCalendarComponent
            ref={internalCalendarRef}
            schedulerLicenseKey={SCHEDULER_LICENSE_KEY}
            plugins={calendarPlugins}
            initialView={initialView}
            initialDate={initialDate}
            headerToolbar={headerToolbar}
            views={{
              multiMonthYear: { multiMonthMaxColumns: 3 },
              resourceTimelineWeek: {
                slotDuration: "02:00:00",
                slotMinTime: "06:00:00",
                slotMaxTime: "22:00:00",
              },
              resourceTimelineDay: {
                slotDuration: "01:00:00",
                slotMinTime: "06:00:00",
                slotMaxTime: "22:00:00",
              },
              resourceTimeGridDay: {
                slotMinTime: "06:00:00",
                slotMaxTime: "22:00:00",
              },
            }}
            resources={fcResources}
            events={fcEvents}
            editable={true}
            droppable={true}
            selectable={true}
            selectMirror={true}
            nowIndicator={true}
            eventResizableFromStart={true}
            slotMinTime="06:00:00"
            slotMaxTime="23:00:00"
            slotDuration="00:30:00"
            allDaySlot={true}
            weekends={true}
            dayMaxEvents={4}
            expandRows={true}
            selectAllow={(selectInfo: DateSelectArg) => {
              const selStart = selectInfo.start.getTime();
              const selEnd = selectInfo.end.getTime();

              const isOccupied = events.some((ev) => {
                if (!ev.start || !ev.end) return false;
                const evStart = new Date(ev.start).getTime();
                const evEnd = new Date(ev.end).getTime();
                return Math.max(selStart, evStart) < Math.min(selEnd, evEnd);
              });

              return !isOccupied;
            }}
            eventOverlap={false}
            eventClick={handleEventClick}
            eventDrop={handleEventDrop}
            eventResize={handleEventResize}
            select={handleSelect}
            eventReceive={handleEventReceive}
            dateClick={onDateClick}
            datesSet={onDatesSet}
            eventContent={renderEventContent}
          />
        </div>
      </div>
    );
  },
);
