import { prefetch } from "@/lib/trpc/server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  // Server-side prefetch for instant load — fall back gracefully if auth fails
  let data: Awaited<ReturnType<typeof prefetch.dashboard>>;
  try {
    data = await prefetch.dashboard();
  } catch {
    data = { stats: null as any, todaysTasks: [], activeTimer: null };
  }

  return <DashboardClient initialData={data} />;
}
