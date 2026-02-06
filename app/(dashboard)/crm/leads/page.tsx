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
    <div className="p-4 md:p-8 pt-6 h-full flex flex-col overflow-hidden w-full min-w-0">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Leads</h2>
          <p className="text-muted-foreground">Manage and track your leads</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={setView}>
            <TabsList>
              <TabsTrigger value="kanban" title="Kanban View">
                <LayoutGrid className="w-4 h-4" />
              </TabsTrigger>
              <TabsTrigger value="list" title="List View">
                <List className="w-4 h-4" />
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button onClick={() => setIsLeadFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> New Lead
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden min-h-0 w-full min-w-0">
        {view === "kanban" ? (
          <LeadsKanban onAddLead={() => setIsLeadFormOpen(true)} />
        ) : (
          <div className="flex items-center justify-center h-40 border rounded-lg m-4 text-muted-foreground">
            List view coming soon
          </div>
        )}
      </div>

      <LeadFormDialog open={isLeadFormOpen} onOpenChange={setIsLeadFormOpen} />
    </div>
  );
}
