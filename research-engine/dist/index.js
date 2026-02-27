"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Try to load from root .env if local one doesn't exist
dotenv_1.default.config({ path: path_1.default.resolve(__dirname, "../.env") });
dotenv_1.default.config(); // Also load local .env if it exists (overrides)
const Sentry = __importStar(require("@sentry/node"));
const profiling_node_1 = require("@sentry/profiling-node");
const pino_1 = __importDefault(require("pino"));
// Initialize Pino logger for structured JSON logs in production
const logger = (0, pino_1.default)({
    level: process.env.LOG_LEVEL || "info",
    transport: process.env.NODE_ENV !== "production"
        ? {
            target: "pino-pretty",
            options: { colorize: true },
        }
        : undefined,
});
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.init({
        dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
        integrations: [(0, profiling_node_1.nodeProfilingIntegration)()],
        // Performance Monitoring
        tracesSampleRate: 1.0, // Capture 100% of the transactions
        // Set sampling rate for profiling - this is relative to tracesSampleRate
        profilesSampleRate: 1.0,
    });
    logger.info("Sentry initialized in Research Engine");
}
const express_1 = __importDefault(require("express"));
const express_2 = require("inngest/express");
const inngest_1 = require("inngest");
const agent_1 = require("./agent");
const http_1 = require("http");
const socket_1 = require("./lib/socket");
const cors_1 = __importDefault(require("cors"));
// Provide the logger instance globally
globalThis.logger = logger;
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
// Health check endpoint for UptimeRobot / BetterStack
app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
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
// Endpoint to broadcast team activity events
app.post("/emit-activity", (req, res) => {
    const { orgId, activity } = req.body;
    if (orgId && activity) {
        socket_1.SocketService.getInstance().emitActivity(orgId, activity);
        res.status(200).json({ success: true });
    }
    else {
        res.status(400).json({ error: "Missing orgId or activity" });
    }
});
// The error handler must be before any other error middleware and after all controllers
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
    Sentry.setupExpressErrorHandler(app);
}
// Create HTTP server and attach Socket.io
const server = (0, http_1.createServer)(app);
socket_1.SocketService.getInstance().init(server);
server.listen(PORT, () => {
    logger.info(`[ResearchEngine] Server listening on port ${PORT}`);
    logger.info(`[ResearchEngine] Inngest endpoint: http://localhost:${PORT}/api/inngest`);
    logger.info(`[ResearchEngine] WebSocket server ready`);
});
