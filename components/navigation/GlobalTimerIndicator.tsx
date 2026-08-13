"use client";

import { useEffect } from "react";
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
  const activeSessionId = useTimerStore((s) => (s as any).activeSessionId || "session_default");
  const display = useTimerDisplay();
  const router = useRouter();

  // 30-second heartbeat ping while timer is running
  useEffect(() => {
    if (!isRunning) return;

    const pingHeartbeat = async () => {
      try {
        await fetch(`/api/sessions/${activeSessionId}/heartbeat`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ timestamp: new Date().toISOString() }),
        });
      } catch (err) {
        // Silently catch heartbeat network error, engine handles missed heartbeats
      }
    };

    // Immediate ping + interval
    pingHeartbeat();
    const interval = setInterval(pingHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [isRunning, activeSessionId]);

  if (!isRunning) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => router.push("/timer")}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all group cursor-pointer"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="font-mono text-xs text-emerald-500 font-bold tabular-nums tracking-wide">
              {display}
            </span>
            <Timer className="w-3.5 h-3.5 text-emerald-500/70 group-hover:text-emerald-500 transition-colors" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="font-mono text-xs">
          Active Timer Session — Heartbeat Syncing
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

