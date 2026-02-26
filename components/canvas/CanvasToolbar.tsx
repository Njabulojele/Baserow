"use client";

import React from "react";
import { useCanvasStore, type ToolType } from "@/lib/stores/canvas-store";
import {
  MousePointer2,
  Hand,
  Type,
  StickyNote,
  Square,
  Pencil,
  ArrowUpRight,
  Image,
  PlusCircle,
  Frame,
  CheckSquare,
  Hash,
  Link2,
  Eraser,
  Grid3X3,
  Magnet,
  Undo2,
  Redo2,
  Trash2,
} from "lucide-react";

interface CanvasToolbarProps {
  onOpenEntityModal: () => void;
}

const tools: {
  tool: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut: string;
}[] = [
  {
    tool: "select",
    icon: <MousePointer2 className="w-4 h-4" />,
    label: "Select",
    shortcut: "V",
  },
  {
    tool: "pan",
    icon: <Hand className="w-4 h-4" />,
    label: "Pan",
    shortcut: "H",
  },
  {
    tool: "text",
    icon: <Type className="w-4 h-4" />,
    label: "Text",
    shortcut: "T",
  },
  {
    tool: "sticky",
    icon: <StickyNote className="w-4 h-4" />,
    label: "Sticky Note",
    shortcut: "S",
  },
  {
    tool: "shape",
    icon: <Square className="w-4 h-4" />,
    label: "Shape",
    shortcut: "R",
  },
  {
    tool: "pen",
    icon: <Pencil className="w-4 h-4" />,
    label: "Pen",
    shortcut: "P",
  },
  {
    tool: "eraser",
    icon: <Eraser className="w-4 h-4" />,
    label: "Eraser",
    shortcut: "E",
  },
  {
    tool: "arrow",
    icon: <ArrowUpRight className="w-4 h-4" />,
    label: "Arrow",
    shortcut: "A",
  },
  {
    tool: "section",
    icon: <Frame className="w-4 h-4" />,
    label: "Section",
    shortcut: "F",
  },
  {
    tool: "checklist",
    icon: <CheckSquare className="w-4 h-4" />,
    label: "Checklist",
    shortcut: "",
  },
  {
    tool: "numberBadge",
    icon: <Hash className="w-4 h-4" />,
    label: "Number",
    shortcut: "",
  },
  {
    tool: "embed",
    icon: <Link2 className="w-4 h-4" />,
    label: "Embed Link",
    shortcut: "",
  },
  {
    tool: "image",
    icon: <Image className="w-4 h-4" />,
    label: "Image",
    shortcut: "",
  },
];

export function CanvasToolbar({ onOpenEntityModal }: CanvasToolbarProps) {
  const {
    activeTool,
    setActiveTool,
    showGrid,
    snapToGrid,
    toggleGrid,
    toggleSnap,
    undo,
    redo,
    deleteSelectedNodes,
    selectedNodeIds,
    penColor,
    penThickness,
    setPenColor,
    setPenThickness,
  } = useCanvasStore();

  return (
    <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col gap-1 bg-[#1a1a1e]/95 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl">
      {tools.map(({ tool, icon, label, shortcut }) => (
        <button
          key={tool}
          onClick={() => setActiveTool(tool)}
          className={`relative w-9 h-9 flex items-center justify-center rounded-lg transition-all group ${
            activeTool === tool
              ? "bg-emerald-500/20 text-emerald-400"
              : "text-white/50 hover:bg-white/10 hover:text-white/80"
          }`}
          title={`${label}${shortcut ? ` (${shortcut})` : ""}`}
        >
          {icon}
          {/* Tooltip */}
          <div className="absolute left-12 px-2 py-1 bg-[#222226] rounded-md text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity border border-white/10 shadow-lg z-50">
            {label}
            {shortcut && (
              <span className="ml-1.5 text-white/30 font-mono">{shortcut}</span>
            )}
          </div>
        </button>
      ))}

      <div className="w-full h-px bg-white/10 my-1" />

      {/* Entity button */}
      <button
        onClick={onOpenEntityModal}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-white/50 hover:bg-emerald-500/20 hover:text-emerald-400 transition-all group relative"
        title="Attach Entity"
      >
        <PlusCircle className="w-4 h-4" />
        <div className="absolute left-12 px-2 py-1 bg-[#222226] rounded-md text-xs text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity border border-white/10 shadow-lg z-50">
          Attach Entity
        </div>
      </button>

      <div className="w-full h-px bg-white/10 my-1" />

      {/* Pen options (visible when pen/eraser active) */}
      {(activeTool === "pen" || activeTool === "eraser") && (
        <div className="flex flex-col gap-1 items-center px-0.5">
          {activeTool === "pen" && (
            <input
              type="color"
              value={penColor}
              onChange={(e) => setPenColor(e.target.value)}
              className="w-7 h-7 rounded border-none cursor-pointer bg-transparent"
              title="Pen color"
            />
          )}
          <input
            type="range"
            min={1}
            max={20}
            value={penThickness}
            onChange={(e) => setPenThickness(Number(e.target.value))}
            className="w-8 appearance-none bg-white/10 h-1 rounded-full accent-emerald-400"
            style={{
              writingMode: "vertical-lr" as React.CSSProperties["writingMode"],
              height: 50,
            }}
            title="Thickness"
          />
          <div className="w-full h-px bg-white/10 my-1" />
        </div>
      )}

      {/* Grid & Snap */}
      <button
        onClick={toggleGrid}
        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all group relative ${
          showGrid ? "text-white/70" : "text-white/30"
        } hover:bg-white/10`}
        title="Toggle Grid"
      >
        <Grid3X3 className="w-4 h-4" />
      </button>
      <button
        onClick={toggleSnap}
        className={`w-9 h-9 flex items-center justify-center rounded-lg transition-all group relative ${
          snapToGrid ? "text-emerald-400" : "text-white/30"
        } hover:bg-white/10`}
        title="Snap to Grid"
      >
        <Magnet className="w-4 h-4" />
      </button>

      <div className="w-full h-px bg-white/10 my-1" />

      {/* Undo / Redo */}
      <button
        onClick={undo}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white/70 transition-all"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="w-4 h-4" />
      </button>
      <button
        onClick={redo}
        className="w-9 h-9 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/10 hover:text-white/70 transition-all"
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="w-4 h-4" />
      </button>

      {/* Delete */}
      {selectedNodeIds.size > 0 && (
        <button
          onClick={deleteSelectedNodes}
          className="w-9 h-9 flex items-center justify-center rounded-lg text-red-400/70 hover:bg-red-500/20 hover:text-red-400 transition-all"
          title="Delete selected"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
