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
import { Loader2, Sparkles, ArrowRight, CheckCircle2 } from "lucide-react";
import { ResearchScope, SearchMethod } from "@prisma/client";
import ReactMarkdown from "react-markdown";

interface ResearchCreationModalProps {
  open: boolean;
  onClose: () => void;
}

export function ResearchCreationModal({
  open,
  onClose,
}: ResearchCreationModalProps) {
  const [step, setStep] = useState<
    "create" | "refining" | "review" | "starting"
  >("create");
  const [formData, setFormData] = useState({
    title: "",
    originalPrompt: "",
    scope: ResearchScope.GENERAL_RESEARCH,
    searchMethod: SearchMethod.GEMINI_GROUNDING,
    goalId: undefined as string | undefined,
    geminiApiKey: "",
  });
  const [researchId, setResearchId] = useState<string>("");
  const [refinedPrompt, setRefinedPrompt] = useState<string>("");

  const createMutation = trpc.research.create.useMutation();
  const refineMutation = trpc.research.refinePrompt.useMutation();
  const startMutation = trpc.research.startResearch.useMutation();

  const { data: goals } = trpc.planning.listGoals.useQuery();

  const handleCreateAndRefine = async () => {
    if (!formData.title || !formData.originalPrompt) {
      toast.error("Missing fields", {
        description: "Please fill in all required fields",
      });
      return;
    }

    try {
      setStep("refining");
      // 1. Create research record
      const research = await createMutation.mutateAsync({
        ...formData,
      });
      setResearchId(research.id);

      // 2. Transmit to AI for refinement
      const refined = await refineMutation.mutateAsync({
        researchId: research.id,
        originalPrompt: formData.originalPrompt,
        scope: formData.scope,
      });

      setRefinedPrompt(refined.refinedPrompt);
      setStep("review");
    } catch (error: any) {
      setStep("create");
      toast.error("Error", {
        description: error.message || "Something went wrong",
      });
    }
  };

  const handleSkipRefinement = async () => {
    if (!formData.title || !formData.originalPrompt) {
      toast.error("Missing fields", {
        description: "Please fill in all required fields",
      });
      return;
    }

    try {
      setStep("starting");
      // Create research record without refinement
      const research = await createMutation.mutateAsync({
        ...formData,
      });
      setResearchId(research.id);

      // Start research immediately with original prompt
      await startMutation.mutateAsync({ researchId: research.id });

      toast.success("Research Started!", {
        description: "Using your original prompt without AI refinement.",
      });

      onClose();
      setTimeout(() => {
        setStep("create");
        setFormData({
          title: "",
          originalPrompt: "",
          scope: ResearchScope.GENERAL_RESEARCH,
          searchMethod: SearchMethod.GEMINI_GROUNDING,
          goalId: undefined,
          geminiApiKey: "",
        });
      }, 500);

      window.location.href = `/research/${research.id}`;
    } catch (error: any) {
      setStep("create");
      toast.error("Error", {
        description: error.message || "Failed to start research",
      });
    }
  };

  const handleStartResearch = async () => {
    try {
      setStep("starting");
      await startMutation.mutateAsync({ researchId });

      toast.success("Research Dispatched!", {
        description: "Your agent is now scouring the web.",
      });

      onClose();
      // Reset state for next time
      setTimeout(() => {
        setStep("create");
        setFormData({
          title: "",
          originalPrompt: "",
          scope: ResearchScope.GENERAL_RESEARCH,
          searchMethod: SearchMethod.GEMINI_GROUNDING,
          goalId: undefined,
          geminiApiKey: "",
        });
      }, 500);

      window.location.href = `/research/${researchId}`;
    } catch (error: any) {
      setStep("review");
      toast.error("Error", {
        description: error.message || "Failed to start research",
      });
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val && step !== "starting") {
          onClose();
          // Reset to create step if closed mid-process
          if (step === "refining" || step === "review") {
            setStep("create");
          }
        }
      }}
    >
      <DialogContent className="bg-[#1a252f] border-[#2f3e46] text-white max-w-2xl w-[95vw] md:w-full max-h-[85vh] md:max-h-[90vh] overflow-hidden flex flex-col p-0 rounded-xl">
        {/* Progress bar */}
        <div className="h-1 w-full bg-black/20">
          <div
            className="h-full bg-[#a9927d] transition-all duration-500"
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
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              {step === "create" && "New Research Mission"}
              {step === "refining" && "Consulting Gemini AI..."}
              {step === "review" && "Mission Briefing Refined"}
              {step === "starting" && "Dispatching Agent..."}
              {step === "create" && (
                <Sparkles className="w-5 h-5 text-[#a9927d]" />
              )}
            </DialogTitle>
          </DialogHeader>

          {step === "create" && (
            <div className="space-y-5 animate-in fade-in slide-in-from-bottom-2 duration-300">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-gray-400">
                  Mission Title
                </Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="e.g., Q1 Market Expansion Analysis"
                  className="bg-black/20 border-[#2f3e46] focus:border-[#a9927d] h-12"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Scope */}
                <div className="space-y-2">
                  <Label
                    htmlFor="scope"
                    className="text-gray-400 whitespace-nowrap"
                  >
                    Research Scope
                  </Label>
                  <Select
                    value={formData.scope}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        scope: value as ResearchScope,
                      })
                    }
                  >
                    <SelectTrigger className="bg-black/20 border-[#2f3e46] h-12 w-full min-w-0">
                      <SelectValue className="truncate" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a252f] border-[#2f3e46] text-white">
                      {Object.values(ResearchScope).map((s) => (
                        <SelectItem key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Goal Link */}
                <div className="space-y-2">
                  <Label
                    htmlFor="goal"
                    className="text-gray-400 whitespace-nowrap"
                  >
                    Link to Strategic Goal
                  </Label>
                  <Select
                    value={formData.goalId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, goalId: value })
                    }
                  >
                    <SelectTrigger className="bg-black/20 border-[#2f3e46] h-12 w-full min-w-0">
                      <SelectValue
                        placeholder="Unlinked"
                        className="truncate"
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a252f] border-[#2f3e46] text-white">
                      {goals?.map((goal: any) => (
                        <SelectItem key={goal.id} value={goal.id}>
                          {goal.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Search Method */}
              <div className="space-y-2">
                <Label className="text-gray-400">Search Strategy</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        searchMethod: SearchMethod.GEMINI_GROUNDING,
                      })
                    }
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.searchMethod === SearchMethod.GEMINI_GROUNDING
                        ? "border-[#a9927d] bg-[#a9927d]/10"
                        : "border-[#2f3e46] bg-black/20 hover:border-[#a9927d]/50"
                    }`}
                  >
                    <p className="font-medium text-white text-sm">Grounding</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Fast Google Search via Gemini
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        searchMethod: SearchMethod.SERPER_API,
                      })
                    }
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.searchMethod === SearchMethod.SERPER_API
                        ? "border-[#6b9080] bg-[#6b9080]/10"
                        : "border-[#2f3e46] bg-black/20 hover:border-[#6b9080]/50"
                    }`}
                  >
                    <p className="font-medium text-white text-sm">Serper</p>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Deep custom web scraping
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        searchMethod: (SearchMethod as any).JINA_SERPER,
                      })
                    }
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.searchMethod ===
                      (SearchMethod as any).JINA_SERPER
                        ? "border-blue-500 bg-blue-500/10"
                        : "border-[#2f3e46] bg-black/20 hover:border-blue-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-white text-sm">
                        Deep Search
                      </p>
                      <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded">
                        NEW
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Iterative Loop (Clean Extraction)
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({
                        ...formData,
                        searchMethod: SearchMethod.GEMINI_DEEP_RESEARCH,
                      })
                    }
                    className={`p-3 rounded-lg border text-left transition-all ${
                      formData.searchMethod ===
                      SearchMethod.GEMINI_DEEP_RESEARCH
                        ? "border-amber-500 bg-amber-500/10"
                        : "border-[#2f3e46] bg-black/20 hover:border-amber-500/50"
                    }`}
                  >
                    <div className="flex items-center gap-1">
                      <p className="font-medium text-white text-sm">
                        Deep Research
                      </p>
                      <span className="text-[8px] bg-amber-500/20 text-amber-500 px-1 rounded">
                        PRO
                      </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      Autonomous agent (Gemini Native)
                    </p>
                  </button>
                </div>
              </div>

              {/* Prompt */}
              <div className="space-y-2">
                <Label htmlFor="prompt" className="text-gray-400">
                  Objective Description
                </Label>
                <Textarea
                  id="prompt"
                  value={formData.originalPrompt}
                  onChange={(e) =>
                    setFormData({ ...formData, originalPrompt: e.target.value })
                  }
                  placeholder="Describe what you want to find. Be as specific as possible about the data, regions, or competitors."
                  rows={4}
                  className="bg-black/20 border-[#2f3e46] focus:border-[#a9927d] resize-none"
                />
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 pt-4">
                <Button
                  variant="ghost"
                  onClick={handleSkipRefinement}
                  disabled={createMutation.isPending || startMutation.isPending}
                  className="text-gray-400 hover:text-white order-2 sm:order-1"
                >
                  Skip Refinement →
                </Button>
                <div className="flex gap-3 justify-end order-1 sm:order-2">
                  <Button
                    variant="ghost"
                    onClick={onClose}
                    className="text-gray-400 hover:text-white"
                  >
                    Abort
                  </Button>
                  <Button
                    onClick={handleCreateAndRefine}
                    disabled={
                      createMutation.isPending || refineMutation.isPending
                    }
                    className="bg-[#a9927d] hover:bg-[#8f7a68] text-white px-8 h-12 whitespace-nowrap"
                  >
                    Refine Mission <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {(step === "refining" || step === "starting") && (
            <div className="flex flex-col items-center justify-center py-20 animate-in fade-in duration-500">
              <div className="relative">
                <div className="absolute inset-0 bg-[#a9927d]/20 blur-2xl rounded-full animate-pulse" />
                <Loader2 className="w-16 h-16 text-[#a9927d] animate-spin relative" />
              </div>
              <p className="mt-8 text-xl font-medium text-white">
                {step === "refining"
                  ? "Optimizing Research Parameters..."
                  : "Deploying Web Crawlers..."}
              </p>
              <p className="mt-2 text-muted-foreground">
                This will only take a moment.
              </p>
            </div>
          )}

          {step === "review" && (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
              <div className="bg-black/40 border border-[#6b9080]/30 rounded-xl p-5 relative overflow-y-auto max-h-[50vh]">
                <div className="absolute top-0 right-0 p-2">
                  <Sparkles className="w-4 h-4 text-[#6b9080]" />
                </div>
                <Label className="text-[#6b9080] text-xs font-bold uppercase tracking-wider mb-2 block">
                  Refined Mission Briefing
                </Label>
                <div className="prose prose-invert prose-sm max-w-none text-gray-300">
                  <ReactMarkdown>{refinedPrompt}</ReactMarkdown>
                </div>
              </div>

              <div className="bg-[#2f3e46]/20 rounded-lg p-4 flex gap-3">
                <CheckCircle2 className="w-5 h-5 text-[#6b9080] shrink-0" />
                <p className="text-sm text-gray-300">
                  Our AI has expanded your request to target better sources and
                  ensure comprehensive coverage of the $
                  {formData.scope.toLowerCase()} sector.
                </p>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep("create")}
                  className="text-gray-400"
                >
                  Edit Brief
                </Button>
                <Button
                  onClick={handleStartResearch}
                  className="bg-[#6b9080] hover:bg-[#5a7a6b] text-white px-8 h-12"
                >
                  Commence Research
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
