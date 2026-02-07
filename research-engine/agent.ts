import { Inngest } from "inngest";
import { prisma } from "./lib/prisma";
import { WebScraper } from "./lib/scraper";
import { SerperClient } from "./lib/search-client";
import { GeminiClient } from "./lib/gemini-client";
import { JinaClient } from "./lib/jina-client";
import { getLLMClientWithFallback } from "./lib/llm-provider";
import { ResearchStatus, ActionPriority, SearchMethod } from "@prisma/client";

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
  },
  { event: "research/initiated" },
  async ({ event, step }) => {
    const { researchId, userId } = event.data;

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
      // 🚀 DEEP RESEARCH (AUTONOMOUS AGENT)
      const interaction = await step.run("create-deep-research", async () => {
        const freshUser = await getFreshUser();
        if (!freshUser?.geminiApiKey) throw new Error("API key missing");
        const geminiClient = new GeminiClient(
          freshUser.geminiApiKey,
          freshUser.geminiModel,
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
            return await geminiClient.getDeepResearchStatus(interaction.id);
          },
        );
        pollingAttempts++;

        // Update progress in DB (outside of step.run is fine for simple updates)
        await prisma.research.update({
          where: { id: researchId },
          data: { progress: Math.min(10 + pollingAttempts * 1, 60) },
        });
      }

      if (statusResult.status === "failed") {
        throw new Error(`Deep Research Failed: ${statusResult.error}`);
      }

      // Step 3b: Save results as synthetic sources
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
      // 🌐 STANDARD MODES (SCRAPE + ANALYZE)
      sources = await step.run("scrape-sources", async () => {
        const scraper = new WebScraper();
        await scraper.initialize();

        try {
          let scrapedData;

          if (research.searchMethod === SearchMethod.JINA_SERPER) {
            const freshUser = await getFreshUser();
            if (!freshUser?.serperApiKey) {
              throw new Error(
                "Serper API key required for Jina + Serper mode.",
              );
            }

            const serper = new SerperClient(freshUser.serperApiKey);
            const jina = new JinaClient();
            const { client: llm } = await getLLMClientWithFallback(
              (freshUser.llmProvider as any) || "GEMINI",
              freshUser.geminiApiKey || "",
              "GROQ",
              freshUser.groqApiKey || "",
            );

            let currentQuery = research.refinedPrompt;
            let allScrapedData: any[] = [];
            let accumulatedContent = "";
            let iteration = 0;
            const maxIterations = 2;

            while (iteration < maxIterations) {
              iteration++;
              const searchResults = await serper.search(currentQuery, 5);
              const urls = jina.filterUrls(searchResults.map((r) => r.url));

              const extractions = await jina.extractMultiple(urls);
              const newScraped = extractions
                .filter((e) => e.success)
                .map((e) => ({
                  url: e.url,
                  title: e.title,
                  content: e.content,
                  excerpt: e.excerpt,
                }));

              allScrapedData = [...allScrapedData, ...newScraped];
              accumulatedContent += newScraped
                .map((s) => s.content)
                .join("\n\n---\n\n");

              if (iteration < maxIterations) {
                const gapAnalysis = await llm.identifyGaps!(
                  currentQuery,
                  accumulatedContent,
                );
                if (
                  !gapAnalysis.hasGaps ||
                  gapAnalysis.suggestedQueries.length === 0
                ) {
                  break;
                }
                currentQuery = gapAnalysis.suggestedQueries[0];
              }
            }

            const finalReport = await llm.synthesizeFinalReport!(
              research.refinedPrompt,
              accumulatedContent,
              iteration,
            );

            scrapedData = [
              ...allScrapedData,
              {
                url: "final-synthesis",
                title: "Synthesized Research Report",
                content: finalReport,
                excerpt: finalReport.substring(0, 500),
              },
            ];
          } else if (research.searchMethod === SearchMethod.SERPER_API) {
            const freshUser = await getFreshUser();
            if (!freshUser?.serperApiKey) {
              throw new Error(
                "Serper API key not configured. Please add it in Settings.",
              );
            }
            const serperClient = new SerperClient(freshUser.serperApiKey);
            const jinaClient = new JinaClient();

            const searchResults = await serperClient.search(
              research.refinedPrompt,
              10,
            );
            const urls = jinaClient.filterUrls(searchResults.map((r) => r.url));

            const extractions = await jinaClient.extractMultiple(urls);

            scrapedData = extractions
              .filter((e) => e.success)
              .map((e) => ({
                url: e.url,
                title: e.title,
                content: e.content,
                excerpt: e.excerpt,
              }));

            if (scrapedData.length === 0) {
              scrapedData = searchResults.map((r) => ({
                url: r.url,
                title: r.title,
                content: r.snippet,
                excerpt: r.snippet,
              }));
            }
          } else {
            const freshUser = await getFreshUser();
            if (!freshUser?.geminiApiKey) {
              throw new Error("Gemini API key not found");
            }
            const geminiClient = new GeminiClient(
              freshUser.geminiApiKey,
              "gemini-2.0-flash",
            );

            const groundingResult = await geminiClient.retryWithBackoff(() =>
              geminiClient.model.generateContent({
                contents: [
                  {
                    role: "user",
                    parts: [
                      {
                        text: `Search the web and provide comprehensive information about: ${research.refinedPrompt}. Include specific facts, data, and cite your sources with URLs.`,
                      },
                    ],
                  },
                ],
                tools: [{ googleSearchRetrieval: {} } as any],
              }),
            );

            const groundingResponse = await groundingResult.response;
            const groundingText = groundingResponse.text();

            const groundingMetadata =
              groundingResponse.candidates?.[0]?.groundingMetadata;
            const groundingChunks = groundingMetadata?.groundingChunks || [];

            scrapedData = groundingChunks.map((chunk: any, index: number) => ({
              url: chunk.web?.uri || `grounding-${index}`,
              title: chunk.web?.title || `Grounding Source ${index + 1}`,
              content:
                groundingText || "Content extracted via Gemini Grounding",
              excerpt: groundingText.substring(0, 500),
            }));

            if (scrapedData.length === 0) {
              scrapedData = [
                {
                  url: "gemini-grounding",
                  title: "AI Grounded Research",
                  content: groundingText,
                  excerpt: groundingText.substring(0, 500),
                },
              ];
            }
          }

          if (scrapedData.length > 0) {
            await prisma.researchSource.createMany({
              data: scrapedData.map((s: any) => ({
                researchId: research.id,
                url: s.url,
                title: s.title,
                content: s.content || s.excerpt || "",
                excerpt:
                  s.excerpt || (s.content ? s.content.substring(0, 500) : ""),
              })),
              skipDuplicates: true,
            });
          }

          await prisma.research.update({
            where: { id: researchId },
            data: { progress: 30 },
          });

          return scrapedData.map((s: any) => ({
            url: s.url,
            title: s.title,
            excerpt: s.excerpt,
          }));
        } finally {
          await scraper.close();
        }
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

      const overrides = event.data.retryOptions;
      let primaryProvider = (freshUser.llmProvider as any) || "GEMINI";
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
      }

      const { client: llmClient } = await getLLMClientWithFallback(
        primaryProvider,
        primaryKey,
        primaryProvider === "GEMINI" ? "GROQ" : "GEMINI",
        primaryProvider === "GEMINI"
          ? freshUser.groqApiKey || ""
          : freshUser.geminiApiKey || "",
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

      const { client: llmClient } = await getLLMClientWithFallback(
        (freshUser.llmProvider as any) || "GEMINI",
        freshUser.geminiApiKey || "",
        "GROQ",
        freshUser.groqApiKey || "",
        freshUser.geminiModel,
      );

      const prompt = `
        Based on these research findings, generate 10 specific, high-impact actionable items.
        Goal: ${research.refinedPrompt}
        Summary: ${analysis.summary}
        
        CRITICAL INSTRUCTIONS:
        - make actions CONCRETE (e.g., "Contact X" -> "Email Head of Sales at Company X asking for Y").
        - include "WHY" this action is needed in the description.
        - mix Strategic (long-term) and Tactical (immediate) actions.
        
        Return as JSON array only:
        [
          { "description": "Specific Action + Rationale", "priority": "HIGH" | "MEDIUM" | "LOW", "effort": 1-5 }
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

        const { client: llmClient } = await getLLMClientWithFallback(
          (freshUser.llmProvider as any) || "GEMINI",
          freshUser.geminiApiKey || "",
          "GROQ",
          freshUser.groqApiKey || "",
          freshUser.geminiModel,
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
              "painPoints": ["pain point 1", "pain point 2"],
              "suggestedDM": "Suggested Decision Maker Role (e.g. CTO, Marketing Director)",
              "suggestedEmail": "Predicted email pattern (e.g. first.last@company.com) or specific email"
            }
          ]
        `;

        const leads = await llmClient.generateJSON<any[]>(prompt);

        const leadData = await prisma.leadData.upsert({
          where: { researchId },
          create: {
            researchId,
            totalFound: leads.length,
          },
          update: {
            totalFound: { increment: leads.length },
          },
        });

        if (leads.length > 0) {
          await prisma.lead.createMany({
            data: leads.map((lead: any) => ({
              leadDataId: leadData.id,
              name: lead.name || "Unknown Contact",
              company: lead.company || "Unknown Company",
              email: lead.email,
              phone: lead.phone,
              website: lead.website,
              industry: lead.industry,
              location: lead.location,
              painPoints: lead.painPoints || [],
              suggestedDM: lead.suggestedDM || "Relevant Decision Maker",
              suggestedEmail: lead.suggestedEmail || "Not available",
            })),
          });
        }

        return { leadDataId: leadData.id, count: leads.length };
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

export const generateLeadsAgent = inngest.createFunction(
  {
    id: "generate-leads-agent",
    name: "Lead Generation Agent",
    retries: 1,
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
            "painPoints": ["Specific Pain Point 1", "Specific Pain Point 2"],
            "suggestedDM": "Target Decision Maker Role",
            "suggestedEmail": "Predicted email pattern or specific email"
          }
        ]
      `;

      return await llmClient.generateJSON<any[]>(prompt);
    });

    if (leads.length > 0) {
      await step.run("save-leads", async () => {
        let leadDataId = research.leadData?.id;

        if (!leadDataId) {
          const leadData = await prisma.leadData.create({
            data: {
              researchId,
              totalFound: 0,
            },
          });
          leadDataId = leadData.id;
        }

        await prisma.lead.createMany({
          data: leads.map((lead: any) => ({
            leadDataId: leadDataId!,
            name: lead.name || "Unknown Contact",
            company: lead.company || "Unknown Company",
            email: lead.email,
            phone: lead.phone,
            website: lead.website,
            industry: lead.industry,
            location: lead.location,
            painPoints: lead.painPoints || [],
            suggestedDM: lead.suggestedDM || "Relevant Decision Maker",
            suggestedEmail: lead.suggestedEmail || "Not available",
          })),
        });

        const total = await prisma.lead.count({
          where: { leadDataId: leadDataId! },
        });
        await prisma.leadData.update({
          where: { id: leadDataId },
          data: { totalFound: total },
        });
      });
    }

    return { success: true, count: leads.length };
  },
);
