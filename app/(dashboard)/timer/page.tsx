"use client";

import { useTimerStore } from "@/lib/timerStore";
import { useTimerDisplay } from "@/hooks/useTimerDisplay";
import { Button } from "@/components/ui/button";
import { Play, Pause, Square, RotateCcw } from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

export default function TimerPage() {
  const { isRunning, start, stop, reset, getElapsedMs, accumulatedMs } = useTimerStore();
  const display = useTimerDisplay();
  const logSessionMutation = trpc.timer.logSession.useMutation();

  const hasTime = isRunning || accumulatedMs > 0;

  const handleStopAndSave = () => {
    const totalMs = getElapsedMs();
    const durationSeconds = Math.floor(totalMs / 1000);

    // Stop and reset timer store
    stop();
    reset();

    if (durationSeconds > 0) {
      logSessionMutation.mutate({ durationSeconds });
      const mins = Math.max(1, Math.round(durationSeconds / 60));
      toast.success(`Session saved! Logged ${durationSeconds}s (~${mins} mins) to database ⚡`);
    } else {
      toast.info("Timer reset.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] gap-10 px-4">
      {/* Ambient glow */}
      <div
        className={`absolute w-64 h-64 rounded-full blur-[120px] transition-all duration-1000 pointer-events-none ${
          isRunning ? "bg-amber-500/20 scale-110" : "bg-muted/10 scale-100"
        }`}
      />

      {/* Timer display */}
      <div className="relative flex flex-col items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/50">
          {isRunning ? "Running" : hasTime ? "Paused" : "Ready"}
        </span>
        <h1
          className={`font-mono text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight tabular-nums transition-colors duration-500 ${
            isRunning ? "text-amber-400" : "text-muted-foreground/60"
          }`}
        >
          {display}
        </h1>
        {isRunning && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500" />
            </span>
            <span className="text-[10px] font-mono text-amber-400/80 uppercase tracking-widest">
              Live Session Tracking
            </span>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {!isRunning ? (
          <Button
            onClick={start}
            size="lg"
            className="h-14 px-10 rounded-full bg-amber-500 hover:bg-amber-400 text-black font-mono text-sm tracking-wide gap-2 shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30 font-bold"
          >
            <Play className="w-4 h-4 fill-current" />
            {hasTime ? "Resume" : "Start Focus"}
          </Button>
        ) : (
          <Button
            onClick={stop}
            size="lg"
            className="h-14 px-8 rounded-full bg-secondary hover:bg-secondary/80 text-foreground font-mono text-sm tracking-wide gap-2 border border-white/10 transition-all"
          >
            <Pause className="w-4 h-4 text-amber-400" />
            Pause
          </Button>
        )}

        {hasTime && (
          <Button
            onClick={handleStopAndSave}
            size="lg"
            className="h-14 px-8 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-mono text-sm tracking-wide gap-2 shadow-lg shadow-emerald-500/20 transition-all font-extrabold"
          >
            <Square className="w-4 h-4 fill-current" />
            Stop &amp; Save Session
          </Button>
        )}

        {hasTime && (
          <Button
            onClick={reset}
            size="lg"
            variant="ghost"
            className="h-14 w-14 rounded-full text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all"
            title="Reset Without Saving"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Hint */}
      <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest max-w-xs text-center">
        Timer persists across pages • Auto-saves to PostgreSQL database on Stop
      </p>
    </div>
  );
}
