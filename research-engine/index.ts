import express from "express";
import { serve } from "inngest/express";
import { Inngest } from "inngest";
import { researchAgent, generateLeadsAgent } from "./agent";
import * as dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3010;

// Initialize Inngest with the same ID as the main app
const inngest = new Inngest({
  id: "baserow-research",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

// Serve the Inngest handler
// Render deployment will use this endpoint (e.g., https://your-service.onrender.com/api/inngest)
app.use(express.json());
app.use(
  "/api/inngest",
  serve({
    client: inngest,
    functions: [researchAgent, generateLeadsAgent],
  }),
);

import { Request, Response } from "express";

app.get("/", (req: Request, res: Response) => {
  res.send("Research Engine is running!");
});

app.listen(PORT, () => {
  console.log(`[ResearchEngine] Server listening on port ${PORT}`);
  console.log(
    `[ResearchEngine] Inngest endpoint: http://localhost:${PORT}/api/inngest`,
  );
});
