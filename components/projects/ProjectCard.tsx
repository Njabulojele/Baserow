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
  // Fallback color if none provided
  const accentColor = project.color || "#6366f1";

  // Status mapping to colors/labels
  const statusConfig: Record<string, { label: string; className: string }> = {
    active: {
      label: "Active",
      className: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    },
    planning: {
      label: "Planning",
      className: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    },
    on_hold: {
      label: "On Hold",
      className: "bg-amber-500/10 text-amber-600 border-amber-500/20",
    },
    completed: {
      label: "Completed",
      className: "bg-slate-100 text-slate-600 border-slate-200",
    },
    cancelled: {
      label: "Cancelled",
      className: "bg-red-500/10 text-red-600 border-red-500/20",
    },
  };

  const statusInfo = statusConfig[project.status] || statusConfig.active;

  return (
    <Link href={`/projects/${project.id}`} className="block h-full group">
      <div className="h-full flex flex-col bg-card hover:bg-gradient-to-br hover:from-card hover:to-primary/5 border rounded-xl shadow-sm hover:shadow-md transition-all duration-300 relative overflow-hidden">
        {/* Color Indicator Strip */}
        <div
          className="absolute left-0 top-0 bottom-0 w-1.5 transition-all group-hover:w-2"
          style={{ backgroundColor: accentColor }}
        />

        <div className="p-5 pl-7 flex flex-col h-full">
          {/* Header */}
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-lg leading-tight tracking-tight text-foreground group-hover:text-primary transition-colors">
                {project.name}
              </h3>
              {project.client && (
                <p className="text-xs font-medium text-muted-foreground mt-1 uppercase tracking-wider">
                  {project.client.name}
                </p>
              )}
            </div>
            <Badge
              variant="outline"
              className={cn(
                "text-[10px] font-semibold px-2 py-0.5 h-6",
                statusInfo.className,
              )}
            >
              {statusInfo.label}
            </Badge>
          </div>

          {/* Description / Content (Flex Grow) */}
          <div className="flex-1 min-h-[3rem] mb-6">
            {project.description ? (
              <p className="text-sm text-muted-foreground/80 line-clamp-2 leading-relaxed">
                {project.description}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground/40 italic">
                No description provided.
              </p>
            )}
          </div>

          {/* Progress & Stats Footer */}
          <div className="mt-auto space-y-4">
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs font-medium">
                <span className="text-muted-foreground">Progress</span>
                <span
                  className={cn(
                    "text-foreground",
                    project.completionPercentage >= 100
                      ? "text-emerald-600"
                      : "",
                  )}
                >
                  {Math.round(project.completionPercentage)}%
                </span>
              </div>
              <Progress
                value={project.completionPercentage}
                className="h-1.5 bg-muted/50"
                // We can dynamically color the indicator if ShadCN Progress supports supports child class or style
                // For now standard primary color is fine, but let's try to pass style if possible or just stick to component default
              />
            </div>

            <div className="pt-4 border-t border-dashed flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5">
                  <ListTodo className="h-3.5 w-3.5" />
                  <span>{project._count.tasks}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5" />
                  <span>{hoursSpent}h</span>
                </div>
              </div>

              {project.deadline && (
                <div
                  className={cn(
                    "px-2 py-1 rounded bg-muted/50 font-medium",
                    new Date(project.deadline) < new Date() &&
                      project.status !== "completed"
                      ? "text-red-500 bg-red-50"
                      : "",
                  )}
                >
                  {new Date(project.deadline).toLocaleDateString(undefined, {
                    month: "short",
                    day: "numeric",
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
