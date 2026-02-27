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
  Globe,
  Activity,
  RefreshCcw,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { EmptyState } from "@/components/ui/empty-state";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

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
  const isGrounding = research.searchMethod === "GEMINI_GROUNDING";
  const fullReportSource = research.sources?.find(
    (s: any) =>
      s.url === "google-search-grounding" || s.title.includes("Final Report"),
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Scope Info */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1a252f] border border-[#2f3e46] p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-[#a9927d] rounded-lg">
            <Target className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-[#a9927d] uppercase tracking-widest font-mono mb-1">
              Scope
            </p>
            <p className="text-sm font-medium font-mono uppercase text-white">
              {research.scope.replace(/_/g, " ")}
            </p>
          </div>
        </div>
        <div className="bg-[#1a252f] border border-[#2f3e46] p-4 rounded-xl flex items-center gap-3">
          <div className="p-2 bg-primary/10 text-[#a9927d] rounded-lg">
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <p className="text-[10px] text-[#a9927d] uppercase tracking-widest font-mono mb-1">
              Method
            </p>
            <p className="text-sm font-medium font-mono uppercase text-white">
              {research.searchMethod === "GEMINI_DEEP_RESEARCH"
                ? "Deep Research"
                : "Google Search"}
            </p>
          </div>
        </div>
        <div className="bg-[#1a252f] border border-[#2f3e46] p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#a9927d] uppercase tracking-widest font-mono mb-1">
                Status
              </p>
              <p className="text-sm font-medium font-mono uppercase text-white">
                {research.status}
              </p>
            </div>
          </div>
          {isFailed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="h-8 text-[10px] font-mono text-muted-foreground hover:text-white"
            >
              <RefreshCcw className="w-3 h-3 mr-1" /> Retry
            </Button>
          )}
        </div>
        <div className="bg-[#1a252f] border border-[#2f3e46] p-4 rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 text-[#a9927d] rounded-lg">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <p className="text-[10px] text-[#a9927d] uppercase tracking-widest font-mono mb-1">
                Timeline
              </p>
              <p className="text-[10px] font-mono text-muted-foreground uppercase">
                Started{" "}
                {formatDistanceToNow(new Date(research.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      {research.status === "COMPLETED" && (
        <div className="bg-[#0a0c10] border border-[#2f3e46] rounded-xl overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-[#2f3e46] flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-[#0a0c10]/95 backdrop-blur z-10 gap-2">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#a9927d] flex items-center gap-2">
              <FileText className="w-4 h-4" />
              {isGrounding
                ? "Grounded Research Report"
                : "Deep Research Analysis"}
            </h2>
          </div>

          <div className="p-6 md:p-8 relative">
            {(isGrounding && fullReportSource) ||
            (!isGrounding && fullReportSource) ? (
              <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#1a252f] prose-pre:border prose-pre:border-[#2f3e46] prose-a:text-blu hover:prose-a:text-blu/80 prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-table:border-collapse prose-th:border prose-th:border-[#2f3e46] prose-th:bg-[#1a252f] prose-th:p-3 prose-td:border prose-td:border-[#2f3e46] prose-td:p-3 prose-ul:my-6 prose-li:my-2 prose-p:my-6 max-w-none text-gray-300">
                <MarkdownRenderer content={fullReportSource.content} />
              </div>
            ) : research.rawData?.summary ? (
              <div className="prose prose-invert prose-p:leading-relaxed max-w-none text-gray-300">
                <MarkdownRenderer content={research.rawData.summary} />
              </div>
            ) : (
              <div className="py-12 flex flex-col items-center justify-center text-center">
                <EmptyState
                  title="No Report Available"
                  description="This research task did not generate a unified text report."
                  icon={Search}
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
