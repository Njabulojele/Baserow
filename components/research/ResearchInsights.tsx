"use client";

import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Cpu, Users, BarChart } from "lucide-react";
import { cn } from "@/lib/utils";

interface ResearchInsightsProps {
  insights: any[];
}

export function ResearchInsights({ insights }: ResearchInsightsProps) {
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("tech")) return <Cpu className="w-3 h-3" />;
    if (cat.includes("market") || cat.includes("trend"))
      return <TrendingUp className="w-3 h-3" />;
    if (cat.includes("customer") || cat.includes("people"))
      return <Users className="w-3 h-3" />;
    return <BarChart className="w-3 h-3" />;
  };

  if (insights.length === 0) {
    return (
      <div className="py-16 text-center border border-border/50 border-dashed rounded-md">
        <Lightbulb className="w-5 h-5 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-xs font-mono text-muted-foreground">
          NO INSIGHTS SYNTHESIZED
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {insights.map((insight, index) => (
        <div
          key={index}
          className="border border-border rounded-md bg-card/50 overflow-hidden"
        >
          <div className="flex h-full">
            <div
              className={cn(
                "w-[3px] shrink-0",
                (insight.confidence || 0.9) >= 0.8 && "bg-emerald-500/60",
                (insight.confidence || 0.9) >= 0.5 &&
                  (insight.confidence || 0.9) < 0.8 &&
                  "bg-amber-500/60",
                (insight.confidence || 0.9) < 0.5 && "bg-red-500/60",
              )}
            />
            <div className="p-4 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-1.5 rounded bg-charcoal/50 text-muted-foreground">
                    {getCategoryIcon(insight.category)}
                  </div>
                  <div>
                    <h4 className="text-sm font-mono font-medium text-alabaster">
                      {insight.title}
                    </h4>
                    <p className="text-[9px] font-mono text-muted-foreground/60 uppercase tracking-widest">
                      {insight.category}
                    </p>
                  </div>
                </div>
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[9px] h-4 px-1.5 font-mono border tabular-nums",
                    (insight.confidence || 0.9) >= 0.8 &&
                      "border-emerald-500/20 text-emerald-400 bg-emerald-500/5",
                    (insight.confidence || 0.9) >= 0.5 &&
                      (insight.confidence || 0.9) < 0.8 &&
                      "border-amber-500/20 text-amber-400 bg-amber-500/5",
                    (insight.confidence || 0.9) < 0.5 &&
                      "border-red-500/20 text-red-400 bg-red-500/5",
                  )}
                >
                  {Math.round((insight.confidence || 0.9) * 100)}%
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {insight.content}
              </p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
