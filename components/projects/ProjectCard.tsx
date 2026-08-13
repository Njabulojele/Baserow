"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Clock,
  ListChecks,
  MoreVertical,
  Pause,
  CheckCircle2,
  RotateCcw,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ProjectCardProps {
  project: {
    id: string;
    name: string;
    description: string | null;
    status: string;
    priority: string;
    type?: string;
    color: string | null;
    deadline: Date | null;
    completionPercentage: number;
    actualHoursSpent: number;
    revenueZAR?: number;
    _count?: { tasks: number };
    tasks?: any[];
    client: { id: string; name: string } | null;
  };
}

const statusBadgeStyles: Record<string, string> = {
  active: "bg-emerald-500/15 text-emerald-500",
  planning: "bg-blue-500/15 text-blue-500",
  on_hold: "bg-amber-500/15 text-amber-500",
  completed: "bg-teal-500/15 text-teal-400",
  cancelled: "bg-rose-500/15 text-rose-500",
};

export function ProjectCard({ project }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const utils = trpc.useUtils();

  const updateStatus = trpc.project.updateProject.useMutation({
    onMutate: () => setIsUpdating(true),
    onSuccess: () => {
      utils.project.getProjects.invalidate();
    },
    onSettled: () => setIsUpdating(false),
  });

  const handleStatusChange = (e: React.MouseEvent, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    updateStatus.mutate({
      id: project.id,
      status: newStatus as any,
    });
  };

  const taskCount = project._count?.tasks ?? project.tasks?.length ?? 0;

  return (
    <Link href={`/projects/${project.id}`} className="block h-[250px] w-full">
      <div
        className={cn(
          "toota-card h-full w-full p-5 flex flex-col justify-between hover:translate-y-[-2px] transition-all duration-300 group cursor-pointer relative overflow-hidden",
          isUpdating && "opacity-60 pointer-events-none",
        )}
      >
        {/* Soft Accent Strip */}
        <div
          className="absolute top-0 left-0 w-full h-1"
          style={{ backgroundColor: project.color || "var(--primary)" }}
        />

        {/* Top Section */}
        <div className="space-y-2 pt-1">
          {/* Header Row */}
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1 min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: project.color || "var(--primary)" }}
                />
                <h3 className="text-base font-bold text-foreground truncate group-hover:text-emerald-500 transition-colors">
                  {project.name}
                </h3>
              </div>

              {project.client ? (
                <p className="text-xs text-muted-foreground font-medium flex items-center gap-1.5 pl-4 truncate">
                  <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="truncate">{project.client.name}</span>
                </p>
              ) : (
                <div className="h-4" />
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <span
                className={cn(
                  "text-[10px] font-extrabold px-2.5 py-1 rounded-full uppercase tracking-wider capitalize",
                  statusBadgeStyles[project.status] || statusBadgeStyles.active,
                )}
              >
                {project.status.replace("_", " ")}
              </span>

              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.preventDefault()}>
                  <button className="p-1 text-muted-foreground hover:text-foreground rounded-lg hover:bg-secondary transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                  <DropdownMenuItem
                    onClick={(e) => handleStatusChange(e, "active")}
                    className="text-xs font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-2 text-blue-500" /> Reactivate
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleStatusChange(e, "on_hold")}
                    className="text-xs font-medium cursor-pointer"
                  >
                    <Pause className="w-3.5 h-3.5 mr-2 text-amber-500" /> Put on Hold
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleStatusChange(e, "completed")}
                    className="text-xs font-medium cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-emerald-500" /> Mark Complete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* Fixed-Height Description Block */}
          <div className="h-9 overflow-hidden">
            {project.description ? (
              <p className="text-xs text-muted-foreground line-clamp-2 leading-snug">
                {project.description}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground/40 italic leading-snug">
                No description provided
              </p>
            )}
          </div>
        </div>

        {/* Progress Bar & Completion */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground font-medium">Progress</span>
            <span className="font-mono font-bold text-foreground">
              {Math.round(project.completionPercentage)}%
            </span>
          </div>

          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-400 to-emerald-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(project.completionPercentage, 100)}%` }}
            />
          </div>
        </div>

        {/* Pinned Footer Meta Details */}
        <div className="mt-auto pt-3 border-t border-secondary/50 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3 font-mono text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 text-foreground font-bold">
              <ListChecks className="w-3.5 h-3.5 text-emerald-500" />
              {taskCount} task{taskCount !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-amber-500" />
              {project.actualHoursSpent.toFixed(1)}h
            </span>
          </div>

          {/* Avatar Stack */}
          <div className="flex items-center -space-x-1.5">
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-amber-400 to-emerald-400 flex items-center justify-center text-black font-bold text-[9px] ring-2 ring-background">
              CJ
            </div>
            <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 flex items-center justify-center text-white font-bold text-[9px] ring-2 ring-background">
              AI
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
