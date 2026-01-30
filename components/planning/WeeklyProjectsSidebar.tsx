"use client";

import { FolderOpen } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectItem {
  id: string;
  name: string;
  color: string | null;
  taskCount: number;
}

interface WeeklyProjectsSidebarProps {
  projects: ProjectItem[];
  selectedProjectId?: string | null;
  onSelectProject?: (projectId: string | null) => void;
}

export function WeeklyProjectsSidebar({
  projects,
  selectedProjectId,
  onSelectProject,
}: WeeklyProjectsSidebarProps) {
  const totalTasks = projects.reduce((sum, p) => sum + p.taskCount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          Projects
        </h3>
        <span className="text-xs text-muted-foreground">{projects.length}</span>
      </div>

      {/* All Projects Option */}
      <button
        onClick={() => onSelectProject?.(null)}
        className={cn(
          "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
          selectedProjectId === null
            ? "bg-primary/15 border border-primary/30"
            : "hover:bg-accent/50",
        )}
      >
        <div className="size-3 rounded-full bg-linear-to-br from-indigo-500 to-purple-500" />
        <span className="text-sm font-medium flex-1 text-left">
          All Projects
        </span>
        <span className="text-xs text-muted-foreground">{totalTasks}</span>
      </button>

      {/* Individual Projects */}
      <div className="space-y-1">
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelectProject?.(project.id)}
            className={cn(
              "w-full flex items-center gap-3 p-2 rounded-lg transition-colors",
              selectedProjectId === project.id
                ? "bg-primary/15 border border-primary/30"
                : "hover:bg-accent/50",
            )}
          >
            <div
              className="size-3 rounded-full shrink-0"
              style={{ backgroundColor: project.color || "#6366f1" }}
            />
            <span className="text-sm font-medium flex-1 text-left truncate">
              {project.name}
            </span>
            <span className="text-xs text-muted-foreground">
              {project.taskCount}
            </span>
          </button>
        ))}

        {projects.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <FolderOpen className="size-8 mx-auto mb-2 opacity-50" />
            <p className="text-xs">No projects with tasks this week</p>
          </div>
        )}
      </div>
    </div>
  );
}
