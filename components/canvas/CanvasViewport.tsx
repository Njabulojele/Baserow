"use client";

import React, { useRef, useCallback, useEffect, useState } from "react";
import { useCanvasStore } from "@/lib/stores/canvas-store";
import { CanvasNode as CanvasNodeComponent } from "./CanvasNode";
import { FreeDrawLayer } from "./FreeDrawLayer";
import { ConnectionLayer } from "./ConnectionLayer";

export function CanvasViewport() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const isPanningRef = useRef(false);
  const spaceDownRef = useRef(false);
  const [selectionRect, setSelectionRect] = useState<{
    startX: number;
    startY: number;
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const {
    nodes,
    connections,
    viewport,
    activeTool,
    selectedNodeIds,
    showGrid,
    setViewport,
    setIsPanning,
    selectNode,
    deselectAll,
    addNode,
    updateNode,
    startDrawing,
    continueDrawing,
    endDrawing,
    drawings,
    currentDrawingPath,
    isDrawing,
    activeShapeType,
    selectNodesInRect,
    pushHistory,
  } = useCanvasStore();

  // ---- Pan / Zoom ----
  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault();
      if (e.ctrlKey || e.metaKey) {
        // Zoom
        const delta = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.max(0.1, Math.min(5, viewport.zoom * delta));
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;
        const scale = newZoom / viewport.zoom;
        setViewport({
          zoom: newZoom,
          x: mx - (mx - viewport.x) * scale,
          y: my - (my - viewport.y) * scale,
        });
      } else {
        // Pan
        setViewport({
          x: viewport.x - e.deltaX,
          y: viewport.y - e.deltaY,
        });
      }
    },
    [viewport, setViewport],
  );

  // Space key for panning
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (
        e.code === "Space" &&
        !(e.target as HTMLElement).matches("input,textarea")
      ) {
        e.preventDefault();
        spaceDownRef.current = true;
      }
    };
    const up = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDownRef.current = false;
        isPanningRef.current = false;
        setIsPanning(false);
      }
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, [setIsPanning]);

  // Convert screen coords to canvas coords
  const screenToCanvas = useCallback(
    (sx: number, sy: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: (sx - rect.left - viewport.x) / viewport.zoom,
        y: (sy - rect.top - viewport.y) / viewport.zoom,
      };
    },
    [viewport],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (
        e.button === 1 ||
        (e.button === 0 && (activeTool === "pan" || spaceDownRef.current))
      ) {
        // Middle-click or Pan tool or space+click
        isPanningRef.current = true;
        setIsPanning(true);
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        e.preventDefault();
        return;
      }

      const pos = screenToCanvas(e.clientX, e.clientY);

      if (activeTool === "pen" || activeTool === "eraser") {
        startDrawing(pos);
        return;
      }

      if (activeTool === "select" && e.button === 0) {
        // Start lasso selection
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        setSelectionRect({
          startX: e.clientX - rect.left,
          startY: e.clientY - rect.top,
          x: e.clientX - rect.left,
          y: e.clientY - rect.top,
          width: 0,
          height: 0,
        });
        deselectAll();
        return;
      }

      // Place new node
      if (
        [
          "text",
          "sticky",
          "shape",
          "section",
          "checklist",
          "numberBadge",
          "embed",
        ].includes(activeTool)
      ) {
        const nodeDefaults = getNodeDefaults(activeTool, activeShapeType, pos);
        addNode(nodeDefaults);
        useCanvasStore.getState().setActiveTool("select");
      }
    },
    [
      activeTool,
      screenToCanvas,
      setIsPanning,
      deselectAll,
      addNode,
      startDrawing,
      activeShapeType,
    ],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isPanningRef.current) {
        const dx = e.clientX - lastMouseRef.current.x;
        const dy = e.clientY - lastMouseRef.current.y;
        setViewport({
          x: viewport.x + dx,
          y: viewport.y + dy,
        });
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
        return;
      }

      if ((activeTool === "pen" || activeTool === "eraser") && isDrawing) {
        const pos = screenToCanvas(e.clientX, e.clientY);
        continueDrawing(pos);
        return;
      }

      if (selectionRect) {
        const rect = containerRef.current?.getBoundingClientRect();
        if (!rect) return;
        const curX = e.clientX - rect.left;
        const curY = e.clientY - rect.top;
        setSelectionRect({
          ...selectionRect,
          x: Math.min(selectionRect.startX, curX),
          y: Math.min(selectionRect.startY, curY),
          width: Math.abs(curX - selectionRect.startX),
          height: Math.abs(curY - selectionRect.startY),
        });
      }
    },
    [
      viewport,
      setViewport,
      activeTool,
      isDrawing,
      screenToCanvas,
      continueDrawing,
      selectionRect,
    ],
  );

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      setIsPanning(false);
    }

    if ((activeTool === "pen" || activeTool === "eraser") && isDrawing) {
      endDrawing();
    }

    if (selectionRect && selectionRect.width > 5 && selectionRect.height > 5) {
      // Convert selection rect to canvas coords
      const topLeft = screenToCanvas(
        selectionRect.x +
          (containerRef.current?.getBoundingClientRect()?.left || 0),
        selectionRect.y +
          (containerRef.current?.getBoundingClientRect()?.top || 0),
      );
      const bottomRight = screenToCanvas(
        selectionRect.x +
          selectionRect.width +
          (containerRef.current?.getBoundingClientRect()?.left || 0),
        selectionRect.y +
          selectionRect.height +
          (containerRef.current?.getBoundingClientRect()?.top || 0),
      );
      selectNodesInRect({
        x: topLeft.x,
        y: topLeft.y,
        width: bottomRight.x - topLeft.x,
        height: bottomRight.y - topLeft.y,
      });
    }
    setSelectionRect(null);
  }, [
    activeTool,
    isDrawing,
    endDrawing,
    setIsPanning,
    selectionRect,
    screenToCanvas,
    selectNodesInRect,
  ]);

  // --- Node dragging ---
  const handleNodeDragStart = useCallback(
    (nodeId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.locked) return;

      if (!selectedNodeIds.has(nodeId)) {
        selectNode(nodeId, e.shiftKey);
      }

      const startX = e.clientX;
      const startY = e.clientY;
      const startPositions = nodes
        .filter((n) => selectedNodeIds.has(n.id) || n.id === nodeId)
        .map((n) => ({ id: n.id, x: n.x, y: n.y }));

      const onMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startX) / viewport.zoom;
        const dy = (ev.clientY - startY) / viewport.zoom;
        startPositions.forEach((p) => {
          updateNode(p.id, {
            x: useCanvasStore.getState().snapToGrid
              ? Math.round((p.x + dx) / 20) * 20
              : p.x + dx,
            y: useCanvasStore.getState().snapToGrid
              ? Math.round((p.y + dy) / 20) * 20
              : p.y + dy,
          });
        });
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        pushHistory();
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [
      nodes,
      selectedNodeIds,
      viewport.zoom,
      selectNode,
      updateNode,
      pushHistory,
    ],
  );

  // --- Node resize ---
  const handleNodeResize = useCallback(
    (nodeId: string, e: React.MouseEvent, corner: string) => {
      e.stopPropagation();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node || node.locked) return;

      const startX = e.clientX;
      const startY = e.clientY;
      const startW = node.width;
      const startH = node.height;
      const startNX = node.x;
      const startNY = node.y;

      const onMove = (ev: MouseEvent) => {
        const dx = (ev.clientX - startX) / viewport.zoom;
        const dy = (ev.clientY - startY) / viewport.zoom;
        let newX = startNX;
        let newY = startNY;
        let newW = startW;
        let newH = startH;

        if (corner.includes("right")) newW = Math.max(60, startW + dx);
        if (corner.includes("bottom")) newH = Math.max(40, startH + dy);
        if (corner.includes("left")) {
          newW = Math.max(60, startW - dx);
          newX = startNX + (startW - newW);
        }
        if (corner.includes("top")) {
          newH = Math.max(40, startH - dy);
          newY = startNY + (startH - newH);
        }

        updateNode(nodeId, { x: newX, y: newY, width: newW, height: newH });
      };

      const onUp = () => {
        window.removeEventListener("mousemove", onMove);
        window.removeEventListener("mouseup", onUp);
        pushHistory();
      };

      window.addEventListener("mousemove", onMove);
      window.addEventListener("mouseup", onUp);
    },
    [nodes, viewport.zoom, updateNode, pushHistory],
  );

  const cursorStyle =
    activeTool === "pan" || spaceDownRef.current
      ? "grab"
      : activeTool === "pen"
        ? "crosshair"
        : activeTool === "eraser"
          ? "cell"
          : "default";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{ cursor: cursorStyle }}
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Grid background */}
      {showGrid && (
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, rgba(255,255,255,0.06) 1px, transparent 1px)`,
            backgroundSize: `${20 * viewport.zoom}px ${20 * viewport.zoom}px`,
            backgroundPosition: `${viewport.x}px ${viewport.y}px`,
          }}
        />
      )}

      {/* Transform container */}
      <div
        ref={canvasRef}
        style={{
          transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
          transformOrigin: "0 0",
          position: "absolute",
          top: 0,
          left: 0,
          willChange: "transform",
        }}
      >
        {/* Connections */}
        <ConnectionLayer nodes={nodes} connections={connections} />

        {/* Free draw */}
        <FreeDrawLayer drawings={drawings} currentPath={currentDrawingPath} />

        {/* Nodes */}
        {nodes.map((node) => (
          <CanvasNodeComponent
            key={node.id}
            node={node}
            isSelected={selectedNodeIds.has(node.id)}
            onDragStart={(e: React.MouseEvent) =>
              handleNodeDragStart(node.id, e)
            }
            onResize={(e: React.MouseEvent, corner: string) =>
              handleNodeResize(node.id, e, corner)
            }
            onSelect={(e: React.MouseEvent) => {
              e.stopPropagation();
              selectNode(node.id, e.shiftKey);
            }}
          />
        ))}
      </div>

      {/* Selection rectangle */}
      {selectionRect && selectionRect.width > 2 && (
        <div
          className="absolute border border-blue-400/50 bg-blue-400/10 pointer-events-none rounded-sm"
          style={{
            left: selectionRect.x,
            top: selectionRect.y,
            width: selectionRect.width,
            height: selectionRect.height,
          }}
        />
      )}

      {/* Zoom indicator */}
      <div className="absolute bottom-4 right-4 flex items-center gap-1 bg-[#1a1a1e] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white/50 z-10">
        <button
          onClick={() => useCanvasStore.getState().zoomOut()}
          className="hover:text-white px-1"
        >
          −
        </button>
        <span className="w-10 text-center font-mono">
          {Math.round(viewport.zoom * 100)}%
        </span>
        <button
          onClick={() => useCanvasStore.getState().zoomIn()}
          className="hover:text-white px-1"
        >
          +
        </button>
        <div className="w-px h-3 bg-white/10 mx-1" />
        <button
          onClick={() => useCanvasStore.getState().resetZoom()}
          className="hover:text-white px-1"
        >
          Reset
        </button>
      </div>
    </div>
  );
}

function getNodeDefaults(
  tool: string,
  shapeType: string,
  pos: { x: number; y: number },
) {
  const base = { x: pos.x, y: pos.y };

  switch (tool) {
    case "text":
      return {
        ...base,
        type: "text" as const,
        width: 240,
        height: 60,
        text: "Double-click to edit",
        fontSize: 16,
        fontFamily: "Inter",
        textColor: "#f5f5f4",
        bgColor: "#1e1e22",
        borderColor: "#333338",
        borderWidth: 1,
        borderRadius: 8,
        borderStyle: "solid",
      };
    case "sticky":
      return {
        ...base,
        type: "sticky" as const,
        width: 200,
        height: 200,
        text: "",
        fontSize: 14,
        fontFamily: "Inter",
        textColor: "#1a1a1a",
        bgColor: randomStickyColor(),
        borderRadius: 4,
        rotation: Math.random() * 6 - 3,
        shadow: true,
      };
    case "shape":
      return {
        ...base,
        type: "shape" as const,
        width: 160,
        height: 120,
        shapeType: shapeType as import("@/lib/stores/canvas-store").ShapeType,
        fillColor: "#2a2a30",
        borderColor: "#6EE7B7",
        borderWidth: 2,
        opacity: 1,
      };
    case "section":
      return {
        ...base,
        type: "section" as const,
        width: 500,
        height: 400,
        sectionTitle: "Section",
        sectionColor: "#6EE7B7",
        bgColor: "rgba(110,231,183,0.05)",
        borderColor: "rgba(110,231,183,0.2)",
        borderWidth: 2,
        borderRadius: 12,
        borderStyle: "dashed",
      };
    case "checklist":
      return {
        ...base,
        type: "checklist" as const,
        width: 260,
        height: 200,
        bgColor: "#1e1e22",
        borderColor: "#333338",
        borderWidth: 1,
        borderRadius: 12,
        text: "Checklist",
        checklistItems: [
          { id: "1", text: "Item 1", checked: false },
          { id: "2", text: "Item 2", checked: false },
        ],
      };
    case "numberBadge":
      return {
        ...base,
        type: "numberBadge" as const,
        width: 48,
        height: 48,
        badgeNumber: 1,
        badgeColor: "#6EE7B7",
      };
    case "embed":
      return {
        ...base,
        type: "embed" as const,
        width: 300,
        height: 120,
        embedUrl: "",
        embedTitle: "Link",
        embedDescription: "Paste a URL",
        bgColor: "#1e1e22",
        borderColor: "#333338",
        borderWidth: 1,
        borderRadius: 12,
      };
    default:
      return {
        ...base,
        type: "text" as const,
        width: 200,
        height: 60,
        text: "New node",
      };
  }
}

function randomStickyColor() {
  const colors = [
    "#FEF08A",
    "#FCA5A5",
    "#86EFAC",
    "#93C5FD",
    "#C4B5FD",
    "#FDBA74",
    "#F9A8D4",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}
