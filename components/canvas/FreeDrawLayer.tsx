"use client";

import React, { useCallback } from "react";
import { type DrawingPath, useCanvasStore } from "@/lib/stores/canvas-store";

interface FreeDrawLayerProps {
  drawings: DrawingPath[];
  currentPath: DrawingPath | null;
  arrowStart?: { x: number; y: number } | null;
  arrowEnd?: { x: number; y: number } | null;
}

export function FreeDrawLayer({
  drawings,
  currentPath,
  arrowStart,
  arrowEnd,
}: FreeDrawLayerProps) {
  const selectedDrawingId = useCanvasStore((s) => s.selectedDrawingId);
  const selectDrawing = useCanvasStore((s) => s.selectDrawing);
  const activeTool = useCanvasStore((s) => s.activeTool);

  const penPaths = currentPath ? [...drawings, currentPath] : drawings;
  const hasContent = penPaths.length > 0 || (arrowStart && arrowEnd);

  const handleArrowClick = useCallback(
    (e: React.MouseEvent, id: string) => {
      if (activeTool !== "select") return;
      e.stopPropagation();
      selectDrawing(id);
    },
    [activeTool, selectDrawing],
  );

  if (!hasContent) return null;

  // Offset for the large SVG
  const O = 10000;

  return (
    <svg
      className="absolute"
      style={{
        left: -O,
        top: -O,
        width: O * 2,
        height: O * 2,
        overflow: "visible",
        pointerEvents: "none",
      }}
    >
      <defs>
        <marker
          id="arrow-marker"
          markerWidth="12"
          markerHeight="8"
          refX="11"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 12 4 L 0 8 L 3 4 Z" fill="currentColor" />
        </marker>
        <marker
          id="arrow-marker-preview"
          markerWidth="12"
          markerHeight="8"
          refX="11"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 12 4 L 0 8 L 3 4 Z"
            fill="currentColor"
            opacity="0.5"
          />
        </marker>
        <marker
          id="arrow-marker-selected"
          markerWidth="12"
          markerHeight="8"
          refX="11"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path d="M 0 0 L 12 4 L 0 8 L 3 4 Z" fill="#3B82F6" />
        </marker>
      </defs>

      {/* Pen, eraser & arrow drawings */}
      {penPaths.map((path) => {
        if (path.tool === "arrow") {
          if (path.points.length < 2) return null;
          const start = path.points[0];
          const end = path.points[path.points.length - 1];
          const isSelected = selectedDrawingId === path.id;

          return (
            <g key={path.id}>
              {/* Invisible fat hit area for click detection */}
              <line
                x1={start.x + O}
                y1={start.y + O}
                x2={end.x + O}
                y2={end.y + O}
                stroke="transparent"
                strokeWidth={Math.max(path.thickness * 3, 16)}
                strokeLinecap="round"
                style={{
                  pointerEvents: activeTool === "select" ? "stroke" : "none",
                  cursor: "pointer",
                }}
                onClick={(e) => handleArrowClick(e, path.id)}
              />
              {/* Visible arrow line */}
              <line
                x1={start.x + O}
                y1={start.y + O}
                x2={end.x + O}
                y2={end.y + O}
                stroke={isSelected ? "#3B82F6" : path.color}
                strokeWidth={path.thickness}
                strokeLinecap="round"
                markerEnd={
                  isSelected
                    ? "url(#arrow-marker-selected)"
                    : "url(#arrow-marker)"
                }
                style={{
                  color: isSelected ? "#3B82F6" : path.color,
                  pointerEvents: "none",
                }}
              />
              {/* Selection endpoint handles */}
              {isSelected && (
                <>
                  <circle
                    cx={start.x + O}
                    cy={start.y + O}
                    r={5}
                    fill="#3B82F6"
                    stroke="#fff"
                    strokeWidth={1.5}
                    style={{ pointerEvents: "none" }}
                  />
                  <circle
                    cx={end.x + O}
                    cy={end.y + O}
                    r={5}
                    fill="#3B82F6"
                    stroke="#fff"
                    strokeWidth={1.5}
                    style={{ pointerEvents: "none" }}
                  />
                </>
              )}
            </g>
          );
        }

        if (path.points.length < 2) return null;
        const d = pathToSvgD(path.points);
        const isEraser = path.tool === "eraser";

        return (
          <path
            key={path.id}
            d={d}
            fill="none"
            stroke={isEraser ? "#0f0f11" : path.color}
            strokeWidth={path.thickness}
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity={isEraser ? 1 : 0.85}
            style={{ pointerEvents: "none" }}
          />
        );
      })}

      {/* Live arrow preview */}
      {arrowStart && arrowEnd && (
        <line
          x1={arrowStart.x + O}
          y1={arrowStart.y + O}
          x2={arrowEnd.x + O}
          y2={arrowEnd.y + O}
          stroke="#ffffff"
          strokeWidth={2}
          strokeLinecap="round"
          strokeDasharray="6 3"
          markerEnd="url(#arrow-marker-preview)"
          opacity={0.6}
          style={{ color: "#ffffff", pointerEvents: "none" }}
        />
      )}
    </svg>
  );
}

function pathToSvgD(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";
  const O = 10000;

  let d = `M ${points[0].x + O} ${points[0].y + O}`;

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2 + O;
    const yc = (points[i].y + points[i + 1].y) / 2 + O;
    d += ` Q ${points[i].x + O} ${points[i].y + O}, ${xc} ${yc}`;
  }

  const last = points[points.length - 1];
  d += ` L ${last.x + O} ${last.y + O}`;

  return d;
}
