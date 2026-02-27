import { SerperClient } from "./search-client";
import { JinaClient } from "./jina-client";
import { getLLMClientWithFallback } from "./llm-provider";
import type { ResearchSubQuestion } from "./orchestrator";

/**
 * Result from a single subagent research run.
 */
export interface SubagentResult {
  subQuestionId: string;
  question: string;
  facts: string[];
  sourceURLs: string[];
  rawContent: string;
  confidence: number; // 0-1
  iterations: number;
}

/**
 * ResearchSubagent — handles one sub-question from the orchestrator's plan.
 *
 * Each subagent follows an iterative research loop:
 * 1. Execute a targeted web search for its assigned question
 * 2. Extract and process content from results
 * 3. Reflect on gaps using the LLM
 * 4. If gaps exist and iterations remain, refine query and repeat
 * 5. Return structured facts with source attribution
 */
export class ResearchSubagent {
  private maxIterations: number;
  private maxSources: number;

  constructor(options?: { maxIterations?: number; maxSources?: number }) {
    this.maxIterations = options?.maxIterations ?? 2;
    this.maxSources = options?.maxSources ?? 5;
  }

  /**
   * Research a single sub-question through iterative search + reflect.
   */
  async research(
    subQuestion: ResearchSubQuestion,
    userConfig: {
      serperApiKey?: string;
      geminiApiKey?: string;
      groqApiKey?: string;
      geminiModel?: string;
      llmProvider?: string;
    },
    onLog?: (message: string) => void,
  ): Promise<SubagentResult> {
    const log = onLog || (() => {});

    if (!userConfig.serperApiKey) {
      throw new Error("Serper API key required for subagent research.");
    }

    const serper = new SerperClient(userConfig.serperApiKey);
    const jina = new JinaClient();

    const provider = (userConfig.llmProvider as any) || "GEMINI";
    const primaryKey =
      provider === "GROQ"
        ? userConfig.groqApiKey || ""
        : userConfig.geminiApiKey || "";

    const { client: llm } = await getLLMClientWithFallback(
      provider,
      primaryKey,
      provider === "GEMINI" ? "GROQ" : "GEMINI",
      provider === "GROQ"
        ? userConfig.geminiApiKey || ""
        : userConfig.groqApiKey || "",
      userConfig.geminiModel,
    );

    let currentQuery = subQuestion.question;
    let accumulatedContent = "";
    const allSourceURLs: string[] = [];
    let iteration = 0;

    while (iteration < this.maxIterations) {
      iteration++;
      log(
        `[Subagent ${subQuestion.id}] Iteration ${iteration}/${this.maxIterations}: "${currentQuery}"`,
      );

      // 1. Search
      const searchResults = await serper.search(currentQuery, this.maxSources);
      const urls = jina.filterUrls(searchResults.map((r) => r.url));

      log(
        `[Subagent ${subQuestion.id}] Found ${urls.length} sources. Extracting...`,
      );

      // 2. Extract content
      const extractions = await jina.extractMultiple(urls, (msg) =>
        log(`[Subagent ${subQuestion.id}] ${msg}`),
      );

      const newContent = extractions
        .filter((e) => e.success)
        .map((e) => {
          allSourceURLs.push(e.url);
          return `Source: ${e.title} (${e.url})\n${e.content}`;
        })
        .join("\n\n---\n\n");

      accumulatedContent += newContent + "\n\n";

      // 3. Reflect on gaps (if not last iteration)
      if (iteration < this.maxIterations && llm.identifyGaps) {
        try {
          const gapAnalysis = await llm.identifyGaps(
            currentQuery,
            accumulatedContent,
          );

          if (
            !gapAnalysis.hasGaps ||
            !gapAnalysis.suggestedQueries ||
            gapAnalysis.suggestedQueries.length === 0
          ) {
            log(
              `[Subagent ${subQuestion.id}] Sufficient data gathered. Stopping early.`,
            );
            break;
          }

          currentQuery = gapAnalysis.suggestedQueries[0];
          log(
            `[Subagent ${subQuestion.id}] Gap found. Following up: "${currentQuery}"`,
          );
        } catch (err: any) {
          log(
            `[Subagent ${subQuestion.id}] Gap analysis failed: ${err.message}. Continuing with what we have.`,
          );
          break;
        }
      }
    }

    // 4. Extract structured facts
    const factsPrompt = `Extract the key facts from this research content that answer the question: "${subQuestion.question}"

CONTENT:
${accumulatedContent.substring(0, 15000)}

Return a JSON object:
{
  "facts": ["Fact 1 with specific data", "Fact 2", ...],
  "confidence": 0.0-1.0
}

RULES:
- Facts should be specific and verifiable (include numbers, dates, names).
- Confidence reflects how completely the question was answered.
- Return 3-10 facts.`;

    const extracted = await llm.generateJSON<{
      facts: string[];
      confidence: number;
    }>(factsPrompt);

    return {
      subQuestionId: subQuestion.id,
      question: subQuestion.question,
      facts: extracted.facts || [],
      sourceURLs: [...new Set(allSourceURLs)],
      rawContent: accumulatedContent,
      confidence: extracted.confidence || 0.5,
      iterations: iteration,
    };
  }

  /**
   * Run multiple sub-questions in parallel.
   */
  async researchParallel(
    subQuestions: ResearchSubQuestion[],
    userConfig: {
      serperApiKey?: string;
      geminiApiKey?: string;
      groqApiKey?: string;
      geminiModel?: string;
      llmProvider?: string;
    },
    onLog?: (message: string) => void,
  ): Promise<SubagentResult[]> {
    const results = await Promise.all(
      subQuestions.map((sq) =>
        this.research(sq, userConfig, onLog).catch((err) => ({
          subQuestionId: sq.id,
          question: sq.question,
          facts: [`Research failed: ${err.message}`],
          sourceURLs: [],
          rawContent: "",
          confidence: 0,
          iterations: 0,
        })),
      ),
    );

    return results;
  }
}
