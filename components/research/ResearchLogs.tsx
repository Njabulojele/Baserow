"use client";

import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { Badge } from "@/components/ui/badge";
import { Wifi, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface LogMessage {
  message: string;
  timestamp: string;
}
interface ResearchLogsProps {
  researchId: string;
  status: string;
}

export function ResearchLogs({ researchId, status }: ResearchLogsProps) {
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status !== "IN_PROGRESS") return;
    const ENGINE_URL =
      process.env.NEXT_PUBLIC_RESEARCH_ENGINE_URL || "http://localhost:3010";
    const socket = io(ENGINE_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;
    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("join-research", researchId);
    });
    socket.on("disconnect", () => setIsConnected(false));
    socket.on(
      "research-log",
      (data: { message: string; timestamp: string }) => {
        setLogs((prev) => [...prev, data]);
        if (scrollRef.current)
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      },
    );
    return () => {
      socket.disconnect();
    };
  }, [researchId, status]);

  useEffect(() => {
    if (scrollRef.current)
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [logs]);

  if (status !== "IN_PROGRESS" && logs.length === 0) return null;

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col bg-background border border-border rounded-md overflow-hidden font-mono text-xs">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border shrink-0">
        <span className="text-[10px] text-muted-foreground uppercase tracking-widest">
          TERMINAL
        </span>
        <Badge
          variant="outline"
          className={cn(
            "text-[9px] h-4 px-1.5 font-mono border gap-1",
            isConnected
              ? "text-emerald-400 border-emerald-500/20 bg-emerald-500/5"
              : "text-muted-foreground/40 border-border",
          )}
        >
          {isConnected ? (
            <>
              <Wifi className="w-2.5 h-2.5" /> ONLINE
            </>
          ) : (
            <>
              <WifiOff className="w-2.5 h-2.5" /> OFFLINE
            </>
          )}
        </Badge>
      </div>
      <div
        ref={scrollRef}
        className="flex-1 p-3 overflow-y-auto space-y-0.5 custom-scrollbar"
        style={{ maxHeight: "400px" }}
      >
        {logs.length === 0 ? (
          <p className="text-muted-foreground/40 text-[10px] animate-pulse">
            Waiting for agent...
          </p>
        ) : (
          logs.map((log, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-muted-foreground/30 text-[10px] mt-px min-w-[50px] tabular-nums shrink-0">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span
                className={cn(
                  "break-words text-[10px] leading-relaxed",
                  log.message.includes("Error") && "text-red-400/60",
                  log.message.includes("Found") && "text-emerald-400/50",
                  log.message.includes("Starting") && "text-blu/50",
                  !log.message.includes("Error") &&
                    !log.message.includes("Found") &&
                    !log.message.includes("Starting") &&
                    "text-muted-foreground/60",
                )}
              >
                {log.message}
              </span>
            </div>
          ))
        )}
        {isConnected && <p className="text-blu/40 animate-pulse mt-1">▌</p>}
      </div>
    </div>
  );
}
