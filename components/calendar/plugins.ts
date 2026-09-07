import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import listPlugin from "@fullcalendar/list";
import interactionPlugin from "@fullcalendar/interaction";
import multiMonthPlugin from "@fullcalendar/multimonth";
import rrulePlugin from "@fullcalendar/rrule";
import resourceTimelinePlugin from "@fullcalendar/resource-timeline";
import resourceTimeGridPlugin from "@fullcalendar/resource-timegrid";
import resourceDayGridPlugin from "@fullcalendar/resource-daygrid";
import scrollGridPlugin from "@fullcalendar/scrollgrid";

/**
 * Single source of truth for FullCalendar plugin registry.
 * Includes standard open-source plugins and scheduler resource plugins.
 */
export const calendarPlugins = [
  dayGridPlugin,
  timeGridPlugin,
  listPlugin,
  interactionPlugin,
  multiMonthPlugin,
  rrulePlugin,
  resourceTimelinePlugin,
  resourceTimeGridPlugin,
  resourceDayGridPlugin,
  scrollGridPlugin,
];

/**
 * Scheduler evaluation license key for non-commercial local dev and evaluation.
 * Note: Must be replaced with a commercial license key in production if using Scheduler features.
 */
export const SCHEDULER_LICENSE_KEY =
  process.env.NEXT_PUBLIC_FULLCALENDAR_LICENSE_KEY ||
  "CC-Attribution-NonCommercial-NoDerivatives";
