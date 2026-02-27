import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { WebScraper } from "@/lib/scraper";
import { SerperClient } from "@/lib/search-client";
import { GeminiClient } from "@/lib/gemini-client";
import { JinaClient } from "@/lib/jina-client";
import { getLLMClientWithFallback } from "@/lib/llm-provider";
import { ResearchStatus, ActionPriority, SearchMethod } from "@prisma/client";
import { emitResearchLog } from "@/lib/log-emitter";

function calculateCredibility(url: string): number {
  try {
    if (url.startsWith("interaction://")) return 0.8;
    if (url === "final-synthesis" || url === "gemini-grounding") return 0.85;
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname.endsWith(".edu") || hostname.endsWith(".gov")) return 0.95;
    if (
      hostname.includes("wikipedia.org") ||
      hostname.includes("nature.com") ||
      hostname.includes("sciencedirect.com") ||
      hostname.includes("pubmed")
    )
      return 0.9;
    if (hostname.endsWith(".org")) return 0.75;
    if (
      hostname.includes("reddit.com") ||
      hostname.includes("quora.com") ||
      hostname.includes("news.ycombinator.com") ||
      hostname.includes("stackexchange.com") ||
      hostname.includes("stackoverflow.com")
    )
      return 0.6;
    if (
      hostname.includes("twitter.com") ||
      hostname.includes("x.com") ||
      hostname.includes("facebook.com") ||
      hostname.includes("tiktok.com")
    )
      return 0.3;
    return 0.5;
  } catch {
    return 0.5;
  }
}

export const researchAgent = inngest.createFunction(
  {
    id: "research-agent",
    name: "Deep Research Agent",
    retries: 2,
  },
  { event: "research/initiated" },
  async ({ event, step }) => {
    const { researchId, userId } = event.data;

    // Emit initial log
    await emitResearchLog(
      researchId,
      "Research agent initialized. Fetching details...",
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
                // If it's the last output, it's likely the final report
                // But we accumulate all text just in case, or treat intermediate text as 'notes'
                if (index === (statusResult.outputs?.length || 0) - 1) {
                  finalReport += part.text;
                } else {
                  // Intermediate text steps
                  scrapedData.push({
                    url: `interaction://${interaction.id}/step-${index}`,
                    title: `Research Step ${index + 1}`,
                    content: part.text,
                    excerpt: part.text.substring(0, 300) + "...",
                  });
                }
              }
              if (part.thought) {
                // Capture thinking block
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

        // Add the final report as the main source
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
            credibility: calculateCredibility(s.url),
          })),
          skipDuplicates: true,
        });

        await prisma.research.update({
          where: { id: researchId },
          data: { progress: 70 },
        });

        return scrapedData;
      });
    } else {
      // 🌐 STANDARD MODES (SCRAPE + ANALYZE)
      sources = await step.run("scrape-sources", async () => {
        const scraper = new WebScraper();
        await scraper.initialize();
        await emitResearchLog(researchId, "Web Scraper initialized...");

        try {
          let scrapedData: any[] = [];

          if (research.searchMethod === (SearchMethod as any).JINA_SERPER) {
            // 🚀 JINA + SERPER AGENTIC LOOP
            // 🚀 JINA + SERPER LOGIC (Configurable Mode)
            const freshUser = await getFreshUser();
            if (!freshUser?.serperApiKey) {
              throw new Error(
                "Serper API key required for Jina + Serper mode.",
              );
            }

            const serper = new SerperClient(freshUser.serperApiKey);
            const jina = new JinaClient();
            const scrapingMode = (freshUser as any).scrapingMode || "AGENTIC"; // Default to AGENTIC

            let allScrapedData: any[] = [];

            if (scrapingMode === "SCRAPER") {
              // ⚡️ FAST SCRAPER MODE (Single Pass, No LLM)
              await emitResearchLog(
                researchId,
                `Running in Fast Scraper Mode...`,
              );
              console.log(
                `[ResearchAgent] Fast Scraper Mode: ${research.refinedPrompt}`,
              );

              // 1. Search
              const searchResults = await serper.search(
                research.refinedPrompt,
                10,
              ); // get more results
              const urls = jina.filterUrls(searchResults.map((r) => r.url));

              await emitResearchLog(
                researchId,
                `Found ${urls.length} sources. Extracting content...`,
              );

              // 2. Extract
              const extractions = await jina.extractMultiple(urls, (msg) =>
                emitResearchLog(researchId, msg),
              );
              allScrapedData = extractions
                .filter((e) => e.success)
                .map((e) => ({
                  url: e.url,
                  title: e.title,
                  content: e.content,
                  excerpt: e.excerpt,
                }));
            } else {
              // 🤖 AGENTIC MODE (Iterative + LLM)
              await emitResearchLog(
                researchId,
                `Running in Agentic Search Mode...`,
              );

              // Smart Default: If no DB setting, use GROQ only if key exists, else GEMINI
              let defaultProvider = "GEMINI";
              if (freshUser.groqApiKey) {
                defaultProvider = "GROQ";
              }

              let primaryProvider =
                (freshUser.llmProvider as any) || defaultProvider;
              let primaryKey = freshUser.geminiApiKey || "";

              if (primaryProvider === "GROQ") {
                primaryKey = freshUser.groqApiKey || "";
              }

              const { client: llm } = await getLLMClientWithFallback(
                primaryProvider,
                primaryKey,
                primaryProvider === "GEMINI" ? "GROQ" : "GEMINI",
                primaryProvider === "GROQ"
                  ? freshUser.geminiApiKey || ""
                  : freshUser.groqApiKey || "",
              );

              console.log(
                `[ResearchAgent] Starting Agentic Loop for: ${research.refinedPrompt}`,
              );

              let currentQuery = research.refinedPrompt;
              let accumulatedContent = "";
              let iteration = 0;
              const maxIterations = 2;

              while (iteration < maxIterations) {
                iteration++;
                await emitResearchLog(
                  researchId,
                  `Iteration ${iteration}/${maxIterations}: Searching for "${currentQuery}"...`,
                );
                console.log(
                  `[ResearchAgent] Iteration ${iteration}/${maxIterations} with query: ${currentQuery}`,
                );

                // 1. Search
                const searchResults = await serper.search(currentQuery, 5);
                const urls = jina.filterUrls(searchResults.map((r) => r.url));

                await emitResearchLog(
                  researchId,
                  `Found ${urls.length} sources. Extracting content...`,
                );

                // 2. Extract
                const extractions = await jina.extractMultiple(urls, (msg) =>
                  emitResearchLog(researchId, msg),
                );
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
                  try {
                    const gapAnalysis = await llm.identifyGaps!(
                      currentQuery,
                      accumulatedContent,
                    );
                    if (
                      !gapAnalysis.hasGaps ||
                      !gapAnalysis.suggestedQueries ||
                      gapAnalysis.suggestedQueries.length === 0
                    ) {
                      await emitResearchLog(
                        researchId,
                        "Sufficient data collected. Finishing search...",
                      );
                      break;
                    }
                    currentQuery = gapAnalysis.suggestedQueries[0];
                  } catch (error: any) {
                    console.error("Agentic Loop LLM Error:", error);
                    await emitResearchLog(
                      researchId,
                      `Agentic planning failed: ${error?.message || "Unknown error"}. Stopping early.`,
                    );
                    break;
                  }
                }
              }

              scrapedData = allScrapedData;

              // 4. Final Synthesis
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
            }
          } else if (research.searchMethod === SearchMethod.SERPER_API) {
            // Use Serper API + Jina extraction for better format support
            const freshUser = await getFreshUser();
            if (!freshUser?.serperApiKey) {
              throw new Error(
                "Serper API key not configured. Please add it in Settings.",
              );
            }
            const serperClient = new SerperClient(freshUser.serperApiKey);
            const jinaClient = new JinaClient();

            console.log(
              `[ResearchAgent] Searching with Serper for: ${research.refinedPrompt}`,
            );
            const searchResults = await serperClient.search(
              research.refinedPrompt,
              10,
            );
            const urls = jinaClient.filterUrls(searchResults.map((r) => r.url));

            console.log(
              `[ResearchAgent] Extracting ${urls.length} URLs via Jina...`,
            );
            const extractions = await jinaClient.extractMultiple(urls, (msg) =>
              emitResearchLog(researchId, msg),
            );

            scrapedData = extractions
              .filter((e) => e.success)
              .map((e) => ({
                url: e.url,
                title: e.title,
                content: e.content,
                excerpt: e.excerpt,
              }));

            if (scrapedData.length === 0) {
              // Fallback to snippets if extraction failed
              scrapedData = searchResults.map((r) => ({
                url: r.url,
                title: r.title,
                content: r.snippet,
                excerpt: r.snippet,
              }));
            }
          } else {
            // Use Gemini Grounding - search via Gemini with Google Search tool
            const freshUser = await getFreshUser();
            if (!freshUser?.geminiApiKey) {
              throw new Error("Gemini API key not found");
            }
            // Use gemini-2.0-flash for Grounding (it supports googleSearch tool)
            const geminiClient = new GeminiClient(
              freshUser.geminiApiKey,
              "gemini-2.0-flash",
            );

            const groundingResult = await geminiClient.groundingSearch(
              research.refinedPrompt || research.title,
            );

            scrapedData = groundingResult.sources.map((source, index) => ({
              url: source.url,
              title: source.title,
              content:
                groundingResult.text ||
                "Content extracted via Gemini Grounding",
              excerpt: groundingResult.text.substring(0, 500),
            }));

            const groundingText = groundingResult.text;

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

          // Save sources to DB
          if (scrapedData.length > 0) {
            console.log(
              `[ResearchAgent] Saving ${scrapedData.length} sources to DB...`,
            );
            await prisma.researchSource.createMany({
              data: scrapedData.map((s: any) => ({
                researchId: research.id,
                url: s.url,
                title: s.title,
                content: s.content || s.excerpt || "",
                excerpt:
                  s.excerpt || (s.content ? s.content.substring(0, 500) : ""),
                credibility: calculateCredibility(s.url),
              })),
              skipDuplicates: true,
            });
            console.log("[ResearchAgent] Sources saved successfully.");
          }

          await prisma.research.update({
            where: { id: researchId },
            data: { progress: 30 },
          });

          return scrapedData;
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

      // Get fresh user data for latest API key
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
        primaryProvider === "GEMINI" ? "GROQ" : "GEMINI", // Flip fallback
        primaryProvider === "GROQ"
          ? freshUser.geminiApiKey || ""
          : freshUser.groqApiKey || "",
        primaryModel,
      );

      await emitResearchLog(
        researchId,
        "Analyzing gathered content and generating insights...",
      );

      // Fetch user's AI context for personalized analysis
      const aiContext = await prisma.userAIContext.findUnique({
        where: { userId },
      });

      let contextPrefix = "";
      if (aiContext) {
        const parts: string[] = [];
        if (aiContext.researchStyle)
          parts.push(`Research style preference: ${aiContext.researchStyle}`);
        if (aiContext.communicationPref)
          parts.push(
            `Communication preference: ${aiContext.communicationPref}`,
          );
        if (aiContext.industryFocus?.length)
          parts.push(`Industry focus: ${aiContext.industryFocus.join(", ")}`);
        if (aiContext.customInstructions)
          parts.push(`Custom instructions: ${aiContext.customInstructions}`);
        if (aiContext.previousFindings) {
          const findings = aiContext.previousFindings as any[];
          if (findings.length > 0) {
            const recent = findings
              .slice(-5)
              .map((f: any) => f.title)
              .join(", ");
            parts.push(`Recent research topics (for continuity): ${recent}`);
          }
        }
        if (parts.length > 0) {
          contextPrefix = `\n\n[USER CONTEXT — Tailor your analysis accordingly]\n${parts.join("\n")}\n\n`;
        }
      }

      const result = await llmClient.analyzeContent(
        research.refinedPrompt + contextPrefix,
        sources
          .map((s: any) => `Source: ${s.title} (${s.url})\n${s.content}`)
          .join("\n\n---\n\n"),
      );

      // Save insights
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
      // Get fresh user data for latest API key
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
        // Get fresh user data for latest API key
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

        const leads = await llmClient.generateJSON<any[]>(prompt);

        // Use upsert to avoid unique constraint violation if LeadData already exists
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

      // Auto-save findings to UserAIContext for cross-session memory
      try {
        const insights = await prisma.researchInsight.findMany({
          where: { researchId },
          take: 3,
          orderBy: { confidence: "desc" },
        });

        const topicKeywords = insights
          .flatMap((i) => [
            i.category,
            ...i.title.split(" ").filter((w) => w.length > 4),
          ])
          .filter(Boolean)
          .slice(0, 5);

        const existing = await prisma.userAIContext.findUnique({
          where: { userId },
        });

        const previousFindings: any[] =
          (existing?.previousFindings as any[]) || [];
        const newEntry = {
          researchId,
          title: research.title,
          summary: analysis.summary?.substring(0, 500) || "Research completed",
          topics: topicKeywords,
          date: new Date().toISOString(),
        };
        const updatedFindings = [...previousFindings, newEntry].slice(-20);

        const existingTopics = existing?.preferredTopics || [];
        const mergedTopics = Array.from(
          new Set([...existingTopics, ...topicKeywords]),
        ).slice(-50);

        await prisma.userAIContext.upsert({
          where: { userId },
          create: {
            userId,
            previousFindings: updatedFindings,
            preferredTopics: mergedTopics,
          },
          update: {
            previousFindings: updatedFindings,
            preferredTopics: mergedTopics,
          },
        });
      } catch (ctxErr) {
        console.warn("[ResearchAgent] Failed to save AI context:", ctxErr);
      }
    });

    return { success: true };
  },
);
