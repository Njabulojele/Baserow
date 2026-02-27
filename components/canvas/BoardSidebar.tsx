"use client";

import React, { useState } from "react";
import {
  Plus,
  Star,
  MoreHorizontal,
  Copy,
  Trash2,
  FolderOpen,
  Users,
  Search,
} from "lucide-react";

interface Board {
  id: string;
  name: string;
  emoji: string | null;
  type: string;
  color: string | null;
  isFavorited: boolean;
  updatedAt: Date | string;
  project?: {
    id: string;
    name: string;
    color: string | null;
    icon: string | null;
  } | null;
  client?: { id: string; name: string; companyName: string | null } | null;
}

interface BoardSidebarProps {
  boards: Board[];
  activeBoardId: string | null;
  loading: boolean;
  onSelectBoard: (id: string) => void;
  onCreateBoard: () => void;
  onDeleteBoard: (id: string) => void;
  onDuplicateBoard: (id: string) => void;
  onToggleFavorite: (id: string) => void;
}

export function BoardSidebar({
  boards,
  activeBoardId,
  loading,
  onSelectBoard,
  onCreateBoard,
  onDeleteBoard,
  onDuplicateBoard,
  onToggleFavorite,
}: BoardSidebarProps) {
  const [search, setSearch] = useState("");
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "favorites">("all");

  const filtered = boards.filter((b) => {
    if (filter === "favorites" && !b.isFavorited) return false;
    if (search && !b.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  return (
    <div className="w-64 bg-[#131315] border-r border-white/5 flex flex-col h-full shrink-0">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 flex items-center justify-between">
        <h3 className="text-xs font-semibold text-white/50 uppercase tracking-wider">
          Boards
        </h3>
        <button
          onClick={onCreateBoard}
          className="p-1 rounded-md hover:bg-white/10 text-white/50 hover:text-emerald-400 transition-colors"
          title="New board"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Search */}
      <div className="px-3 pb-2">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search boards..."
            className="w-full pl-7 pr-2 py-1.5 text-xs bg-white/5 border border-white/10 rounded-md text-white placeholder:text-white/30 outline-none focus:border-emerald-500/50"
          />
        </div>
      </div>

      {/* Filter tabs */}
      <div className="px-3 pb-2 flex gap-1">
        <button
          onClick={() => setFilter("all")}
          className={`text-xs px-2 py-1 rounded-md transition-colors ${
            filter === "all"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("favorites")}
          className={`text-xs px-2 py-1 rounded-md transition-colors flex items-center gap-1 ${
            filter === "favorites"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:text-white/60"
          }`}
        >
          <Star className="w-3 h-3" /> Favorites
        </button>
      </div>

      {/* Board list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2">
        {loading ? (
          <div className="space-y-2 px-1">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 bg-white/5 rounded-lg animate-pulse"
              />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-3 py-8 text-center text-white/30 text-xs">
            {search
              ? "No boards match your search"
              : "No boards yet. Create one!"}
          </div>
        ) : (
          <div className="space-y-0.5">
            {filtered.map((board) => (
              <div
                key={board.id}
                className={`relative group px-2.5 py-2 rounded-lg cursor-pointer transition-all ${
                  activeBoardId === board.id
                    ? "bg-emerald-500/15 text-white"
                    : "hover:bg-white/5 text-white/70"
                }`}
                onClick={() => onSelectBoard(board.id)}
              >
                <div className="flex items-center gap-2">
                  <span className="text-base">{board.emoji || "🧠"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium truncate">
                      {board.name}
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      {board.project && (
                        <span className="flex items-center gap-0.5 text-[10px] text-blue-400/70">
                          <FolderOpen className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[60px]">
                            {board.project.name}
                          </span>
                        </span>
                      )}
                      {board.client && (
                        <span className="flex items-center gap-0.5 text-[10px] text-purple-400/70">
                          <Users className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[60px]">
                            {board.client.name}
                          </span>
                        </span>
                      )}
                      {!board.project && !board.client && (
                        <span className="text-[10px] text-white/30 capitalize">
                          {board.type}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Favorite & Menu */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(board.id);
                      }}
                      className="p-0.5 rounded hover:bg-white/10"
                    >
                      <Star
                        className={`w-3 h-3 ${board.isFavorited ? "text-yellow-400 fill-yellow-400" : "text-white/30"}`}
                      />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setMenuOpen(menuOpen === board.id ? null : board.id);
                      }}
                      className="p-0.5 rounded hover:bg-white/10"
                    >
                      <MoreHorizontal className="w-3 h-3 text-white/40" />
                    </button>
                  </div>
                </div>

                {/* Context menu */}
                {menuOpen === board.id && (
                  <div className="absolute right-0 top-full mt-1 bg-[#1e1e22] border border-white/10 rounded-lg shadow-xl z-50 py-1 w-36">
                    <button
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicateBoard(board.id);
                        setMenuOpen(null);
                      }}
                    >
                      <Copy className="w-3 h-3" /> Duplicate
                    </button>
                    <button
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteBoard(board.id);
                        setMenuOpen(null);
                      }}
                    >
                      <Trash2 className="w-3 h-3" /> Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
