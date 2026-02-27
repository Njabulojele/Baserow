import { getLLMClientWithFallback } from "./llm-provider";

/**
 * A single sub-question in the research plan.
 */
export interface ResearchSubQuestion {
  id: string;
  question: string;
  sourceTypes: string[]; // e.g. ["academic", "industry", "news", "official"]
  dependsOn: string[]; // IDs of sub-questions this depends on
  expectedFormat: string; // e.g. "factual_data", "comparative_analysis", "timeline"
  priority: number; // 1 (highest) to 5 (lowest)
}

/**
 * The DAG-based research plan produced by the Orchestrator.
 */
export interface ResearchPlan {
  originalQuery: string;
  refinedObjective: string;
  subQuestions: ResearchSubQuestion[];
  executionGroups: string[][]; // Groups of sub-question IDs that can run in parallel
  estimatedDepth: "quick" | "standard" | "deep" | "ultra-deep";
  synthesisStrategy: string; // How to combine results
}

/**
 * OrchestratorAgent — the "Lead Agent" from deep_research.md
 *
 * Takes a raw research query and depth setting, decomposes it into
 * a DAG of sub-questions with dependency and parallelism information.
 * This enables the fan-out pattern where independent sub-questions
 * can be researched simultaneously by subagents.
 */
export class OrchestratorAgent {
  /**
   * Generate a DAG-based research plan from a query.
   */
  async planResearch(
    query: string,
    depth: "quick" | "standard" | "deep" | "ultra-deep",
    userConfig: {
      geminiApiKey?: string;
      groqApiKey?: string;
      geminiModel?: string;
      llmProvider?: string;
    },
  ): Promise<ResearchPlan> {
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

    const maxSubQuestions = {
      quick: 2,
      standard: 4,
      deep: 6,
      "ultra-deep": 10,
    }[depth];

    const prompt = `You are a research planning agent. Your job is to decompose a complex research query into a structured plan of sub-questions that can be investigated independently or in sequence.

RESEARCH QUERY: "${query}"
DEPTH LEVEL: ${depth} (max ${maxSubQuestions} sub-questions)

INSTRUCTIONS:
1. Analyze the query to identify distinct knowledge gaps or angles to investigate.
2. Break it into ${maxSubQuestions} or fewer targeted sub-questions.
3. Identify dependencies: which sub-questions need answers from others before they can be researched.
4. Group independent sub-questions into parallel execution groups.
5. Define a synthesis strategy for combining the results.

Return a JSON object with this EXACT schema:
{
  "originalQuery": "${query}",
  "refinedObjective": "A clearer, more specific version of the query",
  "subQuestions": [
    {
      "id": "sq-1",
      "question": "Specific research question",
      "sourceTypes": ["academic", "industry", "news", "official"],
      "dependsOn": [],
      "expectedFormat": "factual_data | comparative_analysis | timeline | opinion_aggregation",
      "priority": 1
    }
  ],
  "executionGroups": [
    ["sq-1", "sq-2"],
    ["sq-3"]
  ],
  "estimatedDepth": "${depth}",
  "synthesisStrategy": "How to combine all sub-question results into a coherent final report"
}

RULES:
- Sub-questions should be specific enough for a focused web search.
- If a sub-question depends on another, list the dependency in "dependsOn".
- Execution groups define parallelism: all items in a group run simultaneously.
- Groups execute in order: group 0 first, then group 1, etc.
- "synthesisStrategy" should describe the narrative structure of the final report.

Return ONLY the JSON object, no markdown.`;

    const plan = await llm.generateJSON<ResearchPlan>(prompt);

    // Validate and sanitize
    if (!plan.subQuestions || plan.subQuestions.length === 0) {
      return {
        originalQuery: query,
        refinedObjective: query,
        subQuestions: [
          {
            id: "sq-1",
            question: query,
            sourceTypes: ["industry", "news"],
            dependsOn: [],
            expectedFormat: "factual_data",
            priority: 1,
          },
        ],
        executionGroups: [["sq-1"]],
        estimatedDepth: depth,
        synthesisStrategy: "Direct synthesis from single research thread.",
      };
    }

    // Ensure execution groups exist and are valid
    if (!plan.executionGroups || plan.executionGroups.length === 0) {
      // Default: all sub-questions in one parallel group
      plan.executionGroups = [plan.subQuestions.map((sq) => sq.id)];
    }

    return plan;
  }

  /**
   * Resolve execution groups from the DAG, respecting dependencies.
   * Returns groups in execution order.
   */
  resolveExecutionOrder(plan: ResearchPlan): string[][] {
    // Build dependency graph
    const resolved = new Set<string>();
    const groups: string[][] = [];
    const remaining = new Set(plan.subQuestions.map((sq) => sq.id));

    while (remaining.size > 0) {
      const currentGroup: string[] = [];

      for (const sq of plan.subQuestions) {
        if (remaining.has(sq.id)) {
          const depsResolved = sq.dependsOn.every((dep) => resolved.has(dep));
          if (depsResolved) {
            currentGroup.push(sq.id);
          }
        }
      }

      if (currentGroup.length === 0) {
        // Circular dependency — force remaining into one group
        groups.push([...remaining]);
        break;
      }

      groups.push(currentGroup);
      currentGroup.forEach((id) => {
        resolved.add(id);
        remaining.delete(id);
      });
    }

    return groups;
  }
}
