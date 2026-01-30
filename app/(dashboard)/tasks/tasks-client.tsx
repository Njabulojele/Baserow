"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskForm } from "@/components/tasks/TaskForm";
import { trpc } from "@/lib/trpc/client";

interface Task {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  dueDate: Date | null;
  scheduledDate: Date | null;
  estimatedMinutes: number | null;
  actualMinutes: number;
  timerRunning: boolean;
  currentTimerStart: Date | null;
  project: { id: string; name: string; color: string | null } | null;
}

interface TasksClientProps {
  initialTasks: any[];
}

export function TasksClient({ initialTasks }: TasksClientProps) {
  const [status, setStatus] = useState<string>("all");

  // Use server-prefetched data for 'all', fetch fresh for filtered views
  const { data: tasks, isLoading } = trpc.task.getTasks.useQuery(
    status === "all"
      ? undefined
      : { status: status as "not_started" | "in_progress" | "done" },
    {
      initialData: status === "all" ? initialTasks : undefined,
    },
  );

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Tasks</h1>
          <p className="text-muted-foreground mt-1">
            Manage and track your work
          </p>
        </div>
        <TaskForm />
      </div>

      <Tabs value={status} onValueChange={setStatus} className="space-y-6">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="not_started">To Do</TabsTrigger>
          <TabsTrigger value="in_progress">In Progress</TabsTrigger>
          <TabsTrigger value="done">Completed</TabsTrigger>
        </TabsList>

        <TabsContent value={status}>
          <TaskList
            tasks={tasks}
            isLoading={isLoading}
            emptyMessage={
              status === "all"
                ? "No tasks yet. Create your first task!"
                : `No ${status.replace("_", " ")} tasks`
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
