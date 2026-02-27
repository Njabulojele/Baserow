import { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { trpc } from "@/lib/trpc/client";

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  entityType: string;
  entityName?: string | null;
  createdAt: string;
  user: {
    name: string | null;
    email: string;
    avatar: string | null;
  };
}

export function useActivityFeed(orgId: string | undefined) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const socketRef = useRef<Socket | null>(null);

  // Initial fetch from DB
  const { data } = trpc.team.getActivityFeed.useQuery(
    { orgId: orgId! },
    {
      enabled: !!orgId,
      refetchOnWindowFocus: false,
    },
  );

  useEffect(() => {
    if (data) {
      setActivities(data as any);
    }
  }, [data]);

  useEffect(() => {
    if (!orgId) return;

    const socketUrl =
      process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3010";
    const socket = io(socketUrl);
    socketRef.current = socket;

    socket.on("connect", () => {
      // Re-use the join-org room created by presence hook
      // Activities are broadcast to org-{orgId}
    });

    socket.on("new-activity", (activity: ActivityLog) => {
      setActivities((prev) => [activity, ...prev]);
    });

    return () => {
      socket.disconnect();
    };
  }, [orgId]);

  return { activities };
}
