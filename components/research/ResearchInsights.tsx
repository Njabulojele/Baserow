"use client";

import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, TrendingUp, Cpu, Users, BarChart } from "lucide-react";

interface ResearchInsightsProps {
  insights: any[];
}

export function ResearchInsights({ insights }: ResearchInsightsProps) {
  const getCategoryIcon = (category: string) => {
    const cat = category.toLowerCase();
    if (cat.includes("tech")) return <Cpu className="w-4 h-4" />;
    if (cat.includes("market") || cat.includes("trend"))
      return <TrendingUp className="w-4 h-4" />;
    if (cat.includes("customer") || cat.includes("people"))
      return <Users className="w-4 h-4" />;
    return <BarChart className="w-4 h-4" />;
  };

  if (insights.length === 0) {
    return (
      <div className="py-12 text-center bg-[#1a252f] rounded-xl border border-[#2f3e46]">
        <Lightbulb className="w-12 h-12 mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400">No insights synthesized yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {insights.map((insight, index) => (
        <Card
          key={index}
          className="bg-[#1a252f] border-[#2f3e46] overflow-hidden group"
        >
          <div className="flex h-full">
            {/* Confidence Bar */}
            <div
              className="w-1.5 bg-[#6b9080]"
              style={{ opacity: insight.confidence || 1 }}
            />

            <div className="p-6 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-black/40 rounded-lg text-[#6b9080]">
                    {getCategoryIcon(insight.category)}
                  </div>
                  <div>
                    <h4 className="text-white font-bold text-lg">
                      {insight.title}
                    </h4>
                    <p className="text-xs text-[#a9927d] uppercase tracking-wider">
                      {insight.category}
                    </p>
                  </div>
                </div>
                <Badge className="bg-black/40 text-gray-400 border-[#2f3e46] font-mono">
                  CONFIDENCE: {Math.round((insight.confidence || 0.9) * 100)}%
                </Badge>
              </div>

              <div className="prose prose-invert max-w-none text-gray-300 text-sm leading-relaxed">
                {insight.content}
              </div>

              <div className="mt-6 flex flex-wrap gap-2">
                {/* Potential keywords or related concepts could go here */}
                {insight.category === "Market Trend" && (
                  <Badge
                    variant="outline"
                    className="text-xs border-[#6b9080]/30 text-[#6b9080]"
                  >
                    HIGH IMPACT
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
