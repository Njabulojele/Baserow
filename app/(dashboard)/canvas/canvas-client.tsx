"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc/client";
import { useCanvasStore, type BoardData } from "@/lib/stores/canvas-store";
import { CanvasViewport } from "@/components/canvas/CanvasViewport";
import { CanvasToolbar } from "@/components/canvas/CanvasToolbar";
import { BoardSidebar } from "@/components/canvas/BoardSidebar";
import { BoardCreateModal } from "@/components/canvas/BoardCreateModal";
import { EntityAttachModal } from "@/components/canvas/EntityAttachModal";
import { CanvasPropertiesPanel } from "@/components/canvas/CanvasPropertiesPanel";
import {
  PanelLeftClose,
  PanelLeftOpen,
  Save,
  Check,
  ArrowLeft,
} from "lucide-react";
import Link from "next/link";

export function CanvasClient() {
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEntityModal, setShowEntityModal] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const utils = trpc.useUtils();
  const { data: boards = [], isLoading: boardsLoading } =
    trpc.canvas.list.useQuery();
  const { data: activeBoard } = trpc.canvas.getById.useQuery(
    { id: activeBoardId! },
    { enabled: !!activeBoardId },
  );

  const createBoardMutation = trpc.canvas.create.useMutation({
    onSuccess: (board) => {
      utils.canvas.list.invalidate();
      setActiveBoardId(board.id);
      setShowCreateModal(false);
    },
  });

  const updateBoardMutation = trpc.canvas.update.useMutation({
    onSuccess: () => {
      useCanvasStore.getState().markSaved();
    },
  });

  const deleteBoardMutation = trpc.canvas.delete.useMutation({
    onSuccess: () => {
      utils.canvas.list.invalidate();
      setActiveBoardId(null);
    },
  });

  const duplicateBoardMutation = trpc.canvas.duplicate.useMutation({
    onSuccess: (board) => {
      utils.canvas.list.invalidate();
      setActiveBoardId(board.id);
    },
  });

  const toggleFavMutation = trpc.canvas.toggleFavorite.useMutation({
    onSuccess: () => utils.canvas.list.invalidate(),
  });

  const { loadBoardData, getBoardData, isDirty } = useCanvasStore();

  // Load board data when active board changes
  useEffect(() => {
    if (activeBoard?.boardData) {
      loadBoardData(activeBoard.boardData as unknown as BoardData);
    }
  }, [activeBoard, loadBoardData]);

  // Auto-save (debounced 2s)
  const autoSave = useCallback(() => {
    if (!activeBoardId || !isDirty) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const data = getBoardData();
      updateBoardMutation.mutate({
        id: activeBoardId,
        boardData: data,
      });
    }, 2000);
  }, [activeBoardId, isDirty, getBoardData, updateBoardMutation]);

  useEffect(() => {
    if (isDirty) autoSave();
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [isDirty, autoSave]);

  // Manual save
  const handleManualSave = useCallback(() => {
    if (!activeBoardId) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    const data = getBoardData();
    updateBoardMutation.mutate({ id: activeBoardId, boardData: data });
  }, [activeBoardId, getBoardData, updateBoardMutation]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleManualSave();
      }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        useCanvasStore.getState().undo();
      }
      if (
        (e.key === "z" && (e.metaKey || e.ctrlKey) && e.shiftKey) ||
        (e.key === "y" && (e.metaKey || e.ctrlKey))
      ) {
        e.preventDefault();
        useCanvasStore.getState().redo();
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        const tag = (e.target as HTMLElement)?.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA") return;
        useCanvasStore.getState().deleteSelectedNodes();
      }
      if (e.key === "Escape") {
        useCanvasStore.getState().deselectAll();
        useCanvasStore.getState().setActiveTool("select");
      }
      // Tool shortcuts
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;
      const store = useCanvasStore.getState();
      switch (e.key.toLowerCase()) {
        case "v":
          store.setActiveTool("select");
          break;
        case "h":
          store.setActiveTool("pan");
          break;
        case "t":
          store.setActiveTool("text");
          break;
        case "s":
          if (!(e.metaKey || e.ctrlKey)) store.setActiveTool("sticky");
          break;
        case "r":
          store.setActiveTool("shape");
          break;
        case "a":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            store.selectAll();
          } else {
            store.setActiveTool("arrow");
          }
          break;
        case "p":
          store.setActiveTool("pen");
          break;
        case "f":
          store.setActiveTool("section");
          break;
        case "d":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            store.duplicateSelectedNodes();
          }
          break;
        case "g":
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            store.toggleGrid();
          }
          break;
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleManualSave]);

  const handleAddEntity = useCallback(
    (
      entityType: string,
      entityId: string,
      entityData: Record<string, unknown>,
    ) => {
      const store = useCanvasStore.getState();
      store.addNode({
        type: "entity",
        x: -store.viewport.x / store.viewport.zoom + 400,
        y: -store.viewport.y / store.viewport.zoom + 300,
        width: 320,
        height: 180,
        entityType:
          entityType as import("@/lib/stores/canvas-store").EntityType,
        entityId,
        entityData,
        bgColor: getEntityColor(entityType),
        borderRadius: 12,
      });
      setShowEntityModal(false);
    },
    [],
  );

  const { lastSavedAt } = useCanvasStore();
  const saveStatus = updateBoardMutation.isPending
    ? "saving"
    : isDirty
      ? "unsaved"
      : "saved";

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#0a0c10] text-white">
      {/* Board Sidebar */}
      {showSidebar && (
        <BoardSidebar
          boards={boards}
          activeBoardId={activeBoardId}
          loading={boardsLoading}
          onSelectBoard={setActiveBoardId}
          onCreateBoard={() => setShowCreateModal(true)}
          onDeleteBoard={(id) => deleteBoardMutation.mutate({ id })}
          onDuplicateBoard={(id) => duplicateBoardMutation.mutate({ id })}
          onToggleFavorite={(id) => toggleFavMutation.mutate({ id })}
        />
      )}

      {/* Main Area */}
      <div className="flex-1 flex flex-col relative min-w-0">
        {/* Top bar */}
        <div className="h-12 flex items-center px-3 gap-2 bg-[#1a252f] border-b border-[#2f3e46] shrink-0 z-30">
          <button
            onClick={() => setShowSidebar(!showSidebar)}
            className="p-1.5 rounded-md hover:bg-[#0a0c10] text-gray-400 hover:text-white transition-colors"
            title={showSidebar ? "Hide sidebar" : "Show sidebar"}
          >
            {showSidebar ? (
              <PanelLeftClose className="w-4 h-4" />
            ) : (
              <PanelLeftOpen className="w-4 h-4" />
            )}
          </button>

          <Link
            href="/dashboard"
            className="p-1.5 rounded-md hover:bg-[#0a0c10] text-gray-400 hover:text-white transition-colors"
            title="Back to dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>

          <div className="w-px h-5 bg-[#2f3e46] mx-1" />

          {activeBoard && (
            <>
              <span className="text-lg mr-1">{activeBoard.emoji}</span>
              <span className="text-sm font-medium truncate max-w-[200px]">
                {activeBoard.name}
              </span>

              {activeBoard.project && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 ml-2">
                  {activeBoard.project.name}
                </span>
              )}
              {activeBoard.client && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 ml-1">
                  {activeBoard.client.name}
                </span>
              )}
            </>
          )}

          <div className="flex-1" />

          {/* Save status */}
          {activeBoardId && (
            <div className="flex items-center gap-2 text-xs text-white/40">
              {saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-amber-400">
                  <Save className="w-3 h-3 animate-pulse" /> Saving...
                </span>
              )}
              {saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Check className="w-3 h-3" /> Saved
                  {lastSavedAt && (
                    <span className="text-white/30">
                      · {new Date(lastSavedAt).toLocaleTimeString()}
                    </span>
                  )}
                </span>
              )}
              {saveStatus === "unsaved" && (
                <span className="text-gray-500 font-mono text-[10px] uppercase tracking-widest">
                  Unsaved changes
                </span>
              )}
              <button
                onClick={handleManualSave}
                className="p-1.5 rounded hover:bg-[#0a0c10] text-gray-400 hover:text-white transition-colors"
                title="Save (Ctrl+S)"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Canvas content */}
        {activeBoardId ? (
          <div className="flex-1 relative">
            <CanvasToolbar onOpenEntityModal={() => setShowEntityModal(true)} />
            <CanvasViewport boardId={activeBoardId} />
            <CanvasPropertiesPanel />
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center px-8 flex flex-col items-center">
              <div className="text-6xl mb-6">🧠</div>
              <h2 className="text-sm font-mono tracking-widest uppercase mb-2 text-[#a9927d]">
                Infinite Canvas
              </h2>
              <p className="text-gray-500 font-mono text-[10px] max-w-md mb-8 text-center uppercase tracking-widest leading-relaxed">
                Your visual thinking space. Brainstorm, plan projects, map
                client relationships — with your real data. Select a board or
                create a new one to get started.
              </p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="border border-[#a9927d]/50 bg-[#0a0c10] text-[#a9927d] hover:bg-[#a9927d] hover:text-[#0a0c10] text-[10px] font-mono uppercase tracking-widest px-6 py-2.5 rounded-md transition-colors"
              >
                Create Your First Board
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showCreateModal && (
        <BoardCreateModal
          onClose={() => setShowCreateModal(false)}
          onCreate={(data) => createBoardMutation.mutate(data)}
          isLoading={createBoardMutation.isPending}
        />
      )}
      {showEntityModal && (
        <EntityAttachModal
          onClose={() => setShowEntityModal(false)}
          onAttach={handleAddEntity}
        />
      )}
    </div>
  );
}

function getEntityColor(type: string): string {
  const colors: Record<string, string> = {
    project: "#3B82F6",
    task: "#10B981",
    client: "#8B5CF6",
    goal: "#F59E0B",
    deal: "#EC4899",
    lead: "#06B6D4",
    research: "#6366F1",
    meeting: "#F97316",
  };
  return colors[type] || "#6EE7B7";
}
