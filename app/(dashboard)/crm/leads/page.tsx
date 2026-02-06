"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List } from "lucide-react";
import LeadsKanban from "@/components/crm/LeadsKanban";
import { LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function LeadsPage() {
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [view, setView] = useState("kanban");

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center justify-between shrink-0 mb-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white-smoke">
            Leads
          </h2>
          <p className="text-muted-foreground">Manage and track your leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={setView}>
            <TabsList className="bg-muted/50 border-none">
              <TabsTrigger
                value="kanban"
                title="Kanban View"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                <LayoutGrid className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger
                value="list"
                title="List View"
                className="data-[state=active]:bg-accent data-[state=active]:text-white"
              >
                <List className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            onClick={() => setIsLeadFormOpen(true)}
            className="bg-accent hover:bg-accent/90 text-white font-bold"
          >
            <Plus className="mr-2 h-4 w-4 text-white" /> New Lead
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 w-full min-w-0">
        {view === "kanban" ? (
          <LeadsKanban onAddLead={() => setIsLeadFormOpen(true)} />
        ) : (
          <div className="flex items-center justify-center h-40 border border-dashed rounded-lg text-muted-foreground bg-muted/20">
            List view coming soon
          </div>
        )}
      </div>

      <LeadFormDialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen} />
    </div>
  );
}
