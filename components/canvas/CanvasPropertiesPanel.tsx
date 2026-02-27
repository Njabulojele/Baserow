"use client";

import React from "react";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import {
  Bold,
  Italic,
  Underline,
  Lock,
  Unlock,
  Trash2,
  Copy,
  ArrowUpToLine,
  ArrowDownToLine,
} from "lucide-react";

const FONT_SIZES = [10, 12, 14, 16, 18, 20, 24, 28, 32, 40, 48, 64, 72];
const FONT_FAMILIES = ["Inter", "DM Sans", "Sora", "Roboto Mono", "Georgia"];
const COLOR_SWATCHES = [
  "#ffffff",
  "#f5f5f4",
  "#d4d4d8",
  "#a1a1aa",
  "#6EE7B7",
  "#34D399",
  "#10B981",
  "#93C5FD",
  "#3B82F6",
  "#2563EB",
  "#C4B5FD",
  "#8B5CF6",
  "#7C3AED",
  "#FCA5A5",
  "#EF4444",
  "#DC2626",
  "#FDBA74",
  "#F59E0B",
  "#D97706",
  "#FDE68A",
  "#FCD34D",
  "#FBBF24",
  "#F9A8D4",
  "#EC4899",
  "#DB2777",
];

export function CanvasPropertiesPanel() {
  const {
    nodes,
    selectedNodeIds,
    updateNode,
    deleteSelectedNodes,
    duplicateSelectedNodes,
    bringToFront,
    sendToBack,
    lockNode,
    unlockNode,
  } = useCanvasStore();

  if (selectedNodeIds.size === 0) return null;

  const selectedNodes = nodes.filter((n) => selectedNodeIds.has(n.id));
  const node = selectedNodes[0];
  if (!node) return null;

  const isMulti = selectedNodes.length > 1;

  return (
    <div className="absolute right-3 top-16 z-20 w-52 bg-[#0a0c10]/95 backdrop-blur-md border border-[#2f3e46] rounded-xl shadow-xl p-3 space-y-3 max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="text-[10px] text-[#a9927d] uppercase tracking-widest font-mono">
        {isMulti ? `${selectedNodes.length} selected` : node.type}
      </div>

      {/* Quick actions */}
      <div className="flex gap-1 flex-wrap">
        <button
          onClick={duplicateSelectedNodes}
          className="p-1.5 rounded hover:bg-[#1a252f] text-gray-500 hover:text-white"
          title="Duplicate"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => bringToFront(node.id)}
          className="p-1.5 rounded hover:bg-[#1a252f] text-gray-500 hover:text-white"
          title="Bring to front"
        >
          <ArrowUpToLine className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() => sendToBack(node.id)}
          className="p-1.5 rounded hover:bg-[#1a252f] text-gray-500 hover:text-white"
          title="Send to back"
        >
          <ArrowDownToLine className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={() =>
            node.locked ? unlockNode(node.id) : lockNode(node.id)
          }
          className={`p-1.5 rounded hover:bg-[#1a252f] transition-colors ${node.locked ? "text-amber-500 bg-[#1a252f]/50" : "text-gray-500 hover:text-white"}`}
          title={node.locked ? "Unlock" : "Lock"}
        >
          {node.locked ? (
            <Unlock className="w-3.5 h-3.5" />
          ) : (
            <Lock className="w-3.5 h-3.5" />
          )}
        </button>
        <button
          onClick={deleteSelectedNodes}
          className="p-1.5 rounded hover:bg-red-500/10 text-gray-500 hover:text-red-400 transition-colors"
          title="Delete"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Text styling */}
      {(node.type === "text" ||
        node.type === "sticky" ||
        node.type === "section") &&
        !isMulti && (
          <>
            <div>
              <label className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1 block">
                Font
              </label>
              <select
                value={node.fontFamily || "Inter"}
                onChange={(e) =>
                  updateNode(node.id, { fontFamily: e.target.value })
                }
                className="w-full px-2 py-1.5 bg-[#1a252f] border border-[#2f3e46] rounded text-[10px] font-mono tracking-widest text-gray-300 outline-none"
              >
                {FONT_FAMILIES.map((f) => (
                  <option key={f} value={f}>
                    {f}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1 block">
                Size
              </label>
              <select
                value={node.fontSize || 16}
                onChange={(e) =>
                  updateNode(node.id, { fontSize: Number(e.target.value) })
                }
                className="w-full px-2 py-1.5 bg-[#1a252f] border border-[#2f3e46] rounded text-[10px] font-mono tracking-widest text-gray-300 outline-none"
              >
                {FONT_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}px
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-1">
              <button
                onClick={() =>
                  updateNode(node.id, {
                    fontWeight: node.fontWeight === "bold" ? "normal" : "bold",
                  })
                }
                className={`p-1.5 rounded transition-colors ${node.fontWeight === "bold" ? "bg-[#1a252f] text-[#a9927d]" : "text-gray-500 hover:bg-[#1a252f] hover:text-white"}`}
              >
                <Bold className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  updateNode(node.id, {
                    fontStyle:
                      node.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
                className={`p-1.5 rounded transition-colors ${node.fontStyle === "italic" ? "bg-[#1a252f] text-[#a9927d]" : "text-gray-500 hover:bg-[#1a252f] hover:text-white"}`}
              >
                <Italic className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() =>
                  updateNode(node.id, {
                    textDecoration:
                      node.textDecoration === "underline"
                        ? "none"
                        : "underline",
                  })
                }
                className={`p-1.5 rounded transition-colors ${node.textDecoration === "underline" ? "bg-[#1a252f] text-[#a9927d]" : "text-gray-500 hover:bg-[#1a252f] hover:text-white"}`}
              >
                <Underline className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

      {/* Background color */}
      {node.type !== "entity" && !isMulti && (
        <div>
          <label className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1 block">
            Background
          </label>
          <div className="flex flex-wrap gap-1">
            {COLOR_SWATCHES.slice(0, 12).map((c) => (
              <button
                key={c}
                onClick={() => updateNode(node.id, { bgColor: c })}
                className={`w-4.5 h-4.5 rounded transition-transform ${node.bgColor === c ? "scale-125 ring-1 ring-white/40" : "hover:scale-110"}`}
                style={{ backgroundColor: c, width: 18, height: 18 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Text color */}
      {(node.type === "text" || node.type === "sticky") && !isMulti && (
        <div>
          <label className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1 block">
            Text Color
          </label>
          <div className="flex flex-wrap gap-1">
            {COLOR_SWATCHES.slice(0, 12).map((c) => (
              <button
                key={c}
                onClick={() => updateNode(node.id, { textColor: c })}
                className={`w-4.5 h-4.5 rounded transition-transform ${node.textColor === c ? "scale-125 ring-1 ring-white/40" : "hover:scale-110"}`}
                style={{ backgroundColor: c, width: 18, height: 18 }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Border */}
      {!isMulti && node.type !== "numberBadge" && (
        <div>
          <label className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1 block">
            Border
          </label>
          <div className="flex gap-1 items-center">
            <input
              type="range"
              min={0}
              max={6}
              value={node.borderWidth || 0}
              onChange={(e) =>
                updateNode(node.id, { borderWidth: Number(e.target.value) })
              }
              className="flex-1 h-1 accent-[#a9927d] bg-[#1a252f] border border-[#2f3e46] rounded-full appearance-none"
            />
            <span className="text-[10px] font-mono text-gray-500 w-5 text-right">
              {node.borderWidth || 0}
            </span>
          </div>
        </div>
      )}

      {/* Opacity */}
      {!isMulti && (
        <div>
          <label className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1 block">
            Opacity
          </label>
          <div className="flex gap-1 items-center">
            <input
              type="range"
              min={10}
              max={100}
              value={(node.opacity ?? 1) * 100}
              onChange={(e) =>
                updateNode(node.id, { opacity: Number(e.target.value) / 100 })
              }
              className="flex-1 h-1 accent-[#a9927d] bg-[#1a252f] border border-[#2f3e46] rounded-full appearance-none"
            />
            <span className="text-[10px] font-mono text-gray-500 w-8 text-right">
              {Math.round((node.opacity ?? 1) * 100)}%
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
