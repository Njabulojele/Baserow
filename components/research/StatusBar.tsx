"use client";

import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Clock } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

type ResearchStatusType =
  | "idle"
  | "initializing"
  | "searching"
  | "scraping"
  | "synthesizing"
  | "complete"
  | "failed";

interface StatusBarProps {
  status: ResearchStatusType;
  progress: number;
  stepDescription?: string;
  startedAt?: number;
}

function getStatusStyle(status: ResearchStatusType) {
  switch (status) {
    case "idle":
      return "bg-muted text-muted-foreground border-border";
    case "initializing":
      return "bg-blu/10 text-blu border-blu/20";
    case "searching":
      return "bg-blu/10 text-blu border-blu/20";
    case "scraping":
      return "bg-amber-500/10 text-amber-400 border-amber-500/20";
    case "synthesizing":
      return "bg-violet-500/10 text-violet-400 border-violet-500/20";
    case "complete":
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    case "failed":
      return "bg-red-500/10 text-red-400 border-red-500/20";
  }
}

export function StatusBar({
  status,
  progress,
  stepDescription,
  startedAt,
}: StatusBarProps) {
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (
      startedAt &&
      status !== "idle" &&
      status !== "complete" &&
      status !== "failed"
    ) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startedAt) / 1000));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [startedAt, status]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  return (
    <div className="border-b border-border bg-card/80 px-4 py-2.5 flex items-center gap-4">
      <Badge
        variant="outline"
        className={cn(
          "text-[10px] font-mono uppercase tracking-widest h-5 px-2 border",
          getStatusStyle(status),
        )}
      >
        {status === "idle" ? "STANDBY" : status.toUpperCase()}
      </Badge>
      {status !== "idle" && status !== "complete" && (
        <div className="flex-1 max-w-[200px]">
          <Progress
            value={progress}
            className="h-[2px] bg-border [&>div]:bg-blu/70 [&>div]:transition-all [&>div]:duration-700"
          />
        </div>
      )}
      {stepDescription && (
        <span className="text-[11px] font-mono text-muted-foreground flex-1 truncate">
          {stepDescription}
        </span>
      )}
      {startedAt && status !== "idle" && (
        <div className="flex items-center gap-1.5 text-muted-foreground shrink-0">
          <Clock className="w-3 h-3" />
          <span className="text-[11px] font-mono tabular-nums">
            {formatTime(elapsed)}
          </span>
        </div>
      )}
    </div>
  );
}
