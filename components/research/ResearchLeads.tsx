"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Mail, Loader2, Plus, Globe, Copy } from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

interface ResearchLeadsProps {
  researchId: string;
}

export function ResearchLeads({ researchId }: ResearchLeadsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const utils = trpc.useContext();
  const { data: crmLeads, isLoading } = trpc.crmLead.getByResearchId.useQuery({
    researchId,
  });

  const generateLeads = trpc.research.generateLeads.useMutation({
    onSuccess: () => {
      toast.success("Leads generated");
      utils.research.getById.invalidate({ id: researchId });
      utils.crmLead.getByResearchId.invalidate({ researchId });
      setIsGenerating(false);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsGenerating(false);
    },
  });

  const handleGenerateLeads = () => {
    setIsGenerating(true);
    generateLeads.mutate({ researchId });
  };
  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (isLoading) {
    return (
      <div className="py-16 text-center border border-border/50 border-dashed rounded-md">
        <Loader2 className="w-5 h-5 mx-auto text-muted-foreground/40 animate-spin mb-3" />
        <p className="text-xs font-mono text-muted-foreground">LOADING LEADS</p>
      </div>
    );
  }

  if (!crmLeads || crmLeads.length === 0) {
    return (
      <div className="py-16 text-center border border-border/50 border-dashed rounded-md">
        <Users className="w-5 h-5 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-xs font-mono text-muted-foreground mb-1">
          NO LEADS IDENTIFIED
        </p>
        <p className="text-[10px] text-muted-foreground/60 max-w-xs mx-auto mb-4">
          Extract potential leads from research findings
        </p>
        <Button
          onClick={handleGenerateLeads}
          disabled={isGenerating}
          size="sm"
          className="h-7 bg-blu/10 hover:bg-blu/20 text-blu text-[10px] font-mono border border-blu/20 rounded px-3"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
          ) : (
            <Plus className="w-3 h-3 mr-1.5" />
          )}
          GENERATE LEADS
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          {crmLeads.length} Leads Identified
        </span>
        <Button
          onClick={handleGenerateLeads}
          disabled={isGenerating}
          size="sm"
          className="h-6 bg-charcoal hover:bg-charcoal/80 text-muted-foreground text-[10px] font-mono border border-border rounded px-2.5"
        >
          {isGenerating ? (
            <Loader2 className="w-3 h-3 animate-spin mr-1" />
          ) : (
            <Plus className="w-3 h-3 mr-1" />
          )}
          MORE
        </Button>
      </div>
      <div className="space-y-2">
        {crmLeads.map((lead) => (
          <div
            key={lead.id}
            className="border border-border rounded-md bg-card/50 hover:border-charcoal transition-all"
          >
            <div className="p-4">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-md bg-charcoal flex items-center justify-center text-muted-foreground text-xs font-mono font-bold uppercase shrink-0">
                  {lead.firstName?.charAt(0) || "?"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <h4 className="text-sm font-mono font-medium text-alabaster truncate">
                      {lead.firstName} {lead.lastName}
                    </h4>
                    {lead.status !== "NEW" && (
                      <Badge
                        variant="outline"
                        className="text-[9px] h-4 px-1.5 font-mono border-border text-muted-foreground"
                      >
                        {lead.status}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[11px] text-blu/60 font-mono truncate">
                    {lead.title || "Decision Maker"} · {lead.companyName}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-2">
                    {lead.email && (
                      <button
                        onClick={() => copyToClipboard(lead.email, "Email")}
                        className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-alabaster transition-colors"
                      >
                        <Mail className="w-3 h-3" /> {lead.email}
                      </button>
                    )}
                    {lead.companyWebsite && (
                      <a
                        href={
                          lead.companyWebsite.startsWith("http")
                            ? lead.companyWebsite
                            : `https://${lead.companyWebsite}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-blu transition-colors"
                      >
                        <Globe className="w-3 h-3" />
                        {lead.companyWebsite.replace(/^https?:\/\//, "")}
                      </a>
                    )}
                  </div>
                  {lead.painPoints && lead.painPoints.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5">
                      {lead.painPoints.map((pp: string, i: number) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[9px] h-4 px-1.5 font-mono border-border/60 text-muted-foreground/60 bg-transparent"
                        >
                          {pp}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  {lead.email && (
                    <button
                      onClick={() => copyToClipboard(lead.email, "Email")}
                      className="p-1.5 text-muted-foreground/40 hover:text-blu transition-colors rounded hover:bg-charcoal/50"
                    >
                      <Copy className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
