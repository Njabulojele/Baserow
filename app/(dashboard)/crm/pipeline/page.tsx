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
    <div className="flex flex-col h-full min-w-0">
      <div className="flex  items-center justify-between shrink-0 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white-smoke">
            Pipeline
          </h2>
          <p className="text-muted-foreground">Manage deal flow and stages</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsPipelineSetupOpen(true)}
            className="border-accent text-accent hover:bg-accent/10 w-full sm:w-auto"
          >
            <Settings className="mr-2 h-4 w-4" />
            Pipelines
          </Button>
          <Button
            onClick={() => setIsDealFormOpen(true)}
            className="bg-accent hover:bg-accent/90 text-white font-bold w-full sm:w-auto"
          >
            <Plus className="mr-2 h-4 w-4 text-white" /> New Deal
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
