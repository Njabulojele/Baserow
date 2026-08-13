"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, LayoutGrid, List, TrendingUp, Users, CheckCircle2, Percent } from "lucide-react";
import LeadsKanban from "@/components/crm/LeadsKanban";
import { LeadFormDialog } from "@/components/crm/LeadFormDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";

export default function LeadsPage() {
  const [isLeadFormOpen, setIsLeadFormOpen] = useState(false);
  const [view, setView] = useState("kanban");

  const { data: stats } = trpc.crmLead.getStats.useQuery();

  return (
    <div className="flex flex-col h-full min-w-0 space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between shrink-0 gap-4">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-widest text-foreground">
            Leads & Contacts
          </h2>
          <p className="text-xs text-muted-foreground">Flexible lead tracking pipeline</p>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Tabs value={view} onValueChange={setView} className="shrink-0">
            <TabsList className="bg-secondary/40 border-none shrink-0">
              <TabsTrigger
                value="kanban"
                title="Kanban View"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
              >
                <LayoutGrid className="w-4 h-4 mr-1.5" />
                Kanban
              </TabsTrigger>
              <TabsTrigger
                value="list"
                title="List View"
                className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs"
              >
                <List className="w-4 h-4 mr-1.5" />
                List
              </TabsTrigger>
            </TabsList>
          </Tabs>
          <Button
            onClick={() => setIsLeadFormOpen(true)}
            className="bg-emerald-500 hover:bg-emerald-600 text-black font-bold text-xs whitespace-nowrap shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" /> New Lead / Contact
          </Button>
        </div>
      </div>

      {/* Metric Summary Bar (Inspired by Twenty CRM style) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 shrink-0">
        <div className="toota-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Total Contacts</p>
            <p className="text-lg font-bold text-foreground font-mono">{stats?.total ?? 0}</p>
          </div>
        </div>

        <div className="toota-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">New This Week</p>
            <p className="text-lg font-bold text-foreground font-mono">{stats?.newThisWeek ?? 0}</p>
          </div>
        </div>

        <div className="toota-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Converted Clients</p>
            <p className="text-lg font-bold text-foreground font-mono">{stats?.converted ?? 0}</p>
          </div>
        </div>

        <div className="toota-card p-3.5 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center shrink-0">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground font-medium">Conversion Rate</p>
            <p className="text-lg font-bold text-foreground font-mono">
              {stats?.conversionRate ? `${stats.conversionRate.toFixed(1)}%` : "0%"}
            </p>
          </div>
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
