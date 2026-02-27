"use client";

import React from "react";
import { type DrawingPath } from "@/lib/stores/canvas-store";

interface FreeDrawLayerProps {
  drawings: DrawingPath[];
  currentPath: DrawingPath | null;
}

export function FreeDrawLayer({ drawings, currentPath }: FreeDrawLayerProps) {
  const allPaths = currentPath ? [...drawings, currentPath] : drawings;

  if (allPaths.length === 0) return null;

  // Calculate bounding box for the SVG (large enough to cover the canvas)
  return (
    <svg
      className="absolute pointer-events-none"
      style={{
        left: -10000,
        top: -10000,
        width: 20000,
        height: 20000,
        overflow: "visible",
      }}
    >
      {allPaths.map((path) => {
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
          />
        );
      })}
    </svg>
  );
}

function pathToSvgD(points: { x: number; y: number }[]): string {
  if (points.length < 2) return "";

  // Use quadratic bezier curves for smooth drawing
  let d = `M ${points[0].x + 10000} ${points[0].y + 10000}`;

  for (let i = 1; i < points.length - 1; i++) {
    const xc = (points[i].x + points[i + 1].x) / 2 + 10000;
    const yc = (points[i].y + points[i + 1].y) / 2 + 10000;
    d += ` Q ${points[i].x + 10000} ${points[i].y + 10000}, ${xc} ${yc}`;
  }

  // Last point
  const last = points[points.length - 1];
  d += ` L ${last.x + 10000} ${last.y + 10000}`;

  return d;
}
