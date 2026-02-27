"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { X } from "lucide-react";

interface BoardCreateModalProps {
  onClose: () => void;
  onCreate: (data: {
    name: string;
    emoji?: string;
    type?: string;
    color?: string;
    projectId?: string;
    clientId?: string;
    goalId?: string;
    taskId?: string;
  }) => void;
  isLoading: boolean;
}

const BOARD_TYPES = [
  { value: "brainstorm", label: "Brainstorm", emoji: "🧠" },
  { value: "planning", label: "Planning", emoji: "📋" },
  { value: "project", label: "Project", emoji: "📁" },
  { value: "learning", label: "Learning", emoji: "📚" },
  { value: "personal", label: "Personal", emoji: "🌟" },
];

const EMOJIS = [
  "🧠",
  "💡",
  "🚀",
  "🎯",
  "📋",
  "📁",
  "🔥",
  "⚡",
  "🌊",
  "🎨",
  "🏗️",
  "📊",
  "🗺️",
  "💎",
  "🌟",
  "🔮",
];

const COLORS = [
  "#6EE7B7",
  "#F59E0B",
  "#3B82F6",
  "#8B5CF6",
  "#EC4899",
  "#06B6D4",
  "#F97316",
  "#10B981",
  "#EF4444",
  "#6366F1",
];

export function BoardCreateModal({
  onClose,
  onCreate,
  isLoading,
}: BoardCreateModalProps) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🧠");
  const [type, setType] = useState("brainstorm");
  const [color, setColor] = useState("#6EE7B7");
  const [projectId, setProjectId] = useState("");
  const [clientId, setClientId] = useState("");

  const { data: entities } = trpc.canvas.getLinkedEntities.useQuery();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({
      name: name.trim(),
      emoji,
      type,
      color,
      projectId: projectId || undefined,
      clientId: clientId || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1e] border border-white/10 rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <h3 className="text-sm font-semibold text-white">Create New Board</h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-white/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 pb-5 space-y-4">
          {/* Name */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Board Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Q1 Strategy Map"
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Emoji */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Icon</label>
            <div className="flex flex-wrap gap-1">
              {EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={`text-lg w-8 h-8 flex items-center justify-center rounded-md transition-colors ${
                    emoji === e
                      ? "bg-emerald-500/20 ring-1 ring-emerald-500"
                      : "hover:bg-white/10"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Board Type
            </label>
            <div className="flex flex-wrap gap-1.5">
              {BOARD_TYPES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`text-xs px-3 py-1.5 rounded-lg transition-colors ${
                    type === t.value
                      ? "bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50"
                      : "bg-white/5 text-white/50 hover:bg-white/10"
                  }`}
                >
                  {t.emoji} {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Color */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">Color</label>
            <div className="flex gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-6 h-6 rounded-full transition-transform ${color === c ? "scale-125 ring-2 ring-white/30" : "hover:scale-110"}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          {/* Link to project */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Link to Project (optional)
            </label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-emerald-500/50"
            >
              <option value="">No project</option>
              {entities?.projects?.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Link to client */}
          <div>
            <label className="text-xs text-white/50 mb-1 block">
              Link to Client (optional)
            </label>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white outline-none focus:border-emerald-500/50"
            >
              <option value="">No client</option>
              {entities?.clients?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.companyName ? `(${c.companyName})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!name.trim() || isLoading}
            className="w-full py-2.5 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 text-black font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
          >
            {isLoading ? "Creating..." : "Create Board"}
          </button>
        </form>
      </div>
    </div>
  );
}
