"use client";

import { useState, useRef, useEffect } from "react";
import {
  Sparkles,
  X,
  Send,
  Plus,
  Timer,
  Loader2,
  GripVertical,
  Minimize2,
} from "lucide-react";
import { useAuth } from "@clerk/nextjs";
import { toast } from "sonner";

interface ChatMessage {
  role: "user" | "assistant" | "system";
  text: string;
  action?: any;
}

export function AIMiniChat() {
  const { getToken } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  /**
   * Get auth headers with Clerk bearer token
   */
  const getHeaders = async (): Promise<Record<string, string>> => {
    try {
      // Timeout getToken after 3s in case Clerk JS failed to load
      const token = await Promise.race([
        getToken(),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), 3000)),
      ]);
      console.log("[Chat] Got token:", token ? "yes" : "no (timeout or null)");
      return {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    } catch (err) {
      console.warn("[Chat] getToken() failed:", err);
      return { "Content-Type": "application/json" };
    }
  };

  /**
   * Send a message — streams from /api/chat/stream
   * Context is fetched server-side, no tRPC needed.
   */
  const handleSend = async () => {
    const msg = input.trim();
    if (!msg || isStreaming) return;

    console.log("[Chat] Sending message:", msg);

    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setIsStreaming(true);
    setMessages((prev) => [...prev, { role: "assistant", text: "" }]);

    try {
      const headers = await getHeaders();
      console.log("[Chat] Making fetch to /api/chat/stream");
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ message: msg }),
      });

      console.log("[Chat] Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Request failed with status ${response.status}`,
        );
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullText = "";

      if (reader) {
        let done = false;
        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split("\n");

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6).trim();
                if (data === "[DONE]") {
                  done = true;
                  break;
                }
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.delta) {
                    fullText += parsed.delta;
                    setMessages((prev) => {
                      const updated = [...prev];
                      const lastIdx = updated.length - 1;
                      if (updated[lastIdx]?.role === "assistant") {
                        updated[lastIdx] = {
                          ...updated[lastIdx],
                          text: fullText
                            .replace(/ACTION:\s*\{.*?\}/s, "")
                            .trim(),
                        };
                      }
                      return updated;
                    });
                  }
                  if (parsed.error) throw new Error(parsed.error);
                } catch (e: any) {
                  if (e.message && !e.message.includes("JSON")) throw e;
                }
              }
            }
          }
        }
      }

      // Check for action in the final text
      const actionMatch = fullText.match(/ACTION:\s*(\{.*?\})/s);
      if (actionMatch) {
        try {
          const action = JSON.parse(actionMatch[1]);
          setMessages((prev) => {
            const updated = [...prev];
            const lastIdx = updated.length - 1;
            if (updated[lastIdx]?.role === "assistant") {
              updated[lastIdx] = {
                ...updated[lastIdx],
                text: fullText.replace(/ACTION:\s*\{.*?\}/s, "").trim(),
                action,
              };
            }
            return updated;
          });
        } catch {
          /* parsing failed */
        }
      }
    } catch (err: any) {
      setMessages((prev) => {
        const updated = [...prev];
        const lastIdx = updated.length - 1;
        if (updated[lastIdx]?.role === "assistant" && !updated[lastIdx].text) {
          updated[lastIdx] = {
            role: "assistant",
            text: err.message || "Something went wrong. Try again.",
          };
        } else {
          updated.push({
            role: "assistant",
            text: err.message || "Something went wrong. Try again.",
          });
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  /**
   * Execute an action via /api/chat/action (no tRPC)
   */
  const handleExecuteAction = async (action: any) => {
    setIsExecuting(true);
    try {
      const headers = await getHeaders();
      const res = await fetch("/api/chat/action", {
        method: "POST",
        headers,
        credentials: "include",
        body: JSON.stringify({ type: action.type, payload: action }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(data.message);
        setMessages((prev) => [
          ...prev,
          { role: "system", text: `✅ ${data.message}` },
        ]);
      } else {
        toast.error(data.message || data.error || "Action failed");
      }
    } catch {
      toast.error("Failed to execute action");
    } finally {
      setIsExecuting(false);
    }
  };

  // Dragging
  const onDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    setIsDragging(true);
    dragRef.current = {
      startX: clientX,
      startY: clientY,
      origX: position.x,
      origY: position.y,
    };
  };

  useEffect(() => {
    if (!isDragging) return;

    const onMove = (e: MouseEvent | TouchEvent) => {
      if (!dragRef.current) return;
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      setPosition({
        x: dragRef.current.origX + (clientX - dragRef.current.startX),
        y: dragRef.current.origY + (clientY - dragRef.current.startY),
      });
    };

    const onEnd = () => setIsDragging(false);

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onEnd);
    window.addEventListener("touchmove", onMove);
    window.addEventListener("touchend", onEnd);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging]);

  return (
    <>
      {/* FAB */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          className="fixed bottom-6 right-6 z-50 p-4 rounded-full bg-gradient-to-br from-[#a9927d] to-[#8b7a6a] text-[#0a0c10] shadow-2xl hover:scale-110 active:scale-95 transition-transform duration-200 group"
        >
          <Sparkles className="h-5 w-5 group-hover:rotate-12 transition-transform" />
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          style={{ transform: `translate(${position.x}px, ${position.y}px)` }}
          className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] rounded-2xl bg-[#0a0c10] border border-[#2f3e46] shadow-2xl flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-300"
        >
          {/* Header */}
          <div
            onMouseDown={onDragStart}
            onTouchStart={onDragStart}
            className="flex items-center justify-between px-4 py-3 border-b border-[#2f3e46] bg-[#1a252f] cursor-grab active:cursor-grabbing shrink-0 select-none"
          >
            <div className="flex items-center gap-2">
              <GripVertical className="h-3.5 w-3.5 text-gray-600" />
              <Sparkles className="h-4 w-4 text-[#a9927d]" />
              <span className="text-xs font-mono uppercase tracking-widest text-white">
                BaseRow AI
              </span>
              <span className="text-[8px] font-mono text-gray-600 uppercase">
                Gemini 2.5
              </span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-[#2f3e46] transition-colors"
              >
                <Minimize2 className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => {
                  setIsOpen(false);
                  setMessages([]);
                }}
                className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-[#2f3e46] transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-6">
                <div className="p-4 rounded-full bg-[#1a252f] border border-[#2f3e46] mb-4">
                  <Sparkles className="h-6 w-6 text-[#a9927d]" />
                </div>
                <p className="text-sm text-white font-medium mb-1">
                  Hey! I&apos;m your AI assistant.
                </p>
                <p className="text-[10px] text-gray-500 leading-relaxed">
                  Ask me about your schedule, create tasks, or start timers. I
                  have full context of your day.
                </p>
                <div className="flex flex-wrap gap-1.5 mt-4 justify-center">
                  {[
                    "What's on my plate today?",
                    "Add a task: Review PRs",
                    "Summarize my week",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="px-2.5 py-1 rounded-full bg-[#1a252f] border border-[#2f3e46] text-[9px] font-mono text-gray-400 hover:text-white hover:border-[#a9927d]/30 transition-colors uppercase tracking-wider"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#a9927d] text-[#0a0c10]"
                      : msg.role === "system"
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                        : "bg-[#1a252f] border border-[#2f3e46] text-gray-300"
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {/* Streaming cursor */}
                  {isStreaming &&
                    i === messages.length - 1 &&
                    msg.role === "assistant" && (
                      <span className="inline-block w-1.5 h-3.5 bg-[#a9927d] animate-pulse ml-0.5 -mb-0.5 rounded-sm" />
                    )}
                  {msg.action && (
                    <button
                      onClick={() => handleExecuteAction(msg.action)}
                      disabled={isExecuting}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#a9927d]/20 border border-[#a9927d]/30 text-[#a9927d] hover:bg-[#a9927d]/30 transition-colors text-[10px] font-mono uppercase tracking-wider"
                    >
                      {msg.action.type === "addTask" ? (
                        <Plus className="h-3 w-3" />
                      ) : (
                        <Timer className="h-3 w-3" />
                      )}
                      {isExecuting
                        ? "Executing..."
                        : msg.action.type === "addTask"
                          ? `Add: ${msg.action.title}`
                          : "Start Timer"}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isStreaming && messages[messages.length - 1]?.text === "" && (
              <div className="flex justify-start">
                <div className="bg-[#1a252f] border border-[#2f3e46] rounded-xl px-4 py-3">
                  <Loader2 className="h-4 w-4 text-[#a9927d] animate-spin" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-[#2f3e46] bg-[#1a252f] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask anything..."
                className="flex-1 bg-[#0a0c10] border border-[#2f3e46] rounded-xl px-3 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-[#a9927d]/50 transition-colors"
                disabled={isStreaming}
              />
              <button
                type="submit"
                disabled={!input.trim() || isStreaming}
                className="p-2.5 rounded-xl bg-[#a9927d] text-[#0a0c10] hover:bg-[#d4c4b7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
