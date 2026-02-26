import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { useUser } from "@clerk/nextjs";
import { usePathname } from "next/navigation";

interface UserPresence {
  userId: string;
  name: string;
  page: string;
  lastActive: number;
}

export function useTeamPresence(orgId: string | undefined) {
  const { user } = useUser();
  const pathname = usePathname();
  const [onlineUsers, setOnlineUsers] = useState<Map<string, UserPresence>>(
    new Map(),
  );
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!orgId || !user) return;

    // Connect to the research engine socket server
    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3010";
    const socket = io(socketUrl, {
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
      randomizationFactor: 0.5,
    });
    socketRef.current = socket;

    const me = {
      userId: user.id,
      name: user.fullName || user.username || "Anonymous",
      page: pathname || "Team Hub",
    };

    socket.on("connect", () => {
      console.log("[TeamPresence] Connected to socket server");
      socket.emit("join-org", orgId, me);
    });

    socket.on(
      "presence-update",
      (data: { action: string; user: UserPresence }) => {
        setOnlineUsers((prev) => {
          const next = new Map(prev);
          if (data.action === "left") {
            next.delete(data.user.userId);
          } else {
            next.set(data.user.userId, {
              ...data.user,
              lastActive: Date.now(),
            });
          }
          return next;
        });
      },
    );

    // Heartbeat every 30s to keep presence alive and update current page
    const interval = setInterval(() => {
      socket.emit("presence-heartbeat", orgId, {
        userId: user.id,
        name: user.fullName || user.username || "Anonymous",
        page: window.location.pathname,
      });
    }, 30000);

    return () => {
      clearInterval(interval);
      socket.emit("leave-org", orgId);
      socket.disconnect();
    };
  }, [orgId, user, pathname]);

  return { onlineUsers };
}
