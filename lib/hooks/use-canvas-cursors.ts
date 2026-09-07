import { useEffect, useState, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { useUser, useAuth } from "@clerk/nextjs";
import throttle from "lodash/throttle";

export interface CursorPosition {
  userId: string;
  name: string;
  x: number;
  y: number;
  lastUpdate: number;
}

export function useCanvasCursors(
  orgId: string | undefined | null,
  canvasId: string,
) {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [cursors, setCursors] = useState<Map<string, CursorPosition>>(
    new Map(),
  );
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!orgId || !user || !canvasId) return;

    let socket: Socket;

    async function initSocket() {
      const token = await getToken();
      if (!token) return;

      const socketUrl =
        process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3010";

      socket = io(socketUrl, {
        auth: { token },
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      socketRef.current = socket;

      socket.on("connect", () => {
        console.log("[CanvasCursors] Connected to socket server");
        // We must join the org channel to receive org events
        socket.emit("join-org", orgId, {
          userId: user?.id,
          name: user?.fullName || user?.username || "Anonymous",
          page: `canvas-${canvasId}`,
        });
      });

      socket.on(
        "cursor-update",
        (data: {
          userId: string;
          name: string;
          x: number;
          y: number;
          canvasId: string;
        }) => {
          // Ignore our own cursor and cursors for other canvases
          if (data.userId === user?.id || data.canvasId !== canvasId) return;

          setCursors((prev) => {
            const next = new Map(prev);
            next.set(data.userId, {
              userId: data.userId,
              name: data.name,
              x: data.x,
              y: data.y,
              lastUpdate: Date.now(),
            });
            return next;
          });
        },
      );

      // Cleanup stale cursors every 5 seconds
      const cleanupInterval = setInterval(() => {
        const now = Date.now();
        setCursors((prev) => {
          let changed = false;
          const next = new Map(prev);
          for (const [userId, cursor] of Array.from(next.entries())) {
            // Remove cursor if no update in 10 seconds
            if (now - cursor.lastUpdate > 10000) {
              next.delete(userId);
              changed = true;
            }
          }
          return changed ? next : prev;
        });
      }, 5000);

      socket.on("disconnect", () => {
        console.log("[CanvasCursors] Disconnected");
      });

      return () => {
        clearInterval(cleanupInterval);
      };
    }

    initSocket();

    return () => {
      if (socket) {
        socket.emit("leave-org", orgId);
        socket.disconnect();
      }
    };
  }, [orgId, user, canvasId, getToken]);

  // Throttled function to broadcast cursor position
  const broadcastCursor = useCallback(
    throttle((x: number, y: number) => {
      if (!socketRef.current?.connected || !orgId || !canvasId) return;

      socketRef.current.emit("cursor-move", {
        orgId,
        canvasId,
        x,
        y,
      });
    }, 50), // Send max 20 times per second
    [orgId, canvasId],
  );

  return { cursors, broadcastCursor };
}
