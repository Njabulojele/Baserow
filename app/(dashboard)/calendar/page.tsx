import { prefetch } from "@/lib/trpc/server";
import { CalendarClient } from "./CalendarClient";
import { startOfWeek, endOfWeek } from "date-fns";

export default async function CalendarPage() {
  const today = new Date();
  const start = startOfWeek(today);
  const end = endOfWeek(today);

  // Prefetch initial week's events
  await prefetch.calendar.getEvents({ start, end });

  return <CalendarClient />;
}
