"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowRight, CheckCircle2 } from "lucide-react";
import { ResearchScope, SearchMethod } from "@prisma/client";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ResearchCreationModalProps {
  open: boolean;
  onClose: () => void;
}

const DEFAULT_FORM = {
  title: "",
  originalPrompt: "",
  scope: ResearchScope.GENERAL_RESEARCH as ResearchScope,
  searchMethod: SearchMethod.GEMINI_GROUNDING as SearchMethod,
  goalId: undefined as string | undefined,
  geminiApiKey: "",
};

export function ResearchCreationModal({
  open,
  onClose,
}: ResearchCreationModalProps) {
  const [step, setStep] = useState<
    "create" | "refining" | "review" | "starting"
  >("create");
  const [formData, setFormData] = useState({ ...DEFAULT_FORM });
  const [researchId, setResearchId] = useState<string>("");
  const [refinedPrompt, setRefinedPrompt] = useState<string>("");

  const createMutation = trpc.research.create.useMutation();
  const refineMutation = trpc.research.refinePrompt.useMutation();
  const startMutation = trpc.research.startResearch.useMutation();
  const { data: goals } = trpc.planning.listGoals.useQuery();

  const resetForm = () => {
    setStep("create");
    setFormData({ ...DEFAULT_FORM });
  };

  const handleCreateAndRefine = async () => {
    if (!formData.title || !formData.originalPrompt) {
      toast.error("Fill in all required fields");
      return;
    }
    try {
      setStep("refining");
      const research = await createMutation.mutateAsync({ ...formData });
      setResearchId(research.id);
      const refined = await refineMutation.mutateAsync({
        researchId: research.id,
        originalPrompt: formData.originalPrompt,
        scope: formData.scope,
      });
      setRefinedPrompt(refined.refinedPrompt);
      setStep("review");
    } catch (error: any) {
      setStep("create");
      toast.error(error.message || "Something went wrong");
    }
  };

  const handleSkipRefinement = async () => {
    if (!formData.title || !formData.originalPrompt) {
      toast.error("Fill in all required fields");
      return;
    }
    try {
      setStep("starting");
      const research = await createMutation.mutateAsync({ ...formData });
      setResearchId(research.id);
      await startMutation.mutateAsync({ researchId: research.id });
      toast.success("Research started");
      onClose();
      setTimeout(resetForm, 500);
      window.location.href = `/research/${research.id}`;
    } catch (error: any) {
      setStep("create");
      toast.error(error.message || "Failed to start");
    }
  };

  const handleStartResearch = async () => {
    try {
      setStep("starting");
      await startMutation.mutateAsync({ researchId });
      toast.success("Research dispatched");
      onClose();
      setTimeout(resetForm, 500);
      window.location.href = `/research/${researchId}`;
    } catch (error: any) {
      setStep("review");
      toast.error(error.message || "Failed to start");
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && step !== "starting") {
          onClose();
          if (step === "refining" || step === "review") setStep("create");
        }
      }}
    >
      <DialogContent className="bg-card border-border text-foreground max-w-2xl w-[95vw] md:w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-lg">
        {/* Progress bar */}
        <div className="h-[2px] w-full bg-border">
          <div
            className="h-full bg-blu transition-all duration-500"
            style={{
              width:
                step === "create"
                  ? "25%"
                  : step === "refining"
                    ? "50%"
                    : step === "review"
                      ? "75%"
                      : "100%",
            }}
          />
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto flex-1 custom-scrollbar max-h-[calc(85vh-4px)]">
          <DialogHeader className="mb-6">
            <DialogTitle className="font-mono text-sm uppercase tracking-widest text-muted-foreground">
              {step === "create" && "NEW RESEARCH"}
              {step === "refining" && "REFINING OBJECTIVE..."}
              {step === "review" && "REVIEW OBJECTIVE"}
              {step === "starting" && "DEPLOYING AGENT..."}
            </DialogTitle>
          </DialogHeader>

          {step === "create" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Title
                </Label>
                <Input
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Q1 Market Expansion Analysis"
                  className="bg-background border-border focus:border-blu/40 h-10 font-mono text-xs text-foreground"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    Scope
                  </Label>
                  <Select
                    value={formData.scope}
                    onValueChange={(v) =>
                      setFormData({ ...formData, scope: v as ResearchScope })
                    }
                  >
                    <SelectTrigger className="bg-background border-border h-10 w-full font-mono text-xs text-muted-foreground">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {Object.values(ResearchScope).map((s) => (
                        <SelectItem
                          key={s}
                          value={s}
                          className="font-mono text-xs"
                        >
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                    Strategic Goal{" "}
                    <span className="text-muted-foreground/30">(opt)</span>
                  </Label>
                  <Select
                    value={formData.goalId}
                    onValueChange={(v) =>
                      setFormData({ ...formData, goalId: v })
                    }
                  >
                    <SelectTrigger className="bg-background border-border h-10 w-full font-mono text-xs text-muted-foreground">
                      <SelectValue placeholder="Unlinked" />
                    </SelectTrigger>
                    <SelectContent className="bg-card border-border text-foreground">
                      {goals?.map((g: any) => (
                        <SelectItem
                          key={g.id}
                          value={g.id}
                          className="font-mono text-xs"
                        >
                          {g.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Mode */}
              <div className="space-y-2">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Mode
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        searchMethod:
                          SearchMethod.GEMINI_GROUNDING as SearchMethod,
                      })
                    }
                    className={cn(
                      "p-3 rounded-md border text-left transition-all duration-200",
                      formData.searchMethod ===
                        (SearchMethod.GEMINI_GROUNDING as SearchMethod)
                        ? "border-blu/30 bg-blu/5 ring-1 ring-blu/20"
                        : "border-border bg-background hover:border-charcoal",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-mono text-xs text-alabaster">
                        GOOGLE SEARCH
                      </p>
                      <span className="text-[8px] font-mono bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        FREE
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 font-mono">
                      Fast · Seconds · Free tier
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        searchMethod:
                          SearchMethod.GEMINI_DEEP_RESEARCH as SearchMethod,
                      })
                    }
                    className={cn(
                      "p-3 rounded-md border text-left transition-all duration-200",
                      formData.searchMethod ===
                        (SearchMethod.GEMINI_DEEP_RESEARCH as SearchMethod)
                        ? "border-amber-500/30 bg-amber-500/5 ring-1 ring-amber-500/20"
                        : "border-border bg-background hover:border-charcoal",
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-mono text-xs text-alabaster">
                        DEEP RESEARCH
                      </p>
                      <span className="text-[8px] font-mono bg-amber-500/10 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/20">
                        ~$2-5
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground/60 font-mono">
                      Autonomous · Minutes · Cited
                    </p>
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Objective
                </Label>
                <Textarea
                  value={formData.originalPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, originalPrompt: e.target.value })
                  }
                  placeholder="What do you want to understand deeply?"
                  rows={4}
                  className="bg-background border-border focus:border-blu/40 resize-none font-mono text-xs text-muted-foreground leading-relaxed"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between gap-3 pt-3">
                <Button
                  variant="ghost"
                  onClick={handleSkipRefinement}
                  disabled={createMutation.isPending || startMutation.isPending}
                  className="text-muted-foreground hover:text-alabaster text-xs font-mono order-2 sm:order-1"
                >
                  SKIP REFINEMENT →
                </Button>
                <div className="flex gap-2 justify-end order-1 sm:order-2">
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    className="text-muted-foreground hover:text-alabaster text-xs font-mono"
                  >
                    CANCEL
                  </Button>
                  <Button
                    onClick={handleCreateAndRefine}
                    disabled={
                      createMutation.isPending || refineMutation.isPending
                    }
                    className="bg-blu hover:bg-blu/90 text-white text-xs font-mono px-5 h-9"
                  >
                    REFINE <ArrowRight className="w-3 h-3 ml-1.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {(step === "refining" || step === "starting") && (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 text-blu/60 animate-spin" />
              <p className="mt-6 text-xs font-mono text-muted-foreground uppercase tracking-widest">
                {step === "refining"
                  ? "OPTIMIZING PARAMETERS"
                  : "DEPLOYING AGENT"}
              </p>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-5">
              <div className="border border-border rounded-md p-4 bg-card/80 max-h-[50vh] overflow-y-auto custom-scrollbar">
                <Label className="text-[10px] font-mono text-blu/60 uppercase tracking-widest mb-3 block">
                  Refined Objective
                </Label>
                <div className="prose prose-invert prose-sm max-w-none prose-headings:font-mono prose-headings:text-alabaster prose-p:text-muted-foreground prose-p:leading-relaxed">
                  <ReactMarkdown>{refinedPrompt}</ReactMarkdown>
                </div>
              </div>
              <div className="flex items-start gap-2.5 px-3 py-2.5 border border-emerald-500/10 rounded-md bg-emerald-500/5">
                <CheckCircle2 className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-muted-foreground font-mono">
                  Objective expanded for better source targeting and coverage.
                </p>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="ghost"
                  onClick={() => setStep("create")}
                  className="text-muted-foreground hover:text-alabaster text-xs font-mono"
                >
                  EDIT
                </Button>
                <Button
                  onClick={handleStartResearch}
                  className="bg-blu hover:bg-blu/90 text-white text-xs font-mono px-5 h-9"
                >
                  START RESEARCH
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
