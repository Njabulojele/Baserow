"use client";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ResearchStatus } from "@prisma/client";
import {
  Search,
  Target,
  Lightbulb,
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

interface ResearchOverviewProps {
  research: any;
  onRetry: () => void;
}

export function ResearchOverview({ research, onRetry }: ResearchOverviewProps) {
  const isFailed = research.status === "FAILED";
  const isInProgress = research.status === "IN_PROGRESS";
  const isCompleted = research.status === "COMPLETED";

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Status Card */}
        <Card className="lg:col-span-2 bg-[#1a252f] border-[#2f3e46] p-6">
          <h3 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
            <Search className="w-5 h-5 text-[#a9927d]" /> Research Mission
            Progress
          </h3>

          <div className="space-y-8">
            <div className="relative">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-gray-400">Total Completion</span>
                <span className="text-[#6b9080] font-bold">
                  {research.progress}%
                </span>
              </div>
              <Progress value={research.progress} className="h-3 bg-black/40" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 ${
                    research.progress >= 30
                      ? "bg-[#6b9080]/20 border-[#6b9080]/30"
                      : research.progress > 0 &&
                          research.progress < 30 &&
                          !isFailed
                        ? "bg-[#a9927d]/10 border-[#a9927d]/30"
                        : "bg-black/20 border-transparent opacity-50"
                  }`}
                >
                  <div
                    className={`mt-1 p-1.5 rounded-full border ${
                      research.progress >= 30
                        ? "bg-[#6b9080] border-[#6b9080] text-white"
                        : research.progress > 0 &&
                            research.progress < 30 &&
                            !isFailed
                          ? "bg-[#a9927d] border-[#a9927d] text-white animate-pulse"
                          : "bg-transparent border-gray-600 text-gray-500"
                    }`}
                  >
                    {research.progress >= 30 ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : research.progress > 0 &&
                      research.progress < 30 &&
                      !isFailed ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          research.progress > 0 &&
                          research.progress < 30 &&
                          !isFailed
                            ? "text-[#a9927d]"
                            : "text-white"
                        }`}
                      >
                        Surface Discovery
                      </p>
                      {research.progress > 0 &&
                        research.progress < 30 &&
                        !isFailed && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 h-4 border-[#a9927d] text-[#a9927d]"
                          >
                            IN PROGRESS
                          </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Identifying key sources and trends
                    </p>
                  </div>
                </div>

                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 ${
                    research.progress >= 70
                      ? "bg-[#6b9080]/20 border-[#6b9080]/30"
                      : research.progress >= 30 &&
                          research.progress < 70 &&
                          !isFailed
                        ? "bg-[#a9927d]/10 border-[#a9927d]/30"
                        : "bg-black/20 border-transparent opacity-50"
                  }`}
                >
                  <div
                    className={`mt-1 p-1.5 rounded-full border ${
                      research.progress >= 70
                        ? "bg-[#6b9080] border-[#6b9080] text-white"
                        : research.progress >= 30 &&
                            research.progress < 70 &&
                            !isFailed
                          ? "bg-[#a9927d] border-[#a9927d] text-white animate-pulse"
                          : "bg-transparent border-gray-600 text-gray-500"
                    }`}
                  >
                    {research.progress >= 70 ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : research.progress >= 30 &&
                      research.progress < 70 &&
                      !isFailed ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          research.progress >= 30 &&
                          research.progress < 70 &&
                          !isFailed
                            ? "text-[#a9927d]"
                            : "text-white"
                        }`}
                      >
                        Deep Analysis
                      </p>
                      {research.progress >= 30 &&
                        research.progress < 70 &&
                        !isFailed && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 h-4 border-[#a9927d] text-[#a9927d]"
                          >
                            IN PROGRESS
                          </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      AI synthesis and insight extraction
                    </p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-all duration-300 ${
                    research.progress >= 100
                      ? "bg-[#6b9080]/20 border-[#6b9080]/30"
                      : research.progress >= 70 &&
                          research.progress < 100 &&
                          !isFailed
                        ? "bg-[#a9927d]/10 border-[#a9927d]/30"
                        : "bg-black/20 border-transparent opacity-50"
                  }`}
                >
                  <div
                    className={`mt-1 p-1.5 rounded-full border ${
                      research.progress >= 100
                        ? "bg-[#6b9080] border-[#6b9080] text-white"
                        : research.progress >= 70 &&
                            research.progress < 100 &&
                            !isFailed
                          ? "bg-[#a9927d] border-[#a9927d] text-white animate-pulse"
                          : "bg-transparent border-gray-600 text-gray-500"
                    }`}
                  >
                    {research.progress >= 100 ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : research.progress >= 70 &&
                      research.progress < 100 &&
                      !isFailed ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p
                        className={`text-sm font-medium ${
                          research.progress >= 70 &&
                          research.progress < 100 &&
                          !isFailed
                            ? "text-[#a9927d]"
                            : "text-white"
                        }`}
                      >
                        Strategy Formulation
                      </p>
                      {research.progress >= 70 &&
                        research.progress < 100 &&
                        !isFailed && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1.5 h-4 border-[#a9927d] text-[#a9927d]"
                          >
                            IN PROGRESS
                          </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Generating actionable items and leads
                    </p>
                  </div>
                </div>

                {isFailed && (
                  <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                    <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-500">
                        Mission Obstructed
                      </p>
                      <p className="text-xs text-red-400/80">
                        {research.errorMessage ||
                          "An unknown error occurred during analysis."}
                      </p>
                      <Button
                        variant="link"
                        size="sm"
                        onClick={onRetry}
                        className="h-auto p-0 text-red-500 font-bold mt-1"
                      >
                        Retry Mission
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Executive Summary */}
        {research.rawData?.summary && (
          <Card className="lg:col-span-2 bg-[#1a252f] border-[#2f3e46] p-6 animate-in fade-in duration-700 delay-200">
            <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#6b9080]" /> Executive Summary
            </h3>
            <div className="prose prose-invert prose-sm max-w-none text-gray-300 leading-relaxed overflow-x-auto">
              <ReactMarkdown>{research.rawData.summary}</ReactMarkdown>
            </div>
          </Card>
        )}

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card className="bg-[#1a252f] border-[#2f3e46] p-6">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
              Metadata
            </h4>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Target className="w-4 h-4 text-[#a9927d]" /> Scope
                </div>
                <Badge
                  variant="outline"
                  className="border-[#6b9080] text-[#6b9080]"
                >
                  {research.scope.replace(/_/g, " ")}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Clock className="w-4 h-4 text-[#a9927d]" /> Started
                </div>
                <span className="text-xs text-gray-400">
                  {formatDistanceToNow(new Date(research.createdAt))} ago
                </span>
              </div>
              {research.completedAt && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm text-gray-300">
                    <CheckCircle2 className="w-4 h-4 text-[#6b9080]" />{" "}
                    Completed
                  </div>
                  <span className="text-xs text-gray-400">
                    {formatDistanceToNow(new Date(research.completedAt))} ago
                  </span>
                </div>
              )}
            </div>
          </Card>

          <Card className="bg-[#1a252f] border-[#2f3e46] p-6">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
              Quick Stats
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-black/20 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Insights</p>
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <span className="text-xl font-bold font-mono">
                    {research.insights.length}
                  </span>
                </div>
              </div>
              <div className="p-3 bg-black/20 rounded-xl">
                <p className="text-xs text-muted-foreground mb-1">Sources</p>
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-400" />
                  <span className="text-xl font-bold font-mono">
                    {research.sources.length}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Key Trends */}
          {research.rawData?.trends && research.rawData.trends.length > 0 && (
            <Card className="bg-[#1a252f] border-[#2f3e46] p-6">
              <h4 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">
                Key Trends
              </h4>
              <ul className="space-y-3">
                {research.rawData.trends.map((trend: string, i: number) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-300"
                  >
                    <span className="text-[#a9927d] font-bold mt-0.5">•</span>
                    {trend}
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>

      {/* Raw Mission Text */}
      <Card className="bg-black/20 border-dashed border-[#2f3e46] p-6">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-[#a9927d] uppercase tracking-widest">
            Original Objective
          </h4>
          <Dialog>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-muted-foreground hover:text-white"
              >
                <Maximize2 className="w-3 h-3 mr-1" /> Expand
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-[#1a252f] border-[#2f3e46] text-white">
              <DialogHeader>
                <DialogTitle>Research Objective</DialogTitle>
              </DialogHeader>
              <div className="mt-4 max-h-[60vh] overflow-y-auto prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{research.originalPrompt}</ReactMarkdown>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        <div className="text-gray-400 text-sm leading-relaxed italic line-clamp-3">
          <ReactMarkdown>{research.originalPrompt}</ReactMarkdown>
        </div>
      </Card>
    </div>
  );
}
