import { prefetch } from "@/lib/trpc/server";
import { DashboardClient } from "./dashboard-client";

export default async function DashboardPage() {
  // Server-side prefetch for instant load
  const data = await prefetch.dashboard();

  return <DashboardClient initialData={data} />;
}
