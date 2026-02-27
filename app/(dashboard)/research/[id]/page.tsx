"use client";

import { use, useState, useEffect, useRef, useReducer } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ArrowLeft,
  Download,
  RefreshCcw,
  Loader2,
  Play,
  Key,
  XCircle,
  Star,
  AlertCircle,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { PDFGenerator } from "@/lib/pdf-generator";
import Link from "next/link";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RetryAnalysisDialog } from "@/components/research/RetryAnalysisDialog";
import { ResearchOverview } from "@/components/research/ResearchOverview";
import { ResearchSources } from "@/components/research/ResearchSources";
import { ResearchInsights } from "@/components/research/ResearchInsights";
import { ResearchActionItems } from "@/components/research/ResearchActionItems";
import { ResearchLeads } from "@/components/research/ResearchLeads";
import {
  SourceCard,
  SourceCardSkeleton,
  type SourceCardData,
} from "@/components/research/SourceCard";
import { StatusBar } from "@/components/research/StatusBar";
import io, { Socket } from "socket.io-client";
import { cn } from "@/lib/utils";

/* ─── Source feed reducer ─── */
type FeedAction =
  | { type: "ADD_SOURCE"; source: SourceCardData }
  | { type: "SET_STATUS"; status: string }
  | { type: "ADD_LOG"; message: string }
  | { type: "RESET" };

interface FeedState {
  sources: SourceCardData[];
  statusMessage: string;
  logs: string[];
}

const initialFeedState: FeedState = {
  sources: [],
  statusMessage: "",
  logs: [],
};

function feedReducer(state: FeedState, action: FeedAction): FeedState {
  switch (action.type) {
    case "ADD_SOURCE":
      if (state.sources.some((s) => s.url === action.source.url)) return state;
      return { ...state, sources: [...state.sources, action.source] };
    case "SET_STATUS":
      return { ...state, statusMessage: action.status };
    case "ADD_LOG":
      return { ...state, logs: [...state.logs, action.message] };
    case "RESET":
      return initialFeedState;
    default:
      return state;
  }
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return url.substring(0, 30);
  }
}

function mapProgressToStatus(
  progress: number,
):
  | "idle"
  | "initializing"
  | "searching"
  | "scraping"
  | "synthesizing"
  | "complete"
  | "failed" {
  if (progress <= 0) return "idle";
  if (progress < 15) return "initializing";
  if (progress < 40) return "searching";
  if (progress < 65) return "scraping";
  if (progress < 90) return "synthesizing";
  return "complete";
}

/* ─── Main Page ─── */
export default function ResearchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState("feed");
  const [isExporting, setIsExporting] = useState(false);
  const [newApiKey, setNewApiKey] = useState("");
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);
  const [showKeyDialog, setShowKeyDialog] = useState(false);
  const [showRetryDialog, setShowRetryDialog] = useState(false);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [feed, dispatch] = useReducer(feedReducer, initialFeedState);
  const socketRef = useRef<Socket | null>(null);
  const feedScrollRef = useRef<HTMLDivElement>(null);

  const {
    data: research,
    isLoading,
    refetch,
  } = trpc.research.getById.useQuery(
    { id },
    {
      refetchInterval: (query) =>
        query.state.data?.status === "IN_PROGRESS" ? 2000 : false,
    },
  );

  const startMutation = trpc.research.startResearch.useMutation();
  const cancelMutation = trpc.research.cancelResearch.useMutation();
  const updateSettingsMutation = trpc.settings.updateSettings.useMutation();
  const utils = trpc.useUtils();

  const toggleFavorite = trpc.research.toggleFavorite.useMutation({
    onMutate: async ({ id: researchId }) => {
      await utils.research.getById.cancel({ id: researchId });
      const prev = utils.research.getById.getData({ id: researchId });
      utils.research.getById.setData({ id: researchId }, (old) =>
        old ? { ...old, isFavorited: !old.isFavorited } : old,
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      utils.research.getById.setData({ id }, ctx?.prev);
    },
    onSettled: () => {
      utils.research.getById.invalidate({ id });
      utils.research.list.invalidate();
    },
  });

  // Populate live sources from DB when polling brings new data
  useEffect(() => {
    if (!research || !research.sources) return;
    research.sources.forEach((s: any) => {
      dispatch({
        type: "ADD_SOURCE",
        source: {
          url: s.url,
          title: s.title || extractDomain(s.url),
          domain: extractDomain(s.url),
          status: "scraped",
          snippet: s.excerpt,
        },
      });
    });
  }, [research?.sources]);

  // Socket for live source feed
  useEffect(() => {
    if (!research || research.status !== "IN_PROGRESS") return;
    if (!startedAt) setStartedAt(Date.now());

    const ENGINE_URL =
      process.env.NEXT_PUBLIC_RESEARCH_ENGINE_URL || "http://localhost:3010";
    const socket = io(ENGINE_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("join-research", id);
    });

    socket.on(
      "research-log",
      (data: { message: string; timestamp: string }) => {
        dispatch({ type: "ADD_LOG", message: data.message });

        // Parse source links (format: 📎 Title — URL)
        const sourceMatch = data.message.match(
          /📎\s*(.+?)\s*—\s*(https?:\/\/.+)/,
        );
        if (sourceMatch) {
          const [, title, url] = sourceMatch;
          dispatch({
            type: "ADD_SOURCE",
            source: {
              url,
              title: title.trim(),
              domain: extractDomain(url),
              status: "scraped",
            },
          });
        } else if (data.message.includes("http")) {
          const urlMatch = data.message.match(/(https?:\/\/[^\s]+)/);
          if (urlMatch) {
            dispatch({
              type: "ADD_SOURCE",
              source: {
                url: urlMatch[1],
                title: extractDomain(urlMatch[1]),
                domain: extractDomain(urlMatch[1]),
                status: "scraped",
              },
            });
          }
        }

        dispatch({ type: "SET_STATUS", status: data.message });
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [research?.status, id]);

  useEffect(() => {
    if (feedScrollRef.current)
      feedScrollRef.current.scrollTop = feedScrollRef.current.scrollHeight;
  }, [feed.sources]);

  const handleRetry = async () => {
    try {
      await startMutation.mutateAsync({ researchId: id });
      toast.success("Research restarted");
      dispatch({ type: "RESET" });
      setStartedAt(Date.now());
      refetch();
    } catch {
      toast.error("Failed to restart");
    }
  };

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
      toast.success("Analysis restarted");
      refetch();
    } catch {
      toast.error("Failed to restart analysis");
    }
  };

  const handleUpdateApiKey = async () => {
    if (!newApiKey) return;
    try {
      setIsUpdatingKey(true);
      await updateSettingsMutation.mutateAsync({ geminiApiKey: newApiKey });
      toast.success("API Key updated");
      setShowKeyDialog(false);
      setNewApiKey("");
      utils.research.getById.invalidate({ id });
    } catch {
      toast.error("Failed to update API key");
    } finally {
      setIsUpdatingKey(false);
    }
  };

  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      const blob = await PDFGenerator.generateResearchReport(research);
      const url = window.URL.createObjectURL(
        new Blob([blob as unknown as BlobPart], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `${research.title.replace(/\s+/g, "_")}_Report.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      toast.success("Report exported");
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const isQuotaError =
    research?.errorMessage?.includes("429") ||
    research?.errorMessage?.includes("quota") ||
    research?.errorMessage?.includes("Quota");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[70vh]">
        <Loader2 className="w-5 h-5 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (!research) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <AlertCircle className="w-5 h-5 text-muted-foreground/40" />
        <p className="text-xs font-mono text-muted-foreground">
          RESEARCH NOT FOUND
        </p>
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="text-muted-foreground text-xs font-mono"
        >
          <Link href="/research">← BACK</Link>
        </Button>
      </div>
    );
  }

  const isActive = research.status === "IN_PROGRESS";
  const researchStatus =
    research.status === "FAILED"
      ? ("failed" as const)
      : research.status === "COMPLETED"
        ? ("complete" as const)
        : isActive
          ? mapProgressToStatus(research.progress)
          : ("idle" as const);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* ─── Top Bar ─── */}
      <div className="border-b border-border bg-background px-4 md:px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <Link
            href="/research"
            className="text-muted-foreground/40 hover:text-alabaster transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="min-w-0">
            <h1 className="text-sm font-mono font-bold text-alabaster truncate">
              {research.title}
            </h1>
            <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest">
              {research.scope.replace(/_/g, " ")} ·{" "}
              {research.searchMethod === "GEMINI_DEEP_RESEARCH"
                ? "DEEP RESEARCH"
                : "GOOGLE SEARCH"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-7 w-7 rounded",
              research.isFavorited
                ? "text-amber-400"
                : "text-muted-foreground/40 hover:text-amber-400",
            )}
            onClick={() => toggleFavorite.mutate({ id: research.id })}
          >
            <Star
              className={cn(
                "w-3.5 h-3.5",
                research.isFavorited && "fill-amber-400",
              )}
            />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 rounded text-muted-foreground/40 hover:text-alabaster"
            onClick={() => refetch()}
          >
            <RefreshCcw className="w-3.5 h-3.5" />
          </Button>
          {isActive && (
            <Button
              onClick={async () => {
                await cancelMutation.mutateAsync({ researchId: id });
                toast.success("Cancelled");
                refetch();
              }}
              disabled={cancelMutation.isPending}
              size="sm"
              className="h-7 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-mono border border-red-500/20 rounded px-3"
            >
              <XCircle className="w-3 h-3 mr-1" /> ABORT
            </Button>
          )}
          {research.status === "PENDING" && (
            <Button
              onClick={handleRetry}
              size="sm"
              className="h-7 bg-blu/10 hover:bg-blu/20 text-blu text-[10px] font-mono border border-blu/20 rounded px-3"
            >
              <Play className="w-3 h-3 mr-1" /> START
            </Button>
          )}
          {research.status === "FAILED" && (
            <>
              {isQuotaError && (
                <Button
                  onClick={() => setShowKeyDialog(true)}
                  size="sm"
                  className="h-7 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-[10px] font-mono border border-amber-500/20 rounded px-3"
                >
                  <Key className="w-3 h-3 mr-1" /> KEY
                </Button>
              )}
              <Button
                onClick={() => setShowRetryDialog(true)}
                size="sm"
                className="h-7 bg-charcoal hover:bg-charcoal/80 text-muted-foreground text-[10px] font-mono border border-border rounded px-3"
              >
                <RefreshCcw className="w-3 h-3 mr-1" /> RETRY
              </Button>
              <Button
                onClick={handleRetry}
                size="sm"
                className="h-7 bg-blu/10 hover:bg-blu/20 text-blu text-[10px] font-mono border border-blu/20 rounded px-3"
              >
                <Play className="w-3 h-3 mr-1" /> RESTART
              </Button>
            </>
          )}
          {research.status === "COMPLETED" && (
            <Button
              onClick={handleExportPDF}
              disabled={isExporting}
              size="sm"
              className="h-7 bg-charcoal hover:bg-charcoal/80 text-muted-foreground text-[10px] font-mono border border-border rounded px-3"
            >
              {isExporting ? (
                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
              ) : (
                <Download className="w-3 h-3 mr-1" />
              )}{" "}
              EXPORT
            </Button>
          )}
        </div>
      </div>

      {/* ─── Status Bar ─── */}
      {(isActive || research.status === "FAILED") && (
        <StatusBar
          status={researchStatus}
          progress={research.progress}
          stepDescription={feed.statusMessage || undefined}
          startedAt={startedAt || undefined}
        />
      )}

      {/* ─── Error Banner ─── */}
      {research.status === "FAILED" && research.errorMessage && (
        <div className="border-b border-red-500/10 bg-red-500/5 px-4 py-2">
          <p className="text-[11px] font-mono text-red-400/80">
            <AlertCircle className="w-3 h-3 inline mr-1.5 align-text-bottom" />
            {research.errorMessage}
          </p>
        </div>
      )}

      {/* ─── Main Content ─── */}
      <div className="flex-1 overflow-hidden">
        {isActive ? (
          <div className="h-full flex flex-col lg:flex-row">
            {/* Sources Feed */}
            <div className="flex-1 flex flex-col border-r border-border/40">
              <div className="px-4 py-2.5 border-b border-border/40 flex items-center justify-between shrink-0">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Sources · {feed.sources.length}
                </span>
                {feed.sources.length > 0 && (
                  <span className="text-[10px] font-mono text-blu animate-pulse">
                    LIVE
                  </span>
                )}
              </div>
              <div
                ref={feedScrollRef}
                className="flex-1 overflow-y-auto p-3 space-y-1.5 custom-scrollbar"
              >
                {feed.sources.length === 0 ? (
                  <div className="space-y-1.5">
                    {[...Array(4)].map((_, i) => (
                      <SourceCardSkeleton key={i} />
                    ))}
                  </div>
                ) : (
                  feed.sources.map((source, i) => (
                    <SourceCard key={source.url + i} source={source} />
                  ))
                )}
              </div>
            </div>

            {/* Activity Log */}
            <div className="w-full lg:w-[340px] flex flex-col shrink-0 bg-background">
              <div className="px-4 py-2.5 border-b border-border/40 shrink-0">
                <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
                  Activity
                </span>
              </div>
              <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
                <div className="space-y-0.5 font-mono text-[10px]">
                  {feed.logs.slice(-40).map((log, i) => (
                    <p
                      key={i}
                      className={cn(
                        "text-muted-foreground/40 leading-relaxed break-words",
                        log.includes("Error") && "text-red-400/60",
                        log.includes("Found") && "text-emerald-400/50",
                        log.includes("Starting") && "text-blu/50",
                        log.includes("📎") && "text-muted-foreground/60",
                      )}
                    >
                      {log}
                    </p>
                  ))}
                  <p className="text-blu/40 animate-pulse mt-1">▌</p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-8">
            {research.refinedPrompt && (
              <div className="mb-8 border-l-2 border-border pl-4">
                <p className="text-[10px] font-mono text-muted-foreground/40 uppercase tracking-widest mb-1.5">
                  Objective
                </p>
                <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                  {research.refinedPrompt}
                </p>
              </div>
            )}

            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="space-y-6"
            >
              <TabsList className="bg-transparent border-b border-border p-0 h-auto rounded-none w-full justify-start">
                {[
                  { value: "feed", label: "OVERVIEW" },
                  {
                    value: "sources",
                    label: "SOURCES",
                    count: research.sources.length,
                  },
                  {
                    value: "insights",
                    label: "INSIGHTS",
                    count: research.insights.length,
                  },
                  {
                    value: "actions",
                    label: "ACTIONS",
                    count: research.actionItems.length,
                  },
                  ...(research.scope === "LEAD_GENERATION"
                    ? [{ value: "leads", label: "LEADS" }]
                    : []),
                ].map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="relative px-4 pb-2.5 pt-1 text-[10px] font-mono tracking-widest text-muted-foreground data-[state=active]:text-blu data-[state=active]:bg-transparent rounded-none border-b-2 border-transparent data-[state=active]:border-blu/50 transition-all uppercase"
                  >
                    {tab.label}
                    {"count" in tab &&
                      tab.count !== undefined &&
                      tab.count > 0 && (
                        <span className="ml-1.5 text-muted-foreground/30">
                          {tab.count}
                        </span>
                      )}
                  </TabsTrigger>
                ))}
              </TabsList>

              <TabsContent value="feed">
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
                  <ResearchLeads researchId={id} />
                </TabsContent>
              )}
            </Tabs>
          </div>
        )}
      </div>

      {/* ─── Dialogs ─── */}
      <RetryAnalysisDialog
        open={showRetryDialog}
        onOpenChange={setShowRetryDialog}
        onConfirm={handleRetryAnalysis}
      />
      <Dialog open={showKeyDialog} onOpenChange={setShowKeyDialog}>
        <DialogContent className="bg-card border-border text-foreground">
          <DialogHeader>
            <DialogTitle className="font-mono text-sm">
              UPDATE API KEY
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <Input
              value={newApiKey}
              onChange={(e) => setNewApiKey(e.target.value)}
              placeholder="Paste your Gemini API key"
              className="bg-background border-border font-mono text-xs h-10"
              type="password"
            />
            <Button
              onClick={handleUpdateApiKey}
              disabled={isUpdatingKey || !newApiKey}
              className="w-full bg-charcoal hover:bg-charcoal/80 text-alabaster border border-border font-mono text-xs h-10"
            >
              {isUpdatingKey && (
                <Loader2 className="w-3 h-3 animate-spin mr-2" />
              )}{" "}
              UPDATE & CONTINUE
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
