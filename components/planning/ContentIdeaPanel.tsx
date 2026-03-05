"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Linkedin,
  Facebook,
  Youtube,
  Globe,
  Mail,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import Link from "next/link";

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
  facebook: <Facebook className="w-3.5 h-3.5" />,
  youtube: <Youtube className="w-3.5 h-3.5" />,
  blog: <Globe className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
};

const PLATFORM_COLORS: Record<string, string> = {
  linkedin: "#0077b5",
  facebook: "#1877f2",
  youtube: "#ff0000",
  blog: "#10b981",
  email: "#f59e0b",
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  idea: { label: "Idea", color: "#6b7280" },
  researched: { label: "Researched", color: "#3b82f6" },
  drafted: { label: "Drafted", color: "#f59e0b" },
  published: { label: "Published", color: "#10b981" },
};

export function ContentIdeaPanel() {
  const [newTitle, setNewTitle] = useState("");
  const [newPlatform, setNewPlatform] = useState<string>("linkedin");
  const [isAdding, setIsAdding] = useState(false);

  const utils = trpc.useUtils();
  const { data: ideas, isLoading } = trpc.contentIdea.getIdeas.useQuery();

  const createMutation = trpc.contentIdea.createIdea.useMutation({
    onSuccess: () => {
      toast.success("Content idea added!");
      setNewTitle("");
      setIsAdding(false);
      utils.contentIdea.getIdeas.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const researchMutation = trpc.contentIdea.triggerResearch.useMutation({
    onSuccess: (data) => {
      toast.success("Research triggered! Check the Research page.");
      utils.contentIdea.getIdeas.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleAdd = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      platform: newPlatform as any,
    });
  };

  return (
    <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2f3e46]/50">
        <div>
          <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d]">
            Content Ideas
          </h3>
          <p className="text-[9px] font-mono text-gray-600 mt-0.5">
            Bank of ideas with AI research
          </p>
        </div>
        <button
          onClick={() => setIsAdding(!isAdding)}
          className="p-1.5 rounded-lg hover:bg-[#0a0c10] text-gray-400 hover:text-[#a9927d] transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Add new idea */}
      {isAdding && (
        <div className="px-4 py-3 border-b border-[#2f3e46]/30 space-y-2">
          <Input
            placeholder="Content idea title..."
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="h-8 bg-[#0a0c10] border-[#2f3e46] text-white text-sm placeholder:text-gray-600"
            onKeyDown={(e) => e.key === "Enter" && handleAdd()}
          />
          <div className="flex items-center gap-1.5">
            {Object.entries(PLATFORM_ICONS).map(([key, icon]) => (
              <button
                key={key}
                onClick={() => setNewPlatform(key)}
                className={cn(
                  "p-1.5 rounded-md transition-colors",
                  newPlatform === key
                    ? "bg-[#0a0c10]"
                    : "hover:bg-[#0a0c10]/50",
                )}
                style={{
                  color: newPlatform === key ? PLATFORM_COLORS[key] : "#6b7280",
                }}
              >
                {icon}
              </button>
            ))}
            <div className="flex-1" />
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={createMutation.isPending}
              className="h-7 text-[10px] font-mono bg-[#a9927d] text-[#0a0c10] hover:bg-[#d4c4b7]"
            >
              Add
            </Button>
          </div>
        </div>
      )}

      {/* Ideas list */}
      <div className="p-2 space-y-0.5 max-h-[300px] overflow-y-auto custom-scrollbar">
        {isLoading && (
          <div className="text-center py-6 text-xs text-gray-600">
            Loading...
          </div>
        )}
        {ideas?.length === 0 && (
          <div className="text-center py-6 text-xs text-gray-600">
            No ideas yet. Start building your bank!
          </div>
        )}
        {ideas?.map((idea) => {
          const status = STATUS_LABELS[idea.status] || STATUS_LABELS.idea;
          const platformColor = PLATFORM_COLORS[idea.platform] || "#6b7280";

          return (
            <div
              key={idea.id}
              className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors group"
            >
              <span
                className="shrink-0 mt-0.5"
                style={{ color: platformColor }}
              >
                {PLATFORM_ICONS[idea.platform] || (
                  <Globe className="w-3.5 h-3.5" />
                )}
              </span>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-white block truncate">
                  {idea.title}
                </span>
                <span
                  className="text-[9px] font-mono uppercase tracking-wider"
                  style={{ color: status.color }}
                >
                  {status.label}
                </span>
              </div>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {idea.status === "idea" && (
                  <button
                    onClick={() => researchMutation.mutate({ ideaId: idea.id })}
                    disabled={researchMutation.isPending}
                    className="p-1 rounded text-gray-400 hover:text-[#a9927d] hover:bg-[#0a0c10] transition-colors"
                    title="Research this idea"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                )}
                {idea.researchId && (
                  <Link
                    href={`/research/${idea.researchId}`}
                    className="p-1 rounded text-gray-400 hover:text-[#a9927d] hover:bg-[#0a0c10] transition-colors"
                    title="View research"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
