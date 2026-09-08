import { EventInput } from "@fullcalendar/core";
import { CalendarEvent } from "@/types/calendar";

export interface CalendarResource {
  id: string;
  title: string;
  eventColor?: string;
  occupancy?: string;
}

/**
 * Maps application CalendarEvent to FullCalendar EventInput shape.
 * Supports background events, resource assignment, recurring events (rrule),
 * and custom extendedProps.
 */
export function toFullCalendarEvent(event: CalendarEvent): EventInput {
  const isBackground =
    event.type === "background" ||
    event.display === "background" ||
    event.display === "inverse-background";

  let duration: string | undefined = undefined;
  if (event.start && event.end) {
    const s = new Date(event.start).getTime();
    const e = new Date(event.end).getTime();
    if (e > s) {
      const diffMin = Math.round((e - s) / 60000);
      const h = Math.floor(diffMin / 60).toString().padStart(2, "0");
      const m = (diffMin % 60).toString().padStart(2, "0");
      duration = `${h}:${m}`;
    }
  }

  let finalRrule: any = event.rrule || (event.isRecurring ? event.recurrenceRule : undefined);
  if (typeof finalRrule === "string" && finalRrule) {
    const lines = finalRrule.split("\n").map((l: string) => l.trim()).filter(Boolean);
    const rruleLine = lines.find((l: string) => l.startsWith("RRULE:") || (!l.startsWith("DTSTART:") && !l.startsWith("EXDATE:")));
    const exdateLines = lines.filter((l: string) => l.startsWith("EXDATE:"));
    const rawRule = rruleLine ? (rruleLine.startsWith("RRULE:") ? rruleLine.substring(6) : rruleLine) : "";

    if (!finalRrule.includes("DTSTART") && event.start) {
      const d = new Date(event.start);
      const pad = (n: number) => n.toString().padStart(2, "0");
      const dtstart = `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
      let rruleStr = `DTSTART:${dtstart}\nRRULE:${rawRule}`;
      if (exdateLines.length > 0) {
        rruleStr += `\n${exdateLines.join("\n")}`;
      }
      finalRrule = rruleStr;
    }
  }

  return {
    id: event.id,
    title: event.title,
    start: finalRrule ? undefined : event.start,
    end: finalRrule ? undefined : event.end,
    rrule: finalRrule,
    duration: finalRrule ? duration : undefined,
    allDay: event.allDay ?? false,
    backgroundColor: isBackground ? `${event.color}25` : event.color,
    borderColor: isBackground ? `${event.color}50` : event.color,
    textColor: isBackground ? "#ffffff" : "#ffffff",
    editable: isBackground ? false : (event.draggable ?? true),
    startEditable: isBackground ? false : (event.draggable ?? true),
    durationEditable: isBackground ? false : (event.resizable ?? true),
    display: event.display ?? (isBackground ? "background" : "auto"),
    resourceId: event.resourceId || event.projectId || undefined,
    resourceIds: event.resourceIds,
    extendedProps: {
      type: event.type,
      status: event.status,
      priority: event.priority,
      color: event.color,
      projectId: event.projectId,
      description: event.description,
      resourceTitle: event.resourceTitle,
      rawEvent: event,
    },
  };
}

/**
 * Default resources for Resource Timeline and Resource Time Grid views,
 * reflecting the Auditorium and Meeting Room configuration from the examples.
 */
export const DEFAULT_CALENDAR_RESOURCES: CalendarResource[] = [
  { id: "general", title: "General Tasks", eventColor: "#a9927d" },
  { id: "auditorium-a", title: "Auditorium A", eventColor: "#10b981", occupancy: "150 seats" },
  { id: "auditorium-b", title: "Auditorium B", eventColor: "#f59e0b", occupancy: "80 seats" },
  { id: "auditorium-c", title: "Auditorium C", eventColor: "#3b82f6", occupancy: "50 seats" },
  { id: "auditorium-d", title: "Auditorium D", eventColor: "#8b5cf6", occupancy: "40 seats" },
  { id: "room-d1", title: "Room D1 (Breakout)", eventColor: "#ec4899", occupancy: "12 seats" },
  { id: "focus-pod", title: "Focus Pod 1", eventColor: "#6366f1", occupancy: "1 person" },
];

/**
 * Batch maps array of CalendarEvents to EventInputs.
 */
export function toFullCalendarEvents(events: CalendarEvent[]): EventInput[] {
  return events.map(toFullCalendarEvent);
}

/**
 * Extracts and groups resources from events and projects.
 * If dedicated resources are provided, uses those; otherwise combines standard resources
 * with any unique resources/projects present in events.
 */
export function extractResourcesFromEvents(
  events: CalendarEvent[],
  customResources?: CalendarResource[],
): CalendarResource[] {
  if (customResources && customResources.length > 0) {
    return customResources;
  }

  const resourceMap = new Map<string, CalendarResource>();

  // Add default demo resources for rich resource views
  DEFAULT_CALENDAR_RESOURCES.forEach((res) => {
    resourceMap.set(res.id, res);
  });

  events.forEach((ev) => {
    const resId = ev.resourceId || ev.projectId;
    if (resId && !resourceMap.has(resId)) {
      resourceMap.set(resId, {
        id: resId,
        title: ev.resourceTitle || ev.projectId || resId,
        eventColor: ev.color || "#3b82f6",
      });
    }
  });

  return Array.from(resourceMap.values());
}

/**
 * Reverse-maps FullCalendar event mutation payload back to backend update shape.
 */
export function fromFullCalendarMutation(fcEvent: any): {
  id: string;
  start: Date;
  end: Date;
  resourceId?: string;
  allDay?: boolean;
} {
  const start = fcEvent.start ? new Date(fcEvent.start) : new Date();
  let end = fcEvent.end ? new Date(fcEvent.end) : null;

  // If no end date (e.g. single slot click or drag), default to 30 mins after start
  if (!end) {
    end = new Date(start.getTime() + 30 * 60 * 1000);
  }

  const resourceId =
    fcEvent.getResources && fcEvent.getResources().length > 0
      ? fcEvent.getResources()[0].id
      : undefined;

  return {
    id: fcEvent.id,
    start,
    end,
    resourceId,
    allDay: fcEvent.allDay,
  };
}
