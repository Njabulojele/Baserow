"use client";

import { useTimerStore } from "@/lib/timerStore";
import { useTimerDisplay } from "@/hooks/useTimerDisplay";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw } from "lucide-react";

export default function TimerPage() {
  const { isRunning, start, stop, reset, accumulatedMs } = useTimerStore();
  const display = useTimerDisplay();

  const hasTime = isRunning || accumulatedMs > 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-8rem)] gap-10 px-4">
      {/* Ambient glow */}
      <div
        className={`absolute w-64 h-64 rounded-full blur-[120px] transition-all duration-1000 pointer-events-none ${
          isRunning ? "bg-blu/20 scale-110" : "bg-muted/10 scale-100"
        }`}
      />

      {/* Timer display */}
      <div className="relative flex flex-col items-center gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground/50">
          {isRunning ? "Running" : hasTime ? "Paused" : "Ready"}
        </span>
        <h1
          className={`font-mono text-7xl md:text-8xl lg:text-9xl font-bold tracking-tight tabular-nums transition-colors duration-500 ${
            isRunning ? "text-alabaster" : "text-muted-foreground/60"
          }`}
        >
          {display}
        </h1>
        {isRunning && (
          <div className="flex items-center gap-1.5 mt-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blu opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blu" />
            </span>
            <span className="text-[10px] font-mono text-blu/70 uppercase tracking-widest">
              Tracking
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
            className="h-14 px-10 rounded-full bg-blu hover:bg-blu/90 text-white font-mono text-sm tracking-wide gap-2 shadow-lg shadow-blu/20 transition-all hover:shadow-xl hover:shadow-blu/30"
          >
            <Play className="w-4 h-4 fill-current" />
            {hasTime ? "Resume" : "Start"}
          </Button>
        ) : (
          <Button
            onClick={stop}
            size="lg"
            className="h-14 px-10 rounded-full bg-card hover:bg-card/80 text-alabaster font-mono text-sm tracking-wide gap-2 border border-border/50 transition-all"
          >
            <Pause className="w-4 h-4" />
            Pause
          </Button>
        )}
        {hasTime && (
          <Button
            onClick={reset}
            size="lg"
            variant="ghost"
            className="h-14 w-14 rounded-full text-muted-foreground hover:text-alabaster hover:bg-card/50 transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Hint */}
      <p className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-widest max-w-xs text-center">
        Timer persists across pages &amp; reloads
      </p>
    </div>
  );
}
