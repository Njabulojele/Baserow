"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ExternalLink,
  Globe,
  FileText,
  RefreshCcw,
  ArrowLeft,
  ShieldCheck,
  ShieldAlert,
  Shield,
} from "lucide-react";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface ResearchSourcesProps {
  sources: any[];
  onStartAnalysis?: () => void;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "unknown";
  }
}

function getCredibilityColor(score: number): {
  text: string;
  bg: string;
  border: string;
  icon: any;
} {
  if (score >= 0.8)
    return {
      text: "text-emerald-400",
      bg: "bg-emerald-500/10",
      border: "border-emerald-500/20",
      icon: ShieldCheck,
    };
  if (score >= 0.5)
    return {
      text: "text-amber-400",
      bg: "bg-amber-500/10",
      border: "border-amber-500/20",
      icon: Shield,
    };
  return {
    text: "text-rose-400",
    bg: "bg-rose-500/10",
    border: "border-rose-500/20",
    icon: ShieldAlert,
  };
}

export function ResearchSources({
  sources = [],
  onStartAnalysis,
}: ResearchSourcesProps) {
  const [selectedSource, setSelectedSource] = useState<any | null>(null);

  if (!sources || sources.length === 0) {
    return (
      <div className="py-16 text-center border border-border/50 border-dashed rounded-md">
        <Globe className="w-5 h-5 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-xs font-mono text-muted-foreground">
          NO SOURCES ANALYZED
        </p>
      </div>
    );
  }

  if (selectedSource) {
    return (
      <div className="space-y-6 animate-in fade-in duration-300 pb-20">
        <div className="flex items-center justify-between border-b border-border/50 pb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedSource(null)}
            className="h-8 px-2 text-muted-foreground hover:text-alabaster font-mono text-[10px]"
          >
            <ArrowLeft className="w-3 h-3 mr-2" /> BACK TO SOURCES
          </Button>
          {selectedSource.url && selectedSource.url.startsWith("http") && (
            <a
              href={selectedSource.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground hover:text-blu transition-colors"
            >
              <ExternalLink className="w-3 h-3" />
              ORIGINAL ARTICLE
            </a>
          )}
        </div>

        <div className="bg-[#0a0c10] border border-[#2f3e46] rounded-xl overflow-hidden mt-6">
          <div className="px-6 py-4 border-b border-[#2f3e46] flex flex-col sm:flex-row sm:items-center justify-between sticky top-0 bg-[#0a0c10]/95 backdrop-blur z-10 gap-2">
            <h2 className="text-sm font-mono uppercase tracking-widest text-[#a9927d] flex items-center gap-2">
              <Globe className="w-4 h-4" />
              {selectedSource.title || "Source Document"}
            </h2>
            <div className="flex items-center gap-2 max-w-[300px]">
              {selectedSource.credibility !== undefined && (
                <Badge
                  variant="outline"
                  className={`font-mono text-[9px] px-1.5 py-0 rounded ${getCredibilityColor(selectedSource.credibility).bg} ${getCredibilityColor(selectedSource.credibility).border} ${getCredibilityColor(selectedSource.credibility).text}`}
                >
                  {(selectedSource.credibility * 100).toFixed(0)}% TRUST
                </Badge>
              )}
              <span className="text-[10px] font-mono text-muted-foreground truncate">
                {selectedSource.url}
              </span>
            </div>
          </div>

          <div className="p-6 md:p-8 relative">
            <div className="prose prose-invert prose-p:leading-relaxed prose-pre:bg-[#1a252f] prose-pre:border prose-pre:border-[#2f3e46] prose-a:text-blu hover:prose-a:text-blu/80 prose-headings:font-bold prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-table:border-collapse prose-th:border prose-th:border-[#2f3e46] prose-th:bg-[#1a252f] prose-th:p-3 prose-td:border prose-td:border-[#2f3e46] prose-td:p-3 prose-ul:my-6 prose-li:my-2 prose-p:my-6 max-w-none text-gray-300">
              <MarkdownRenderer content={selectedSource.content} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-border/50">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          {sources.length} Sources Collected
        </span>
        {onStartAnalysis && (
          <Button
            onClick={onStartAnalysis}
            size="sm"
            className="h-7 bg-blu/10 hover:bg-blu/20 text-blu text-[10px] font-mono border border-blu/20 rounded px-3"
          >
            <RefreshCcw className="w-3 h-3 mr-1.5" /> RE-ANALYZE
          </Button>
        )}
      </div>
      <div className="space-y-1">
        {sources.map((source, index) => (
          <div
            key={index}
            className="group border border-border rounded-md bg-card/50 hover:border-charcoal transition-all duration-200 cursor-pointer"
            onClick={() => source.content && setSelectedSource(source)}
          >
            <div className="flex items-center gap-3 px-3 py-2.5">
              <img
                src={`https://www.google.com/s2/favicons?domain=${extractDomain(source.url)}&sz=16`}
                alt=""
                className="w-4 h-4 shrink-0 opacity-50"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
              <span className="text-[10px] font-mono font-bold text-muted-foreground shrink-0 uppercase tracking-wider min-w-[100px]">
                {extractDomain(source.url)}
              </span>
              <span className="text-xs text-muted-foreground/60 truncate flex-1 min-w-0">
                {source.title || "Untitled"}
              </span>

              {source.credibility !== undefined && (
                <div
                  className={`flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded border ${getCredibilityColor(source.credibility).bg} ${getCredibilityColor(source.credibility).border} ${getCredibilityColor(source.credibility).text}`}
                  title={`${(source.credibility * 100).toFixed(0)}% Credibility Score`}
                >
                  {(() => {
                    const Icon = getCredibilityColor(source.credibility).icon;
                    return <Icon className="w-3 h-3" />;
                  })()}
                  <span>{Math.round(source.credibility * 100)}</span>
                </div>
              )}

              {source.content && (
                <button
                  className="p-1 text-muted-foreground/40 hover:text-alabaster transition-colors opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedSource(source);
                  }}
                >
                  <FileText className="w-3 h-3" />
                </button>
              )}
              {source.url && source.url.startsWith("http") && (
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-muted-foreground/40 hover:text-blu transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
            {source.excerpt && (
              <div className="px-3 pb-2.5 -mt-0.5">
                <p className="text-[10px] text-muted-foreground/50 leading-relaxed line-clamp-2 pl-7">
                  {source.excerpt}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
