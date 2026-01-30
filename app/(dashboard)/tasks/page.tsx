import { prefetch } from "@/lib/trpc/server";
import { TasksClient } from "./tasks-client";

export default async function TasksPage() {
  // Server-side prefetch for instant load
  const tasks = await prefetch.tasks();

  return <TasksClient initialTasks={tasks} />;
}
