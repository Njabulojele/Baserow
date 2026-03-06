"use client";

import { useState } from "react";
import { format } from "date-fns";
import {
  Search,
  Bot,
  Plus,
  Zap,
  CheckCircle2,
  Clock,
  ExternalLink,
  Target,
  MessageSquare,
  MoreVertical,
  PlayCircle,
  Trash2,
  Users,
  Inbox,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AgentCreationModal } from "./components/AgentCreationModal";

export function ProspectingClient({
  initialAgents,
  initialLeads,
}: {
  initialAgents: any;
  initialLeads: any;
}) {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [selectedInboxId, setSelectedInboxId] = useState<string>("all");

  const utils = trpc.useUtils();

  const { data: agents } = trpc.prospecting.getAgents.useQuery(undefined, {
    initialData: initialAgents,
    staleTime: 5 * 60 * 1000,
  });

  const { data: leads } = trpc.prospecting.getLeads.useQuery(
    { limit: 50 },
    {
      initialData: initialLeads,
      staleTime: 5 * 60 * 1000,
    },
  );

  const toggleMutation = trpc.prospecting.toggleAgent.useMutation({
    onSuccess: () => {
      toast.success("Agent status updated");
      utils.prospecting.getAgents.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.prospecting.deleteAgent.useMutation({
    onSuccess: () => {
      toast.success("Agent deleted");
      utils.prospecting.getAgents.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const triggerRunMutation = trpc.prospecting.triggerRun.useMutation({
    onSuccess: (data) => {
      toast.success(data.message);
      // We don't invalidate immediately, as the Inngest job takes time.
      // Optimistically update the UI to show it's running (could add state for this).
    },
    onError: (err) => toast.error(err.message),
  });

  const markContactedMutation = trpc.prospecting.markContacted.useMutation({
    onSuccess: () => {
      toast.success("Lead marked as contacted");
      utils.prospecting.getLeads.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedLead = leads?.find((l) => l.id === selectedLeadId);
  const displayedLeads =
    selectedInboxId === "all"
      ? leads
      : leads?.filter((l) => l.agentId === selectedInboxId);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[#0a0c10]">
      {/* ━━━ Header ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-[#2f3e46]/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-sm font-mono font-bold uppercase tracking-widest text-[#a9927d] flex items-center gap-2">
                <Target className="w-4 h-4" />
                Platform Prospecting
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Automated agents sourcing leads across the web.
              </p>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-[#1a252f] border border-[#a9927d]/50 text-[#a9927d] hover:bg-[#a9927d] hover:text-[#1a252f] font-mono tracking-widest uppercase text-xs h-9"
            >
              <Plus className="w-4 h-4 mr-2" />
              New Agent
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── LEFT COLUMN: Inboxes (Agents) ── */}
          <div className="lg:col-span-3 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-gray-500 pl-2">
              Inboxes
            </h2>

            <div className="space-y-1">
              <button
                onClick={() => setSelectedInboxId("all")}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedInboxId === "all"
                    ? "bg-[#2f3e46]/40 text-white"
                    : "text-gray-400 hover:bg-[#1a252f] hover:text-gray-200"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Inbox className="w-4 h-4" />
                  <span>All Leads</span>
                </div>
                <span className="bg-[#0a0c10] px-2 py-0.5 rounded text-[10px] font-mono border border-[#2f3e46]">
                  {leads?.filter((l) => !l.contacted).length || 0}
                </span>
              </button>

              {agents?.map((agent) => {
                const isSelected = selectedInboxId === agent.id;
                const unreadCount =
                  leads?.filter((l) => l.agentId === agent.id && !l.contacted)
                    .length || 0;

                return (
                  <div key={agent.id} className="group relative">
                    <button
                      onClick={() => setSelectedInboxId(agent.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-colors ${
                        isSelected
                          ? "bg-[#2f3e46]/40 text-white"
                          : "text-gray-400 hover:bg-[#1a252f] hover:text-gray-200"
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 pr-2">
                        <div
                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${agent.status === "ACTIVE" ? "bg-emerald-400" : "bg-gray-600"}`}
                        />
                        <span className="truncate">{agent.name}</span>
                      </div>

                      {unreadCount > 0 && (
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-mono border ${isSelected ? "bg-[#a9927d]/20 text-[#a9927d] border-[#a9927d]/30" : "bg-[#0a0c10] text-gray-500 border-[#2f3e46]"}`}
                        >
                          {unreadCount}
                        </span>
                      )}
                    </button>

                    {/* Agent Actions Dropdown (visible on hover) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-1 top-1.5 h-6 w-6 text-gray-500 opacity-0 group-hover:opacity-100 hover:text-white hover:bg-[#2f3e46] data-[state=open]:opacity-100 data-[state=open]:bg-[#2f3e46]"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        align="end"
                        className="w-48 bg-[#1a252f] border-[#2f3e46]"
                      >
                        <DropdownMenuItem
                          className="text-xs cursor-pointer focus:bg-[#0a0c10]"
                          onClick={() =>
                            toggleMutation.mutate({ id: agent.id })
                          }
                        >
                          {agent.status === "ACTIVE"
                            ? "Pause Agent"
                            : "Resume Agent"}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs cursor-pointer focus:bg-[#0a0c10] text-[#a9927d]"
                          onClick={() =>
                            triggerRunMutation.mutate({ agentId: agent.id })
                          }
                        >
                          <PlayCircle className="w-3.5 h-3.5 mr-2" /> Force Run
                          Now
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-xs cursor-pointer text-red-400 focus:bg-red-400/10 focus:text-red-400"
                          onClick={() =>
                            deleteMutation.mutate({ id: agent.id })
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete Agent
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>

            {agents?.length === 0 && (
              <div className="px-3 py-4 text-center">
                <Button
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="w-full border-[#2f3e46] text-[#a9927d] hover:bg-[#0a0c10] text-xs h-8"
                >
                  Deploy First Agent
                </Button>
              </div>
            )}
          </div>

          {/* ── CENTER COLUMN: Discovered Leads ── */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#a9927d] pl-1">
              {selectedInboxId === "all" ? "All Unread Leads" : "Inbox"} (
              {displayedLeads?.filter((l) => !l.contacted).length || 0})
            </h2>

            <div className="space-y-2 max-h-[calc(100vh-200px)] overflow-y-auto custom-scrollbar pr-2">
              {displayedLeads?.length === 0 ? (
                <div className="text-center py-12 text-sm text-gray-500 italic">
                  No leads found in this inbox.
                </div>
              ) : (
                displayedLeads?.map((lead) => (
                  <button
                    key={lead.id}
                    onClick={() => setSelectedLeadId(lead.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedLeadId === lead.id
                        ? "bg-[#2f3e46]/30 border-[#a9927d]/50"
                        : lead.contacted
                          ? "bg-[#0a0c10]/50 border-transparent opacity-60"
                          : "bg-[#1a252f] border-[#2f3e46] hover:border-[#a9927d]/30"
                    }`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4
                        className={`text-sm font-medium truncate ${lead.contacted ? "text-gray-500 line-through" : "text-gray-200"}`}
                      >
                        {lead.company || lead.name}
                      </h4>
                      {lead.contacted && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      )}
                    </div>

                    {lead.company && lead.name !== lead.company && (
                      <p className="text-xs text-gray-500 mb-2 truncate">
                        {lead.name}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {lead.painPoints.slice(0, 2).map((pp, i) => (
                        <span
                          key={i}
                          className="text-[9px] font-mono bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded border border-red-500/20 truncate max-w-[120px]"
                        >
                          {pp}
                        </span>
                      ))}
                    </div>

                    <div className="flex items-center justify-between mt-3 text-[10px] font-mono text-gray-500">
                      <span className="flex items-center gap-1 bg-[#0a0c10] px-1.5 py-0.5 rounded border border-[#2f3e46]">
                        {lead.agent?.platform}
                      </span>
                      <span>{format(new Date(lead.createdAt), "MMM d")}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* ── RIGHT COLUMN: Detail View ── */}
          <div className="lg:col-span-5 space-y-4">
            <h2 className="text-xs font-mono uppercase tracking-widest text-[#a9927d] pl-1 invisible">
              Details
            </h2>

            {selectedLead ? (
              <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] flex flex-col h-[calc(100vh-200px)] sticky top-24">
                {/* Lead Header */}
                <div className="px-5 py-4 border-b border-[#2f3e46]/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-base font-medium text-white mb-0.5">
                        {selectedLead.company || selectedLead.name}
                      </h3>
                      <p className="text-sm text-gray-400">
                        {selectedLead.name}
                      </p>
                    </div>

                    {selectedLead.sourceUrl && (
                      <a
                        href={selectedLead.sourceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="p-1.5 bg-[#0a0c10] text-[#a9927d] rounded-md border border-[#2f3e46] hover:bg-[#a9927d] hover:text-[#0a0c10] transition-colors"
                        title="View Source"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                  </div>

                  {selectedLead.industry && (
                    <div className="mt-3 inline-block px-2 py-1 bg-[#0a0c10] rounded text-[10px] font-mono text-gray-400 border border-[#2f3e46]">
                      {selectedLead.industry}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-gray-400">
                    {selectedLead.location && (
                      <span className="flex items-center gap-1">
                        📍 {selectedLead.location}
                      </span>
                    )}
                    {selectedLead.email && (
                      <a
                        href={`mailto:${selectedLead.email}`}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        ✉️ {selectedLead.email}
                      </a>
                    )}
                    {selectedLead.phone && (
                      <a
                        href={`tel:${selectedLead.phone}`}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        📞 {selectedLead.phone}
                      </a>
                    )}
                    {selectedLead.website && (
                      <a
                        href={
                          selectedLead.website.startsWith("http")
                            ? selectedLead.website
                            : `https://${selectedLead.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        🔗 Website
                      </a>
                    )}
                  </div>
                </div>

                {/* Scrollable details */}
                <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
                  {/* Analysis */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-red-400 mb-2">
                        <Zap className="w-3.5 h-3.5" /> Detected Pain Points
                      </h4>
                      <ul className="space-y-1.5">
                        {selectedLead.painPoints.map((pp, i) => (
                          <li
                            key={i}
                            className="text-sm text-gray-300 bg-red-500/5 px-2.5 py-1.5 rounded-md border border-red-500/10"
                          >
                            {pp}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* @ts-ignore */}
                    {selectedLead.contextSnippet && (
                      <div>
                        <h4 className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-purple-400 mb-2 mt-4">
                          <MessageSquare className="w-3.5 h-3.5" /> Source
                          Context
                        </h4>
                        <div className="text-sm text-gray-300 leading-relaxed bg-[#0a0c10] p-4 rounded-lg border-l-2 border-purple-500 italic">
                          "{selectedLead.contextSnippet}"
                        </div>
                      </div>
                    )}

                    {selectedLead.whyIsLead && (
                      <div>
                        <h4 className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-emerald-400 mb-2 mt-4">
                          <Target className="w-3.5 h-3.5" /> Why they qualify
                        </h4>
                        <div className="text-sm text-gray-300 leading-relaxed bg-emerald-500/5 p-3 rounded-lg border border-emerald-500/10">
                          {selectedLead.whyIsLead}
                        </div>
                      </div>
                    )}

                    {selectedLead.offerPositioning && (
                      <div>
                        <h4 className="text-xs font-mono uppercase tracking-wider text-[#a9927d] mb-2 mt-4">
                          Strategy / Positioning
                        </h4>
                        <div className="text-sm text-gray-300 leading-relaxed bg-[#a9927d]/5 p-3 rounded-lg border border-[#a9927d]/10">
                          {selectedLead.offerPositioning}
                        </div>
                      </div>
                    )}
                  </div>

                  <hr className="border-[#2f3e46]" />

                  {/* Generated Outreach */}
                  <div>
                    <h4 className="flex items-center gap-1.5 text-xs font-mono uppercase tracking-wider text-blue-400 mb-3">
                      <MessageSquare className="w-3.5 h-3.5" /> Generated
                      Outreach
                    </h4>

                    <div className="space-y-4">
                      {selectedLead.suggestedDM && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono text-gray-500">
                            Suggested DM
                          </span>
                          <div className="bg-[#0a0c10] border border-[#2f3e46] p-3 rounded-lg text-xs text-gray-300 whitespace-pre-wrap font-mono">
                            {selectedLead.suggestedDM}
                          </div>
                        </div>
                      )}

                      {selectedLead.suggestedEmail && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] font-mono text-gray-500">
                            Suggested Email
                          </span>
                          <div className="bg-[#0a0c10] border border-[#2f3e46] p-3 rounded-lg text-xs text-gray-300 whitespace-pre-wrap font-mono">
                            {selectedLead.suggestedEmail}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer Action */}
                <div className="px-5 py-3 border-t border-[#2f3e46]/50 bg-[#1a252f]/80 backdrop-blur">
                  <Button
                    onClick={() =>
                      markContactedMutation.mutate({ leadId: selectedLead.id })
                    }
                    disabled={
                      selectedLead.contacted || markContactedMutation.isPending
                    }
                    className="w-full bg-[#a9927d] text-[#0a0c10] hover:bg-[#d4c4b7] font-mono tracking-widest uppercase text-xs disabled:opacity-50"
                  >
                    {selectedLead.contacted ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 mr-2" /> Contacted
                      </>
                    ) : (
                      "Mark as Contacted"
                    )}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] h-[calc(100vh-200px)] flex flex-col items-center justify-center p-6 text-center text-gray-500 sticky top-24">
                <Target className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">Select a lead to view deep context</p>
                <p className="text-xs font-mono mt-2 opacity-50">
                  Insights, pain points, and personalized outreach generated by
                  AI
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      <AgentCreationModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
      />
    </div>
  );
}

// Just a tiny icon component for the inline render
function UsersIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
