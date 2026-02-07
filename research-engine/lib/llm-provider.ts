/**
 * LLM Provider Abstraction
 * Factory pattern for selecting between Gemini and Groq
 * with automatic fallback support
 */

import {
  GeminiClient,
  AnalysisResult as GeminiAnalysisResult,
} from "./gemini-client";
import {
  GroqClient,
  AnalysisResult as GroqAnalysisResult,
  GapAnalysisResult,
} from "./groq-client";

export type LLMProvider = "GEMINI" | "GROQ";

export interface LLMAnalysisResult {
  insights: {
    title: string;
    content: string;
    category: string;
    confidence: number;
  }[];
  summary: string;
  trends: string[];
}

export interface UnifiedLLMClient {
  refinePrompt(prompt: string): Promise<string>;
  analyzeContent(prompt: string, content: string): Promise<LLMAnalysisResult>;
  identifyGaps?(query: string, content: string): Promise<GapAnalysisResult>;
  synthesizeFinalReport?(
    query: string,
    content: string,
    iterations: number,
  ): Promise<string>;
  generateText(prompt: string): Promise<string>;
  generateJSON<T>(prompt: string): Promise<T>;
}

/**
 * Wrapper for GeminiClient to match unified interface
 */
class GeminiWrapper implements UnifiedLLMClient {
  private client: GeminiClient;

  constructor(encryptedApiKey: string, model?: string) {
    this.client = new GeminiClient(
      encryptedApiKey,
      model || "gemini-2.0-flash",
    );
  }

  async refinePrompt(prompt: string): Promise<string> {
    // GeminiClient.refinePrompt takes (prompt, scope), use prompt as both
    return this.client.refinePrompt(prompt, "general");
  }

  async generateText(prompt: string): Promise<string> {
    const result = await this.client.model.generateContent(prompt);
    return result.response.text();
  }

  async generateJSON<T>(prompt: string): Promise<T> {
    const text = await this.generateText(prompt);

    // First try to extract from code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch (e) {
        // Continue if parse fails
      }
    }

    // Try finding the first JSON object or array
    const jsonStart = text.indexOf("{");
    const arrayStart = text.indexOf("[");

    let start = -1;
    let end = -1;

    if (jsonStart !== -1 && (arrayStart === -1 || jsonStart < arrayStart)) {
      start = jsonStart;
      end = text.lastIndexOf("}");
    } else if (arrayStart !== -1) {
      start = arrayStart;
      end = text.lastIndexOf("]");
    }

    if (start !== -1 && end !== -1) {
      try {
        const potentialJson = text.substring(start, end + 1);
        return JSON.parse(potentialJson);
      } catch (e) {
        // Continue
      }
    }

    throw new Error("No valid JSON found in response");
  }

  async analyzeContent(
    prompt: string,
    content: string,
  ): Promise<LLMAnalysisResult> {
    // Create a synthetic source for analyzeSources
    const sources = [
      {
        url: "research-content",
        title: "Research Content",
        content: content,
      },
    ];
    const result = await this.client.analyzeSources(sources, prompt);
    return result as LLMAnalysisResult;
  }

  // Gemini doesn't have native gap detection, so we'll use a prompt-based approach
  async identifyGaps(
    query: string,
    content: string,
  ): Promise<GapAnalysisResult> {
    try {
      const result = await this.client.model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `Analyze this research and identify CRITICAL gaps.
1. Only report gaps that are blocking the core research goal.
2. Ignore minor missing details if the main picture is clear.
3. Suggest queries that are distinctly different from previous ones (look for specific data points).

Research Query: ${query}

Content:
${content.substring(0, 8000)}

Respond in JSON format only:
{"hasGaps": boolean, "gaps": ["string"], "suggestedQueries": ["string"]}

Maximum 3 gaps and 3 queries.`,
              },
            ],
          },
        ],
      });

      const response = result.response.text();
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("[GeminiWrapper] Gap analysis failed:", error);
    }

    return { hasGaps: false, gaps: [], suggestedQueries: [] };
  }

  async synthesizeFinalReport(
    query: string,
    content: string,
    iterations: number,
  ): Promise<string> {
    const result = await this.client.model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Create a comprehensive research report.

Research Query: ${query}
Research Iterations: ${iterations}

Content to synthesize:
${content}

Requirements:
- Use clear headings and Markdown formatting
- Include key statistics and facts
- Cite sources where possible
- Provide actionable conclusions`,
            },
          ],
        },
      ],
    });

    return result.response.text();
  }
}

/**
 * Wrapper for GroqClient to match unified interface
 */
class GroqWrapper implements UnifiedLLMClient {
  private client: GroqClient;

  constructor(encryptedApiKey: string, model?: string) {
    this.client = new GroqClient(encryptedApiKey, model);
  }

  async refinePrompt(prompt: string): Promise<string> {
    return this.client.refinePrompt(prompt);
  }

  async analyzeContent(
    prompt: string,
    content: string,
  ): Promise<LLMAnalysisResult> {
    return this.client.analyzeContent(prompt, content);
  }

  async generateText(prompt: string): Promise<string> {
    const messages = [
      {
        role: "system" as const,
        content:
          "You are a helpful AI assistant. Follow the user's instructions exactly.",
      },
      {
        role: "user" as const,
        content: prompt,
      },
    ];
    return this.client.chat(messages, 0.5);
  }

  async generateJSON<T>(prompt: string): Promise<T> {
    const text = await this.generateText(prompt);

    // First try to extract from code blocks
    const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      try {
        return JSON.parse(codeBlockMatch[1]);
      } catch (e) {
        // Continue if parse fails
      }
    }

    // Try finding the first JSON object or array
    const jsonStart = text.indexOf("{");
    const arrayStart = text.indexOf("[");

    let start = -1;
    let end = -1;

    if (jsonStart !== -1 && (arrayStart === -1 || jsonStart < arrayStart)) {
      start = jsonStart;
      end = text.lastIndexOf("}");
    } else if (arrayStart !== -1) {
      start = arrayStart;
      end = text.lastIndexOf("]");
    }

    if (start !== -1 && end !== -1) {
      try {
        const potentialJson = text.substring(start, end + 1);
        return JSON.parse(potentialJson);
      } catch (e) {
        // Continue
      }
    }

    throw new Error("No valid JSON found in response");
  }

  async identifyGaps(
    query: string,
    content: string,
  ): Promise<GapAnalysisResult> {
    return this.client.identifyGaps(query, content);
  }

  async synthesizeFinalReport(
    query: string,
    content: string,
    iterations: number,
  ): Promise<string> {
    return this.client.synthesizeFinalReport(query, content, iterations);
  }
}

/**
 * Factory function to get the appropriate LLM client
 */
/**
 * Factory function to get the appropriate LLM client
 */
export function getLLMClient(
  provider: LLMProvider,
  encryptedApiKey: string,
  model?: string,
): UnifiedLLMClient {
  switch (provider) {
    case "GROQ":
      // Verify if the model is a valid Groq model, otherwise use default
      const isGroqModel =
        model?.includes("llama") || model?.includes("mixtral");
      const groqModel = isGroqModel ? model : "llama-3.3-70b-versatile";
      return new GroqWrapper(encryptedApiKey, groqModel);
    case "GEMINI":
    default:
      return new GeminiWrapper(encryptedApiKey, model);
  }
}

/**
 * Get LLM client with automatic fallback
 * If primary provider fails with quota error, try secondary
 */
export async function getLLMClientWithFallback(
  primaryProvider: LLMProvider,
  primaryKey: string,
  fallbackProvider: LLMProvider,
  fallbackKey: string,
  model?: string,
): Promise<{ client: UnifiedLLMClient; provider: LLMProvider }> {
  // Pass model only if it makes sense for the primary provider
  const sanitizedModel = sanitizeModelName(model);
  const primary = getLLMClient(primaryProvider, primaryKey, sanitizedModel);

  // Test primary with a simple request
  try {
    await primary.refinePrompt("test");
    return { client: primary, provider: primaryProvider };
  } catch (error: any) {
    const isFallbackError =
      error.message?.includes("429") ||
      error.message?.includes("quota") ||
      error.message?.includes("limit") ||
      error.message?.includes("404") ||
      error.message?.includes("not found");

    if (isFallbackError && fallbackKey) {
      console.log(
        `[LLMProvider] Primary provider ${primaryProvider} failed (${error.message}), falling back to ${fallbackProvider}`,
      );
      // IMPORTANT: Do NOT pass the 'model' param to the fallback if it was the cause of the failure (likely 404 for Gemini)
      // If we fall back to Groq, we want it to use its default model, not the broken Gemini one.
      const fallback = getLLMClient(fallbackProvider, fallbackKey, undefined);
      return { client: fallback, provider: fallbackProvider };
    }

    throw error;
  }
}

function sanitizeModelName(model: string | undefined): string | undefined {
  if (!model) return undefined;
  // If the model is the known bad one, return undefined to use default
  if (model.includes("gemini-2.5-flash-preview-05-20")) {
    return "gemini-2.0-flash";
  }
  return model;
}
