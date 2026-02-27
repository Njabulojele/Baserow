"use client";

import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

interface SynthesisPanelProps {
  text: string;
  isStreaming: boolean;
  findings?: { finding: string; confidence: number; sources: number }[];
}

export function SynthesisPanel({
  text,
  isStreaming,
  findings,
}: SynthesisPanelProps) {
  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };
  const handleExportMd = () => {
    const blob = new Blob([text], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "research-report.md";
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported");
  };

  if (!text && !isStreaming) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground font-mono text-xs">
        Synthesis will appear here
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-border shrink-0">
        <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest">
          Synthesis
          {isStreaming && (
            <span className="ml-2 text-blu animate-pulse">●</span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-alabaster"
            onClick={handleCopy}
            disabled={!text}
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-muted-foreground hover:text-alabaster"
            onClick={handleExportMd}
            disabled={!text}
          >
            <FileText className="w-3 h-3" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 custom-scrollbar">
        <div className="prose prose-invert prose-sm max-w-none prose-headings:font-mono prose-headings:text-alabaster prose-p:text-muted-foreground prose-p:leading-relaxed prose-a:text-blu prose-strong:text-alabaster prose-code:text-blu/80 prose-code:bg-card prose-code:px-1 prose-code:rounded prose-li:text-muted-foreground prose-li:marker:text-charcoal">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{text}</ReactMarkdown>
          {isStreaming && (
            <span className="inline-block w-[2px] h-4 bg-blu animate-pulse ml-0.5 align-text-bottom" />
          )}
        </div>
        {findings && findings.length > 0 && (
          <>
            <Separator className="my-6 bg-border" />
            <div>
              <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-3">
                Key Findings
              </p>
              <div className="border border-border rounded-md overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-card/50">
                      <th className="text-left px-3 py-2 font-mono text-muted-foreground font-normal tracking-wider text-[10px]">
                        FINDING
                      </th>
                      <th className="text-right px-3 py-2 font-mono text-muted-foreground font-normal tracking-wider text-[10px] w-20">
                        CONF.
                      </th>
                      <th className="text-right px-3 py-2 font-mono text-muted-foreground font-normal tracking-wider text-[10px] w-16">
                        SRCS
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {findings.map((f, i) => (
                      <tr
                        key={i}
                        className="border-b border-border/30 last:border-0"
                      >
                        <td className="px-3 py-2 text-alabaster">
                          {f.finding}
                        </td>
                        <td
                          className={cn(
                            "px-3 py-2 text-right font-mono tabular-nums",
                            f.confidence >= 80
                              ? "text-emerald-400"
                              : f.confidence >= 50
                                ? "text-amber-400"
                                : "text-red-400",
                          )}
                        >
                          {f.confidence}%
                        </td>
                        <td className="px-3 py-2 text-right font-mono text-muted-foreground tabular-nums">
                          {f.sources}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
