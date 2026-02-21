"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateLeadsAgent = exports.researchAgent = void 0;
const inngest_1 = require("inngest");
const prisma_1 = require("./lib/prisma");
const scraper_1 = require("./lib/scraper");
const search_client_1 = require("./lib/search-client");
const gemini_client_1 = require("./lib/gemini-client");
const jina_client_1 = require("./lib/jina-client");
const llm_provider_1 = require("./lib/llm-provider");
const client_1 = require("@prisma/client");
const cache_1 = require("./lib/cache");
// Initialize Inngest with the same ID to maintain event compatibility
const inngest = new inngest_1.Inngest({
    id: "baserow-research",
    eventKey: process.env.INNGEST_EVENT_KEY,
});
exports.researchAgent = inngest.createFunction({
    id: "research-agent",
    name: "Deep Research Agent",
    retries: 2,
}, { event: "research/initiated" }, async ({ event, step }) => {
    const { researchId, userId } = event.data;
    const socket = socket_1.SocketService.getInstance();
    socket.emitLog(researchId, "Research agent initialized. fetching details...");
    // Step 1: Fetch research details
    const research = await step.run("fetch-research", async () => {
        const data = await prisma_1.prisma.research.findUnique({
            where: { id: researchId },
        });
        if (!data)
            throw new Error("Research not found");
        return data;
    });
    // Step 2: Get user's Gemini API key and model preference
    const user = await step.run("fetch-user", async () => {
        return await prisma_1.prisma.user.findUnique({
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
        await prisma_1.prisma.research.update({
            where: { id: researchId },
            data: {
                status: client_1.ResearchStatus.FAILED,
                errorMessage: "Gemini API key not found",
            },
        });
        return { success: false, error: "API Key missing" };
    }
    // Helper to get fresh user data (bypasses Inngest step caching)
    const getFreshUser = async () => {
        return await prisma_1.prisma.user.findUnique({
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
    let sources = [];
    const retryOptions = event.data.retryOptions;
    // Logic to skip search if retrying analysis
    if (retryOptions?.skipSearch) {
        sources = await step.run("fetch-existing-sources", async () => {
            const existingSources = await prisma_1.prisma.researchSource.findMany({
                where: { researchId },
                select: { url: true, title: true, content: true, excerpt: true },
            });
            if (existingSources.length === 0) {
                throw new Error("No existing sources found to retry analysis with.");
            }
            return existingSources;
        });
    }
    else if (research.searchMethod === client_1.SearchMethod.GEMINI_DEEP_RESEARCH) {
        // 🚀 DEEP RESEARCH (AUTONOMOUS AGENT)
        const interaction = await step.run("create-deep-research", async () => {
            const freshUser = await getFreshUser();
            if (!freshUser?.geminiApiKey)
                throw new Error("API key missing");
            const geminiClient = new gemini_client_1.GeminiClient(freshUser.geminiApiKey, freshUser.geminiModel);
            socket.emitLog(researchId, "Connected to Deep Research Agent. Starting mission...");
            return await geminiClient.createDeepResearchTask(research.refinedPrompt);
        });
        let statusResult = interaction;
        let pollingAttempts = 0;
        while (statusResult.status !== "completed" &&
            statusResult.status !== "failed" &&
            pollingAttempts < 40 // ~20 mins total polling
        ) {
            await step.sleep(`poll-wait-${pollingAttempts}`, "30s");
            statusResult = await step.run(`check-deep-status-${pollingAttempts}`, async () => {
                const freshUser = await getFreshUser();
                const geminiClient = new gemini_client_1.GeminiClient(freshUser.geminiApiKey, freshUser.geminiModel);
                socket.emitLog(researchId, `Polling Deep Research Agent... Attempt ${pollingAttempts + 1}`);
                return await geminiClient.getDeepResearchStatus(interaction.id);
            });
            pollingAttempts++;
            // Update progress in DB (outside of step.run is fine for simple updates)
            await prisma_1.prisma.research.update({
                where: { id: researchId },
                data: { progress: Math.min(10 + pollingAttempts * 1, 60) },
            });
        }
        if (statusResult.status === "failed") {
            throw new Error(`Deep Research Failed: ${statusResult.error}`);
        }
        // Step 3b: Save results as synthetic sources
        sources = await step.run("process-deep-results", async () => {
            const scrapedData = [];
            let finalReport = "";
            if (statusResult.outputs) {
                statusResult.outputs.forEach((output, index) => {
                    output.parts.forEach((part) => {
                        if (part.text) {
                            if (index === (statusResult.outputs?.length || 0) - 1) {
                                finalReport += part.text;
                            }
                            else {
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
            await prisma_1.prisma.researchSource.createMany({
                data: scrapedData.map((s) => ({
                    researchId,
                    url: s.url,
                    title: s.title,
                    content: s.content || "",
                    excerpt: s.excerpt || (s.content ? s.content.substring(0, 500) : ""),
                })),
                skipDuplicates: true,
            });
            await prisma_1.prisma.research.update({
                where: { id: researchId },
                data: { progress: 70 },
            });
            return scrapedData.map((s) => ({
                url: s.url,
                title: s.title,
                excerpt: s.excerpt,
            }));
        });
    }
    else {
        // 🌐 STANDARD MODES (SCRAPE + ANALYZE)
        sources = await step.run("scrape-sources", async () => {
            const scraper = new scraper_1.WebScraper();
            await scraper.initialize();
            socket.emitLog(researchId, "Browser scraper initialized");
            try {
                let scrapedData = [];
                if (research.searchMethod === client_1.SearchMethod.JINA_SERPER) {
                    // 🚀 JINA + SERPER LOGIC (Configurable Mode)
                    const freshUser = await getFreshUser();
                    if (!freshUser?.serperApiKey) {
                        throw new Error("Serper API key required for Jina + Serper mode.");
                    }
                    const serper = new search_client_1.SerperClient(freshUser.serperApiKey);
                    const jina = new jina_client_1.JinaClient();
                    const scrapingMode = freshUser.scrapingMode || "AGENTIC";
                    let allScrapedData = [];
                    if (scrapingMode === "SCRAPER") {
                        // ⚡️ FAST SCRAPER MODE (Single Pass, No LLM)
                        socket.emitLog(researchId, "Running in Fast Scraper Mode...");
                        // 1. Search
                        const searchResults = await serper.search(research.refinedPrompt, 10);
                        const urls = jina.filterUrls(searchResults.map((r) => r.url));
                        socket.emitLog(researchId, `Found ${urls.length} relevant sources. beginning extraction...`);
                        // 2. Extract
                        const extractions = await jina.extractMultiple(urls, (msg) => socket.emitLog(researchId, msg));
                        allScrapedData = extractions
                            .filter((e) => e.success)
                            .map((e) => ({
                            url: e.url,
                            title: e.title,
                            content: e.content,
                            excerpt: e.excerpt,
                        }));
                    }
                    else {
                        // 🤖 AGENTIC MODE (Iterative + LLM)
                        socket.emitLog(researchId, "Running in Agentic Search Mode...");
                        // Smart Default: If no DB setting, use GROQ only if key exists, else GEMINI
                        let defaultProvider = "GEMINI";
                        if (freshUser.groqApiKey) {
                            defaultProvider = "GROQ";
                        }
                        let primaryProvider = freshUser.llmProvider || defaultProvider;
                        let primaryKey = freshUser.geminiApiKey || "";
                        if (primaryProvider === "GROQ") {
                            primaryKey = freshUser.groqApiKey || "";
                        }
                        const { client: llm } = await (0, llm_provider_1.getLLMClientWithFallback)(primaryProvider, primaryKey, primaryProvider === "GEMINI" ? "GROQ" : "GEMINI", primaryProvider === "GROQ"
                            ? freshUser.geminiApiKey || ""
                            : freshUser.groqApiKey || "");
                        let currentQuery = research.refinedPrompt;
                        let accumulatedContent = "";
                        let iteration = 0;
                        const maxIterations = 2;
                        while (iteration < maxIterations) {
                            iteration++;
                            socket.emitLog(researchId, `Iteration ${iteration}/${maxIterations}: Searching for "${currentQuery}"...`);
                            const searchResults = await serper.search(currentQuery, 5);
                            const urls = jina.filterUrls(searchResults.map((r) => r.url));
                            socket.emitLog(researchId, `Found ${urls.length} relevant sources. beginning extraction...`);
                            const extractions = await jina.extractMultiple(urls, (msg) => socket.emitLog(researchId, msg));
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
                                    const gapAnalysis = await llm.identifyGaps(currentQuery, accumulatedContent);
                                    if (!gapAnalysis.hasGaps ||
                                        !gapAnalysis.suggestedQueries ||
                                        gapAnalysis.suggestedQueries.length === 0) {
                                        socket.emitLog(researchId, "Sufficient data collected. Finishing search...");
                                        break;
                                    }
                                    currentQuery = gapAnalysis.suggestedQueries[0];
                                }
                                catch (error) {
                                    console.error("Agentic Loop LLM Error:", error);
                                    socket.emitLog(researchId, `Agentic planning failed: ${error?.message || "Unknown error"}. Stopping early.`);
                                    break;
                                }
                            }
                        }
                        scrapedData = allScrapedData;
                        const finalReport = await llm.synthesizeFinalReport(research.refinedPrompt, accumulatedContent, iteration);
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
                }
                else if (research.searchMethod === client_1.SearchMethod.SERPER_API) {
                    const freshUser = await getFreshUser();
                    if (!freshUser?.serperApiKey) {
                        throw new Error("Serper API key not configured. Please add it in Settings.");
                    }
                    const serperClient = new search_client_1.SerperClient(freshUser.serperApiKey);
                    const jinaClient = new jina_client_1.JinaClient();
                    const searchResults = await serperClient.search(research.refinedPrompt, 10);
                    const urls = jinaClient.filterUrls(searchResults.map((r) => r.url));
                    // L2 Cache: Skip URLs scraped within 7 days
                    const urlCache = await (0, cache_1.checkL2Cache)(prisma_1.prisma, urls);
                    const uncachedUrls = urls.filter((u) => !urlCache.has(u));
                    const cachedData = [...urlCache.entries()].map(([url, data]) => ({
                        url,
                        title: data.title,
                        content: data.content,
                        excerpt: data.excerpt,
                    }));
                    if (uncachedUrls.length < urls.length) {
                        socket.emitLog(researchId, `L2 cache: reusing ${urls.length - uncachedUrls.length} cached sources, scraping ${uncachedUrls.length} new URLs`);
                    }
                    const extractions = uncachedUrls.length > 0
                        ? await jinaClient.extractMultiple(uncachedUrls, (msg) => socket_1.SocketService.getInstance().emitLog(researchId, msg))
                        : [];
                    scrapedData = [
                        ...cachedData,
                        ...extractions
                            .filter((e) => e.success)
                            .map((e) => ({
                            url: e.url,
                            title: e.title,
                            content: e.content,
                            excerpt: e.excerpt,
                        })),
                    ];
                    if (scrapedData.length === 0) {
                        scrapedData = searchResults.map((r) => ({
                            url: r.url,
                            title: r.title,
                            content: r.snippet,
                            excerpt: r.snippet,
                        }));
                    }
                }
                else {
                    const freshUser = await getFreshUser();
                    if (!freshUser?.geminiApiKey) {
                        throw new Error("Gemini API key not found");
                    }
                    const geminiClient = new gemini_client_1.GeminiClient(freshUser.geminiApiKey, "gemini-2.0-flash");
                    const groundingResult = await geminiClient.retryWithBackoff(() => geminiClient.model.generateContent({
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
                        tools: [{ googleSearchRetrieval: {} }],
                    }));
                    const groundingResponse = await groundingResult.response;
                    const groundingText = groundingResponse.text();
                    const groundingMetadata = groundingResponse.candidates?.[0]?.groundingMetadata;
                    const groundingChunks = groundingMetadata?.groundingChunks || [];
                    scrapedData = groundingChunks.map((chunk, index) => ({
                        url: chunk.web?.uri || `grounding-${index}`,
                        title: chunk.web?.title || `Grounding Source ${index + 1}`,
                        content: groundingText || "Content extracted via Gemini Grounding",
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
                    await prisma_1.prisma.researchSource.createMany({
                        data: scrapedData.map((s) => ({
                            researchId: research.id,
                            url: s.url,
                            title: s.title,
                            content: s.content || s.excerpt || "",
                            excerpt: s.excerpt || (s.content ? s.content.substring(0, 500) : ""),
                        })),
                        skipDuplicates: true,
                    });
                }
                await prisma_1.prisma.research.update({
                    where: { id: researchId },
                    data: { progress: 30 },
                });
                return scrapedData.map((s) => ({
                    url: s.url,
                    title: s.title,
                    excerpt: s.excerpt,
                }));
            }
            finally {
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
        // Determine primary provider based on overrides or user settings
        // Default to GROQ if no preference is set in DB to avoid Gemini quotas
        const overrides = event.data.retryOptions;
        // Smart Default: If no DB setting, use GROQ only if key exists, else GEMINI
        let defaultProvider = "GEMINI";
        if (freshUser.groqApiKey) {
            defaultProvider = "GROQ";
        }
        let primaryProvider = freshUser.llmProvider || defaultProvider;
        let primaryKey = freshUser.geminiApiKey || "";
        let primaryModel = freshUser.geminiModel;
        if (overrides?.provider === "GROQ") {
            primaryProvider = "GROQ";
            primaryKey = freshUser.groqApiKey || "";
            primaryModel = overrides.model;
        }
        else if (overrides?.provider === "GEMINI") {
            primaryProvider = "GEMINI";
            primaryKey = freshUser.geminiApiKey || "";
            primaryModel = overrides.model || freshUser.geminiModel;
        }
        else if (primaryProvider === "GROQ") {
            primaryKey = freshUser.groqApiKey || "";
        }
        const { client: llmClient } = await (0, llm_provider_1.getLLMClientWithFallback)(primaryProvider, primaryKey, primaryProvider === "GEMINI" ? "GROQ" : "GEMINI", primaryProvider === "GROQ"
            ? freshUser.geminiApiKey || ""
            : freshUser.groqApiKey || "", primaryModel);
        // 🔄 Fetch content fresh from DB if not present (optimization for large payloads)
        const fullSources = await prisma_1.prisma.researchSource.findMany({
            where: {
                researchId,
                url: { in: sources.map((s) => s.url) },
            },
        });
        const result = await llmClient.analyzeContent(research.refinedPrompt, fullSources
            .map((s) => `Source: ${s.title} (${s.url})\n${s.content}`)
            .join("\n\n---\n\n"));
        socket.emitLog(researchId, "Generating structured insights from analysis...");
        await prisma_1.prisma.researchInsight.createMany({
            data: result.insights.map((insight, index) => ({
                researchId,
                title: insight.title,
                content: insight.content,
                category: insight.category,
                confidence: insight.confidence,
                order: index,
            })),
        });
        await prisma_1.prisma.research.update({
            where: { id: researchId },
            data: {
                progress: 70,
                rawData: result,
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
        let primaryProvider = freshUser.llmProvider || defaultProvider;
        let primaryKey = freshUser.geminiApiKey || "";
        let primaryModel = freshUser.geminiModel;
        if (overrides?.provider === "GROQ") {
            primaryProvider = "GROQ";
            primaryKey = freshUser.groqApiKey || "";
            primaryModel = overrides.model;
        }
        else if (overrides?.provider === "GEMINI") {
            primaryProvider = "GEMINI";
            primaryKey = freshUser.geminiApiKey || "";
            primaryModel = overrides.model || freshUser.geminiModel;
        }
        else if (primaryProvider === "GROQ") {
            primaryKey = freshUser.groqApiKey || "";
        }
        const { client: llmClient } = await (0, llm_provider_1.getLLMClientWithFallback)(primaryProvider, primaryKey, primaryProvider === "GEMINI" ? "GROQ" : "GEMINI", primaryProvider === "GROQ"
            ? freshUser.geminiApiKey || ""
            : freshUser.groqApiKey || "", primaryModel);
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
        const actions = await llmClient.generateJSON(prompt);
        if (actions.length > 0) {
            await prisma_1.prisma.actionItem.createMany({
                data: actions.map((a) => ({
                    researchId,
                    description: a.description,
                    priority: (a.priority || "MEDIUM"),
                    effort: a.effort || 3,
                })),
            });
        }
        await prisma_1.prisma.research.update({
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
            let primaryProvider = freshUser.llmProvider || defaultProvider;
            let primaryKey = freshUser.geminiApiKey || "";
            let primaryModel = freshUser.geminiModel;
            if (overrides?.provider === "GROQ") {
                primaryProvider = "GROQ";
                primaryKey = freshUser.groqApiKey || "";
                primaryModel = overrides.model;
            }
            else if (overrides?.provider === "GEMINI") {
                primaryProvider = "GEMINI";
                primaryKey = freshUser.geminiApiKey || "";
                primaryModel = overrides.model || freshUser.geminiModel;
            }
            else if (primaryProvider === "GROQ") {
                primaryKey = freshUser.groqApiKey || "";
            }
            const { client: llmClient } = await (0, llm_provider_1.getLLMClientWithFallback)(primaryProvider, primaryKey, primaryProvider === "GEMINI" ? "GROQ" : "GEMINI", primaryProvider === "GROQ"
                ? freshUser.geminiApiKey || ""
                : freshUser.groqApiKey || "", primaryModel);
            const prompt = `
          Based on the following research findings, identify potential business leads, companies, or organizations that would be relevant targets.

          Research Goal: ${research.refinedPrompt}
          
          Research Summary:
          ${analysis.summary}

          Key Insights:
          ${analysis.insights
                .map((i) => `- ${i.title}: ${i.content}`)
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
            const leads = await llmClient.generateJSON(prompt);
            // Save leads directly to CRM
            socket.emitLog(researchId, "Saving leads directly to CRM pipeline...");
            if (leads.length > 0) {
                await prisma_1.prisma.crmLead.createMany({
                    data: leads.map((lead) => ({
                        userId: userId,
                        researchId: researchId,
                        firstName: lead.name
                            ? lead.name.split(" ")[0] || "Unknown"
                            : "Unknown",
                        lastName: lead.name
                            ? lead.name.split(" ").slice(1).join(" ") || "Contact"
                            : "Contact",
                        companyName: lead.company || "Unknown Company",
                        email: lead.email ||
                            lead.suggestedEmail ||
                            `unknown@${lead.website || "unknown.com"}`,
                        phone: lead.phone,
                        website: lead.website,
                        industry: lead.industry,
                        location: lead.location,
                        companySize: lead.companySize || null,
                        painPoints: lead.painPoints || [],
                        title: lead.suggestedDM || "Relevant Decision Maker",
                        personalization: lead.personalization || null,
                        source: "OUTBOUND",
                        status: "NEW",
                    })),
                });
                socket.emitLog(researchId, `Successfully added ${leads.length} leads to CRM.`);
            }
            return { count: leads.length };
        });
    }
    // Step 7: Finalize
    await step.run("finalize", async () => {
        await prisma_1.prisma.research.update({
            where: { id: researchId },
            data: {
                status: client_1.ResearchStatus.COMPLETED,
                progress: 100,
                completedAt: new Date(),
            },
        });
    });
    return { success: true };
});
const socket_1 = require("./lib/socket");
exports.generateLeadsAgent = inngest.createFunction({
    id: "generate-leads-agent",
    name: "Lead Generation Agent",
    retries: 1,
}, { event: "research/generate-leads-requested" }, async ({ event, step }) => {
    const { researchId, userId } = event.data;
    const research = await step.run("fetch-research", async () => {
        const data = await prisma_1.prisma.research.findUnique({
            where: { id: researchId },
            include: { leadData: true },
        });
        if (!data)
            throw new Error("Research not found");
        return data;
    });
    const analysis = research.rawData;
    if (!analysis?.summary || !analysis?.insights) {
        throw new Error("Research analysis not found. Please run analysis first.");
    }
    const user = await step.run("fetch-user", async () => {
        return await prisma_1.prisma.user.findUnique({
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
        const { client: llmClient } = await (0, llm_provider_1.getLLMClientWithFallback)(user.llmProvider || "GEMINI", user.geminiApiKey || "", "GROQ", user.groqApiKey || "", user.geminiModel);
        const prompt = `
        Based on these research findings, identify specific business leads.
        
        Goal: ${research.refinedPrompt}
        Summary: ${analysis.summary}
        
        Key Insights:
        ${analysis.insights
            .map((i) => `- ${i.title}: ${i.content}`)
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
        return await llmClient.generateJSON(prompt);
    });
    if (leads.length > 0) {
        await step.run("save-leads-to-crm", async () => {
            await prisma_1.prisma.crmLead.createMany({
                data: leads.map((lead) => ({
                    userId: userId,
                    researchId: researchId,
                    firstName: lead.name
                        ? lead.name.split(" ")[0] || "Unknown"
                        : "Unknown",
                    lastName: lead.name
                        ? lead.name.split(" ").slice(1).join(" ") || "Contact"
                        : "Contact",
                    companyName: lead.company || "Unknown Company",
                    email: lead.email ||
                        lead.suggestedEmail ||
                        `unknown@${lead.website || "unknown.com"}`,
                    phone: lead.phone,
                    website: lead.website,
                    industry: lead.industry,
                    location: lead.location,
                    companySize: lead.companySize || null,
                    painPoints: lead.painPoints || [],
                    title: lead.suggestedDM || "Relevant Decision Maker",
                    personalization: lead.personalization || null,
                    source: "OUTBOUND",
                    status: "NEW",
                })),
            });
            console.log(`[LeadGen] Saved ${leads.length} leads directly to CRM pipeline.`);
        });
    }
    return { success: true, count: leads.length };
});
