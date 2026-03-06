"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { X, Bot, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AgentCreationModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [platform, setPlatform] = useState("google");
  const [keywordInput, setKeywordInput] = useState("");
  const [keywords, setKeywords] = useState<string[]>([]);

  const utils = trpc.useUtils();
  const createMutation = trpc.prospecting.createAgent.useMutation({
    onSuccess: () => {
      toast.success("Agent deployed successfully!");
      utils.prospecting.getAgents.invalidate();
      onClose();
      // Reset
      setName("");
      setPlatform("google");
      setKeywords([]);
      setKeywordInput("");
    },
    onError: (err) => toast.error(err.message),
  });

  if (!isOpen) return null;

  const handleAddKeyword = () => {
    if (keywordInput.trim() && !keywords.includes(keywordInput.trim())) {
      setKeywords([...keywords, keywordInput.trim()]);
      setKeywordInput("");
    }
  };

  const currentPlatformColor =
    platform === "reddit"
      ? "#ff4500"
      : platform === "google"
        ? "#ea4335"
        : "#0077b5";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a252f] rounded-2xl border border-[#2f3e46] w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="px-5 py-4 border-b border-[#2f3e46]/50 flex items-center justify-between">
          <h2 className="text-sm font-mono uppercase tracking-widest text-[#a9927d] flex items-center gap-2">
            <Bot className="w-4 h-4" /> Deploy Agent
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-[#0a0c10] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Platform Selection */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              Target Platform
            </label>
            <div className="flex gap-2">
              {[
                { id: "google", label: "Google Local", color: "#ea4335" },
                { id: "reddit", label: "Reddit Groups", color: "#ff4500" },
                { id: "linkedin", label: "LinkedIn", color: "#0077b5" },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPlatform(p.id)}
                  className={`flex-1 py-2 rounded-lg text-xs transition-all border ${
                    platform === p.id
                      ? "bg-[#0a0c10] text-white shadow-sm"
                      : "bg-transparent border-[#2f3e46] text-gray-500 hover:text-gray-300"
                  }`}
                  style={{
                    borderColor: platform === p.id ? `${p.color}50` : undefined,
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              Agent Designation
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Local Plumbers Searcher"
              className="h-9 bg-[#0a0c10] border-[#2f3e46] text-white text-sm"
            />
          </div>

          {/* Keywords */}
          <div className="space-y-2">
            <label className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">
              Hunt Keywords (Max 3)
            </label>
            <div className="flex gap-2">
              <Input
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                placeholder="e.g. plumber, roof repair"
                className="h-9 bg-[#0a0c10] border-[#2f3e46] text-white text-sm"
                onKeyDown={(e) => e.key === "Enter" && handleAddKeyword()}
                disabled={keywords.length >= 3}
              />
              <Button
                onClick={handleAddKeyword}
                disabled={!keywordInput.trim() || keywords.length >= 3}
                className="h-9 px-3 bg-[#0a0c10] border border-[#2f3e46] text-gray-400 hover:text-white"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex gap-2 flex-wrap min-h-[28px] mt-2">
              {keywords.map((kw) => (
                <div
                  key={kw}
                  className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#0a0c10] border border-[#2f3e46] text-xs text-gray-300"
                >
                  <span>{kw}</span>
                  <button
                    onClick={() =>
                      setKeywords(keywords.filter((k) => k !== kw))
                    }
                    className="text-gray-500 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {keywords.length === 0 && (
                <span className="text-xs text-gray-600 italic">
                  No keywords added yet.
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="p-5 border-t border-[#2f3e46]/50 bg-[#0a0c10]/40 flex justify-end gap-3">
          <Button
            variant="ghost"
            onClick={onClose}
            className="text-xs text-gray-400 hover:text-white"
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
              if (keywords.length === 0) {
                toast.error("Add at least one keyword to hunt.");
                return;
              }
              createMutation.mutate({
                name,
                platform,
                searchKeywords: keywords,
              });
            }}
            disabled={
              !name.trim() || keywords.length === 0 || createMutation.isPending
            }
            className="text-xs font-mono uppercase tracking-widest text-[#0a0c10]"
            style={{ backgroundColor: currentPlatformColor }}
          >
            Deploy
          </Button>
        </div>
      </div>
    </div>
  );
}
