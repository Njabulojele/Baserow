"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Try to load from root .env if local one doesn't exist
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
dotenv_1.default.config(); // Also load local .env if it exists (overrides)
const express_1 = __importDefault(require("express"));
const express_2 = require("inngest/express");
const inngest_1 = require("inngest");
const agent_1 = require("./agent");
const http_1 = require("http");
const socket_1 = require("./lib/socket");
const cors_1 = __importDefault(require("cors"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3010;
// Enable CORS for frontend access
app.use((0, cors_1.default)({ origin: "*" }));
// Initialize Inngest with the same ID as the main app
const inngest = new inngest_1.Inngest({
    id: "baserow-research",
    eventKey: process.env.INNGEST_EVENT_KEY,
});
// Serve the Inngest handler with increased payload limits
app.use(express_1.default.json({ limit: "50mb" }));
app.use("/api/inngest", (0, express_2.serve)({
    client: inngest,
    functions: [agent_1.researchAgent, agent_1.generateLeadsAgent],
}));
app.get("/", (req, res) => {
    res.send("Research Engine is running!");
});
// Endpoint to receive logs from external runners (like Next.js Inngest)
app.post("/emit-log", (req, res) => {
    const { researchId, message } = req.body;
    if (researchId && message) {
        socket_1.SocketService.getInstance().emitLog(researchId, message);
        res.status(200).json({ success: true });
    }
    else {
        res.status(400).json({ error: "Missing researchId or message" });
    }
});
// Create HTTP server and attach Socket.io
const server = (0, http_1.createServer)(app);
socket_1.SocketService.getInstance().init(server);
server.listen(PORT, () => {
    console.log(`[ResearchEngine] Server listening on port ${PORT}`);
    console.log(`[ResearchEngine] Inngest endpoint: http://localhost:${PORT}/api/inngest`);
    console.log(`[ResearchEngine] WebSocket server ready`);
});
