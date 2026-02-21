"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SocketService = void 0;
const socket_io_1 = require("socket.io");
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
        console.log("[SocketService] Socket.io initialized");
        this.io.on("connection", (socket) => {
            console.log(`[SocketService] Client connected: ${socket.id}`);
            socket.on("join-research", (researchId) => {
                socket.join(`research-${researchId}`);
                console.log(`[SocketService] Client ${socket.id} joined research-${researchId}`);
            });
            socket.on("disconnect", () => {
                console.log(`[SocketService] Client disconnected: ${socket.id}`);
            });
        });
    }
    emit(event, data, roomId) {
        if (!this.io) {
            // console.warn("[SocketService] Emit called before initialization");
            return;
        }
        if (roomId) {
            this.io.to(roomId).emit(event, data);
        }
        else {
            this.io.emit(event, data);
        }
    }
    emitLog(researchId, message) {
        this.emit("research-log", { researchId, message, timestamp: new Date() }, `research-${researchId}`);
    }
}
exports.SocketService = SocketService;
