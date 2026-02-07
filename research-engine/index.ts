import dotenv from "dotenv";
import path from "path";
// Try to load from root .env if local one doesn't exist
dotenv.config({ path: path.resolve(__dirname, "../.env") });
dotenv.config(); // Also load local .env if it exists (overrides)
import express, { Request, Response } from "express";
import { serve } from "inngest/express";
import { Inngest } from "inngest";
import { researchAgent, generateLeadsAgent } from "./agent";
import { createServer } from "http";
import { SocketService } from "./lib/socket";
import cors from "cors";

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

// Create HTTP server and attach Socket.io
const server = createServer(app);
SocketService.getInstance().init(server);

server.listen(PORT, () => {
  console.log(`[ResearchEngine] Server listening on port ${PORT}`);
  console.log(
    `[ResearchEngine] Inngest endpoint: http://localhost:${PORT}/api/inngest`,
  );
  console.log(`[ResearchEngine] WebSocket server ready`);
});
