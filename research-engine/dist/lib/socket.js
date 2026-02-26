"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const ioredis_1 = __importDefault(require("ioredis"));
class SocketService {
    constructor() {
        this.io = null;
    }
    static getInstance() {
        if (!SocketService.instance) {
            SocketService.instance = new SocketService();
        }
        return SocketService.instance;
    }
    init(httpServer) {
        if (this.io) {
            console.log("[SocketService] Socket already initialized");
            return;
        }
        this.io = new socket_io_1.Server(httpServer, {
            cors: {
                origin: "*", // Allow all origins for simplicity in development
                methods: ["GET", "POST"],
            },
        });
        if (process.env.REDIS_URL) {
            const pubClient = new ioredis_1.default(process.env.REDIS_URL);
            const subClient = pubClient.duplicate();
            pubClient.on("error", (err) => console.error("[SocketService] Redis Pub Error:", err));
            subClient.on("error", (err) => console.error("[SocketService] Redis Sub Error:", err));
            this.io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
            console.log("[SocketService] Redis Adapter applied for horizontal scaling");
        }
        else {
            console.warn("[SocketService] REDIS_URL not provided. Falling back to in-memory adapter (single-node only).");
        }
        console.log("[SocketService] Socket.io initialized");
        this.io.on("connection", (socket) => {
            console.log(`[SocketService] Client connected: ${socket.id}`);
            // --- Research Engine Channels ---
            socket.on("join-research", (researchId) => {
                socket.join(`research-${researchId}`);
            });
            // --- Team Hub Channels ---
            socket.on("join-org", (orgId, userPlan) => {
                socket.join(`org-${orgId}`);
                // Store user info on the socket for disconnect handling
                socket.orgId = orgId;
                socket.user = userPlan;
                // Broadcast presence change to the room
                this.emit("presence-update", { action: "joined", user: userPlan }, `org-${orgId}`);
                console.log(`[SocketService] User ${userPlan.name} joined org-${orgId} on page ${userPlan.page}`);
            });
            socket.on("leave-org", (orgId) => {
                socket.leave(`org-${orgId}`);
                if (socket.user) {
                    this.emit("presence-update", { action: "left", user: socket.user }, `org-${orgId}`);
                }
            });
            // Heartbeat from clients to update their current page
            socket.on("presence-heartbeat", (orgId, userPlan) => {
                socket.user = userPlan;
                this.emit("presence-update", { action: "heartbeat", user: userPlan }, `org-${orgId}`);
            });
            socket.on("disconnect", () => {
                console.log(`[SocketService] Client disconnected: ${socket.id}`);
                // Handle presence cleanup
                const orgId = socket.orgId;
                const user = socket.user;
                if (orgId && user) {
                    this.emit("presence-update", { action: "left", user }, `org-${orgId}`);
                }
            });
        });
    }
    emit(event, data, roomId) {
        if (!this.io) {
            return;
        }
        if (roomId) {
            this.io.to(roomId).emit(event, data);
        }
        else {
            this.io.emit(event, data);
        }
    }
    // Helper for REST endpoints to push to sockets
    emitActivity(orgId, activityLog) {
        this.emit("new-activity", activityLog, `org-${orgId}`);
    }
    emitLog(researchId, message) {
        this.emit("research-log", { researchId, message, timestamp: new Date() }, `research-${researchId}`);
    }
}
exports.SocketService = SocketService;
