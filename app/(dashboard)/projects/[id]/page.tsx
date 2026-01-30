"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Clock,
  ListTodo,
  CalendarDays,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TaskList } from "@/components/tasks/TaskList";
import { TaskForm } from "@/components/tasks/TaskForm";
import { trpc } from "@/lib/trpc/client";

interface ProjectDetailPageProps {
  params: Promise<{ id: string }>;
}

const statusColors = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  planning: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  completed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

export default function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { id } = use(params);

  const { data: project, isLoading } = trpc.project.getProject.useQuery({ id });

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="h-4 w-32 bg-muted rounded" />
          <div className="grid gap-4 md:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-muted rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return notFound();
  }

  const statusClass =
    statusColors[project.status as keyof typeof statusColors] ||
    statusColors.active;
  const completedTasks = project.tasks.filter(
    (t) => t.status === "done",
  ).length;
  const totalTasks = project.tasks.length;
  const hoursLogged = Math.round(project.actualHoursSpent * 10) / 10;

  // Transform tasks to match TaskCard interface
  const transformedTasks = project.tasks.map((task) => ({
    ...task,
    project: { id: project.id, name: project.name, color: project.color },
  }));

  return (
    <div className="container mx-auto py-8 px-4">
      {/* Back button and header */}
      <div className="mb-8">
        <Link href="/projects">
          <Button variant="ghost" size="sm" className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Projects
          </Button>
        </Link>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              {project.color && (
                <div
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
              )}
              <h1 className="text-3xl font-bold">{project.name}</h1>
              <Badge
                variant="outline"
                className={cn("capitalize", statusClass)}
              >
                {project.status.replace("_", " ")}
              </Badge>
            </div>
            {project.description && (
              <p className="text-muted-foreground max-w-2xl">
                {project.description}
              </p>
            )}
          </div>
          <TaskForm defaultProjectId={project.id} />
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Progress</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round(project.completionPercentage)}%
            </div>
            <Progress
              value={project.completionPercentage}
              className="mt-2 h-2"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {completedTasks}/{totalTasks}
            </div>
            <p className="text-xs text-muted-foreground">completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Time Logged</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hoursLogged}h</div>
            {project.estimatedHours && (
              <p className="text-xs text-muted-foreground">
                of {project.estimatedHours}h estimated
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deadline</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {project.deadline ? (
              <>
                <div className="text-2xl font-bold">
                  {new Date(project.deadline).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
                <p className="text-xs text-muted-foreground">
                  {Math.ceil(
                    (new Date(project.deadline).getTime() - Date.now()) /
                      (1000 * 60 * 60 * 24),
                  )}{" "}
                  days left
                </p>
              </>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tasks list */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Tasks</h2>
        <TaskList
          tasks={transformedTasks}
          emptyMessage="No tasks yet. Add your first task!"
        />
      </div>
    </div>
  );
}
