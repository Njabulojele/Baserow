"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ExternalLink,
  Globe,
  FileText,
  Verified,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { Sparkles, ArrowRight } from "lucide-react";

interface ResearchSourcesProps {
  sources: any[];
  onStartAnalysis?: () => void;
}

export function ResearchSources({
  sources = [],
  onStartAnalysis,
}: ResearchSourcesProps) {
  if (!sources || sources.length === 0) {
    return (
      <div className="py-12 text-center bg-[#1a252f] rounded-xl border border-[#2f3e46]">
        <Globe className="w-12 h-12 mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400">No sources analyzed yet.</p>
      </div>
    );
  }

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return "External Source";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
        {sources.map((source, index) => (
          <Card
            key={index}
            className="bg-[#1a252f] border-[#2f3e46] p-5 hover:border-[#6b9080] transition-colors group"
          >
            <div className="flex items-start justify-between gap-4 mb-3">
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-semibold truncate group-hover:text-[#6b9080] transition-colors">
                  {source.title || "Untitled Source"}
                </h4>
                <p className="text-xs text-[#a9927d] font-mono truncate mt-0.5">
                  {getHostname(source.url)}
                </p>
              </div>
              <a
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 bg-black/40 rounded-lg hover:bg-black/60 text-[#a9927d] transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>

            <p className="text-sm text-gray-400 line-clamp-3 mb-4 leading-relaxed">
              {source.excerpt || "No summary available for this source."}
            </p>

            <div className="flex items-center justify-between mt-auto pt-4 border-t border-[#2f3e46]/50">
              <div className="flex items-center gap-2">
                <Badge className="bg-amber-500/20 text-amber-500 border-amber-500/30 flex items-center gap-1 font-normal text-[10px]">
                  <AlertTriangle className="w-3 h-3" /> Manual Review
                </Badge>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 text-[10px] text-gray-500 hover:text-white p-0"
                  >
                    <FileText className="w-3 h-3 mr-1" /> View Content
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl w-full h-[90vh] bg-[#1a252f] border-[#2f3e46] text-white flex flex-col p-0 overflow-hidden">
                  <DialogHeader className="p-6 pb-2 shrink-0 border-b border-[#2f3e46] bg-[#1a252f]">
                    <DialogTitle className="text-xl font-bold pr-8">
                      {source.title}
                    </DialogTitle>
                    <DialogDescription className="text-[#a9927d] font-mono text-sm truncate flex items-center gap-2 mt-2">
                      <Globe className="w-3 h-3" />
                      {source.url}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex-1 overflow-y-auto p-8 bg-[#111820]">
                    <article className="prose prose-invert prose-lg max-w-none">
                      <ReactMarkdown
                        components={{
                          h1: ({ node, ...props }) => (
                            <h1
                              className="text-3xl font-bold text-white mb-6 pb-2 border-b border-[#2f3e46]"
                              {...props}
                            />
                          ),
                          h2: ({ node, ...props }) => (
                            <h2
                              className="text-2xl font-semibold text-white mt-8 mb-4"
                              {...props}
                            />
                          ),
                          h3: ({ node, ...props }) => (
                            <h3
                              className="text-xl font-medium text-[#a9927d] mt-6 mb-3"
                              {...props}
                            />
                          ),
                          p: ({ node, ...props }) => (
                            <p
                              className="text-gray-300 leading-relaxed mb-4"
                              {...props}
                            />
                          ),
                          ul: ({ node, ...props }) => (
                            <ul
                              className="list-disc pl-6 mb-4 space-y-2 text-gray-300"
                              {...props}
                            />
                          ),
                          ol: ({ node, ...props }) => (
                            <ol
                              className="list-decimal pl-6 mb-4 space-y-2 text-gray-300"
                              {...props}
                            />
                          ),
                          blockquote: ({ node, ...props }) => (
                            <blockquote
                              className="border-l-4 border-[#a9927d] pl-4 italic text-gray-400 my-6 bg-black/20 p-4 rounded-r-lg"
                              {...props}
                            />
                          ),
                          a: ({ node, ...props }) => (
                            <a
                              className="text-[#6b9080] hover:text-[#a9927d] underline underline-offset-4 transition-colors"
                              target="_blank"
                              rel="noopener noreferrer"
                              {...props}
                            />
                          ),
                          code: ({ node, ...props }) => (
                            <code
                              className="bg-black/40 px-1.5 py-0.5 rounded text-sm font-mono text-[#a9927d]"
                              {...props}
                            />
                          ),
                        }}
                      >
                        {source.content}
                      </ReactMarkdown>
                    </article>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </Card>
        ))}
      </div>

      {onStartAnalysis && (
        <div className="flex justify-center pt-8 border-t border-[#2f3e46]/50">
          <Button
            onClick={onStartAnalysis}
            className="bg-[#6b9080] hover:bg-[#5a7a6b] text-white px-8 py-6 h-auto text-lg shadow-lg shadow-[#6b9080]/20 hover:shadow-[#6b9080]/40 transition-all font-medium"
          >
            <Sparkles className="w-5 h-5 mr-3" />
            Start Insight Analysis
            <ArrowRight className="w-5 h-5 ml-3 opacity-60" />
          </Button>
        </div>
      )}
    </div>
  );
}
