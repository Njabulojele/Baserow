"use client";

import { create } from "zustand";

// ──────────────── Types ────────────────

export type NodeType =
  | "text"
  | "sticky"
  | "image"
  | "shape"
  | "entity"
  | "section"
  | "checklist"
  | "numberBadge"
  | "embed";

export type ShapeType =
  | "rectangle"
  | "roundedRect"
  | "circle"
  | "diamond"
  | "triangle"
  | "hexagon";

export type EntityType =
  | "project"
  | "task"
  | "client"
  | "goal"
  | "deal"
  | "lead"
  | "research"
  | "meeting";

export type ToolType =
  | "select"
  | "pan"
  | "text"
  | "sticky"
  | "shape"
  | "pen"
  | "arrow"
  | "image"
  | "entity"
  | "section"
  | "checklist"
  | "numberBadge"
  | "embed"
  | "eraser";

export interface CanvasNode {
  id: string;
  type: NodeType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  locked?: boolean;
  zIndex: number;
  // Content by type
  text?: string;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: string;
  fontStyle?: string;
  textDecoration?: string;
  textColor?: string;
  bgColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderStyle?: string;
  borderRadius?: number;
  opacity?: number;
  shadow?: boolean;
  // Shape
  shapeType?: ShapeType;
  fillColor?: string;
  // Image
  imageUrl?: string;
  // Entity
  entityType?: EntityType;
  entityId?: string;
  entityData?: Record<string, unknown>;
  // Section
  sectionTitle?: string;
  sectionColor?: string;
  // Checklist
  checklistItems?: { id: string; text: string; checked: boolean }[];
  // Number badge
  badgeNumber?: number;
  badgeColor?: string;
  // Embed
  embedUrl?: string;
  embedTitle?: string;
  embedDescription?: string;
  // Group
  groupId?: string;
}

export interface Connection {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  fromSide: "top" | "right" | "bottom" | "left";
  toSide: "top" | "right" | "bottom" | "left";
  style: "bezier" | "straight" | "elbow";
  color: string;
  thickness: number;
  arrowHead: "none" | "arrow" | "filled" | "open";
  label?: string;
  animated?: boolean;
}

export interface DrawingPath {
  id: string;
  points: { x: number; y: number }[];
  color: string;
  thickness: number;
  tool: "pen" | "eraser";
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

export interface BoardData {
  nodes: CanvasNode[];
  connections: Connection[];
  drawings: DrawingPath[];
  viewport: Viewport;
}

// ──────────────── State ────────────────

interface CanvasState {
  // Board data
  nodes: CanvasNode[];
  connections: Connection[];
  drawings: DrawingPath[];
  viewport: Viewport;

  // UI state
  activeTool: ToolType;
  selectedNodeIds: Set<string>;
  selectedConnectionId: string | null;
  activeShapeType: ShapeType;
  isPanning: boolean;
  isDrawing: boolean;
  currentDrawingPath: DrawingPath | null;
  snapToGrid: boolean;
  showGrid: boolean;
  penColor: string;
  penThickness: number;

  // Undo/redo
  history: BoardData[];
  historyIndex: number;
  maxHistory: number;

  // Dirty state
  isDirty: boolean;
  lastSavedAt: Date | null;

  // Next z-index
  nextZIndex: number;
}

interface CanvasActions {
  // Board
  loadBoardData: (data: BoardData) => void;
  getBoardData: () => BoardData;
  markSaved: () => void;

  // Tool
  setActiveTool: (tool: ToolType) => void;
  setActiveShapeType: (shape: ShapeType) => void;

  // Viewport
  setViewport: (viewport: Partial<Viewport>) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetZoom: () => void;
  setIsPanning: (panning: boolean) => void;

  // Selection
  selectNode: (id: string, addToSelection?: boolean) => void;
  deselectAll: () => void;
  selectAll: () => void;
  selectNodesInRect: (rect: {
    x: number;
    y: number;
    width: number;
    height: number;
  }) => void;
  setSelectedConnection: (id: string | null) => void;

  // Nodes
  addNode: (node: Omit<CanvasNode, "id" | "zIndex">) => string;
  updateNode: (id: string, updates: Partial<CanvasNode>) => void;
  deleteNode: (id: string) => void;
  deleteSelectedNodes: () => void;
  duplicateSelectedNodes: () => void;
  bringToFront: (id: string) => void;
  sendToBack: (id: string) => void;
  lockNode: (id: string) => void;
  unlockNode: (id: string) => void;

  // Connections
  addConnection: (conn: Omit<Connection, "id">) => string;
  updateConnection: (id: string, updates: Partial<Connection>) => void;
  deleteConnection: (id: string) => void;

  // Drawing
  startDrawing: (point: { x: number; y: number }) => void;
  continueDrawing: (point: { x: number; y: number }) => void;
  endDrawing: () => void;
  setPenColor: (color: string) => void;
  setPenThickness: (thickness: number) => void;
  clearDrawings: () => void;

  // Grid
  toggleGrid: () => void;
  toggleSnap: () => void;

  // Undo/Redo
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

export const useCanvasStore = create<CanvasState & CanvasActions>(
  (set, get) => ({
    // Defaults
    nodes: [],
    connections: [],
    drawings: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    activeTool: "select",
    selectedNodeIds: new Set(),
    selectedConnectionId: null,
    activeShapeType: "rectangle",
    isPanning: false,
    isDrawing: false,
    currentDrawingPath: null,
    snapToGrid: false,
    showGrid: true,
    penColor: "#ffffff",
    penThickness: 3,
    history: [],
    historyIndex: -1,
    maxHistory: 50,
    isDirty: false,
    lastSavedAt: null,
    nextZIndex: 1,

    // ──── Board ────
    loadBoardData: (data) => {
      const maxZ = data.nodes.reduce((m, n) => Math.max(m, n.zIndex ?? 0), 0);
      set({
        nodes: data.nodes || [],
        connections: data.connections || [],
        drawings: data.drawings || [],
        viewport: data.viewport || { x: 0, y: 0, zoom: 1 },
        nextZIndex: maxZ + 1,
        isDirty: false,
        history: [data],
        historyIndex: 0,
        selectedNodeIds: new Set(),
      });
    },

    getBoardData: () => {
      const { nodes, connections, drawings, viewport } = get();
      return { nodes, connections, drawings, viewport };
    },

    markSaved: () => set({ isDirty: false, lastSavedAt: new Date() }),

    // ──── Tool ────
    setActiveTool: (tool) =>
      set({
        activeTool: tool,
        selectedNodeIds: new Set(),
        selectedConnectionId: null,
      }),
    setActiveShapeType: (shape) => set({ activeShapeType: shape }),

    // ──── Viewport ────
    setViewport: (vp) => set((s) => ({ viewport: { ...s.viewport, ...vp } })),
    zoomIn: () =>
      set((s) => ({
        viewport: { ...s.viewport, zoom: Math.min(s.viewport.zoom * 1.2, 5) },
      })),
    zoomOut: () =>
      set((s) => ({
        viewport: { ...s.viewport, zoom: Math.max(s.viewport.zoom / 1.2, 0.1) },
      })),
    resetZoom: () => set((s) => ({ viewport: { ...s.viewport, zoom: 1 } })),
    setIsPanning: (panning) => set({ isPanning: panning }),

    // ──── Selection ────
    selectNode: (id, addToSelection = false) =>
      set((s) => {
        const newSet = addToSelection
          ? new Set(s.selectedNodeIds)
          : new Set<string>();
        if (newSet.has(id) && addToSelection) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return { selectedNodeIds: newSet, selectedConnectionId: null };
      }),
    deselectAll: () =>
      set({ selectedNodeIds: new Set(), selectedConnectionId: null }),
    selectAll: () =>
      set((s) => ({
        selectedNodeIds: new Set(s.nodes.map((n) => n.id)),
      })),
    selectNodesInRect: (rect) =>
      set((s) => {
        const ids = s.nodes
          .filter(
            (n) =>
              n.x >= rect.x &&
              n.y >= rect.y &&
              n.x + n.width <= rect.x + rect.width &&
              n.y + n.height <= rect.y + rect.height,
          )
          .map((n) => n.id);
        return { selectedNodeIds: new Set(ids) };
      }),
    setSelectedConnection: (id) =>
      set({ selectedConnectionId: id, selectedNodeIds: new Set() }),

    // ──── Nodes ────
    addNode: (node) => {
      const id = generateId();
      const { nextZIndex } = get();
      set((s) => ({
        nodes: [...s.nodes, { ...node, id, zIndex: nextZIndex }],
        nextZIndex: nextZIndex + 1,
        isDirty: true,
      }));
      get().pushHistory();
      return id;
    },

    updateNode: (id, updates) =>
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, ...updates } : n)),
        isDirty: true,
      })),

    deleteNode: (id) => {
      set((s) => ({
        nodes: s.nodes.filter((n) => n.id !== id),
        connections: s.connections.filter(
          (c) => c.fromNodeId !== id && c.toNodeId !== id,
        ),
        selectedNodeIds: (() => {
          const ns = new Set(s.selectedNodeIds);
          ns.delete(id);
          return ns;
        })(),
        isDirty: true,
      }));
      get().pushHistory();
    },

    deleteSelectedNodes: () => {
      const { selectedNodeIds } = get();
      if (selectedNodeIds.size === 0) return;
      set((s) => ({
        nodes: s.nodes.filter((n) => !selectedNodeIds.has(n.id)),
        connections: s.connections.filter(
          (c) =>
            !selectedNodeIds.has(c.fromNodeId) &&
            !selectedNodeIds.has(c.toNodeId),
        ),
        selectedNodeIds: new Set(),
        isDirty: true,
      }));
      get().pushHistory();
    },

    duplicateSelectedNodes: () => {
      const { selectedNodeIds, nodes, nextZIndex } = get();
      if (selectedNodeIds.size === 0) return;
      const duped: CanvasNode[] = [];
      let zi = nextZIndex;
      nodes
        .filter((n) => selectedNodeIds.has(n.id))
        .forEach((n) => {
          duped.push({
            ...n,
            id: generateId(),
            x: n.x + 30,
            y: n.y + 30,
            zIndex: zi++,
          });
        });
      set((s) => ({
        nodes: [...s.nodes, ...duped],
        nextZIndex: zi,
        selectedNodeIds: new Set(duped.map((d) => d.id)),
        isDirty: true,
      }));
      get().pushHistory();
    },

    bringToFront: (id) => {
      const { nextZIndex } = get();
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id ? { ...n, zIndex: nextZIndex } : n,
        ),
        nextZIndex: nextZIndex + 1,
      }));
    },

    sendToBack: (id) =>
      set((s) => ({
        nodes: s.nodes.map((n) =>
          n.id === id ? { ...n, zIndex: 0 } : { ...n, zIndex: n.zIndex + 1 },
        ),
      })),

    lockNode: (id) =>
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, locked: true } : n)),
      })),

    unlockNode: (id) =>
      set((s) => ({
        nodes: s.nodes.map((n) => (n.id === id ? { ...n, locked: false } : n)),
      })),

    // ──── Connections ────
    addConnection: (conn) => {
      const id = generateId();
      set((s) => ({
        connections: [...s.connections, { ...conn, id }],
        isDirty: true,
      }));
      get().pushHistory();
      return id;
    },

    updateConnection: (id, updates) =>
      set((s) => ({
        connections: s.connections.map((c) =>
          c.id === id ? { ...c, ...updates } : c,
        ),
        isDirty: true,
      })),

    deleteConnection: (id) => {
      set((s) => ({
        connections: s.connections.filter((c) => c.id !== id),
        selectedConnectionId:
          s.selectedConnectionId === id ? null : s.selectedConnectionId,
        isDirty: true,
      }));
      get().pushHistory();
    },

    // ──── Drawing ────
    startDrawing: (point) => {
      const { penColor, penThickness, activeTool } = get();
      const path: DrawingPath = {
        id: generateId(),
        points: [point],
        color: activeTool === "eraser" ? "erase" : penColor,
        thickness: activeTool === "eraser" ? 20 : penThickness,
        tool: activeTool === "eraser" ? "eraser" : "pen",
      };
      set({ isDrawing: true, currentDrawingPath: path });
    },

    continueDrawing: (point) =>
      set((s) => {
        if (!s.currentDrawingPath) return {};
        return {
          currentDrawingPath: {
            ...s.currentDrawingPath,
            points: [...s.currentDrawingPath.points, point],
          },
        };
      }),

    endDrawing: () => {
      const { currentDrawingPath } = get();
      if (!currentDrawingPath || currentDrawingPath.points.length < 2) {
        set({ isDrawing: false, currentDrawingPath: null });
        return;
      }
      set((s) => ({
        drawings: [...s.drawings, currentDrawingPath],
        isDrawing: false,
        currentDrawingPath: null,
        isDirty: true,
      }));
      get().pushHistory();
    },

    setPenColor: (color) => set({ penColor: color }),
    setPenThickness: (thickness) => set({ penThickness: thickness }),
    clearDrawings: () => {
      set({ drawings: [], isDirty: true });
      get().pushHistory();
    },

    // ──── Grid ────
    toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
    toggleSnap: () => set((s) => ({ snapToGrid: !s.snapToGrid })),

    // ──── Undo/Redo ────
    pushHistory: () =>
      set((s) => {
        const data = {
          nodes: s.nodes,
          connections: s.connections,
          drawings: s.drawings,
          viewport: s.viewport,
        };
        const newHistory = s.history.slice(0, s.historyIndex + 1);
        newHistory.push(data);
        if (newHistory.length > s.maxHistory) newHistory.shift();
        return { history: newHistory, historyIndex: newHistory.length - 1 };
      }),

    undo: () =>
      set((s) => {
        if (s.historyIndex <= 0) return {};
        const prev = s.history[s.historyIndex - 1];
        return {
          nodes: prev.nodes,
          connections: prev.connections,
          drawings: prev.drawings,
          historyIndex: s.historyIndex - 1,
          isDirty: true,
        };
      }),

    redo: () =>
      set((s) => {
        if (s.historyIndex >= s.history.length - 1) return {};
        const next = s.history[s.historyIndex + 1];
        return {
          nodes: next.nodes,
          connections: next.connections,
          drawings: next.drawings,
          historyIndex: s.historyIndex + 1,
          isDirty: true,
        };
      }),
  }),
);
