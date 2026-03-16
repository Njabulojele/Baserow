"use client";

import { useTimerStore } from "@/lib/timerStore";
import { useTimerDisplay } from "@/hooks/useTimerDisplay";
import { useRouter } from "next/navigation";
import { Timer } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function GlobalTimerIndicator() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const display = useTimerDisplay();
  const router = useRouter();

  if (!isRunning) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => router.push("/timer")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blu/10 border border-blu/20 hover:bg-blu/15 hover:border-blu/30 transition-all group cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blu opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blu" />
            </span>
            <span className="font-mono text-xs text-blu tabular-nums tracking-wide">
              {display}
            </span>
            <Timer className="w-3 h-3 text-blu/60 group-hover:text-blu transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-mono text-xs">
          Go to Timer
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
