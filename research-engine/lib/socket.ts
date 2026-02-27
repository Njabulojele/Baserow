import { Server as SocketIOServer, Socket } from "socket.io";
import { Server as HttpServer } from "http";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { verifyToken } from "@clerk/backend";

/**
 * Verified user identity extracted from a Clerk JWT.
 */
interface VerifiedSocketUser {
  userId: string;
  orgIds: string[]; // All org IDs the user is a member of
}

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

  /**
   * Verify a Clerk JWT from the socket handshake.
   * Returns the verified user identity or null if invalid.
   */
  private async verifySocketToken(
    socket: Socket,
  ): Promise<VerifiedSocketUser | null> {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        console.warn(`[SocketService] No auth token provided by ${socket.id}`);
        return null;
      }

      const secretKey = process.env.CLERK_SECRET_KEY;
      if (!secretKey) {
        console.error(
          "[SocketService] CLERK_SECRET_KEY not set — cannot verify tokens",
        );
        return null;
      }

      const payload = await verifyToken(token, {
        secretKey,
      });

      const userId = payload.sub;
      // Extract org memberships from the JWT claims
      const orgMemberships: any = (payload as any).org_memberships || [];
      const orgIds = Array.isArray(orgMemberships)
        ? orgMemberships.map((m: any) =>
            typeof m === "string" ? m : m.org_id || m.id,
          )
        : [];

      // Also include the active org if set in the JWT
      const activeOrg = (payload as any).org_id;
      if (activeOrg && !orgIds.includes(activeOrg)) {
        orgIds.push(activeOrg);
      }

      return { userId, orgIds };
    } catch (error: any) {
      console.warn(
        `[SocketService] JWT verification failed for ${socket.id}: ${error.message}`,
      );
      return null;
    }
  }

  public init(httpServer: HttpServer): void {
    if (this.io) {
      console.log("[SocketService] Socket already initialized");
      return;
    }

    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: "*",
        methods: ["GET", "POST"],
      },
    });

    if (process.env.REDIS_URL) {
      const pubClient = new Redis(process.env.REDIS_URL);
      const subClient = pubClient.duplicate();

      pubClient.on("error", (err) =>
        console.error("[SocketService] Redis Pub Error:", err),
      );
      subClient.on("error", (err) =>
        console.error("[SocketService] Redis Sub Error:", err),
      );

      this.io.adapter(createAdapter(pubClient, subClient));
      console.log(
        "[SocketService] Redis Adapter applied for horizontal scaling",
      );
    } else {
      console.warn(
        "[SocketService] REDIS_URL not provided. Falling back to in-memory adapter (single-node only).",
      );
    }

    console.log("[SocketService] Socket.io initialized");

    // ── Connection-level JWT authentication ──
    this.io.use(async (socket, next) => {
      const verified = await this.verifySocketToken(socket);
      if (!verified) {
        return next(new Error("Authentication failed: invalid or missing JWT"));
      }
      // Attach verified identity to the socket for downstream event handlers
      (socket as any).verifiedUser = verified;
      next();
    });

    this.io.on("connection", (socket) => {
      const verified: VerifiedSocketUser = (socket as any).verifiedUser;
      console.log(
        `[SocketService] Authenticated client connected: ${socket.id} (user: ${verified.userId})`,
      );

      // --- Research Engine Channels ---
      // Research rooms are not org-gated (the user must own the research)
      socket.on("join-research", (researchId: string) => {
        socket.join(`research-${researchId}`);
      });

      // --- Team Hub Channels (org-gated) ---
      socket.on(
        "join-org",
        (
          orgId: string,
          userPlan: { userId: string; name: string; page: string },
        ) => {
          // ✅ SERVER-SIDE ORG VERIFICATION — Never trust client-supplied orgId alone
          if (!verified.orgIds.includes(orgId) && verified.orgIds.length > 0) {
            console.warn(
              `[SocketService] BLOCKED: User ${verified.userId} tried to join org-${orgId} without membership. Allowed orgs: [${verified.orgIds.join(", ")}]`,
            );
            socket.emit("error", {
              message: "You do not have access to this organization.",
            });
            return;
          }

          socket.join(`org-${orgId}`);
          (socket as any).orgId = orgId;
          (socket as any).user = { ...userPlan, userId: verified.userId };

          this.emit(
            "presence-update",
            {
              action: "joined",
              user: { ...userPlan, userId: verified.userId },
            },
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

      socket.on(
        "presence-heartbeat",
        (
          orgId: string,
          userPlan: { userId: string; name: string; page: string },
        ) => {
          // Enforce server-verified userId, not client-supplied
          (socket as any).user = { ...userPlan, userId: verified.userId };
          this.emit(
            "presence-update",
            {
              action: "heartbeat",
              user: { ...userPlan, userId: verified.userId },
            },
            `org-${orgId}`,
          );
        },
      );

      // --- Collaborative Cursors ---
      socket.on(
        "cursor-move",
        (data: { orgId: string; x: number; y: number; canvasId: string }) => {
          this.emit(
            "cursor-update",
            {
              userId: verified.userId,
              name: (socket as any).user?.name || "Unknown",
              x: data.x,
              y: data.y,
              canvasId: data.canvasId,
            },
            `org-${data.orgId}`,
          );
        },
      );

      socket.on("disconnect", () => {
        console.log(`[SocketService] Client disconnected: ${socket.id}`);
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
