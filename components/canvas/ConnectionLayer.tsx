"use client";

import React from "react";
import { type CanvasNode, type Connection } from "@/lib/stores/canvas-store";

interface ConnectionLayerProps {
  nodes: CanvasNode[];
  connections: Connection[];
}

export function ConnectionLayer({ nodes, connections }: ConnectionLayerProps) {
  if (connections.length === 0) return null;

  const getPortPosition = (node: CanvasNode, side: string) => {
    switch (side) {
      case "top":
        return { x: node.x + node.width / 2, y: node.y };
      case "right":
        return { x: node.x + node.width, y: node.y + node.height / 2 };
      case "bottom":
        return { x: node.x + node.width / 2, y: node.y + node.height };
      case "left":
        return { x: node.x, y: node.y + node.height / 2 };
      default:
        return { x: node.x + node.width / 2, y: node.y + node.height / 2 };
    }
  };

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
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#6EE7B7" />
        </marker>
        <marker
          id="arrowhead-filled"
          markerWidth="10"
          markerHeight="7"
          refX="10"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#6EE7B7" />
        </marker>
      </defs>

      {connections.map((conn) => {
        const fromNode = nodes.find((n) => n.id === conn.fromNodeId);
        const toNode = nodes.find((n) => n.id === conn.toNodeId);
        if (!fromNode || !toNode) return null;

        const from = getPortPosition(fromNode, conn.fromSide);
        const to = getPortPosition(toNode, conn.toSide);

        // Offset for the large SVG
        const ox = 10000;
        const oy = 10000;

        let pathD = "";
        if (conn.style === "straight") {
          pathD = `M ${from.x + ox} ${from.y + oy} L ${to.x + ox} ${to.y + oy}`;
        } else if (conn.style === "elbow") {
          const mx = (from.x + to.x) / 2 + ox;
          pathD = `M ${from.x + ox} ${from.y + oy} L ${mx} ${from.y + oy} L ${mx} ${to.y + oy} L ${to.x + ox} ${to.y + oy}`;
        } else {
          // Bezier
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const cx1 = from.x + dx * 0.4 + ox;
          const cy1 = from.y + oy;
          const cx2 = to.x - dx * 0.4 + ox;
          const cy2 = to.y + oy;
          pathD = `M ${from.x + ox} ${from.y + oy} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${to.x + ox} ${to.y + oy}`;
        }

        return (
          <g key={conn.id}>
            <path
              d={pathD}
              fill="none"
              stroke={conn.color || "#6EE7B7"}
              strokeWidth={conn.thickness || 2}
              strokeDasharray={conn.animated ? "8 4" : undefined}
              markerEnd={
                conn.arrowHead !== "none" ? "url(#arrowhead)" : undefined
              }
            />
            {conn.label && (
              <text
                x={(from.x + to.x) / 2 + ox}
                y={(from.y + to.y) / 2 + oy - 8}
                textAnchor="middle"
                fill="#fff"
                fontSize="11"
                opacity="0.7"
                fontFamily="Inter, sans-serif"
              >
                {conn.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
