import dotenv from "dotenv";
import path from "path";
// Try to load from root .env if local one doesn't exist
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config(); // Also load local .env if it exists (overrides)

import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import pino from "pino";

// Initialize Pino logger for structured JSON logs in production
const logger = pino({
  level: process.env.LOG_LEVEL || "info",
  transport:
    process.env.NODE_ENV !== "production"
      ? {
          target: "pino-pretty",
          options: { colorize: true },
        }
      : undefined,
});

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    integrations: [nodeProfilingIntegration()],
    // Performance Monitoring
    tracesSampleRate: 1.0, // Capture 100% of the transactions
    // Set sampling rate for profiling - this is relative to tracesSampleRate
    profilesSampleRate: 1.0,
  });
  logger.info("Sentry initialized in Research Engine");
}

import express, { Request, Response } from "express";
import { serve } from "inngest/express";
import { Inngest } from "inngest";
import { researchAgent, generateLeadsAgent } from "./agent";
import { createServer } from "http";
import { SocketService } from "./lib/socket";
import cors from "cors";

// Provide the logger instance globally
(globalThis as any).logger = logger;

const app = express();
const PORT = process.env.PORT || 3010;

// Enable CORS for frontend access
app.use(cors({ origin: "*" }));

// Initialize Inngest with the same ID as the main app
const inngest = new Inngest({
  id: "baserow-research",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// Serve the Inngest handler with increased payload limits
app.use(express.json({ limit: "50mb" }));
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [researchAgent, generateLeadsAgent],
  }),
);

app.get("/", (req: Request, res: Response) => {
  res.send("Research Engine is running!");
});

// Health check endpoint for UptimeRobot / BetterStack
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Endpoint to receive logs from external runners (like Next.js Inngest)
app.post("/emit-log", (req: Request, res: Response) => {
  const { researchId, message } = req.body;
  if (researchId && message) {
    SocketService.getInstance().emitLog(researchId, message);
    res.status(200).json({ success: true });
  } else {
    res.status(400).json({ error: "Missing researchId or message" });
  }
});

// Endpoint to broadcast team activity events
app.post("/emit-activity", (req: Request, res: Response) => {
  const { orgId, activity } = req.body;
  if (orgId && activity) {
    SocketService.getInstance().emitActivity(orgId, activity);
    res.status(200).json({ success: true });
  } else {
    res.status(400).json({ error: "Missing orgId or activity" });
  }
});

// The error handler must be before any other error middleware and after all controllers
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

// Create HTTP server and attach Socket.io
const server = createServer(app);
SocketService.getInstance().init(server);

server.listen(PORT, () => {
  logger.info(`[ResearchEngine] Server listening on port ${PORT}`);
  logger.info(
    `[ResearchEngine] Inngest endpoint: http://localhost:${PORT}/api/inngest`,
  );
  logger.info(`[ResearchEngine] WebSocket server ready`);
});
