"use client";

import { Badge } from "@/components/ui/badge";
import { ExternalLink, ChevronDown } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export interface SourceCardData {
  url: string;
  title: string;
  domain: string;
  snippet?: string;
  credibility?: number;
  sourceType?: string;
  status: "queued" | "fetching" | "scraped" | "failed";
  scrapedAt?: string;
  wordCount?: number;
}

function getCredibilityColor(score: number) {
  if (score >= 80)
    return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
  if (score >= 50) return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  return "bg-red-500/10 text-red-400 border-red-500/20";
}

function getStatusDot(status: SourceCardData["status"]) {
  switch (status) {
    case "queued":
      return "bg-muted-foreground";
    case "fetching":
      return "bg-blu animate-pulse";
    case "scraped":
      return "bg-emerald-400";
    case "failed":
      return "bg-red-400";
  }
}

export function SourceCard({ source }: { source: SourceCardData }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="group border border-border rounded-md bg-card/50 hover:border-charcoal transition-all duration-200 animate-in slide-in-from-bottom-2 fade-in duration-300">
      <div className="flex items-center gap-3 px-3 py-2.5">
        <span
          className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            getStatusDot(source.status),
          )}
        />
        <img
          src={`https://www.google.com/s2/favicons?domain=${source.domain}&sz=16`}
          alt=""
          className="w-4 h-4 shrink-0 opacity-50"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />
        <span className="text-[11px] font-mono font-bold text-muted-foreground shrink-0 uppercase tracking-wider">
          {source.domain}
        </span>
        <span className="text-xs text-muted-foreground/60 truncate flex-1 min-w-0">
          {source.title}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {source.sourceType && (
            <Badge
              variant="outline"
              className="text-[9px] h-4 px-1.5 font-mono border-border text-muted-foreground bg-transparent"
            >
              {source.sourceType}
            </Badge>
          )}
          {source.credibility !== undefined && (
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] h-4 px-1.5 font-mono border",
                getCredibilityColor(source.credibility),
              )}
            >
              {source.credibility}
            </Badge>
          )}
          {source.status === "failed" && (
            <Badge
              variant="destructive"
              className="text-[9px] h-4 px-1.5 font-mono"
            >
              FAIL
            </Badge>
          )}
        </div>
        {source.snippet && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-0.5 text-muted-foreground hover:text-alabaster transition-colors"
          >
            <ChevronDown
              className={cn(
                "w-3 h-3 transition-transform duration-200",
                expanded && "rotate-180",
              )}
            />
          </button>
        )}
        <a
          href={source.url}
          target="_blank"
          rel="noopener noreferrer"
          className="p-0.5 text-muted-foreground hover:text-blu transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>
      {expanded && source.snippet && (
        <div className="px-3 pb-3 pt-0 border-t border-border/50">
          <p className="text-[11px] text-muted-foreground leading-relaxed font-mono mt-2">
            {source.snippet}
          </p>
        </div>
      )}
    </div>
  );
}

export function SourceCardSkeleton() {
  return (
    <div className="border border-border/40 rounded-md bg-card/30 px-3 py-2.5 flex items-center gap-3 animate-pulse">
      <span className="w-1.5 h-1.5 rounded-full bg-border" />
      <span className="w-4 h-4 rounded bg-border" />
      <span className="w-16 h-3 rounded bg-border" />
      <span className="flex-1 h-3 rounded bg-border/50" />
      <span className="w-8 h-4 rounded bg-border/40" />
    </div>
  );
}
