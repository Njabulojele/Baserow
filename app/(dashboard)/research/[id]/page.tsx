"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResearchOverview } from "@/components/research/ResearchOverview";
import { ResearchSources } from "@/components/research/ResearchSources";
import { ResearchInsights } from "@/components/research/ResearchInsights";
import { ResearchActionItems } from "@/components/research/ResearchActionItems";
import { ResearchLeads } from "@/components/research/ResearchLeads";
import {
  ArrowLeft,
  Download,
  RefreshCcw,
  Loader2,
  Play,
  Maximize2,
  Key,
  XCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PDFGenerator } from "@/lib/pdf-generator";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { RetryAnalysisDialog } from "@/components/research/RetryAnalysisDialog";
import ReactMarkdown from "react-markdown";

export default function ResearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("overview");
  const [isExporting, setIsExporting] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);

  // ... (keeping existing hooks)
  // Poll for updates if research is in progress
  const {
    data: research,
    isLoading,
    refetch,
  } = trpc.research.getById.useQuery(
    { id },
    {
      refetchInterval: (data) =>
        data?.status === "IN_PROGRESS" ? 2000 : false,
    },
  );

  const startMutation = trpc.research.startResearch.useMutation();
  const cancelMutation = trpc.research.cancelResearch.useMutation();
  const updateSettingsMutation = trpc.settings.updateSettings.useMutation();
  const utils = trpc.useUtils();

  // Map progress percentage to human-readable steps
  const getProgressStep = (progress: number) => {
    if (progress < 10) return "Initializing research agent...";
    if (progress < 30) return "Scraping and verifying sources...";
    if (progress < 50) return "Analyzing gathered content...";
    if (progress < 70) return "Identifying key insights & gaps...";
    if (progress < 90) return "Synthesizing final report...";
    return "Finalizing research data...";
  };

  const handleManualRefresh = () => {
    toast.promise(refetch(), {
      loading: "Refreshing data...",
      success: "Data updated",
      error: "Failed to refresh",
    });
  };

  // ... (keeping existing handlers)

  const handleRetryAnalysis = async (options: {
    provider: string;
    model?: string;
  }) => {
    try {
      await startMutation.mutateAsync({
        researchId: id,
        retryOptions: {
          skipSearch: true,
          provider: options.provider,
          model: options.model,
        },
      });
      toast.success("Analysis Restarted", {
        description: `Retrying analysis with ${options.provider}...`,
      });
      refetch();
    } catch (error) {
      toast.error("Error", {
        description: "Failed to restart analysis",
      });
    }
  };

  // ... (keeping existing update key handler)

  const handleUpdateApiKey = async () => {
    if (!newApiKey) return;
    try {
      setIsUpdatingKey(true);
      await updateSettingsMutation.mutateAsync({ geminiApiKey: newApiKey });
      toast.success("API Key updated successfully");
      setShowKeyDialog(false);
      setNewApiKey("");
      utils.research.getById.invalidate({ id });
    } catch (error) {
      toast.error("Failed to update API key");
    } finally {
      setIsUpdatingKey(false);
    }
  };

  const isQuotaError =
    research?.errorMessage?.includes("429") ||
    research?.errorMessage?.includes("Quota exceeded");

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-12 h-12 text-[#a9927d] animate-spin mb-4" />
        <p className="text-muted-foreground">Synthesizing research data...</p>
      </div>
    );
  }

  if (!research) {
    return (
      <div className="p-8 text-center">
        <h1 className="text-2xl font-bold text-white mb-4">
          Research Not Found
        </h1>
        <Button asChild className="bg-[#a9927d]">
          <Link href="/research">Back to Dashboard</Link>
        </Button>
      </div>
    );
  }

  const handleRetry = async () => {
    try {
      await startMutation.mutateAsync({ researchId: id });
      toast.success("Research Restarted", {
        description: "Agent has been redeployed.",
      });
      refetch();
    } catch (error) {
      toast.error("Error", {
        description: "Failed to restart research",
      });
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const blob = await PDFGenerator.generateResearchReport(research);
      const url = window.URL.createObjectURL(
        new Blob([blob], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute(
        "download",
        `${research.title.replace(/\s+/g, "_")}_Report.pdf`,
      );
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export Successful", {
        description: "Report downloaded successfully.",
      });
    } catch (error) {
      toast.error("Export Failed", {
        description: "Failed to generate PDF",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Breadcrumbs & Header */}
      <div className="mb-8">
        <Link
          href="/research"
          className="text-sm text-muted-foreground hover:text-[#a9927d] flex items-center gap-1 mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Research Lab
        </Link>

        <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-white">
                {research.title}
              </h1>
              {research.status === "IN_PROGRESS" ? (
                <div className="flex-1 max-w-xs">
                  <div className="w-full bg-black/40 rounded-full h-1.5 mb-2 overflow-hidden">
                    <div
                      className="bg-[#6b9080] h-1.5 rounded-full transition-all duration-500 relative"
                      style={{ width: `${research.progress}%` }}
                    >
                      <div className="absolute inset-0 bg-white/20 animate-pulse w-full h-full" />
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] text-muted-foreground items-center">
                    <span className="flex items-center text-[#6b9080] font-medium animate-pulse">
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      {getProgressStep(research.progress)}
                    </span>
                    <span>{research.progress}%</span>
                  </div>
                </div>
              ) : (
                <Badge
                  className={
                    research.status === "COMPLETED"
                      ? "bg-[#a9927d]"
                      : research.status === "IN_PROGRESS"
                        ? "bg-[#6b9080]"
                        : "bg-destructive"
                  }
                >
                  {research.status}
                </Badge>
              )}
            </div>
            <div className="mt-2">
              <div className="flex items-center gap-2 mb-1">
                <p className="text-sm font-semibold text-[#6b9080] uppercase tracking-wider">
                  Mission Objective
                </p>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 hover:bg-[#6b9080]/20"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-[#6b9080]" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl bg-[#1a252f] border-[#2f3e46] text-white">
                    <DialogHeader>
                      <DialogTitle>Refined Mission Objective</DialogTitle>
                    </DialogHeader>
                    <div className="mt-4 max-h-[60vh] overflow-y-auto prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{research.refinedPrompt}</ReactMarkdown>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
              <div className="text-lg text-[#6b9080] font-medium italic line-clamp-2">
                <ReactMarkdown>{research.refinedPrompt}</ReactMarkdown>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            {research.status === "PENDING" && (
              <Button
                onClick={handleRetry}
                className="bg-[#6b9080] hover:bg-[#5a7a6b] text-white"
              >
                <Play className="w-4 h-4 mr-2" /> Commence Research
              </Button>
            )}
            <Button
              variant="outline"
              onClick={handleManualRefresh}
              className="border-[#2f3e46] text-gray-400 hover:text-white"
            >
              <RefreshCcw className="w-4 h-4 mr-2" /> Refresh
            </Button>
            {research.status === "IN_PROGRESS" && (
              <Button
                onClick={async () => {
                  await cancelMutation.mutateAsync({ researchId: id });
                  toast.success("Research cancelled");
                  refetch();
                }}
                disabled={cancelMutation.isPending}
                className="bg-red-500 hover:bg-red-600 text-white"
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4 mr-2" />
                )}
                Cancel
              </Button>
            )}
            {(research.status === "FAILED" || isQuotaError) && (
              <>
                {isQuotaError && (
                  <Button
                    onClick={() => setShowKeyDialog(true)}
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                  >
                    <Key className="w-4 h-4 mr-2" /> Update API Key
                  </Button>
                )}
                <Button
                  onClick={() => setShowRetryDialog(true)}
                  className="bg-[#6b9080] hover:bg-[#5a7a6b] text-white"
                >
                  <RefreshCcw className="w-4 h-4 mr-2" /> Retry Analysis
                </Button>
                <Button
                  onClick={handleRetry}
                  className="bg-red-500 hover:bg-red-600 text-white"
                >
                  <Play className="w-4 h-4 mr-2" /> Retry Mission
                </Button>
              </>
            )}
            <Button
              onClick={handleExportPDF}
              disabled={isExporting || research.status !== "COMPLETED"}
              className="bg-[#a9927d] hover:bg-[#8f7a68] text-white"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Download className="w-4 h-4 mr-2" />
              )}
              Export Report
            </Button>
          </div>
        </div>
      </div>

      <RetryAnalysisDialog
        open={showRetryDialog}
        onOpenChange={setShowRetryDialog}
        onConfirm={handleRetryAnalysis}
      />

      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="bg-[#1a252f] border-[#2f3e46] text-white">
          <DialogHeader>
            <DialogTitle>Update Gemini API Key</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>New API Key</Label>
              <Input
                value={newApiKey}
                onChange={(e) => setNewApiKey(e.target.value)}
                placeholder="Paste your new API key here"
                className="bg-black/20 border-[#2f3e46]"
                type="password"
              />
            </div>
            <Button
              onClick={handleUpdateApiKey}
              disabled={isUpdatingKey || !newApiKey}
              className="w-full bg-[#a9927d] hover:bg-[#8f7a68] text-white"
            >
              {isUpdatingKey ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Update Key & Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="bg-[#1a252f] border-[#2f3e46] p-1 h-auto flex flex-wrap lg:inline-flex">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-[#2f3e46] text-gray-400 py-3 px-6"
          >
            Overview
          </TabsTrigger>
          <TabsTrigger
            value="sources"
            className="data-[state=active]:bg-[#2f3e46] text-gray-400 py-3 px-6"
          >
            Sources ({research.sources.length})
          </TabsTrigger>
          <TabsTrigger
            value="insights"
            className="data-[state=active]:bg-[#2f3e46] text-gray-400 py-3 px-6"
          >
            Insights ({research.insights.length})
          </TabsTrigger>
          <TabsTrigger
            value="actions"
            className="data-[state=active]:bg-[#2f3e46] text-gray-400 py-3 px-6"
          >
            Action Items ({research.actionItems.length})
          </TabsTrigger>
          {research.scope === "LEAD_GENERATION" && (
            <TabsTrigger
              value="leads"
              className="data-[state=active]:bg-[#2f3e46] text-gray-400 py-3 px-6"
            >
              Leads
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="overview">
          <ResearchOverview research={research} onRetry={handleRetry} />
        </TabsContent>
        <TabsContent value="sources">
          <ResearchSources
            sources={research.sources}
            onStartAnalysis={() => setShowRetryDialog(true)}
          />
        </TabsContent>
        <TabsContent value="insights">
          <ResearchInsights insights={research.insights} />
        </TabsContent>
        <TabsContent value="actions">
          <ResearchActionItems
            actionItems={research.actionItems}
            researchId={research.id}
          />
        </TabsContent>
        {research.scope === "LEAD_GENERATION" && (
          <TabsContent value="leads">
            <ResearchLeads leadData={research.leadData} researchId={id} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
