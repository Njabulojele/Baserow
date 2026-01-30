import { WeekPlanningClient } from "./week-client";

export default function WeekPlanningPage() {
  // Let the client handle all data fetching to avoid server-side auth issues
  return <WeekPlanningClient />;
}
