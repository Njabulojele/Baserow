"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import DealsView from "@/components/crm/DealsView";
import { DealFormDialog } from "@/components/crm/DealFormDialog";
import { PipelineSetupDialog } from "@/components/crm/PipelineSetupDialog";

export default function PipelinePage() {
  const [isDealFormOpen, setIsDealFormOpen] = useState(false);
  const [isPipelineSetupOpen, setIsPipelineSetupOpen] = useState(false);

  return (
    <div className="p-4 md:p-8 pt-6 h-full flex flex-col overflow-hidden w-full min-w-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Pipeline</h2>
          <p className="text-muted-foreground">Manage deal flow and stages</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPipelineSetupOpen(true)}
          >
            <Settings className="mr-2 h-4 w-4" />
            Pipelines
          </Button>
          <Button onClick={() => setIsDealFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Deal
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 w-full min-w-0">
        <DealsView onAddDeal={() => setIsDealFormOpen(true)} />
      </div>

      <DealFormDialog open={isDealFormOpen} onOpenChange={setIsDealFormOpen} />
      <PipelineSetupDialog
        open={isPipelineSetupOpen}
        onOpenChange={setIsPipelineSetupOpen}
      />
    </div>
  );
}
