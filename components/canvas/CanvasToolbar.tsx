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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface CanvasToolbarProps {
  onOpenEntityModal: () => void;
}

interface ToolItem {
  tool: ToolType;
  icon: React.ReactNode;
  label: string;
  shortcut?: string;
}

const cursorTools: ToolItem[] = [
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
];

const createTools: ToolItem[] = [
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
    tool: "section",
    icon: <Frame className="w-4 h-4" />,
    label: "Section",
    shortcut: "F",
  },
];

const drawTools: ToolItem[] = [
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
];

const extraTools: ToolItem[] = [
  {
    tool: "checklist",
    icon: <CheckSquare className="w-4 h-4" />,
    label: "Checklist",
  },
  { tool: "numberBadge", icon: <Hash className="w-4 h-4" />, label: "Number" },
  { tool: "embed", icon: <Link2 className="w-4 h-4" />, label: "Embed Link" },
  { tool: "image", icon: <Image className="w-4 h-4" />, label: "Image" },
];

function ToolButton({
  item,
  isActive,
  onClick,
}: {
  item: ToolItem;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onClick}
          className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
            isActive
              ? "bg-white/10 text-white"
              : "text-white/40 hover:bg-white/5 hover:text-white/70"
          }`}
        >
          {item.icon}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        className="font-mono text-[10px] uppercase tracking-widest"
      >
        {item.label}
        {item.shortcut && (
          <span className="ml-1.5 text-white/30">{item.shortcut}</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

function Divider() {
  return <div className="w-6 h-px bg-white/10 mx-auto my-0.5" />;
}

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
    <TooltipProvider delayDuration={200}>
      <div className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-0.5 bg-[#0a0c10]/90 backdrop-blur-xl rounded-2xl p-1.5 shadow-2xl shadow-black/40 max-h-[calc(100vh-6rem)] overflow-y-auto custom-scrollbar">
        {/* Cursor */}
        {cursorTools.map((item) => (
          <ToolButton
            key={item.tool}
            item={item}
            isActive={activeTool === item.tool}
            onClick={() => setActiveTool(item.tool)}
          />
        ))}

        <Divider />

        {/* Create */}
        {createTools.map((item) => (
          <ToolButton
            key={item.tool}
            item={item}
            isActive={activeTool === item.tool}
            onClick={() => setActiveTool(item.tool)}
          />
        ))}

        <Divider />

        {/* Draw */}
        {drawTools.map((item) => (
          <ToolButton
            key={item.tool}
            item={item}
            isActive={activeTool === item.tool}
            onClick={() => setActiveTool(item.tool)}
          />
        ))}

        {/* Pen options when pen or eraser active */}
        {(activeTool === "pen" || activeTool === "eraser") && (
          <div className="flex flex-col items-center gap-1 py-1">
            {activeTool === "pen" && (
              <input
                type="color"
                value={penColor}
                onChange={(e) => setPenColor(e.target.value)}
                className="w-6 h-6 rounded-full border-none cursor-pointer bg-transparent"
                title="Pen color"
              />
            )}
            <input
              type="range"
              min={1}
              max={20}
              value={penThickness}
              onChange={(e) => setPenThickness(Number(e.target.value))}
              className="appearance-none bg-transparent h-1 rounded-full accent-white/60"
              style={{
                writingMode:
                  "vertical-lr" as React.CSSProperties["writingMode"],
                height: 40,
                width: 4,
              }}
              title="Thickness"
            />
          </div>
        )}

        <Divider />

        {/* Extras */}
        {extraTools.map((item) => (
          <ToolButton
            key={item.tool}
            item={item}
            isActive={activeTool === item.tool}
            onClick={() => setActiveTool(item.tool)}
          />
        ))}

        {/* Entity */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onOpenEntityModal}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-white/40 hover:bg-white/5 hover:text-white/70 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="font-mono text-[10px] uppercase tracking-widest"
          >
            Attach Entity
          </TooltipContent>
        </Tooltip>

        <Divider />

        {/* Canvas controls */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleGrid}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                showGrid
                  ? "text-white/70 bg-white/5"
                  : "text-white/25 hover:bg-white/5 hover:text-white/50"
              }`}
            >
              <Grid3X3 className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="font-mono text-[10px] uppercase tracking-widest"
          >
            Grid
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={toggleSnap}
              className={`w-10 h-10 flex items-center justify-center rounded-lg transition-all ${
                snapToGrid
                  ? "text-white/70 bg-white/5"
                  : "text-white/25 hover:bg-white/5 hover:text-white/50"
              }`}
            >
              <Magnet className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="font-mono text-[10px] uppercase tracking-widest"
          >
            Snap
          </TooltipContent>
        </Tooltip>

        <Divider />

        {/* Undo / Redo */}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={undo}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-white/25 hover:bg-white/5 hover:text-white/50 transition-all"
            >
              <Undo2 className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="font-mono text-[10px] uppercase tracking-widest"
          >
            Undo <span className="text-white/30">⌘Z</span>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={redo}
              className="w-10 h-10 flex items-center justify-center rounded-lg text-white/25 hover:bg-white/5 hover:text-white/50 transition-all"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="right"
            className="font-mono text-[10px] uppercase tracking-widest"
          >
            Redo <span className="text-white/30">⌘Y</span>
          </TooltipContent>
        </Tooltip>

        {/* Delete */}
        {selectedNodeIds.size > 0 && (
          <>
            <Divider />
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={deleteSelectedNodes}
                  className="w-10 h-10 flex items-center justify-center rounded-lg text-red-500/50 hover:bg-red-500/10 hover:text-red-400 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent
                side="right"
                className="font-mono text-[10px] uppercase tracking-widest"
              >
                Delete
              </TooltipContent>
            </Tooltip>
          </>
        )}
      </div>
    </TooltipProvider>
  );
}
