"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Users,
  Linkedin,
  Mail,
  UserPlus,
  Loader2,
  Plus,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc/client";
import { useState } from "react";

interface ResearchLeadsProps {
  leadData: any;
  researchId: string;
}

export function ResearchLeads({ leadData, researchId }: ResearchLeadsProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const utils = trpc.useContext();
  const generateLeads = trpc.research.generateLeads.useMutation({
    onSuccess: () => {
      toast.success("Leads generated successfully!");
      utils.research.getById.invalidate({ id: researchId });
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
    toast.success(`${label} copied!`);
  };

  if (!leadData || !leadData.leads || leadData.leads.length === 0) {
    return (
      <div className="py-20 text-center bg-[#1a252f] rounded-xl border border-[#2f3e46]">
        <Users className="w-16 h-16 mx-auto text-gray-700 mb-4" />
        <h3 className="text-xl font-semibold text-white mb-2">
          Lead Miner is Idle
        </h3>
        <p className="text-gray-400 max-w-sm mx-auto mb-6">
          No business leads were identified yet. You can use the AI to extract
          potential leads from your research findings.
        </p>
        <Button
          onClick={handleGenerateLeads}
          disabled={isGenerating}
          className="bg-[#a9927d] hover:bg-[#8f7a68] text-white"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Sparkles className="w-4 h-4 mr-2" />
          )}
          Generate Leads
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-white">Identified Leads</h3>
        <Button
          onClick={handleGenerateLeads}
          disabled={isGenerating}
          variant="outline"
          className="border-[#a9927d] text-[#a9927d] hover:bg-[#a9927d]/10"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : (
            <Plus className="w-4 h-4 mr-2" />
          )}
          Find More Leads
        </Button>
      </div>

      {/* Lead Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-[#1a252f] border-[#2f3e46] p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
            Total Found
          </p>
          <p className="text-2xl font-bold text-white">{leadData.totalFound}</p>
        </Card>
        <Card className="bg-[#1a252f] border-[#2f3e46] p-4 text-center">
          <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
            Decision Makers
          </p>
          <p className="text-2xl font-bold text-[#6b9080]">
            {Math.floor(leadData.totalFound * 0.4)}
          </p>
        </Card>
        {/* ... more stats */}
      </div>

      {/* Leads List */}
      <div className="space-y-4">
        {leadData.leads.map((lead: any) => (
          <Card
            key={lead.id}
            className="bg-[#1a252f] border-[#2f3e46] overflow-hidden group"
          >
            <div className="flex flex-col lg:flex-row">
              {/* Profile Bar */}
              <div className="p-6 flex-1 border-b lg:border-b-0 lg:border-r border-[#2f3e46]">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-full bg-[#a9927d] flex items-center justify-center text-white font-bold text-xl uppercase shrink-0">
                    {lead.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="text-lg font-bold text-white truncate">
                        {lead.name}
                      </h4>
                      {lead.contacted && (
                        <Badge className="bg-[#6b9080] text-[10px]">
                          CONTACTED
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-[#6b9080] font-medium truncate mb-1">
                      {lead.suggestedDM || "Decision Maker"} @ {lead.company}
                    </p>
                    {lead.industry && (
                      <p className="text-xs text-gray-500 mb-2">
                        🏢 {lead.industry}
                      </p>
                    )}

                    {/* Contact Details Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs mt-3">
                      {lead.email && (
                        <div
                          className="flex items-center gap-1.5 text-gray-400 hover:text-white cursor-pointer"
                          onClick={() => copyToClipboard(lead.email, "Email")}
                        >
                          <Mail className="w-3 h-3 text-blue-400" />
                          <span className="truncate">{lead.email}</span>
                        </div>
                      )}
                      {lead.suggestedEmail &&
                        lead.suggestedEmail !== lead.email && (
                          <div
                            className="flex items-center gap-1.5 text-gray-500 hover:text-white cursor-pointer"
                            onClick={() =>
                              copyToClipboard(
                                lead.suggestedEmail,
                                "Suggested email",
                              )
                            }
                            title="AI-suggested email"
                          >
                            <Mail className="w-3 h-3 text-amber-400" />
                            <span className="truncate italic">
                              {lead.suggestedEmail}
                            </span>
                          </div>
                        )}
                      {lead.phone && (
                        <div
                          className="flex items-center gap-1.5 text-gray-400 hover:text-white cursor-pointer"
                          onClick={() => copyToClipboard(lead.phone, "Phone")}
                        >
                          <span>📞</span>
                          <span>{lead.phone}</span>
                        </div>
                      )}
                      {lead.website && (
                        <a
                          href={
                            lead.website.startsWith("http")
                              ? lead.website
                              : `https://${lead.website}`
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-gray-400 hover:text-[#6b9080]"
                        >
                          <span>🌐</span>
                          <span className="truncate">
                            {lead.website.replace(/^https?:\/\//, "")}
                          </span>
                        </a>
                      )}
                      {lead.location && (
                        <div className="flex items-center gap-1.5 text-gray-400">
                          <span>📍</span>
                          <span>{lead.location}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pain Points Chips */}
                {lead.painPoints && lead.painPoints.length > 0 && (
                  <div className="mt-4">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Pain Points
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {lead.painPoints.map((pp: string, i: number) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className="text-[10px] border-[#2f3e46] bg-black/20 text-gray-400"
                        >
                          {pp}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Outreach Bar */}
              <div className="p-6 bg-black/20 lg:w-80 flex flex-col justify-center gap-3">
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">
                  Quick Actions
                </p>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-[#1a252f] border-[#2f3e46] text-xs h-9 justify-start"
                    onClick={() =>
                      copyToClipboard(
                        lead.email || lead.suggestedEmail || "",
                        "Email",
                      )
                    }
                  >
                    <Mail className="w-3 h-3 mr-2 text-blue-400" /> Copy Email
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-[#1a252f] border-[#2f3e46] text-xs h-9 justify-start"
                    onClick={() => copyToClipboard(lead.phone || "", "Phone")}
                    disabled={!lead.phone}
                  >
                    <span className="mr-2">📞</span> Copy Phone
                  </Button>
                </div>

                {lead.website && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-[#1a252f] border-[#2f3e46] text-xs h-9 justify-start w-full"
                    onClick={() =>
                      window.open(
                        lead.website.startsWith("http")
                          ? lead.website
                          : `https://${lead.website}`,
                        "_blank",
                      )
                    }
                  >
                    <span className="mr-2">🌐</span> Visit Website
                  </Button>
                )}

                <Button className="w-full bg-[#a9927d] hover:bg-[#8f7a68] text-white text-xs h-9">
                  <UserPlus className="w-3 h-3 mr-2" /> Add to CRM
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
