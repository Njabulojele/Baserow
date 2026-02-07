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

      socket.on("join-research", (researchId: string) => {
        socket.join(`research-${researchId}`);
        console.log(
          `[SocketService] Client ${socket.id} joined research-${researchId}`,
        );
      });

      socket.on("disconnect", () => {
        console.log(`[SocketService] Client disconnected: ${socket.id}`);
      });
    });
  }

  public emit(event: string, data: any, roomId?: string): void {
    if (!this.io) {
      // console.warn("[SocketService] Emit called before initialization");
      return;
    }

    if (roomId) {
      this.io.to(roomId).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }

  public emitLog(researchId: string, message: string): void {
    this.emit(
      "research-log",
      { researchId, message, timestamp: new Date() },
      `research-${researchId}`,
    );
  }
}
