"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  type CanvasNode as CanvasNodeType,
  useCanvasStore,
} from "@/lib/stores/canvas-store";
import {
  FolderOpen,
  CheckSquare,
  Users,
  Target,
  TrendingUp,
  UserPlus,
  Search,
  CalendarDays,
  Lock,
  ExternalLink,
  CheckCircle2,
  Circle,
  Link2,
} from "lucide-react";

interface CanvasNodeProps {
  node: CanvasNodeType;
  isSelected: boolean;
  onDragStart: (e: React.MouseEvent) => void;
  onResize: (e: React.MouseEvent, corner: string) => void;
  onSelect: (e: React.MouseEvent) => void;
}

export function CanvasNode({
  node,
  isSelected,
  onDragStart,
  onResize,
  onSelect,
}: CanvasNodeProps) {
  const [isEditing, setIsEditing] = useState(false);
  const textRef = useRef<HTMLTextAreaElement>(null);
  const updateNode = useCanvasStore((s) => s.updateNode);

  useEffect(() => {
    if (isEditing && textRef.current) {
      textRef.current.focus();
      textRef.current.select();
    }
  }, [isEditing]);

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (node.type === "entity") return; // entities don't inline-edit
    setIsEditing(true);
  };

  return (
    <div
      className="absolute select-none group"
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
        zIndex: node.zIndex,
        transform: node.rotation ? `rotate(${node.rotation}deg)` : undefined,
        transition: "box-shadow 0.15s ease",
      }}
      onMouseDown={(e) => {
        if (e.button === 0 && !isEditing) {
          onSelect(e);
          onDragStart(e);
        }
      }}
      onDoubleClick={handleDoubleClick}
    >
      {/* Node content */}
      <div
        className="w-full h-full overflow-hidden relative"
        style={{
          backgroundColor: node.bgColor || "transparent",
          borderColor: isSelected
            ? "#6EE7B7"
            : node.borderColor || "transparent",
          borderWidth: node.borderWidth ?? 0,
          borderStyle:
            (node.borderStyle as React.CSSProperties["borderStyle"]) || "solid",
          borderRadius: node.borderRadius ?? 0,
          opacity: node.opacity ?? 1,
          boxShadow: node.shadow
            ? "0 4px 20px rgba(0,0,0,0.3)"
            : isSelected
              ? "0 0 0 2px #6EE7B7"
              : undefined,
        }}
      >
        {/* Locked icon */}
        {node.locked && (
          <div className="absolute top-1 right-1 p-0.5 rounded bg-black/40 z-10">
            <Lock className="w-3 h-3 text-white/50" />
          </div>
        )}

        {/* Render by type */}
        {node.type === "text" && (
          <TextContent
            node={node}
            isEditing={isEditing}
            textRef={textRef}
            onDone={() => setIsEditing(false)}
          />
        )}
        {node.type === "sticky" && (
          <StickyContent
            node={node}
            isEditing={isEditing}
            textRef={textRef}
            onDone={() => setIsEditing(false)}
          />
        )}
        {node.type === "shape" && <ShapeContent node={node} />}
        {node.type === "entity" && <EntityContent node={node} />}
        {node.type === "section" && (
          <SectionContent
            node={node}
            isEditing={isEditing}
            textRef={textRef}
            onDone={() => setIsEditing(false)}
          />
        )}
        {node.type === "checklist" && <ChecklistContent node={node} />}
        {node.type === "numberBadge" && <NumberBadgeContent node={node} />}
        {node.type === "embed" && (
          <EmbedContent
            node={node}
            isEditing={isEditing}
            textRef={textRef}
            onDone={() => setIsEditing(false)}
          />
        )}
        {node.type === "image" && <ImageContent node={node} />}
      </div>

      {/* Resize handles */}
      {isSelected && !node.locked && (
        <>
          {["top-left", "top-right", "bottom-left", "bottom-right"].map(
            (corner) => (
              <div
                key={corner}
                className="absolute w-3 h-3 bg-emerald-400 border border-black rounded-full cursor-nwse-resize z-20"
                style={{
                  top: corner.includes("top") ? -5 : undefined,
                  bottom: corner.includes("bottom") ? -5 : undefined,
                  left: corner.includes("left") ? -5 : undefined,
                  right: corner.includes("right") ? -5 : undefined,
                  cursor:
                    corner === "top-left" || corner === "bottom-right"
                      ? "nwse-resize"
                      : "nesw-resize",
                }}
                onMouseDown={(e) => onResize(e, corner)}
              />
            ),
          )}
        </>
      )}
    </div>
  );
}

// ─── Text ───
function TextContent({
  node,
  isEditing,
  textRef,
  onDone,
}: {
  node: CanvasNodeType;
  isEditing: boolean;
  textRef: React.RefObject<HTMLTextAreaElement | null>;
  onDone: () => void;
}) {
  const updateNode = useCanvasStore((s) => s.updateNode);

  if (isEditing) {
    return (
      <textarea
        ref={textRef}
        defaultValue={node.text || ""}
        onBlur={(e) => {
          updateNode(node.id, { text: e.target.value });
          onDone();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
        className="w-full h-full bg-transparent resize-none p-3 outline-none"
        style={{
          color: node.textColor || "#f5f5f4",
          fontSize: node.fontSize || 16,
          fontFamily: node.fontFamily || "Inter",
          fontWeight: node.fontWeight || "normal",
          fontStyle: node.fontStyle || "normal",
        }}
      />
    );
  }

  return (
    <div
      className="w-full h-full p-3 whitespace-pre-wrap break-words overflow-hidden"
      style={{
        color: node.textColor || "#f5f5f4",
        fontSize: node.fontSize || 16,
        fontFamily: node.fontFamily || "Inter",
        fontWeight: node.fontWeight || "normal",
        fontStyle: node.fontStyle || "normal",
      }}
    >
      {node.text || "Double-click to edit"}
    </div>
  );
}

// ─── Sticky ───
function StickyContent({
  node,
  isEditing,
  textRef,
  onDone,
}: {
  node: CanvasNodeType;
  isEditing: boolean;
  textRef: React.RefObject<HTMLTextAreaElement | null>;
  onDone: () => void;
}) {
  const updateNode = useCanvasStore((s) => s.updateNode);

  if (isEditing) {
    return (
      <textarea
        ref={textRef}
        defaultValue={node.text || ""}
        onBlur={(e) => {
          updateNode(node.id, { text: e.target.value });
          onDone();
        }}
        onKeyDown={(e) => {
          if (e.key === "Escape") onDone();
        }}
        className="w-full h-full bg-transparent resize-none p-4 outline-none"
        style={{
          color: node.textColor || "#1a1a1a",
          fontSize: node.fontSize || 14,
          fontFamily: node.fontFamily || "Inter",
        }}
        placeholder="Type a note..."
      />
    );
  }

  return (
    <div
      className="w-full h-full p-4 whitespace-pre-wrap break-words overflow-hidden"
      style={{
        color: node.textColor || "#1a1a1a",
        fontSize: node.fontSize || 14,
        fontFamily: node.fontFamily || "Inter",
      }}
    >
      {node.text || (
        <span className="opacity-50 italic">Click to add note...</span>
      )}
    </div>
  );
}

// ─── Shape ───
function ShapeContent({ node }: { node: CanvasNodeType }) {
  const shapeSvg = () => {
    const fill = node.fillColor || "#2a2a30";
    const stroke = node.borderColor || "#6EE7B7";
    const sw = node.borderWidth || 2;

    switch (node.shapeType) {
      case "circle":
        return (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <ellipse
              cx="50"
              cy="50"
              rx="48"
              ry="48"
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />
          </svg>
        );
      case "diamond":
        return (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polygon
              points="50,2 98,50 50,98 2,50"
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />
          </svg>
        );
      case "triangle":
        return (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polygon
              points="50,5 95,95 5,95"
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />
          </svg>
        );
      case "hexagon":
        return (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <polygon
              points="50,3 93,25 93,75 50,97 7,75 7,25"
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />
          </svg>
        );
      default: // rectangle / roundedRect
        return (
          <svg
            width="100%"
            height="100%"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
          >
            <rect
              x="2"
              y="2"
              width="96"
              height="96"
              rx={node.shapeType === "roundedRect" ? 12 : 0}
              fill={fill}
              stroke={stroke}
              strokeWidth={sw}
            />
          </svg>
        );
    }
  };

  return (
    <div className="w-full h-full flex items-center justify-center">
      {shapeSvg()}
    </div>
  );
}

// ─── Entity (the star feature) ───
function EntityContent({ node }: { node: CanvasNodeType }) {
  const data = node.entityData || {};
  const icon = getEntityIcon(node.entityType!);
  const color = node.bgColor || "#3B82F6";

  return (
    <div
      className="w-full h-full p-3 flex flex-col gap-2 rounded-xl overflow-hidden"
      style={{
        background: `linear-gradient(135deg, ${color}15, ${color}05)`,
        borderLeft: `3px solid ${color}`,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2">
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${color}25` }}
        >
          {React.cloneElement(icon, {
            className: "w-3.5 h-3.5",
            style: { color },
          })}
        </div>
        <div className="flex-1 min-w-0">
          <span
            className="text-[10px] uppercase tracking-wider font-semibold"
            style={{ color }}
          >
            {node.entityType}
          </span>
          <div className="text-xs font-semibold text-white truncate">
            {(data.name as string) ||
              (data.title as string) ||
              (data.firstName
                ? `${data.firstName} ${data.lastName}`
                : "Entity")}
          </div>
        </div>
        <a
          href={getEntityLink(node.entityType!, node.entityId!)}
          className="p-1 rounded hover:bg-white/10 transition-colors"
          title="Open in dashboard"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3 text-white/40" />
        </a>
      </div>

      {/* Body */}
      <div className="flex-1 flex flex-col gap-1.5 text-[11px] text-white/60">
        {Boolean(data.status) && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/30">Status:</span>
            <span
              className="px-1.5 py-0.5 rounded text-[10px] font-medium"
              style={{ backgroundColor: `${color}20`, color }}
            >
              {String(data.status).replace(/_/g, " ")}
            </span>
          </div>
        )}
        {data.priority !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/30">Priority:</span>
            <span className="capitalize">{String(data.priority)}</span>
          </div>
        )}
        {data.completionPercentage !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/30">Progress:</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${data.completionPercentage || 0}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="text-[10px]">
              {Math.round(Number(data.completionPercentage) || 0)}%
            </span>
          </div>
        )}
        {data.progress !== undefined && !data.completionPercentage && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/30">Progress:</span>
            <div className="flex-1 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Number(data.progress) * 100}%`,
                  backgroundColor: color,
                }}
              />
            </div>
            <span className="text-[10px]">
              {Math.round(Number(data.progress) * 100)}%
            </span>
          </div>
        )}
        {data.value !== undefined && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/30">Value:</span>
            <span className="font-medium text-emerald-400">
              R{Number(data.value).toLocaleString()}
            </span>
          </div>
        )}
        {Boolean(data.email) && (
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-white/30">Email:</span>
            <span className="truncate">{String(data.email)}</span>
          </div>
        )}
        {Boolean(data.companyName) && !data.name && (
          <div className="flex items-center gap-1.5 truncate">
            <span className="text-white/30">Company:</span>
            <span className="truncate">{String(data.companyName)}</span>
          </div>
        )}
        {Boolean(data.client) &&
          typeof data.client === "object" &&
          Boolean((data.client as Record<string, unknown>).name) && (
            <div className="flex items-center gap-1.5 truncate">
              <span className="text-white/30">Client:</span>
              <span className="truncate">
                {String((data.client as Record<string, unknown>).name)}
              </span>
            </div>
          )}
        {Boolean(data.dueDate) && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/30">Due:</span>
            <span>{new Date(String(data.dueDate)).toLocaleDateString()}</span>
          </div>
        )}
        {Boolean(data.deadline) && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/30">Deadline:</span>
            <span>{new Date(String(data.deadline)).toLocaleDateString()}</span>
          </div>
        )}
        {Boolean(data.scheduledAt) && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/30">Scheduled:</span>
            <span>
              {new Date(String(data.scheduledAt)).toLocaleDateString()}
            </span>
          </div>
        )}
        {Boolean(data.scope) && (
          <div className="flex items-center gap-1.5">
            <span className="text-white/30">Scope:</span>
            <span className="capitalize">
              {String(data.scope).replace(/_/g, " ").toLowerCase()}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section ───
function SectionContent({
  node,
  isEditing,
  textRef,
  onDone,
}: {
  node: CanvasNodeType;
  isEditing: boolean;
  textRef: React.RefObject<HTMLTextAreaElement | null>;
  onDone: () => void;
}) {
  const updateNode = useCanvasStore((s) => s.updateNode);

  return (
    <div className="w-full h-full p-4">
      {isEditing ? (
        <input
          ref={textRef as any}
          defaultValue={node.sectionTitle || "Section"}
          onBlur={(e) => {
            updateNode(node.id, { sectionTitle: e.target.value });
            onDone();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") onDone();
          }}
          className="bg-transparent border-none outline-none text-sm font-bold"
          style={{ color: node.sectionColor || "#6EE7B7" }}
        />
      ) : (
        <span
          className="text-sm font-bold"
          style={{ color: node.sectionColor || "#6EE7B7" }}
        >
          {node.sectionTitle || "Section"}
        </span>
      )}
    </div>
  );
}

// ─── Checklist ───
function ChecklistContent({ node }: { node: CanvasNodeType }) {
  const updateNode = useCanvasStore((s) => s.updateNode);
  const items = node.checklistItems || [];
  const completed = items.filter((i) => i.checked).length;

  const toggleItem = (id: string) => {
    const newItems = items.map((i) =>
      i.id === id ? { ...i, checked: !i.checked } : i,
    );
    updateNode(node.id, { checklistItems: newItems });
  };

  return (
    <div className="w-full h-full p-3 flex flex-col gap-2">
      <div className="text-xs font-semibold text-white/90 flex items-center justify-between">
        <span>{node.text || "Checklist"}</span>
        <span className="text-white/40">
          {completed}/{items.length}
        </span>
      </div>
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-400 rounded-full transition-all"
          style={{
            width: `${items.length > 0 ? (completed / items.length) * 100 : 0}%`,
          }}
        />
      </div>
      <div className="flex-1 overflow-auto space-y-1">
        {items.map((item) => (
          <button
            key={item.id}
            className="flex items-center gap-2 text-xs w-full text-left hover:bg-white/5 rounded px-1 py-0.5"
            onClick={(e) => {
              e.stopPropagation();
              toggleItem(item.id);
            }}
          >
            {item.checked ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            ) : (
              <Circle className="w-3.5 h-3.5 text-white/30 shrink-0" />
            )}
            <span
              className={
                item.checked ? "line-through text-white/30" : "text-white/70"
              }
            >
              {item.text}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Number Badge ───
function NumberBadgeContent({ node }: { node: CanvasNodeType }) {
  return (
    <div
      className="w-full h-full rounded-full flex items-center justify-center font-bold text-lg"
      style={{
        backgroundColor: node.badgeColor || "#6EE7B7",
        color: "#0f0f11",
      }}
    >
      {node.badgeNumber || 1}
    </div>
  );
}

// ─── Embed ───
function EmbedContent({
  node,
  isEditing,
  textRef,
  onDone,
}: {
  node: CanvasNodeType;
  isEditing: boolean;
  textRef: React.RefObject<HTMLTextAreaElement | null>;
  onDone: () => void;
}) {
  const updateNode = useCanvasStore((s) => s.updateNode);

  return (
    <div className="w-full h-full p-3 flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <Link2 className="w-4 h-4 text-white/40 shrink-0" />
        {isEditing ? (
          <input
            ref={textRef as any}
            defaultValue={node.embedUrl || ""}
            placeholder="Paste URL..."
            onBlur={(e) => {
              updateNode(node.id, {
                embedUrl: e.target.value,
                embedTitle: e.target.value
                  ? new URL(e.target.value).hostname
                  : "Link",
              });
              onDone();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") onDone();
            }}
            className="flex-1 bg-transparent border-none outline-none text-xs text-white/70"
          />
        ) : (
          <span className="text-xs font-medium text-white/80 truncate">
            {node.embedTitle || "Link"}
          </span>
        )}
      </div>
      {node.embedUrl && (
        <a
          href={node.embedUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-blue-400 hover:underline truncate"
          onClick={(e) => e.stopPropagation()}
        >
          {node.embedUrl}
        </a>
      )}
      <p className="text-[11px] text-white/40 line-clamp-2">
        {node.embedDescription || "Double-click to add a URL"}
      </p>
    </div>
  );
}

// ─── Image ───
function ImageContent({ node }: { node: CanvasNodeType }) {
  if (!node.imageUrl) {
    return (
      <div className="w-full h-full flex items-center justify-center text-white/30 text-xs">
        No image
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={node.imageUrl}
      alt="Canvas image"
      className="w-full h-full object-cover"
      draggable={false}
    />
  );
}

// ─── Helpers ───
function getEntityIcon(type: string) {
  switch (type) {
    case "project":
      return <FolderOpen />;
    case "task":
      return <CheckSquare />;
    case "client":
      return <Users />;
    case "goal":
      return <Target />;
    case "deal":
      return <TrendingUp />;
    case "lead":
      return <UserPlus />;
    case "research":
      return <Search />;
    case "meeting":
      return <CalendarDays />;
    default:
      return <FolderOpen />;
  }
}

function getEntityLink(type: string, id: string) {
  switch (type) {
    case "project":
      return `/projects/${id}`;
    case "task":
      return `/tasks`;
    case "client":
      return `/clients/${id}`;
    case "goal":
      return `/strategy`;
    case "deal":
      return `/crm/pipeline`;
    case "lead":
      return `/crm/leads`;
    case "research":
      return `/research`;
    case "meeting":
      return `/calendar`;
    default:
      return `/dashboard`;
  }
}
