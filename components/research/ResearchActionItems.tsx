"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  CheckSquare,
  ArrowRight,
  ExternalLink,
  Loader2,
  AlertCircle,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";

interface ResearchActionItemsProps {
  actionItems: any[];
  researchId: string;
}

export function ResearchActionItems({
  actionItems,
  researchId,
}: ResearchActionItemsProps) {
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({});
  const [convertedItems, setConvertedItems] = useState<Set<string>>(new Set());
  const utils = trpc.useUtils();
  const convertMutation = trpc.research.convertActionToTask.useMutation();

  const handleConvertToTask = async (actionItemId: string) => {
    try {
      setLoadingItems((prev) => ({ ...prev, [actionItemId]: true }));
      await convertMutation.mutateAsync({ actionItemId });
      setConvertedItems((prev) => new Set(prev).add(actionItemId));
      toast.success("Converted to task!", {
        description: "You can now find this in your tasks dashboard.",
      });
      utils.research.getById.invalidate({ id: researchId });
    } catch (error: any) {
      toast.error("Conversion failed", {
        description: error.message || "Check your connection.",
      });
    } finally {
      setLoadingItems((prev) => ({ ...prev, [actionItemId]: false }));
    }
  };

  if (actionItems.length === 0) {
    return (
      <div className="py-12 text-center bg-[#1a252f] rounded-xl border border-[#2f3e46]">
        <CheckSquare className="w-12 h-12 mx-auto text-gray-600 mb-3" />
        <p className="text-gray-400">No action items generated yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-[#a9927d]/10 border border-[#a9927d]/30 rounded-xl p-4 mb-6 flex items-start gap-3">
        <Zap className="w-5 h-5 text-[#a9927d] shrink-0 mt-0.5" />
        <p className="text-sm text-gray-300">
          These items were intelligently derived from your research findings.
          Convert them to <strong>Tasks</strong> to start executing on these
          insights.
        </p>
      </div>

      {actionItems.map((item) => (
        <Card
          key={item.id}
          className="bg-[#1a252f] border-[#2f3e46] p-6 hover:border-[#a9927d]/50 transition-all group"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Badge
                  className={
                    item.priority === "HIGH"
                      ? "bg-red-500/20 text-red-500 border-red-500/30"
                      : item.priority === "MEDIUM"
                        ? "bg-amber-500/20 text-amber-500 border-amber-500/30"
                        : "bg-blue-500/20 text-blue-500 border-blue-500/30"
                  }
                >
                  {item.priority} PRIORITY
                </Badge>
                {item.effort && (
                  <span className="text-xs text-gray-500 font-medium">
                    Est. Effort: {item.effort}/5
                  </span>
                )}
              </div>
              <h4 className="text-white font-bold text-lg group-hover:text-[#a9927d] transition-colors">
                {item.description}
              </h4>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              {item.convertedToTaskId || convertedItems.has(item.id) ? (
                <Button
                  variant="outline"
                  className="border-[#6b9080]/30 text-[#6b9080] bg-[#6b9080]/5 cursor-default hover:bg-[#6b9080]/5"
                  disabled
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Task Created
                </Button>
              ) : (
                <Button
                  onClick={() => handleConvertToTask(item.id)}
                  disabled={loadingItems[item.id]}
                  className="bg-[#a9927d] hover:bg-[#8f7a68] text-white"
                >
                  {loadingItems[item.id] ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      Convert to Task <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
