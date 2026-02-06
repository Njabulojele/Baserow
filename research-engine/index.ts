import "dotenv/config"; // MUST be first import
import express, { Request, Response } from "express";
import { serve } from "inngest/express";
import { Inngest } from "inngest";
import { researchAgent, generateLeadsAgent } from "./agent";

const app = express();
const PORT = process.env.PORT || 3010;

// Initialize Inngest with the same ID as the main app
const inngest = new Inngest({
  id: "baserow-research",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// Serve the Inngest handler
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

app.listen(PORT, () => {
  console.log(`[ResearchEngine] Server listening on port ${PORT}`);
  console.log(
    `[ResearchEngine] Inngest endpoint: http://localhost:${PORT}/api/inngest`,
  );
});
