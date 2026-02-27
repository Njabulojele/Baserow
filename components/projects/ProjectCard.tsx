"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Clock,
  ListChecks,
  MoreVertical,
  Pause,
  CheckCircle2,
  XCircle,
  RotateCcw,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { trpc } from "@/lib/trpc/client";

interface ProjectCardProps {
  project: {
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
    _count: { tasks: number };
    client: { id: string; name: string } | null;
  };
}

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: "Active",
    className: "bg-[#0a0c10] text-[#a9927d] border-[#a9927d]/30",
  },
  planning: {
    label: "Planning",
    className: "bg-[#0a0c10] text-blue-400 border-blue-500/30",
  },
  on_hold: {
    label: "On Hold",
    className: "bg-[#0a0c10] text-amber-400 border-amber-500/30",
  },
  completed: {
    label: "Completed",
    className: "bg-[#0a0c10] text-gray-400 border-[#2f3e46]",
  },
  cancelled: {
    label: "Cancelled",
    className: "bg-[#0a0c10] text-red-400 border-red-500/30",
  },
};

export function ProjectCard({ project }: ProjectCardProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const utils = trpc.useUtils();
  const statusInfo = statusConfig[project.status] || statusConfig.active;

  const updateStatus = trpc.project.updateProject.useMutation({
    onMutate: () => setIsUpdating(true),
    onSuccess: () => {
      utils.project.getProjects.invalidate();
      utils.project.getUrgencySummary.invalidate();
    },
    onSettled: () => setIsUpdating(false),
  });

  const handleStatusChange = (e: React.MouseEvent, newStatus: string) => {
    e.preventDefault();
    e.stopPropagation();
    updateStatus.mutate({
      id: project.id,
      status: newStatus as
        | "active"
        | "planning"
        | "on_hold"
        | "completed"
        | "cancelled",
    });
  };

  const deadlineText = project.deadline
    ? new Date(project.deadline).toLocaleDateString("en-ZA", {
        month: "short",
        day: "numeric",
      })
    : null;

  const isOverdue = project.deadline && new Date(project.deadline) < new Date();

  // Determine which actions to show based on current status
  const availableActions = [];
  if (project.status !== "on_hold") {
    availableActions.push({
      label: "Put on Hold",
      icon: Pause,
      status: "on_hold",
      className: "text-amber-500",
    });
  }
  if (project.status !== "completed") {
    availableActions.push({
      label: "Mark as Complete",
      icon: CheckCircle2,
      status: "completed",
      className: "text-emerald-500",
    });
  }
  if (project.status !== "active" && project.status !== "planning") {
    availableActions.push({
      label: "Reactivate",
      icon: RotateCcw,
      status: "active",
      className: "text-blue-500",
    });
  }
  if (project.status !== "cancelled") {
    availableActions.push({
      label: "Cancel",
      icon: XCircle,
      status: "cancelled",
      className: "text-red-500",
    });
  }

  return (
    <Link href={`/projects/${project.id}`}>
      <Card
        className={`relative group hover:shadow-2xl transition-all duration-300 bg-[#1a252f] border border-[#2f3e46] hover:border-[#a9927d]/40 cursor-pointer overflow-hidden ${
          isUpdating ? "opacity-60 pointer-events-none" : ""
        }`}
      >
        {/* Color accent strip */}
        <div
          className="absolute top-0 left-0 w-full h-1 rounded-t-lg"
          style={{
            backgroundColor: project.color || "var(--primary)",
          }}
        />

        <CardHeader className="pb-2 pt-4 px-4 sm:px-6">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1">
              <CardTitle className="text-base sm:text-lg truncate font-light text-white">
                {project.name}
              </CardTitle>
              {project.client && (
                <CardDescription className="text-[10px] font-mono tracking-widest uppercase text-[#a9927d] truncate mt-0.5">
                  {project.client.name}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge
                variant="outline"
                className={`text-[10px] h-5 ${statusInfo.className}`}
              >
                {statusInfo.label}
              </Badge>

              {/* Status Actions Dropdown */}
              <DropdownMenu>
                <DropdownMenuTrigger
                  asChild
                  onClick={(e) => e.preventDefault()}
                >
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-white hover:bg-[#0a0c10]"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onClick={(e) => e.stopPropagation()}
                >
                  {availableActions.map((action, i) => (
                    <DropdownMenuItem
                      key={action.status}
                      onClick={(e) => handleStatusChange(e, action.status)}
                      className={`cursor-pointer text-[10px] font-mono uppercase tracking-widest focus:bg-[#1a252f] ${action.className}`}
                    >
                      <action.icon className="h-3 w-3 mr-2" />
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 sm:px-6 pb-4 space-y-3 border-t border-[#2f3e46]/30 pt-4">
          {project.description && (
            <p className="text-[10px] font-mono text-gray-400 line-clamp-2">
              {project.description}
            </p>
          )}

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-gray-500">
                Progress
              </span>
              <span className="font-mono text-[10px] text-[#a9927d]">
                {Math.round(project.completionPercentage)}%
              </span>
            </div>
            <div className="h-1.5 bg-[#0a0c10] border border-[#2f3e46] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(project.completionPercentage, 100)}%`,
                  backgroundColor:
                    project.completionPercentage >= 100
                      ? "#34d399"
                      : project.completionPercentage >= 50
                        ? "#a9927d"
                        : "#4b5563",
                }}
              />
            </div>
          </div>

          {/* Meta Info */}
          <div className="flex items-center gap-3 flex-wrap text-[10px] font-mono uppercase tracking-widest text-gray-500 pt-2">
            <span className="flex items-center gap-1.5">
              <ListChecks className="h-3 w-3 text-[#a9927d]" />
              {project._count.tasks} task{project._count.tasks !== 1 ? "s" : ""}
            </span>
            <span className="flex items-center gap-1.5 shrink-0">
              <Clock className="h-3 w-3 text-[#a9927d]" />
              {project.actualHoursSpent.toFixed(1)}h
            </span>
            {deadlineText && (
              <span
                className={`flex items-center gap-1.5 shrink-0 ${
                  isOverdue ? "text-red-400" : ""
                }`}
              >
                📅 {deadlineText}
                {isOverdue && " (Overdue)"}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
