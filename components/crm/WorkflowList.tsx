"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Play,
  Pause,
  Trash2,
  Edit,
  Plus,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface WorkflowListProps {
  onCreateNew: () => void;
  onEdit: (workflowId: string) => void;
}

export function WorkflowList({ onCreateNew, onEdit }: WorkflowListProps) {
  const utils = trpc.useUtils();

  const { data: workflows, isLoading } =
    trpc.crmAutomation.listWorkflows.useQuery();

  const toggleMutation = trpc.crmAutomation.toggleWorkflow.useMutation({
    onSuccess: () => {
      utils.crmAutomation.listWorkflows.invalidate();
      toast.success("Workflow updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.crmAutomation.deleteWorkflow.useMutation({
    onSuccess: () => {
      utils.crmAutomation.listWorkflows.invalidate();
      toast.success("Workflow deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const executeMutation = trpc.crmAutomation.executeWorkflow.useMutation({
    onSuccess: () => {
      utils.crmAutomation.listWorkflows.invalidate();
      toast.success("Workflow executed successfully");
    },
    onError: (err) => toast.error(err.message),
  });

  const handleToggle = (id: string, currentlyActive: boolean) => {
    toggleMutation.mutate({ id, active: !currentlyActive });
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this workflow?")) {
      deleteMutation.mutate({ id });
    }
  };

  const handleExecute = (id: string) => {
    executeMutation.mutate({ workflowId: id });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    );
  }

  if (!workflows?.length) {
    return (
      <Card className="p-8 text-center">
        <Zap className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No workflows yet</h3>
        <p className="text-muted-foreground mb-4">
          Create your first automation workflow to streamline your CRM
          processes.
        </p>
        <Button onClick={onCreateNew}>
          <Plus className="h-4 w-4 mr-2" />
          Create Workflow
        </Button>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {workflows.map((workflow) => {
          const isActive = workflow.status === "ACTIVE";
          const triggerCount = workflow.triggers?.length || 0;
          const actionCount = workflow.actions?.length || 0;

          return (
            <Card key={workflow.id} className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-medium truncate">{workflow.name}</h4>
                    <Badge
                      variant={isActive ? "default" : "secondary"}
                      className={cn(
                        isActive && "bg-green-500/10 text-green-600",
                      )}
                    >
                      {workflow.status}
                    </Badge>
                  </div>

                  {workflow.description && (
                    <p className="text-sm text-muted-foreground mb-2 line-clamp-1">
                      {workflow.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Zap className="h-3 w-3" />
                      {triggerCount} trigger{triggerCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <Play className="h-3 w-3" />
                      {actionCount} action{actionCount !== 1 ? "s" : ""}
                    </span>
                    <span className="flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      {workflow.executionCount} runs
                    </span>
                    {workflow.lastExecutedAt && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Last run{" "}
                        {formatDistanceToNow(
                          new Date(workflow.lastExecutedAt),
                          { addSuffix: true },
                        )}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    checked={isActive}
                    onCheckedChange={() => handleToggle(workflow.id, isActive)}
                    disabled={toggleMutation.isPending}
                  />

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleExecute(workflow.id)}
                    disabled={executeMutation.isPending}
                    title="Run now"
                  >
                    <Play className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(workflow.id)}
                    title="Edit"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive"
                    onClick={() => handleDelete(workflow.id)}
                    disabled={deleteMutation.isPending}
                    title="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
