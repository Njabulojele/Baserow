"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Plus,
  Zap,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  History,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { WorkflowList } from "@/components/crm/WorkflowList";
import { WorkflowBuilder } from "@/components/crm/WorkflowBuilder";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export default function WorkflowsPage() {
  const [isWorkflowBuilderOpen, setIsWorkflowBuilderOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<
    string | undefined
  >(undefined);
  const [showHistory, setShowHistory] = useState(false);

  const { data: executions, isLoading: isLoadingExec } =
    trpc.crmAutomation.getExecutions.useQuery({ limit: 20 });

  const statusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
      case "failed":
        return <XCircle className="h-3.5 w-3.5 text-red-500" />;
      case "running":
        return <Clock className="h-3.5 w-3.5 text-yellow-500 animate-spin" />;
      default:
        return <AlertCircle className="h-3.5 w-3.5 text-muted-foreground" />;
    }
  };

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center justify-between shrink-0 mb-6">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-accent/20 rounded-lg text-accent ring-1 ring-accent/30">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white-smoke">
              Workflows
            </h2>
            <p className="text-muted-foreground">Automate your CRM actions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showHistory ? "secondary" : "outline"}
            size="sm"
            onClick={() => setShowHistory(!showHistory)}
          >
            <History className="mr-2 h-4 w-4" />
            History
          </Button>
          <Button
            className="bg-accent hover:bg-accent/90 text-white font-bold"
            onClick={() => {
              setSelectedWorkflowId(undefined);
              setIsWorkflowBuilderOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4 text-white" />
            New Workflow
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 w-full min-w-0 space-y-6">
        <WorkflowList
          onCreateNew={() => {
            setSelectedWorkflowId(undefined);
            setIsWorkflowBuilderOpen(true);
          }}
          onEdit={(id) => {
            setSelectedWorkflowId(id);
            setIsWorkflowBuilderOpen(true);
          }}
        />

        {/* Execution History */}
        {showHistory && (
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5" />
              Recent Executions
            </h3>

            {isLoadingExec ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : !executions?.length ? (
              <Card className="p-6 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>
                  No workflow executions yet. Run a workflow to see results
                  here.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {executions.map((exec) => (
                  <Card key={exec.id} className="p-3">
                    <div className="flex items-center gap-3">
                      {statusIcon(exec.status)}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {exec.workflow?.name || "Unknown Workflow"}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 py-0"
                          >
                            {exec.triggerType.replace(/_/g, " ")}
                          </Badge>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] px-1.5 py-0",
                              exec.status === "completed" &&
                                "bg-green-500/10 text-green-600",
                              exec.status === "failed" &&
                                "bg-red-500/10 text-red-600",
                              exec.status === "running" &&
                                "bg-yellow-500/10 text-yellow-600",
                            )}
                          >
                            {exec.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatDistanceToNow(new Date(exec.startedAt), {
                            addSuffix: true,
                          })}
                          {exec.error && (
                            <span className="text-red-400 ml-2">
                              Error: {exec.error}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      <WorkflowBuilder
        open={isWorkflowBuilderOpen}
        onOpenChange={setIsWorkflowBuilderOpen}
        workflowId={selectedWorkflowId}
      />
    </div>
  );
}
