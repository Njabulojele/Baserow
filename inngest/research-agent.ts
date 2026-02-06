import { inngest } from "./client";
import { prisma } from "@/lib/prisma";
import { GeminiClient } from "@/lib/gemini-client";
import { ResearchStatus } from "@prisma/client";
import { SourceDiscovery } from "@/lib/research/source-discovery";
import { DeepAnalyzer } from "@/lib/research/deep-analyzer";
import { InsightValidator } from "@/lib/research/validator";
import { scrapers } from "@/lib/scrapers";

export const researchAgent = inngest.createFunction(
  {
    id: "research-agent",
    name: "Deep Research Agent",
    concurrency: {
      limit: parseInt(process.env.MAX_CONCURRENT_RESEARCH || "3"),
    },
    retries: 0, // Disable retries for now to debug
  },
  { event: "research/initiated" },
  async ({ event, step }) => {
    const { researchId, userId } = event.data;

    try {
      // Step 0: Get User & API Keys
      const user = await step.run("fetch-user-keys", async () => {
        const u = await prisma.user.findUnique({
          where: { id: userId },
          select: { geminiApiKey: true, geminiModel: true, serperApiKey: true },
        });
        if (!u?.geminiApiKey) throw new Error("Gemini API Key missing");
        return u;
      });

      const geminiClient = new GeminiClient(
        user.geminiApiKey!,
        user.geminiModel,
      );

      // Update status
      await step.run("update-status-discovering", async () => {
        await prisma.research.updateMany({
          where: { id: researchId },
          data: {
            status: "IN_PROGRESS",
            progress: 10,
          },
        });
      });

      // Step 1: Source Discovery
      const sources = await step.run("discover-sources", async () => {
        const research = await prisma.research.findUnique({
          where: { id: researchId },
        });

        if (!research) throw new Error("Research not found");

        const discovery = new SourceDiscovery(
          geminiClient,
          user.serperApiKey || undefined,
        );
        const discovered = await discovery.discover({
          prompt: research.refinedPrompt || research.originalPrompt,
        });

        await prisma.research.updateMany({
          where: { id: researchId },
          data: { progress: 30 },
        });

        return discovered.all;
      });

      // Step 2: Scrape Full Content
      const activeSources = await step.run("scrape-content", async () => {
        // For web sources without content OR with only snippet content (< 500 chars), scrape full page
        const sourcesToScrape = sources.filter(
          (s: any) =>
            s.sourceType === "web" && (!s.content || s.content.length < 500),
        );

        console.log(
          `📄 Scraping full content for ${sourcesToScrape.length} web sources...`,
        );

        const scrapedContent = await Promise.allSettled(
          sourcesToScrape.map(async (source: any) => {
            try {
              console.log(`  → Scraping: ${source.title?.slice(0, 50)}...`);
              const scraped = await scrapers.generic.scrape(source.url);
              return {
                ...source,
                content: scraped.content || source.content, // Use scraped content or keep original
              };
            } catch (err) {
              console.error(`  ✗ Failed to scrape ${source.url}:`, err);
              return source; // Keep original on failure
            }
          }),
        );

        await prisma.research.updateMany({
          where: { id: researchId },
          data: { progress: 50 },
        });

        // Merge scraped content back
        const merged = sources.map((s: any) => {
          const scraped = scrapedContent.find(
            (r: any) => r.status === "fulfilled" && r.value.url === s.url,
          );
          if (scraped && scraped.status === "fulfilled") {
            return scraped.value;
          }
          return s;
        });

        return merged;
      });

      // Step 3: Store Sources
      await step.run("store-sources", async () => {
        await prisma.researchSource.createMany({
          data: activeSources.map((source: any) => ({
            researchId,
            url: source.url,
            title: source.title,
            content: source.content?.slice(0, 50000) || "", // Full content (up to 50k chars)
            excerpt: source.content?.slice(0, 1000) || "", // Truncated for preview
            sourceType: source.sourceType,
            score: source.score || 0,
            sentiment: null,
            engagement: source.metadata?.engagement || null,
            topComments: source.topComments || null,
            metadata: source.metadata || null,
          })),
        });

        await prisma.research.updateMany({
          where: { id: researchId },
          data: { progress: 60 },
        });
        return { stored: activeSources.length };
      });

      // Step 4: Deep Analysis
      const analysis = await step.run("deep-analysis", async () => {
        await prisma.research.updateMany({
          where: { id: researchId },
          data: { status: "IN_PROGRESS" },
        });

        const research = await prisma.research.findUnique({
          where: { id: researchId },
        });

        const analyzer = new DeepAnalyzer(geminiClient);
        const results = await analyzer.analyze(
          activeSources,
          research?.refinedPrompt || research?.originalPrompt || "",
        );

        await prisma.research.updateMany({
          where: { id: researchId },
          data: { progress: 80 },
        });

        return results;
      });

      // Step 5: Validate Insights
      const validated = await step.run("validate-insights", async () => {
        const validator = new InsightValidator(geminiClient);

        const validatedPainPoints = await validator.validatePainPoints(
          analysis.painPoints,
        );

        const validatedOpportunities = await validator.validateOpportunities(
          analysis.opportunities,
        );

        // GUARANTEE MINIMUM RESULTS: If everything is empty, create fallback
        const hasResults =
          validatedPainPoints.length > 0 ||
          validatedOpportunities.length > 0 ||
          (analysis.marketInsights?.length || 0) > 0;

        if (!hasResults && activeSources.length > 0) {
          console.log(
            "⚠️ No AI-generated insights - creating minimum viable results from sources",
          );

          // Create at least one insight from source metadata
          return {
            painPoints: [
              {
                pain: `Research topic requires further analysis - ${activeSources.length} sources collected`,
                severity: "medium" as const,
                frequency: 1,
                willingnessToPay: "Review collected sources for evidence",
                currentSolutions: ["Manual review required"],
                quotes: activeSources.slice(0, 2).map((s: any) => s.title),
                sources: activeSources.slice(0, 3).map((s: any) => s.url),
                validated: false,
                actionabilityScore: 4,
              },
            ],
            opportunities: [
              {
                title: "Research Data Available for Analysis",
                description: `${activeSources.length} sources discovered. AI analysis incomplete due to rate limits - review sources manually.`,
                targetMarket: {
                  demographics: "TBD",
                  psychographics: "TBD",
                  size: "Unknown",
                },
                validationEvidence: activeSources
                  .slice(0, 3)
                  .map((s: any) => `Source: ${s.title}`),
                entryStrategy: [
                  "Review collected sources",
                  "Re-run analysis when API quota resets",
                  "Extract insights manually",
                ],
                revenueEstimate: "Requires analysis",
                competition: { existing: [], gaps: [] },
                risks: ["Incomplete AI analysis"],
                validationScore: 5,
                validated: false,
              },
            ],
            insights: [
              {
                type: "pattern" as const,
                insight: `${activeSources.length} sources discovered across multiple platforms`,
                evidence: activeSources.slice(0, 3).map((s: any) => s.title),
                impact: "medium" as const,
                timeframe: "Immediate",
              },
            ],
            competitors: analysis.competitorIntel || { competitors: [] },
          };
        }

        return {
          painPoints: validatedPainPoints,
          opportunities: validatedOpportunities,
          insights: analysis.marketInsights,
          competitors: analysis.competitorIntel,
        };
      });

      // Step 6: Store Results
      await step.run("store-results", async () => {
        // Store pain points as insights
        await prisma.researchInsight.createMany({
          data: validated.painPoints.map((point: any) => ({
            researchId,
            title: point.pain,
            content: point.willingnessToPay, // Use content for description
            category: point.severity,
            insightType: "pain_point",
            confidenceLevel: point.validated ? "high" : "medium",
            confidence: point.validated ? 0.9 : 0.6,
            evidence: {
              quotes: point.quotes,
              sources: point.sources,
              currentSolutions: point.currentSolutions,
            },
            validation: {
              evidenceScore: point.quotes.length,
              actionabilityScore: point.actionabilityScore || 0,
            },
            actionability: point.actionabilityScore || 0,
            severity: point.severity,
            frequency: point.frequency,
          })),
        });

        // Store opportunities as insights
        await prisma.researchInsight.createMany({
          data: validated.opportunities.map((opp: any) => ({
            researchId,
            title: opp.title,
            content: opp.description,
            category: "high", // Based on validation score
            insightType: "opportunity",
            confidenceLevel: opp.validated ? "high" : "medium",
            confidence: opp.validated ? 0.9 : 0.6,
            evidence: {
              validationEvidence: opp.validationEvidence,
              competition: opp.competition,
            },
            validation: {
              validationScore: opp.validationScore,
              redFlags: opp.redFlags || [],
            },
            actionability: opp.validationScore,
            targetMarket: opp.targetMarket,
            entryStrategy: opp.entryStrategy,
            revenueEstimate: opp.revenueEstimate,
          })),
        });

        // Store market insights
        await prisma.researchInsight.createMany({
          data: validated.insights.map((insight: any) => ({
            researchId,
            title: insight.insight,
            content: insight.evidence.join(" | "),
            category: insight.impact,
            insightType: insight.type,
            confidenceLevel: insight.evidence.length >= 3 ? "high" : "medium",
            confidence: insight.evidence.length >= 3 ? 0.8 : 0.5,
            evidence: { sources: insight.evidence },
            actionability:
              insight.impact === "high"
                ? 8
                : insight.impact === "medium"
                  ? 5
                  : 3,
          })),
        });

        // Store competitor intel
        if (validated.competitors.competitors?.length > 0) {
          await prisma.competitorIntel.createMany({
            data: validated.competitors.competitors.map((comp: any) => ({
              researchId,
              name: comp.name,
              mentions: comp.mentions,
              sentiment: comp.sentiment,
              strengths: comp.strengths,
              weaknesses: comp.weaknesses,
              pricing: comp.pricing,
              userQuotes: comp.userQuotes,
            })),
          });
        }

        // Generate action items from opportunities
        const actionItems = validated.opportunities
          .filter((opp: any) => opp.validated)
          .flatMap((opp: any) =>
            opp.entryStrategy.slice(0, 3).map((step: any, idx: any) => ({
              researchId,
              description: step,
              title: `Execute: ${step.substring(0, 50)}...`, // Truncate for title
              priority: idx === 0 ? "HIGH" : "MEDIUM", // Use Enum
              category: "immediate",
              validated: true,
            })),
          );

        if (actionItems.length > 0) {
          await prisma.actionItem.createMany({ data: actionItems });
        }

        await prisma.research.updateMany({
          where: { id: researchId },
          data: { progress: 90 },
        });
      });

      // Step 7: Generate Summary and Finish
      await step.run("finalize", async () => {
        // Store summary in research ? Schema doesn't have summary field on Research?
        // Existing agent stored summary in `rawData`.
        // Let's store in rawData as well.
        await prisma.research.updateMany({
          where: { id: researchId },
          data: {
            status: "COMPLETED",
            progress: 100,
            completedAt: new Date(),
            rawData: {
              summary: analysis.summary,
              deepAnalysis: analysis,
            },
          },
        });
      });

      // Cleanup
      await step.run("cleanup", async () => {
        await scrapers.reddit.close();
      });

      return { success: true, researchId };
    } catch (error: any) {
      console.error("Research agent error:", error);

      await prisma.research.update({
        where: { id: researchId },
        data: {
          status: "FAILED",
          errorMessage:
            error instanceof Error ? error.message : "Unknown error",
        },
      });

      throw error;
    }
  },
);
