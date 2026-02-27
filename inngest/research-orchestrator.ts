import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { GeminiClient } from "@/lib/gemini-client";
import { getLLMClientWithFallback } from "@/lib/llm-provider";
import { ResearchStatus } from "@prisma/client";
import { emitResearchLog } from "@/lib/log-emitter";

/**
 * Multi-Agent Research Orchestrator
 *
 * When a research query is complex (multi-faceted), this function:
 * 1. Uses an LLM to decompose the prompt into 2-4 independent sub-queries.
 * 2. Spawns parallel Inngest child functions (the existing research-agent)
 *    for each sub-query.
 * 3. Waits for all children to complete.
 * 4. Merges the results into a single unified synthesis on the parent research.
 */
export const researchOrchestrator = inngest.createFunction(
  {
    id: "research-orchestrator",
    name: "Multi-Agent Research Orchestrator",
    retries: 1,
  },
  { event: "research/orchestrate" },
  async ({ event, step }) => {
    const { researchId, userId } = event.data;

    await emitResearchLog(
      researchId,
      "🧠 Multi-Agent Orchestrator activated — decomposing research query...",
    );

    // Step 1: Fetch parent research
    const research = await step.run("fetch-parent-research", async () => {
      const data = await prisma.research.findUnique({
        where: { id: researchId },
      });
      if (!data) throw new Error("Research not found");
      return data;
    });

    // Step 2: Fetch user credentials
    const user = await step.run("fetch-user-keys", async () => {
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
      await prisma.research.update({
        where: { id: researchId },
        data: {
          status: ResearchStatus.FAILED,
          errorMessage: "No LLM API keys found for orchestration.",
        },
      });
      return { success: false, error: "API keys missing" };
    }

    // Step 3: Decompose the prompt into sub-queries
    const subQueries = await step.run("decompose-query", async () => {
      let defaultProvider = "GEMINI";
      if (user.groqApiKey) defaultProvider = "GROQ";

      const primaryProvider = (user.llmProvider as any) || defaultProvider;
      const primaryKey =
        primaryProvider === "GROQ"
          ? user.groqApiKey || ""
          : user.geminiApiKey || "";

      const { client: llm } = await getLLMClientWithFallback(
        primaryProvider,
        primaryKey,
        primaryProvider === "GEMINI" ? "GROQ" : "GEMINI",
        primaryProvider === "GROQ"
          ? user.geminiApiKey || ""
          : user.groqApiKey || "",
      );

      const decompositionPrompt = `
You are a research planning agent. Decompose the following complex research query into 2-4 independent, focused sub-queries. Each sub-query should investigate a specific facet of the overall topic so they can be researched in parallel by different agents.

Original Query: "${research.refinedPrompt}"

RULES:
- Each sub-query must be self-contained (no dependencies between them).
- Keep them specific and actionable.
- Do NOT create more than 4 sub-queries.
- Return ONLY a JSON array of strings.

Example output: ["Sub-query 1", "Sub-query 2", "Sub-query 3"]
      `;

      const queries = await llm.generateJSON<string[]>(decompositionPrompt);

      // Clamp to 2-4
      if (!queries || queries.length < 2) {
        return [research.refinedPrompt]; // Fallback to single query
      }
      return queries.slice(0, 4);
    });

    await emitResearchLog(
      researchId,
      `Decomposed into ${subQueries.length} parallel research streams:\n${subQueries.map((q: string, i: number) => `  ${i + 1}. ${q}`).join("\n")}`,
    );

    await prisma.research.update({
      where: { id: researchId },
      data: {
        progress: 10,
        researchPlan: {
          type: "multi-agent",
          subQueries,
          startedAt: new Date().toISOString(),
        },
      },
    });

    // Step 4: Create child research records and spawn parallel agents
    const childIds = await step.run("spawn-sub-agents", async () => {
      const ids: string[] = [];

      for (const [index, query] of subQueries.entries()) {
        const childResearch = await prisma.research.create({
          data: {
            userId,
            title: `[Sub-Agent ${index + 1}] ${query.substring(0, 100)}`,
            originalPrompt: query,
            refinedPrompt: query,
            scope: research.scope,
            status: ResearchStatus.IN_PROGRESS,
            searchMethod: research.searchMethod,
            progress: 0,
          },
        });

        ids.push(childResearch.id);
      }

      return ids;
    });

    // Step 5: Send events for each child (Inngest will run them in parallel)
    for (const [index, childId] of childIds.entries()) {
      await step.sendEvent(`dispatch-sub-agent-${index}`, {
        name: "research/initiated",
        data: {
          researchId: childId,
          userId,
        },
      });
    }

    await emitResearchLog(
      researchId,
      `Dispatched ${childIds.length} sub-agents. Waiting for completion...`,
    );

    await prisma.research.update({
      where: { id: researchId },
      data: { progress: 20 },
    });

    // Step 6: Poll for child completion
    let allComplete = false;
    let pollAttempts = 0;
    const maxPollAttempts = 60; // 30 minutes at 30s intervals

    while (!allComplete && pollAttempts < maxPollAttempts) {
      await step.sleep(`wait-for-children-${pollAttempts}`, "30s");

      allComplete = await step.run(
        `check-children-${pollAttempts}`,
        async () => {
          const children = await prisma.research.findMany({
            where: { id: { in: childIds } },
            select: { id: true, status: true, progress: true },
          });

          const completed = children.filter(
            (c) =>
              c.status === ResearchStatus.COMPLETED ||
              c.status === ResearchStatus.FAILED,
          );

          const avgProgress =
            children.reduce((sum, c) => sum + c.progress, 0) / children.length;

          await prisma.research.update({
            where: { id: researchId },
            data: {
              progress: Math.min(20 + Math.round(avgProgress * 0.6), 80),
            },
          });

          return completed.length === children.length;
        },
      );

      pollAttempts++;
    }

    if (!allComplete) {
      await prisma.research.update({
        where: { id: researchId },
        data: {
          status: ResearchStatus.FAILED,
          errorMessage:
            "Orchestrator timed out waiting for sub-agents to complete.",
        },
      });
      return { success: false, error: "Timeout" };
    }

    await emitResearchLog(
      researchId,
      "All sub-agents completed! Merging results...",
    );

    // Step 7: Merge results — pull all child sources and insights
    await step.run("merge-results", async () => {
      const children = await prisma.research.findMany({
        where: { id: { in: childIds } },
        include: {
          sources: true,
          insights: true,
          actionItems: true,
        },
      });

      // Copy sources to parent
      const allSources = children.flatMap((c) =>
        c.sources.map((s) => ({
          researchId,
          url: s.url,
          title: s.title,
          content: s.content,
          excerpt: s.excerpt,
          credibility: s.credibility,
        })),
      );

      if (allSources.length > 0) {
        await prisma.researchSource.createMany({
          data: allSources,
          skipDuplicates: true,
        });
      }

      // Copy insights
      const allInsights = children.flatMap((c) =>
        c.insights.map((ins, idx) => ({
          researchId,
          title: ins.title,
          content: ins.content,
          category: ins.category,
          confidence: ins.confidence,
          order: idx,
        })),
      );

      if (allInsights.length > 0) {
        await prisma.researchInsight.createMany({
          data: allInsights,
        });
      }

      // Copy action items
      const allActions = children.flatMap((c) =>
        c.actionItems.map((a) => ({
          researchId,
          description: a.description,
          priority: a.priority,
          effort: a.effort,
        })),
      );

      if (allActions.length > 0) {
        await prisma.actionItem.createMany({
          data: allActions,
        });
      }

      await prisma.research.update({
        where: { id: researchId },
        data: { progress: 85 },
      });
    });

    // Step 8: Synthesise a master summary
    await step.run("master-synthesis", async () => {
      const freshUser = await prisma.user.findUnique({
        where: { id: userId },
        select: {
          geminiApiKey: true,
          geminiModel: true,
          groqApiKey: true,
          llmProvider: true,
        },
      });

      if (!freshUser?.geminiApiKey && !freshUser?.groqApiKey) {
        throw new Error("No API keys for final synthesis");
      }

      let defaultProvider = "GEMINI";
      if (freshUser.groqApiKey) defaultProvider = "GROQ";

      const primaryProvider = (freshUser.llmProvider as any) || defaultProvider;
      const primaryKey =
        primaryProvider === "GROQ"
          ? freshUser.groqApiKey || ""
          : freshUser.geminiApiKey || "";

      const { client: llm } = await getLLMClientWithFallback(
        primaryProvider,
        primaryKey,
        primaryProvider === "GEMINI" ? "GROQ" : "GEMINI",
        primaryProvider === "GROQ"
          ? freshUser.geminiApiKey || ""
          : freshUser.groqApiKey || "",
      );

      const childInsights = await prisma.researchInsight.findMany({
        where: { researchId },
      });

      const childSources = await prisma.researchSource.findMany({
        where: { researchId },
        take: 20,
      });

      const synthesisPrompt = `
You are synthesizing the findings from ${subQueries.length} parallel research agents into one final report.

Original Research Question: "${research.refinedPrompt}"

Sub-Queries Investigated:
${subQueries.map((q: string, i: number) => `${i + 1}. ${q}`).join("\n")}

Key Insights Found:
${childInsights.map((ins) => `- [${ins.category}] ${ins.title}: ${ins.content}`).join("\n")}

Source Material (sampled):
${childSources.map((s) => `[${s.title}] ${s.excerpt}`).join("\n\n")}

INSTRUCTIONS:
- Write a comprehensive, well-structured report combining all findings.  
- Highlight where sub-agents' findings converge or contradict.
- Include a "Confidence Assessment" section.
- Format in Markdown with proper headings.
- Be thorough but concise.
      `;

      let finalReport: string;
      if (llm.synthesizeFinalReport) {
        finalReport = await llm.synthesizeFinalReport(
          research.refinedPrompt,
          synthesisPrompt,
          subQueries.length,
        );
      } else {
        // Fallback via raw generation
        const result = await llm.analyzeContent(
          research.refinedPrompt,
          synthesisPrompt,
        );
        finalReport = result.summary || "Synthesis complete. See insights.";
      }

      // Save the synthesis as a top-level source
      await prisma.researchSource.create({
        data: {
          researchId,
          url: "multi-agent-synthesis",
          title: "Multi-Agent Research Synthesis",
          content: finalReport,
          excerpt: finalReport.substring(0, 500),
          credibility: 0.9,
        },
      });

      // Save raw data
      await prisma.research.update({
        where: { id: researchId },
        data: {
          rawData: {
            orchestrationType: "multi-agent",
            subQueries,
            childResearchIds: childIds,
            synthesis: finalReport.substring(0, 5000),
          },
          progress: 95,
        },
      });
    });

    // Step 9: Finalize
    await step.run("finalize-orchestration", async () => {
      await prisma.research.update({
        where: { id: researchId },
        data: {
          status: ResearchStatus.COMPLETED,
          progress: 100,
          completedAt: new Date(),
        },
      });
    });

    await emitResearchLog(
      researchId,
      "✅ Multi-Agent Orchestration complete! Results merged successfully.",
    );

    return { success: true, childResearchIds: childIds };
  },
);
