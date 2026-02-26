import { Server as SocketIOServer } from "socket.io";
import { Server as HttpServer } from "http";

export class SocketService {
  private static instance: SocketService;
  private io: SocketIOServer | null = null;

  private constructor() {}

  public static getInstance(): SocketService {
    if (!SocketService.instance) {
      SocketService.instance = new SocketService();
    }
    return SocketService.instance;
  }

  public init(httpServer: HttpServer): void {
    if (this.io) {
      console.log("[SocketService] Socket already initialized");
      return;
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*", // Allow all origins for simplicity in development
        methods: ["GET", "POST"],
      },
    });

    console.log("[SocketService] Socket.io initialized");

    this.io.on("connection", (socket) => {
      console.log(`[SocketService] Client connected: ${socket.id}`);

      // --- Research Engine Channels ---
      socket.on("join-research", (researchId: string) => {
        socket.join(`research-${researchId}`);
      });

      // --- Team Hub Channels ---
      socket.on(
        "join-org",
        (
          orgId: string,
          userPlan: { userId: string; name: string; page: string },
        ) => {
          socket.join(`org-${orgId}`);
          // Store user info on the socket for disconnect handling
          (socket as any).orgId = orgId;
          (socket as any).user = userPlan;

          // Broadcast presence change to the room
          this.emit(
            "presence-update",
            { action: "joined", user: userPlan },
            `org-${orgId}`,
          );
          console.log(
            `[SocketService] User ${userPlan.name} joined org-${orgId} on page ${userPlan.page}`,
          );
        },
      );

      socket.on("leave-org", (orgId: string) => {
        socket.leave(`org-${orgId}`);
        if ((socket as any).user) {
          this.emit(
            "presence-update",
            { action: "left", user: (socket as any).user },
            `org-${orgId}`,
          );
        }
      });

      // Heartbeat from clients to update their current page
      socket.on(
        "presence-heartbeat",
        (
          orgId: string,
          userPlan: { userId: string; name: string; page: string },
        ) => {
          (socket as any).user = userPlan;
          this.emit(
            "presence-update",
            { action: "heartbeat", user: userPlan },
            `org-${orgId}`,
          );
        },
      );

      socket.on("disconnect", () => {
        console.log(`[SocketService] Client disconnected: ${socket.id}`);
        // Handle presence cleanup
        const orgId = (socket as any).orgId;
        const user = (socket as any).user;
        if (orgId && user) {
          this.emit(
            "presence-update",
            { action: "left", user },
            `org-${orgId}`,
          );
        }
      });
    });
  }

  public emit(event: string, data: any, roomId?: string): void {
    if (!this.io) {
      return;
    }

    if (roomId) {
      this.io.to(roomId).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }

  // Helper for REST endpoints to push to sockets
  public emitActivity(orgId: string, activityLog: any): void {
    this.emit("new-activity", activityLog, `org-${orgId}`);
  }

  public emitLog(researchId: string, message: string): void {
    this.emit(
      "research-log",
      { researchId, message, timestamp: new Date() },
      `research-${researchId}`,
    );
  }
}
