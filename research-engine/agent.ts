import { Inngest } from "inngest";
import { prisma } from "./lib/prisma";
import { GeminiClient } from "./lib/gemini-client";
import { getLLMClientWithFallback } from "./lib/llm-provider";
import { ResearchStatus, ActionPriority, SearchMethod } from "@prisma/client";
import { LeadScoringService } from "./lib/lead-scoring";
import { LeadPromotionService } from "./lib/lead-promotion";

// Initialize Inngest with the same ID to maintain event compatibility
const inngest = new Inngest({
  id: "baserow-research",
  eventKey: process.env.INNGEST_EVENT_KEY,
});

export const researchAgent = inngest.createFunction(
  {
    id: "research-agent",
    name: "Deep Research Agent",
    retries: 2,
    concurrency: {
      limit: 2,
      key: "event.data.userId",
    },
  },
  { event: "research/initiated" },
  async ({ event, step }) => {
    const { researchId, userId } = event.data;
    const socket = SocketService.getInstance();
    socket.emitLog(
      researchId,
      "Research agent initialized. fetching details...",
    );

    // Step 1: Fetch research details
    const research = await step.run("fetch-research", async () => {
      const data = await prisma.research.findUnique({
        where: { id: researchId },
      });
      if (!data) throw new Error("Research not found");
      return data;
    });

    // Step 2: Get user's Gemini API key and model preference
    const user = await step.run("fetch-user", async () => {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: {
          geminiApiKey: true,
          geminiModel: true,
          serperApiKey: true,
          llmProvider: true,
          groqApiKey: true,
        },
      });
    });

    if (!user?.geminiApiKey) {
      await prisma.research.update({
        where: { id: researchId },
        data: {
          status: ResearchStatus.FAILED,
          errorMessage: "Gemini API key not found",
        },
      });
      return { success: false, error: "API Key missing" };
    }

    // Helper to get fresh user data (bypasses Inngest step caching)
    const getFreshUser = async () => {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: {
          geminiApiKey: true,
          geminiModel: true,
          serperApiKey: true,
          llmProvider: true,
          groqApiKey: true,
        },
      });
    };

    // Step 3: Web Scraping or Deep Research
    let sources: any[] = [];
    const retryOptions = event.data.retryOptions;

    // Logic to skip search if retrying analysis
    if (retryOptions?.skipSearch) {
      sources = await step.run("fetch-existing-sources", async () => {
        const existingSources = await prisma.researchSource.findMany({
          where: { researchId },
          select: { url: true, title: true, content: true, excerpt: true },
        });
        if (existingSources.length === 0) {
          throw new Error("No existing sources found to retry analysis with.");
        }
        return existingSources;
      });
    } else if (research.searchMethod === SearchMethod.GEMINI_DEEP_RESEARCH) {
      // 🚀 DEEP RESEARCH (AUTONOMOUS AGENT via Gemini Interactions API)
      const interaction = await step.run("create-deep-research", async () => {
        const freshUser = await getFreshUser();
        if (!freshUser?.geminiApiKey) throw new Error("API key missing");
        const geminiClient = new GeminiClient(
          freshUser.geminiApiKey,
          freshUser.geminiModel,
        );
        socket.emitLog(
          researchId,
          "Connected to Deep Research Agent. Starting mission...",
        );
        return await geminiClient.createDeepResearchTask(
          research.refinedPrompt,
        );
      });

      let statusResult = interaction;
      let pollingAttempts = 0;

      while (
        statusResult.status !== "completed" &&
        statusResult.status !== "failed" &&
        pollingAttempts < 40 // ~20 mins total polling
      ) {
        await step.sleep(`poll-wait-${pollingAttempts}`, "30s");
        statusResult = await step.run(
          `check-deep-status-${pollingAttempts}`,
          async () => {
            const freshUser = await getFreshUser();
            const geminiClient = new GeminiClient(
              freshUser!.geminiApiKey!,
              freshUser!.geminiModel,
            );
            socket.emitLog(
              researchId,
              `Polling Deep Research Agent... Attempt ${pollingAttempts + 1}`,
            );
            return await geminiClient.getDeepResearchStatus(interaction.id);
          },
        );
        pollingAttempts++;

        await prisma.research.update({
          where: { id: researchId },
          data: { progress: Math.min(10 + pollingAttempts * 1, 60) },
        });
      }

      if (statusResult.status === "failed") {
        throw new Error(`Deep Research Failed: ${statusResult.error}`);
      }

      // Save results as synthetic sources
      sources = await step.run("process-deep-results", async () => {
        const scrapedData: any[] = [];
        let finalReport = "";

        if (statusResult.outputs) {
          statusResult.outputs.forEach((output, index) => {
            output.parts.forEach((part: any) => {
              if (part.text) {
                if (index === (statusResult.outputs?.length || 0) - 1) {
                  finalReport += part.text;
                } else {
                  scrapedData.push({
                    url: `interaction://${interaction.id}/step-${index}`,
                    title: `Research Step ${index + 1}`,
                    content: part.text,
                    excerpt: part.text.substring(0, 300) + "...",
                  });
                }
              }
              if (part.thought) {
                const thoughtContent = `[Thinking Process]\nSummary: ${part.thought.summary || "No summary"}\nSignature: ${part.thought.signature}`;
                scrapedData.push({
                  url: `interaction://${interaction.id}/thought-${index}`,
                  title: `Research Logic (Step ${index + 1})`,
                  content: thoughtContent,
                  excerpt: part.thought.summary
                    ? part.thought.summary.substring(0, 300)
                    : "Internal reasoning step...",
                });
              }
            });
          });
        }

        if (!finalReport && scrapedData.length === 0) {
          finalReport = "No output generated from Deep Research agent.";
        }

        scrapedData.push({
          url: `interaction://${interaction.id}/final-report`,
          title: "Gemini Deep Research Final Report",
          content: finalReport || "No final report text found.",
          excerpt: finalReport ? finalReport.substring(0, 500) : "Empty report",
        });

        await prisma.researchSource.createMany({
          data: scrapedData.map((s: any) => ({
            researchId,
            url: s.url,
            title: s.title,
            content: s.content || "",
            excerpt:
              s.excerpt || (s.content ? s.content.substring(0, 500) : ""),
          })),
          skipDuplicates: true,
        });

        await prisma.research.update({
          where: { id: researchId },
          data: { progress: 70 },
        });

        return scrapedData.map((s: any) => ({
          url: s.url,
          title: s.title,
          excerpt: s.excerpt,
        }));
      });
    } else {
      // 🔍 GOOGLE SEARCH (Grounding — fast, free-tier compatible)
      sources = await step.run("grounding-search", async () => {
        const freshUser = await getFreshUser();
        if (!freshUser?.geminiApiKey) throw new Error("Gemini API key missing");
        const geminiClient = new GeminiClient(
          freshUser.geminiApiKey,
          freshUser.geminiModel || "gemini-2.0-flash",
        );

        socket.emitLog(researchId, "Starting Google Search via Grounding...");

        const result = await geminiClient.groundingSearch(
          research.refinedPrompt,
        );

        socket.emitLog(
          researchId,
          `Found ${result.sources.length} sources from ${result.searchQueries.length} search queries.`,
        );

        // Emit individual sources for live UI display
        result.sources.forEach((s) => {
          socket.emitLog(researchId, `📎 ${s.title} — ${s.url}`);
        });

        const scrapedData = [
          // Real grounding sources with URLs
          ...result.sources.map((s, i) => ({
            url: s.url,
            title: s.title,
            content: result.text,
            excerpt: result.text.substring(0, 500),
          })),
          // The full grounded response
          {
            url: "google-search-grounding",
            title: "Google Search Grounded Report",
            content: result.text,
            excerpt: result.text.substring(0, 500),
          },
        ];

        // De-duplicate by URL
        const seen = new Set<string>();
        const uniqueData = scrapedData.filter((s) => {
          if (seen.has(s.url)) return false;
          seen.add(s.url);
          return true;
        });

        await prisma.researchSource.createMany({
          data: uniqueData.map((s) => ({
            researchId,
            url: s.url,
            title: s.title,
            content: s.content || "",
            excerpt: s.excerpt || "",
          })),
          skipDuplicates: true,
        });

        await prisma.research.update({
          where: { id: researchId },
          data: { progress: 50 },
        });

        return uniqueData.map((s) => ({
          url: s.url,
          title: s.title,
          excerpt: s.excerpt,
        }));
      });
    }

    // Step 4: AI Analysis
    const analysis = await step.run("analyze-findings", async () => {
      if (sources.length === 0) {
        throw new Error("No sources found to analyze");
      }

      const freshUser = await getFreshUser();
      if (!freshUser?.geminiApiKey && !freshUser?.groqApiKey) {
        throw new Error("No LLM API keys found. Please check your settings.");
      }

      // Determine primary provider based on overrides or user settings
      // Default to GROQ if no preference is set in DB to avoid Gemini quotas
      const overrides = event.data.retryOptions;

      // Smart Default: If no DB setting, use GROQ only if key exists, else GEMINI
      let defaultProvider = "GEMINI";
      if (freshUser.groqApiKey) {
        defaultProvider = "GROQ";
      }

      let primaryProvider = (freshUser.llmProvider as any) || defaultProvider;
      let primaryKey = freshUser.geminiApiKey || "";
      let primaryModel = freshUser.geminiModel;

      if (overrides?.provider === "GROQ") {
        primaryProvider = "GROQ";
        primaryKey = freshUser.groqApiKey || "";
        primaryModel = overrides.model;
      } else if (overrides?.provider === "GEMINI") {
        primaryProvider = "GEMINI";
        primaryKey = freshUser.geminiApiKey || "";
        primaryModel = overrides.model || freshUser.geminiModel;
      } else if (primaryProvider === "GROQ") {
        primaryKey = freshUser.groqApiKey || "";
      }

      const { client: llmClient } = await getLLMClientWithFallback(
        primaryProvider,
        primaryKey,
        primaryProvider === "GEMINI" ? "GROQ" : "GEMINI",
        primaryProvider === "GROQ"
          ? freshUser.geminiApiKey || ""
          : freshUser.groqApiKey || "",
        primaryModel,
      );

      // 🔄 Fetch content fresh from DB if not present (optimization for large payloads)
      const fullSources = await prisma.researchSource.findMany({
        where: {
          researchId,
          url: { in: sources.map((s: any) => s.url) },
        },
      });

      const result = await llmClient.analyzeContent(
        research.refinedPrompt,
        fullSources
          .map((s: any) => `Source: ${s.title} (${s.url})\n${s.content}`)
          .join("\n\n---\n\n"),
      );

      socket.emitLog(
        researchId,
        "Generating structured insights from analysis...",
      );

      await prisma.researchInsight.createMany({
        data: result.insights.map((insight, index) => ({
          researchId,
          title: insight.title,
          content: insight.content,
          category: insight.category,
          confidence: insight.confidence,
          order: index,
        })),
      });

      await prisma.research.update({
        where: { id: researchId },
        data: {
          progress: 70,
          rawData: result as any,
        },
      });

      return result;
    });

    // Step 5: Generate Action Items
    const actionItems = await step.run("generate-actions", async () => {
      const freshUser = await getFreshUser();
      if (!freshUser?.geminiApiKey && !freshUser?.groqApiKey) {
        throw new Error("No LLM API keys found. Please check your settings.");
      }

      const overrides = event.data.retryOptions;

      // Smart Default: If no DB setting, use GROQ only if key exists, else GEMINI
      let defaultProvider = "GEMINI";
      if (freshUser.groqApiKey) {
        defaultProvider = "GROQ";
      }

      let primaryProvider = (freshUser.llmProvider as any) || defaultProvider;
      let primaryKey = freshUser.geminiApiKey || "";
      let primaryModel = freshUser.geminiModel;

      if (overrides?.provider === "GROQ") {
        primaryProvider = "GROQ";
        primaryKey = freshUser.groqApiKey || "";
        primaryModel = overrides.model;
      } else if (overrides?.provider === "GEMINI") {
        primaryProvider = "GEMINI";
        primaryKey = freshUser.geminiApiKey || "";
        primaryModel = overrides.model || freshUser.geminiModel;
      } else if (primaryProvider === "GROQ") {
        primaryKey = freshUser.groqApiKey || "";
      }

      const { client: llmClient } = await getLLMClientWithFallback(
        primaryProvider,
        primaryKey,
        primaryProvider === "GEMINI" ? "GROQ" : "GEMINI",
        primaryProvider === "GROQ"
          ? freshUser.geminiApiKey || ""
          : freshUser.groqApiKey || "",
        primaryModel,
      );

      const prompt = `
        You are a COO writing Monday morning action items for a team. These must be things someone can DO, not things to "think about."

        Research Goal: ${research.refinedPrompt}
        Key Findings Summary: ${analysis.summary}

        ════════════════════════════════════════
        RULES FOR ACTION ITEMS — FOLLOW EXACTLY:
        ════════════════════════════════════════

        1. BANNED WORDS: "Consider", "Explore", "Evaluate", "Look into", "Think about", "Assess", "Research further"
           → Replace with: "Schedule", "Build", "Launch", "Email", "Call", "Draft", "Ship", "Hire", "Cut", "Negotiate"

        2. Every action MUST answer: WHO does WHAT by WHEN?
           Bad: "Improve content marketing strategy"
           Good: "Marketing lead drafts 4 SEO-optimized articles targeting [specific keyword cluster] by end of week, publish 2 per week starting next Monday"

        3. Include EXPECTED IMPACT for each action:
           "This could increase [metric] by [X]% based on [finding from research]"
           OR "This mitigates the risk of [specific threat] which could cost [estimate]"

        4. Priority rules:
           - HIGH = revenue at risk or major opportunity window closing. Do this week.
           - MEDIUM = competitive advantage. Do this month.
           - LOW = optimization or future-proofing. Do this quarter.

        5. Effort scale:
           1 = One person, one hour (e.g., send an email)
           2 = One person, one day (e.g., draft a proposal)
           3 = Small team, one week (e.g., build a landing page)
           4 = Cross-functional, 2-4 weeks (e.g., launch a campaign)
           5 = Major initiative, 1-3 months (e.g., enter a new market)

        6. Mix of timeframes:
           - At least 3 quick wins (effort 1-2, do THIS WEEK)
           - At least 3 strategic plays (effort 3-4, do THIS MONTH)
           - Up to 2 big bets (effort 4-5, do THIS QUARTER)

        Generate exactly 8-10 action items.

        Return as JSON array only (no other text):
        [
          { "description": "VERB + specific action + who + timeline + expected impact", "priority": "HIGH" | "MEDIUM" | "LOW", "effort": 1-5 }
        ]
      `;

      const actions = await llmClient.generateJSON<any[]>(prompt);

      if (actions.length > 0) {
        await prisma.actionItem.createMany({
          data: actions.map((a: any) => ({
            researchId,
            description: a.description,
            priority: (a.priority || "MEDIUM") as ActionPriority,
            effort: a.effort || 3,
          })),
        });
      }

      await prisma.research.update({
        where: { id: researchId },
        data: { progress: 90 },
      });

      return actions;
    });

    // Step 6: Lead Generation (if scope is LEAD_GENERATION)
    if (research.scope === "LEAD_GENERATION") {
      await step.run("generate-leads", async () => {
        const freshUser = await getFreshUser();
        if (!freshUser?.geminiApiKey && !freshUser?.groqApiKey) {
          throw new Error("No LLM API keys found. Please check your settings.");
        }

        const overrides = event.data.retryOptions;

        // Smart Default: If no DB setting, use GROQ only if key exists, else GEMINI
        let defaultProvider = "GEMINI";
        if (freshUser.groqApiKey) {
          defaultProvider = "GROQ";
        }

        let primaryProvider = (freshUser.llmProvider as any) || defaultProvider;
        let primaryKey = freshUser.geminiApiKey || "";
        let primaryModel = freshUser.geminiModel;

        if (overrides?.provider === "GROQ") {
          primaryProvider = "GROQ";
          primaryKey = freshUser.groqApiKey || "";
          primaryModel = overrides.model;
        } else if (overrides?.provider === "GEMINI") {
          primaryProvider = "GEMINI";
          primaryKey = freshUser.geminiApiKey || "";
          primaryModel = overrides.model || freshUser.geminiModel;
        } else if (primaryProvider === "GROQ") {
          primaryKey = freshUser.groqApiKey || "";
        }

        const { client: llmClient } = await getLLMClientWithFallback(
          primaryProvider,
          primaryKey,
          primaryProvider === "GEMINI" ? "GROQ" : "GEMINI",
          primaryProvider === "GROQ"
            ? freshUser.geminiApiKey || ""
            : freshUser.groqApiKey || "",
          primaryModel,
        );

        const prompt = `
          Based on the following research findings, identify potential business leads, companies, or organizations that would be relevant targets.

          Research Goal: ${research.refinedPrompt}
          
          Research Summary:
          ${analysis.summary}

          Key Insights:
          ${analysis.insights
            .map((i: any) => `- ${i.title}: ${i.content}`)
            .join("\n")}
          
          Extract details for up to 10 high-quality leads.
          Focus on finding specific companies, their website, and potential decision makers.
          
          Return as a JSON array matching this structure:
          [
            {
              "name": "Contact Name or 'General Inquiry'",
              "company": "Company Name",
              "email": "Email if found or null",
              "phone": "Phone if found or null",
              "website": "Website URL",
              "industry": "Industry segment",
              "location": "City/Country",
              "companySize": "Estimated employee count range e.g. '10-50' or '200+'",
              "painPoints": ["pain point 1", "pain point 2"],
              "suggestedDM": "Suggested Decision Maker Role (e.g. CTO, Marketing Director)",
              "suggestedEmail": "Predicted email pattern (e.g. first.last@company.com) or specific email",
              "personalization": { "recentNews": "Any recent company news", "techStack": ["tools they use"], "hiringSignals": "Any hiring/growth signals" }
            }
          ]
        `;

        const leads = await llmClient.generateJSON<any[]>(prompt);

        // Save leads directly to CRM
        socket.emitLog(researchId, "Saving leads directly to CRM pipeline...");

        if (leads.length > 0) {
          await prisma.crmLead.createMany({
            data: leads.map((lead: any) => ({
              userId: userId,
              researchId: researchId,
              firstName: lead.name
                ? lead.name.split(" ")[0] || "Unknown"
                : "Unknown",
              lastName: lead.name
                ? lead.name.split(" ").slice(1).join(" ") || "Contact"
                : "Contact",
              companyName: lead.company || "Unknown Company",
              email:
                lead.email ||
                lead.suggestedEmail ||
                `unknown@${lead.website || "unknown.com"}`,
              phone: lead.phone,
              companyWebsite: lead.website,
              industry: lead.industry,
              companySize: lead.companySize || null,
              painPoints: lead.painPoints || [],
              title: lead.suggestedDM || "Relevant Decision Maker",
              customFields: {
                location: lead.location,
                personalization: lead.personalization || null,
              },
              source: "OUTBOUND",
              status: "NEW",
            })),
          });

          socket.emitLog(
            researchId,
            `Successfully added ${leads.length} leads to CRM.`,
          );
        }

        return { count: leads.length };
      });
    }

    // Step 7: Finalize
    await step.run("finalize", async () => {
      await prisma.research.update({
        where: { id: researchId },
        data: {
          status: ResearchStatus.COMPLETED,
          progress: 100,
          completedAt: new Date(),
        },
      });
    });

    return { success: true };
  },
);

import { SocketService } from "./lib/socket";

export const generateLeadsAgent = inngest.createFunction(
  {
    id: "generate-leads-agent",
    name: "Lead Generation Agent",
    retries: 1,
    concurrency: {
      limit: 2,
      key: "event.data.userId",
    },
  },
  { event: "research/generate-leads-requested" },
  async ({ event, step }) => {
    const { researchId, userId } = event.data;

    const research = await step.run("fetch-research", async () => {
      const data = await prisma.research.findUnique({
        where: { id: researchId },
        include: { leadData: true },
      });
      if (!data) throw new Error("Research not found");
      return data;
    });

    const analysis = research.rawData as any;
    if (!analysis?.summary || !analysis?.insights) {
      throw new Error(
        "Research analysis not found. Please run analysis first.",
      );
    }

    const user = await step.run("fetch-user", async () => {
      return await prisma.user.findUnique({
        where: { id: userId },
        select: {
          geminiApiKey: true,
          geminiModel: true,
          groqApiKey: true,
          llmProvider: true,
        },
      });
    });

    if (!user?.geminiApiKey && !user?.groqApiKey) {
      throw new Error("No LLM API keys found");
    }

    const leads = await step.run("generate-leads", async () => {
      const { client: llmClient } = await getLLMClientWithFallback(
        (user.llmProvider as any) || "GEMINI",
        user.geminiApiKey || "",
        "GROQ",
        user.groqApiKey || "",
        user.geminiModel,
      );

      const prompt = `
        Based on these research findings, identify specific business leads.
        
        Goal: ${research.refinedPrompt}
        Summary: ${analysis.summary}
        
        Key Insights:
        ${analysis.insights
          .map((i: any) => `- ${i.title}: ${i.content}`)
          .join("\n")}
        
        INSTRUCTIONS:
        - Prioritize finding SPECIFIC people (CTO, VP Marketing, Founder) over generic info.
        - Infer 'painPoints' directly from the research (e.g. if company has bad reviews -> "Customer Satisfaction" is a pain point).
        - 'suggestedEmail' should be a best-guess pattern if not found (e.g. first.last@domain.com).
        
        Extract details for up to 10 high-quality leads.
        Return as a JSON array:
        [
          {
            "name": "Contact Name or 'Specific Role' (not just 'Manager')",
            "company": "Company Name",
            "email": "Email if found or null",
            "phone": "Phone if found or null",
            "website": "Website URL",
            "industry": "Industry segment",
            "location": "City/Country",
            "companySize": "Estimated employee count range e.g. '10-50' or '200+'",
            "painPoints": ["Specific Pain Point 1", "Specific Pain Point 2"],
            "suggestedDM": "Target Decision Maker Role",
            "suggestedEmail": "Predicted email pattern or specific email",
            "personalization": { "recentNews": "Any relevant company news", "techStack": ["tools they use"], "hiringSignals": "Any hiring/growth signals" }
          }
        ]
      `;

      return await llmClient.generateJSON<any[]>(prompt);
    });

    if (leads.length > 0) {
      await step.run("save-leads-to-crm", async () => {
        await prisma.crmLead.createMany({
          data: leads.map((lead: any) => ({
            userId: userId,
            researchId: researchId,
            firstName: lead.name
              ? lead.name.split(" ")[0] || "Unknown"
              : "Unknown",
            lastName: lead.name
              ? lead.name.split(" ").slice(1).join(" ") || "Contact"
              : "Contact",
            companyName: lead.company || "Unknown Company",
            email:
              lead.email ||
              lead.suggestedEmail ||
              `unknown@${lead.website || "unknown.com"}`,
            phone: lead.phone,
            companyWebsite: lead.website,
            industry: lead.industry,
            companySize: lead.companySize || null,
            painPoints: lead.painPoints || [],
            title: lead.suggestedDM || "Relevant Decision Maker",
            customFields: {
              location: lead.location,
              personalization: lead.personalization || null,
            },
            source: "OUTBOUND",
            status: "NEW",
          })),
        });

        console.log(
          `[LeadGen] Saved ${leads.length} leads directly to CRM pipeline.`,
        );
      });
    }

    return { success: true, count: leads.length };
  },
);
