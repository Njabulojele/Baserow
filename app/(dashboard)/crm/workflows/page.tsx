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
    <div className="p-4 md:p-8 pt-6 overflow-hidden w-full min-w-0 flex flex-col">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-yellow-100 rounded-lg text-yellow-600">
            <Zap className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Workflows</h2>
            <p className="text-muted-foreground">Automate your CRM actions</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => {
              setSelectedWorkflowId(undefined);
              setIsWorkflowBuilderOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            New Workflow
          </Button>
        </div>
      </div>

      <div className="mt-8">
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
