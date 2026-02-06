"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Zap } from "lucide-react";
import { WorkflowList } from "@/components/crm/WorkflowList";
import { WorkflowBuilder } from "@/components/crm/WorkflowBuilder";

export default function WorkflowsPage() {
  const [isWorkflowBuilderOpen, setIsWorkflowBuilderOpen] = useState(false);
  const [selectedWorkflowId, setSelectedWorkflowId] = useState<
    string | undefined
  >(undefined);

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

      <div className="flex-1 overflow-hidden min-h-0 w-full min-w-0">
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
      </div>

      <WorkflowBuilder
        open={isWorkflowBuilderOpen}
        onOpenChange={setIsWorkflowBuilderOpen}
        workflowId={selectedWorkflowId}
      />
    </div>
  );
}
