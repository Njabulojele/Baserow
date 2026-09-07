export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO Date string
  end: string; // ISO Date string
  type: "task" | "time_block" | "event" | "background";
  status: string;
  priority: string;
  color: string;
  projectId?: string | null;
  draggable: boolean;
  resizable: boolean;
  display?: "auto" | "block" | "list-item" | "background" | "inverse-background" | "none";
  resourceId?: string;
  resourceIds?: string[];
  allDay?: boolean;
  rrule?: string | object;
  description?: string | null;
  resourceTitle?: string;
  location?: string;
  attendees?: string[];
  meetingLink?: string;
  isRecurring?: boolean;
  recurrenceRule?: string;
}
