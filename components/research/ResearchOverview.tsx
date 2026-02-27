"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { ResearchStatus } from "@prisma/client";
import {
  Search,
  Target,
  CheckCircle2,
  AlertCircle,
  FileText,
  Clock,
  Maximize2,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

interface ResearchOverviewProps {
  research: any;
  onRetry: () => void;
}

function StepIndicator({
  label,
  description,
  isComplete,
  isActive,
  isFailed,
}: {
  label: string;
  description: string;
  isComplete: boolean;
  isActive: boolean;
  isFailed: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 p-3 rounded-md border transition-all duration-200",
        isComplete && "border-emerald-500/20 bg-emerald-500/5",
        isActive && !isFailed && "border-blu/20 bg-blu/5",
        !isComplete && !isActive && "border-border bg-card/30 opacity-40",
        isFailed && isActive && "border-red-500/20 bg-red-500/5",
      )}
    >
      <div className="mt-0.5">
        {isComplete ? (
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
        ) : isActive && !isFailed ? (
          <Loader2 className="w-3.5 h-3.5 text-blu animate-spin" />
        ) : (
          <div className="w-3.5 h-3.5 rounded-full border border-border" />
        )}
      </div>
      <div>
        <p
          className={cn(
            "text-xs font-mono font-medium",
            isComplete && "text-emerald-400",
            isActive && !isFailed && "text-blu",
            !isComplete && !isActive && "text-muted-foreground/40",
          )}
        >
          {label}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {description}
        </p>
      </div>
    </div>
  );
}

export function ResearchOverview({ research, onRetry }: ResearchOverviewProps) {
  const isFailed = research.status === "FAILED";

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progress + Steps */}
        <div className="lg:col-span-2 border border-border rounded-md p-5 bg-card/50">
          <div className="flex items-center gap-2 mb-5">
            <Search className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
              Research Progress
            </h3>
          </div>
          <div className="mb-6">
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-muted-foreground">Completion</span>
              <span className="text-blu tabular-nums">
                {research.progress}%
              </span>
            </div>
            <Progress
              value={research.progress}
              className="h-[2px] bg-border [&>div]:bg-blu/70 [&>div]:transition-all [&>div]:duration-700"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <StepIndicator
              label="SURFACE DISCOVERY"
              description="Identifying sources and trends"
              isComplete={research.progress >= 30}
              isActive={research.progress > 0 && research.progress < 30}
              isFailed={isFailed}
            />
            <StepIndicator
              label="DEEP ANALYSIS"
              description="AI synthesis and extraction"
              isComplete={research.progress >= 70}
              isActive={research.progress >= 30 && research.progress < 70}
              isFailed={isFailed}
            />
            <StepIndicator
              label="STRATEGY FORMULATION"
              description="Generating actions and leads"
              isComplete={research.progress >= 100}
              isActive={research.progress >= 70 && research.progress < 100}
              isFailed={isFailed}
            />
            {isFailed && (
              <div className="flex items-start gap-3 p-3 rounded-md border border-red-500/20 bg-red-500/5">
                <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5" />
                <div>
                  <p className="text-xs font-mono text-red-400">ERROR</p>
                  <p className="text-[10px] text-red-400/70 mt-0.5">
                    {research.errorMessage || "Unknown error"}
                  </p>
                  <button
                    onClick={onRetry}
                    className="text-[10px] font-mono text-red-400 underline underline-offset-2 mt-1 hover:text-red-300"
                  >
                    RETRY →
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="border border-border rounded-md p-4 bg-card/50">
            <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Metadata
            </h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <Target className="w-3 h-3" /> Scope
                </span>
                <Badge
                  variant="outline"
                  className="text-[9px] h-4 px-1.5 font-mono border-border text-muted-foreground bg-transparent"
                >
                  {research.scope.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                  <Clock className="w-3 h-3" /> Started
                </span>
                <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                  {formatDistanceToNow(new Date(research.createdAt))} ago
                </span>
              </div>
              {research.completedAt && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1.5">
                    <CheckCircle2 className="w-3 h-3" /> Done
                  </span>
                  <span className="text-[10px] font-mono text-muted-foreground tabular-nums">
                    {formatDistanceToNow(new Date(research.completedAt))} ago
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="border border-border rounded-md p-4 bg-card/50">
            <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4">
              Stats
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-[10px] font-mono text-muted-foreground/60 mb-1">
                  Insights
                </p>
                <p className="text-xl font-mono font-light text-alabaster tabular-nums">
                  {research.insights.length}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-mono text-muted-foreground/60 mb-1">
                  Sources
                </p>
                <p className="text-xl font-mono font-light text-alabaster tabular-nums">
                  {research.sources.length}
                </p>
              </div>
            </div>
          </div>
          {research.rawData?.trends && research.rawData.trends.length > 0 && (
            <div className="border border-border rounded-md p-4 bg-card/50">
              <h4 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
                Key Trends
              </h4>
              <ul className="space-y-2">
                {research.rawData.trends.map((trend: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-[11px] text-muted-foreground leading-relaxed"
                  >
                    <span className="text-blu/60 mt-0.5 shrink-0">▸</span>
                    {trend}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {research.rawData?.summary && (
        <div className="border border-border rounded-md p-5 bg-card/50">
          <h3 className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-2">
            <FileText className="w-3 h-3" /> Executive Summary
          </h3>
          <div className="prose prose-invert prose-sm max-w-none prose-headings:font-mono prose-headings:text-alabaster prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-blu prose-strong:text-alabaster">
            <ReactMarkdown>{research.rawData.summary}</ReactMarkdown>
          </div>
        </div>
      )}

      <div className="border border-border/50 border-dashed rounded-md p-4 bg-card/30">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-[10px] font-mono text-muted-foreground/60 uppercase tracking-widest">
            Original Objective
          </h4>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-5 text-[10px] font-mono text-muted-foreground hover:text-alabaster px-1.5"
              >
                <Maximize2 className="w-2.5 h-2.5 mr-1" /> EXPAND
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-card border-border text-foreground">
              <DialogHeader>
                <DialogTitle className="font-mono text-sm">
                  RESEARCH OBJECTIVE
                </DialogTitle>
              </DialogHeader>
              <div className="mt-4 max-h-[60vh] overflow-y-auto prose prose-invert prose-sm max-w-none prose-p:text-muted-foreground">
                <ReactMarkdown>{research.originalPrompt}</ReactMarkdown>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <p className="text-[11px] text-muted-foreground leading-relaxed line-clamp-3 font-mono">
          {research.originalPrompt}
        </p>
      </div>
    </div>
  );
}
