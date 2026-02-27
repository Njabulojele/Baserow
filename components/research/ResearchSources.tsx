"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, Globe, FileText, RefreshCcw } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import ReactMarkdown from "react-markdown";

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

export function ResearchSources({
  sources = [],
  onStartAnalysis,
}: ResearchSourcesProps) {
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
            className="group border border-border rounded-md bg-card/50 hover:border-charcoal transition-all duration-200"
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
              {source.content && (
                <Dialog>
                  <DialogTrigger asChild>
                    <button className="p-1 text-muted-foreground/40 hover:text-alabaster transition-colors opacity-0 group-hover:opacity-100">
                      <FileText className="w-3 h-3" />
                    </button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl w-full h-[85vh] bg-card border-border text-foreground flex flex-col p-0 overflow-hidden">
                    <DialogHeader className="p-5 pb-3 shrink-0 border-b border-border">
                      <DialogTitle className="font-mono text-sm">
                        {source.title}
                      </DialogTitle>
                      <DialogDescription className="text-muted-foreground font-mono text-[10px] truncate flex items-center gap-1.5 mt-1">
                        <Globe className="w-3 h-3" />
                        {source.url}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
                      <article className="prose prose-invert prose-sm max-w-none prose-headings:font-mono prose-headings:text-alabaster prose-p:text-muted-foreground prose-a:text-blu prose-strong:text-alabaster prose-code:text-blu/80 prose-code:bg-charcoal/50 prose-blockquote:border-blu/30 prose-blockquote:text-muted-foreground">
                        <ReactMarkdown>{source.content}</ReactMarkdown>
                      </article>
                    </div>
                  </DialogContent>
                </Dialog>
              )}
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-muted-foreground/40 hover:text-blu transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
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
