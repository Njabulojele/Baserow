"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock, ListTodo } from "lucide-react";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  color: string | null;
  deadline: Date | null;
  completionPercentage: number;
  actualHoursSpent: number;
  _count: {
    tasks: number;
  };
  client: {
    id: string;
    name: string;
  } | null;
}

interface ProjectCardProps {
  project: Project;
}

const statusColors = {
  active: "bg-green-500/10 text-green-500 border-green-500/20",
  planning: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  on_hold: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  completed: "bg-gray-500/10 text-gray-500 border-gray-500/20",
  cancelled: "bg-red-500/10 text-red-500 border-red-500/20",
};

export function ProjectCard({ project }: ProjectCardProps) {
  const hoursSpent = Math.round(project.actualHoursSpent * 10) / 10;
  const statusClass =
    statusColors[project.status as keyof typeof statusColors] ||
    statusColors.active;

  return (
    <Link href={`/projects/${project.id}`}>
      <div
        className={cn(
          "group p-6 rounded-xl border transition-all cursor-pointer",
          "bg-card hover:bg-accent/50 hover:shadow-lg hover:-translate-y-1",
        )}
        style={{
          borderLeftColor: project.color || undefined,
          borderLeftWidth: project.color ? 4 : 1,
        }}
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
              {project.name}
            </h3>
            {project.client && (
              <p className="text-sm text-muted-foreground">
                {project.client.name}
              </p>
            )}
          </div>
          <Badge variant="outline" className={cn("capitalize", statusClass)}>
            {project.status.replace("_", " ")}
          </Badge>
        </div>

        {project.description && (
          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
            {project.description}
          </p>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">
              {Math.round(project.completionPercentage)}%
            </span>
          </div>
          <Progress value={project.completionPercentage} className="h-2" />
        </div>

        <div className="flex items-center gap-4 mt-4 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <ListTodo className="h-4 w-4" />
            {project._count.tasks} tasks
          </span>
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {hoursSpent}h logged
          </span>
          {project.deadline && (
            <span>Due {new Date(project.deadline).toLocaleDateString()}</span>
          )}
        </div>
      </div>
    </Link>
  );
}
