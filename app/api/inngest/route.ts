import { serve } from "inngest/next";
import { inngest } from "@/inngest/client";
import { researchAgent } from "@/inngest/research-agent";
import { gdprCleanup } from "@/inngest/gdpr-cleanup";

export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [researchAgent, gdprCleanup],
});
