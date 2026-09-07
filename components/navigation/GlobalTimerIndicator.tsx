"use client";

import { useEffect, useState } from "react";
import { useTimerStore } from "@/lib/timerStore";
import { useTimerDisplay } from "@/hooks/useTimerDisplay";
import { Timer, Coffee, Play, Pause } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { QuickTimerDialog } from "@/components/timer/QuickTimerDialog";

export function GlobalTimerIndicator() {
  const isRunning = useTimerStore((s) => s.isRunning);
  const activeTimer = useTimerStore((s) => s.activeTimer);
  const activeSessionId = activeTimer?.sessionId || "session_default";
  const display = useTimerDisplay();
  const setQuickModalOpen = useTimerStore((s) => s.setQuickModalOpen);
  const isQuickModalOpen = useTimerStore((s) => s.isQuickModalOpen);

  const isBreak =
    activeTimer?.sessionType === "break" ||
    activeTimer?.sessionType === "short_break" ||
    activeTimer?.sessionType === "long_break";

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

  return (
    <>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            {isRunning ? (
              <button
                onClick={() => setQuickModalOpen(true)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all group cursor-pointer border ${
                  isBreak
                    ? "bg-amber-500/10 border-amber-500/25 hover:bg-amber-500/20 text-amber-400"
                    : "bg-emerald-500/10 border-emerald-500/25 hover:bg-emerald-500/20 text-emerald-400"
                }`}
              >
                <span className="relative flex h-2 w-2">
                  <span
                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                      isBreak ? "bg-amber-400" : "bg-emerald-400"
                    }`}
                  />
                  <span
                    className={`relative inline-flex rounded-full h-2 w-2 ${
                      isBreak ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                  />
                </span>

                <span className="font-mono text-xs font-bold tabular-nums tracking-wide">
                  {display}
                </span>

                {isBreak ? (
                  <Coffee className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-opacity" />
                ) : (
                  <Timer className="w-3.5 h-3.5 opacity-80 group-hover:opacity-100 transition-opacity" />
                )}
              </button>
            ) : (
              <button
                onClick={() => setQuickModalOpen(true)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-emerald-500/30 text-gray-300 hover:text-white transition-all text-xs font-mono group cursor-pointer"
              >
                <Timer className="w-3.5 h-3.5 text-gray-400 group-hover:text-emerald-400 transition-colors" />
                <span className="hidden sm:inline text-[11px] font-medium tracking-wide">
                  {activeTimer ? "Resume Timer" : "Quick Timer"}
                </span>
              </button>
            )}
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-mono text-xs bg-[#0c1017] border border-[#273549] text-white">
            {isRunning
              ? isBreak
                ? "Break session active • Click to control"
                : `Focus: ${activeTimer?.projectName || activeTimer?.title || "Active"} • Click to control`
              : "Launch Quick Timer or Log Session"}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      {/* Global Quick Timer Modal accessible anywhere */}
      <QuickTimerDialog open={isQuickModalOpen} onOpenChange={setQuickModalOpen} />
    </>
  );
}
