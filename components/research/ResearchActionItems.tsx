"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckSquare,
  ArrowRight,
  Loader2,
  Zap,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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
      toast.success("Converted to task");
      utils.research.getById.invalidate({ id: researchId });
    } catch (error: any) {
      toast.error(error.message || "Conversion failed");
    } finally {
      setLoadingItems((prev) => ({ ...prev, [actionItemId]: false }));
    }
  };

  if (actionItems.length === 0) {
    return (
      <div className="py-16 text-center border border-border/50 border-dashed rounded-md">
        <CheckSquare className="w-5 h-5 mx-auto text-muted-foreground/30 mb-3" />
        <p className="text-xs font-mono text-muted-foreground">
          NO ACTION ITEMS GENERATED
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2.5 px-3 py-2.5 border border-blu/10 rounded-md bg-blu/5">
        <Zap className="w-3 h-3 text-blu mt-0.5 shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          Derived from research findings. Convert to{" "}
          <span className="text-alabaster font-medium">Tasks</span> to execute.
        </p>
      </div>
      <div className="space-y-1">
        {actionItems.map((item) => (
          <div
            key={item.id}
            className="border border-border rounded-md bg-card/50 px-4 py-3 hover:border-charcoal transition-all group"
          >
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[9px] h-4 px-1.5 font-mono border",
                      item.priority === "HIGH" &&
                        "border-red-500/20 text-red-400 bg-red-500/5",
                      item.priority === "MEDIUM" &&
                        "border-amber-500/20 text-amber-400 bg-amber-500/5",
                      item.priority === "LOW" &&
                        "border-blu/20 text-blu bg-blu/5",
                    )}
                  >
                    {item.priority}
                  </Badge>
                  {item.effort && (
                    <span className="text-[9px] font-mono text-muted-foreground/60 tabular-nums">
                      EFFORT {item.effort}/5
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {item.description}
                </p>
              </div>
              <div className="shrink-0">
                {item.convertedToTaskId || convertedItems.has(item.id) ? (
                  <Badge
                    variant="outline"
                    className="text-[9px] h-5 px-2 font-mono border-emerald-500/20 text-emerald-400 bg-emerald-500/5"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> CONVERTED
                  </Badge>
                ) : (
                  <Button
                    onClick={() => handleConvertToTask(item.id)}
                    disabled={loadingItems[item.id]}
                    size="sm"
                    className="h-6 bg-charcoal hover:bg-charcoal/80 text-muted-foreground text-[10px] font-mono border border-border rounded px-2.5"
                  >
                    {loadingItems[item.id] ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <>
                        CONVERT <ArrowRight className="w-3 h-3 ml-1" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
