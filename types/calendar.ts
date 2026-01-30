export interface CalendarEvent {
  id: string;
  title: string;
  start: string; // ISO Date string
  end: string; // ISO Date string
  type: "task" | "time_block" | "event";
  status: string;
  priority: string;
  color: string;
  projectId?: string | null;
  draggable: boolean;
  resizable: boolean;
}
