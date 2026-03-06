import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { GeminiClient } from "@/lib/gemini-client";
import { getLLMClientWithFallback } from "@/lib/llm-provider";

async function processProspectingAgents(event: any, step: any) {
  // 1. Fetch agents to run
  const agentsToRun = await step.run("fetch-agents", async () => {
    // If manual trigger
    if (event.name === "prospecting/run-agent" && event.data?.agentId) {
      const agent = await prisma.prospectingAgent.findUnique({
        where: { id: event.data.agentId },
        include: { user: true },
      });
      return agent && agent.status === "ACTIVE" ? [agent] : [];
    }

    // If cron schedule
    return await prisma.prospectingAgent.findMany({
      where: { status: "ACTIVE" },
      include: { user: true },
    });
  });

  if (agentsToRun.length === 0) return { message: "No active agents to run." };

  // 2. Process each agent
  let totalLeadsFound = 0;

  for (const agent of agentsToRun) {
    if (!agent.user.geminiApiKey) continue;

    try {
      const leadsFound = await step.run(
        `process-agent-${agent.id}`,
        async () => {
          const llm = new GeminiClient(agent.user.geminiApiKey!);

          // Build search query based on platform and keywords
          const keywordString = agent.searchKeywords.join(" OR ");
          let searchQuery = keywordString;

          // Platform-specific search footprints
          if (agent.platform.toLowerCase() === "reddit") {
            searchQuery = `site:reddit.com ("South Africa" OR "ZA") (${keywordString}) ("need help" OR "looking for" OR "advice")`;
          } else if (agent.platform.toLowerCase() === "google") {
            searchQuery = `("South Africa" OR "ZA") (${keywordString}) ("under construction" OR "coming soon" OR "facebook page" OR "our new website")`;
          } else if (agent.platform.toLowerCase() === "linkedin") {
            searchQuery = `site:linkedin.com/in ("South Africa" OR "ZA") (${keywordString}) ("looking for recommendations" OR "need a web developer" OR "website redesign")`;
          }

          console.log(
            `[Agent ${agent.name}] Executing search for: ${searchQuery}`,
          );
          const searchResult = await llm.groundingSearch(searchQuery);
          console.log(
            `[Agent ${agent.name}] Found ${searchResult.sources?.length || 0} sources.`,
          );

          if (!searchResult.sources || searchResult.sources.length === 0) {
            console.log(`[Agent ${agent.name}] Bailing out, no sources found.`);
            return 0;
          }

          // B. Extract Leads from search context
          const extractionPrompt = `
You are an expert B2B lead generation prospector for "Open Infinity", a South African web development and digital marketing agency (openinfinity.co.za).

Review the following web search data and extract businesses or individuals who need web design, SEO, digital marketing, or custom software services.

Search Context:
${searchResult.text}

Sources found:
${searchResult.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}

IMPORTANT: Extract as much contact info as possible. If they mention their business name, website, email, phone number, or location — capture it ALL. Also quote the EXACT text/post where they expressed their need — this is critical for context.

Return ONLY valid JSON matching this schema:
[
  {
    "name": "Person's name if available, otherwise business name",
    "company": "Business or company name if mentioned",
    "email": "Email if mentioned or visible, otherwise empty string",
    "phone": "Phone number if mentioned, otherwise empty string",
    "website": "Their website URL if mentioned, otherwise empty string",
    "industry": "What industry they appear to be in",
    "location": "City/province/country if mentioned",
    "painPoints": ["specific pain point 1", "specific pain point 2"],
    "whyIsLead": "Exactly why they need Open Infinity's services based on what they said",
    "offerPositioning": "How Open Infinity should approach them",
    "sourceUrl": "The exact URL or source link where you found this lead",
    "contextSnippet": "Copy-paste the EXACT quote or relevant excerpt from their post/comment/page that shows they need help. Include surrounding context so the user can understand the situation."
  }
]
If no clear leads are found, return [].
          `;

          console.log(
            `[Agent ${agent.name}] Requesting detailed extraction...`,
          );
          const rawText = await llm.generateContent(extractionPrompt);
          console.log(
            `[Agent ${agent.name}] Raw LLM Response:`,
            rawText.substring(0, 300) + "...",
          );

          let rawLeads: any[] = [];
          try {
            rawLeads = llm.extractJson<any[]>(rawText);
          } catch (e) {
            console.error(`[Agent ${agent.name}] JSON Extraction Failed`, e);
            return 0;
          }

          console.log(
            `[Agent ${agent.name}] Extracted ${rawLeads?.length || 0} potential leads from text.`,
          );

          if (!rawLeads || rawLeads.length === 0) return 0;

          // C. Save discovered leads to DB
          let newLeadsCount = 0;

          for (const rawLead of rawLeads) {
            // Very basic deduplication check
            const exists = await prisma.lead.findFirst({
              where: {
                agentId: agent.id,
                name: rawLead.name,
              },
            });

            if (!exists) {
              // Generate outreach template
              const outreach = await llm.generateLeadOutreach({
                name: rawLead.name,
                company: rawLead.company,
                industry: rawLead.industry,
                painPoints: rawLead.painPoints || [],
              });

              await prisma.lead.create({
                data: {
                  agentId: agent.id,
                  name: rawLead.name || "Unknown",
                  company: rawLead.company || null,
                  email: rawLead.email || null,
                  phone: rawLead.phone || null,
                  website: rawLead.website || null,
                  industry: rawLead.industry || null,
                  location: rawLead.location || null,
                  painPoints: rawLead.painPoints || [],
                  whyIsLead: rawLead.whyIsLead || "Found matching criteria.",
                  offerPositioning:
                    rawLead.offerPositioning || "Standard web services.",
                  sourceUrl:
                    rawLead.sourceUrl ||
                    searchResult.sources[0]?.url ||
                    "https://google.com",
                  contextSnippet: rawLead.contextSnippet || null,
                  suggestedDM:
                    outreach.dm || "Hi, I saw you were looking for help...",
                  suggestedEmail:
                    outreach.email || "Hi, I saw you were looking for help...",
                },
              });
              newLeadsCount++;
            }
          }

          // Update agent last run time
          await prisma.prospectingAgent.update({
            where: { id: agent.id },
            data: {
              lastRunAt: new Date(),
              nextRunAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
            },
          });

          return newLeadsCount;
        },
      );

      totalLeadsFound += leadsFound;
    } catch (e: any) {
      console.error(`Agent ${agent.id} run failed:`, e);
    }
  }

  return {
    success: true,
    agentsProcessed: agentsToRun.length,
    totalLeadsFound,
  };
}

export const prospectingAgentRun = inngest.createFunction(
  {
    id: "prospecting-agent-run",
    name: "Prospecting Agent Run (Manual)",
    retries: 2,
  },
  { event: "prospecting/run-agent" },
  async ({ event, step }) => {
    return processProspectingAgents(event, step);
  },
);

export const prospectingAgentCron = inngest.createFunction(
  {
    id: "prospecting-agent-cron",
    name: "Prospecting Agent Run (Cron)",
    retries: 2,
  },
  { cron: "0 0 */3 * *" },
  async ({ event, step }) => {
    return processProspectingAgents(event, step);
  },
);
