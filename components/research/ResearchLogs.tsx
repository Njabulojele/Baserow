"use client";

import { useEffect, useRef, useState } from "react";
import io, { Socket } from "socket.io-client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Terminal, Activity, Wifi, WifiOff } from "lucide-react";
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
    // Only connect if research is active
    if (status !== "IN_PROGRESS") return;

    // Use environment variable for the research engine URL or default to localhost
    // Note: In production, this should point to your Render service URL
    const ENGINE_URL =
      process.env.NEXT_PUBLIC_RESEARCH_ENGINE_URL || "http://localhost:3010";

    const socket = io(ENGINE_URL, {
      transports: ["websocket"],
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      console.log("Connected to Research Engine logs");
      socket.emit("join-research", researchId);
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on(
      "research-log",
      (data: { message: string; timestamp: string }) => {
        setLogs((prev) => [...prev, data]);
        // Auto-scroll
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      },
    );

    return () => {
      socket.disconnect();
    };
  }, [researchId, status]);

  // Auto-scroll effect when logs update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  if (status !== "IN_PROGRESS" && logs.length === 0) return null;

  return (
    <div className="w-full h-full min-h-[300px] flex flex-col bg-black/80 border border-[#2f3e46] rounded-xl overflow-hidden font-mono text-sm shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1a252f] border-b border-[#2f3e46]">
        <div className="flex items-center gap-2 text-[#a9927d]">
          <Terminal className="w-4 h-4" />
          <span className="font-semibold tracking-wider">LIVE TERMINAL</span>
        </div>
        <div className="flex items-center gap-2">
          {isConnected ? (
            <Badge
              variant="outline"
              className="text-[#6b9080] border-[#6b9080]/30 bg-[#6b9080]/10 gap-1"
            >
              <Wifi className="w-3 h-3" /> ONLINE
            </Badge>
          ) : (
            <Badge
              variant="outline"
              className="text-gray-500 border-gray-600 gap-1"
            >
              <WifiOff className="w-3 h-3" /> OFFLINE
            </Badge>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 p-4 overflow-y-auto space-y-2 custom-scrollbar"
        style={{ maxHeight: "400px" }}
      >
        {logs.length === 0 ? (
          <div className="text-gray-500 italic flex items-center gap-2 opacity-50">
            <Activity className="w-4 h-4 animate-pulse" />
            Waiting for agent logs...
          </div>
        ) : (
          logs.map((log, i) => (
            <div
              key={i}
              className="flex gap-3 animate-in slide-in-from-left-2 duration-300"
            >
              <span className="text-gray-500 text-xs mt-0.5 min-w-[70px]">
                {new Date(log.timestamp).toLocaleTimeString([], {
                  hour12: false,
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                })}
              </span>
              <span
                className={cn(
                  "break-words",
                  log.message.includes("Error")
                    ? "text-red-400"
                    : log.message.includes("Found")
                      ? "text-[#6b9080]"
                      : log.message.includes("Starting")
                        ? "text-[#a9927d]"
                        : "text-gray-300",
                )}
              >
                {log.message.includes("http") ? (
                  <span>
                    {log.message.split("http")[0]}
                    <span className="text-blue-400 underline decoration-blue-400/30 underline-offset-2">
                      http{log.message.split("http")[1]}
                    </span>
                  </span>
                ) : (
                  log.message
                )}
              </span>
            </div>
          ))
        )}
        {isConnected && (
          <div className="flex gap-2 items-center mt-2 animate-pulse">
            <span className="text-[#6b9080]">➜</span>
            <span className="w-2 h-4 bg-[#6b9080] block" />
          </div>
        )}
      </div>
    </div>
  );
}
