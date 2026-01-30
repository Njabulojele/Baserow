import { prefetch } from "@/lib/trpc/server";
import { DayPlanningClient } from "./day-client";

export default async function DayPlanningPage() {
  // Server-side prefetch for instant load
  const data = await prefetch.dayPlan({ date: new Date() });

  return <DayPlanningClient initialData={data} />;
}
