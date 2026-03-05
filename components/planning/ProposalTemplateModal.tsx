"use client";

import { useState } from "react";
import { FileText, Plus, Copy, Check, X } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function ProposalTemplateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    null,
  );
  const [variables, setVariables] = useState<Record<string, string>>({});
  const [renderedProposal, setRenderedProposal] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();
  const { data: templates } = trpc.proposalTemplate.getTemplates.useQuery();
  const seedMutation = trpc.proposalTemplate.seedDefault.useMutation({
    onSuccess: () => utils.proposalTemplate.getTemplates.invalidate(),
  });
  const generateMutation = trpc.proposalTemplate.generateProposal.useMutation({
    onSuccess: (data) => {
      setRenderedProposal(data.rendered);
      toast.success("Proposal generated!");
    },
    onError: (err) => toast.error(err.message),
  });

  const selectedTemplate = templates?.find((t) => t.id === selectedTemplateId);

  const handleOpen = () => {
    setIsOpen(true);
    // Seed default template if none exist
    if (templates && templates.length === 0) {
      seedMutation.mutate();
    }
  };

  const handleGenerate = () => {
    if (!selectedTemplateId) return;
    generateMutation.mutate({
      templateId: selectedTemplateId,
      variables,
    });
  };

  const handleCopy = async () => {
    if (!renderedProposal) return;
    await navigator.clipboard.writeText(renderedProposal);
    setCopied(true);
    toast.success("Proposal copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) {
    return (
      <button
        onClick={handleOpen}
        className="w-full flex items-center gap-3 px-4 py-3 bg-[#1a252f] rounded-xl border border-[#2f3e46] hover:border-[#a9927d]/40 transition-all group"
      >
        <FileText className="w-4 h-4 text-[#a9927d]" />
        <div className="text-left">
          <span className="text-xs text-white block">
            Generate Client Proposal
          </span>
          <span className="text-[10px] font-mono text-gray-500">
            Quick-fill template → copy → send
          </span>
        </div>
        <Plus className="w-4 h-4 text-gray-500 ml-auto group-hover:text-[#a9927d] transition-colors" />
      </button>
    );
  }

  return (
    <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3e46]/50">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d]">
          Generate Proposal
        </h3>
        <button
          onClick={() => {
            setIsOpen(false);
            setRenderedProposal(null);
            setSelectedTemplateId(null);
            setVariables({});
          }}
          className="p-1 rounded text-gray-500 hover:text-white hover:bg-[#0a0c10] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-4 space-y-3">
        {!renderedProposal ? (
          <>
            {/* Template selection */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                Template
              </label>
              <div className="space-y-1">
                {templates?.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTemplateId(t.id);
                      // Pre-fill variables map
                      const vars: Record<string, string> = {};
                      t.variables.forEach((v) => (vars[v] = ""));
                      setVariables(vars);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 rounded-lg transition-colors text-xs",
                      selectedTemplateId === t.id
                        ? "bg-[#a9927d]/20 text-[#a9927d] border border-[#a9927d]/30"
                        : "bg-[#0a0c10] text-gray-400 hover:text-white border border-transparent",
                    )}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Variable inputs */}
            {selectedTemplate && (
              <div className="space-y-2">
                <label className="text-[10px] font-mono text-gray-500 uppercase tracking-wider block">
                  Fill in Details
                </label>
                {selectedTemplate.variables.map((v) => (
                  <div key={v}>
                    <label className="text-[10px] font-mono text-gray-500 capitalize mb-0.5 block">
                      {v.replace(/([A-Z])/g, " $1").trim()}
                    </label>
                    <Input
                      placeholder={v}
                      value={variables[v] || ""}
                      onChange={(e) =>
                        setVariables((prev) => ({
                          ...prev,
                          [v]: e.target.value,
                        }))
                      }
                      className="h-8 bg-[#0a0c10] border-[#2f3e46] text-white text-xs"
                    />
                  </div>
                ))}
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending}
                  className="w-full h-9 bg-[#a9927d] text-[#0a0c10] hover:bg-[#d4c4b7] font-mono text-[10px] uppercase tracking-wider"
                >
                  Generate Proposal
                </Button>
              </div>
            )}
          </>
        ) : (
          <>
            {/* Rendered proposal preview */}
            <div className="bg-[#0a0c10] rounded-lg border border-[#2f3e46] p-4 max-h-[400px] overflow-y-auto custom-scrollbar">
              <pre className="text-xs text-gray-300 whitespace-pre-wrap font-mono leading-relaxed">
                {renderedProposal}
              </pre>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                className="flex-1 h-9 bg-[#a9927d] text-[#0a0c10] hover:bg-[#d4c4b7] font-mono text-[10px] uppercase tracking-wider"
              >
                {copied ? (
                  <Check className="w-3 h-3 mr-2" />
                ) : (
                  <Copy className="w-3 h-3 mr-2" />
                )}
                {copied ? "Copied" : "Copy to Clipboard"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setRenderedProposal(null)}
                className="h-9 border-[#2f3e46] text-gray-400 font-mono text-[10px] uppercase tracking-wider"
              >
                Edit
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
