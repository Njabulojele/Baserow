/**
 * Groq Client
 * Free-tier LLM provider using Llama 3.1
 * Fast inference with generous rate limits
 */

import { decryptApiKey } from "./encryption";

export interface GroqMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GroqCompletionResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface AnalysisResult {
  insights: {
    title: string;
    content: string;
    category: string;
    confidence: number;
  }[];
  summary: string;
  trends: string[];
}

export interface GapAnalysisResult {
  hasGaps: boolean;
  gaps: string[];
  suggestedQueries: string[];
}

export class GroqClient {
  private apiKey: string;
  private baseUrl = "https://api.groq.com/openai/v1";
  private model: string;

  constructor(
    encryptedApiKey: string,
    model: string = "llama-3.3-70b-versatile",
  ) {
    const apiKey = decryptApiKey(encryptedApiKey);
    if (!apiKey) {
      throw new Error("Invalid or missing Groq API key after decryption");
    }
    this.apiKey = apiKey;
    this.model = model;
  }

  /**
   * Send a chat completion request to Groq
   */
  async chat(
    messages: GroqMessage[],
    temperature: number = 0.7,
  ): Promise<string> {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature,
        max_tokens: 4096,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} - ${errorText}`);
    }

    const data: GroqCompletionResponse = await response.json();
    return data.choices[0]?.message?.content || "";
  }

  /**
   * Refine a research prompt
   */
  async refinePrompt(originalPrompt: string): Promise<string> {
    const messages: GroqMessage[] = [
      {
        role: "system",
        content: `You are a research assistant specializing in refining research queries.
Your task is to take a user's initial research prompt and expand it into a more comprehensive, 
well-structured research question that will yield better results.

Output only the refined prompt, nothing else.`,
      },
      {
        role: "user",
        content: `Please refine this research prompt: "${originalPrompt}"`,
      },
    ];

    return this.retryWithBackoff(() => this.chat(messages, 0.7));
  }

  /**
   * Helper to truncate content to safe limits for free tier
   * 12k TPM ~= 48k chars. We leave buffer for system prompt + output.
   * Safe limit: ~30k chars
   */
  private truncateContent(content: string, limit: number = 30000): string {
    if (content.length <= limit) return content;
    console.warn(
      `[GroqClient] Truncating content from ${content.length} to ${limit} chars to avoid rate limits`,
    );
    return (
      content.substring(0, limit) +
      "\n...[Content truncated to fit free tier limits]..."
    );
  }

  /**
   * Analyze research content and extract insights
   */
  async analyzeContent(
    prompt: string,
    content: string,
  ): Promise<AnalysisResult> {
    const safeContent = this.truncateContent(content);

    const messages: GroqMessage[] = [
      {
        role: "system",
        content: `You are a Senior Strategic Intelligence Analyst generating actionable B2B intelligence for a Lead Generation Agency.
1. Analyze all provided sources to extract strict, highly actionable business intelligence.
2. Focus intensely on extracting B2B Lead Generation Signals:
   - Identify precise decision-maker roles (e.g., Marketing Director, CTO, Founder).
   - Highlight explicit organizational pain points, recent software transitions, or expansion efforts.
   - Extract hard data signals: Funding rounds, hiring surges, and recent tech stack additions.
3. Categorize findings into Strategic Intelligence (e.g., MarketDynamics, CompetitorMoves, PainPoints, TechStack, HiringSignals, IntentTriggers).
4. Assign strong confidence scores; facts and numbers get 0.8+, vague marketing copy gets <0.5.

Respond in valid JSON format:
{
  "insights": [
    {"title": "Specific Signal: (e.g., Hiring 5 New Sales Reps)", "content": "Detailed explanation with facts indicating clear intent or pain points.", "category": "PainPoints|TechStack|HiringSignals|IntentTriggers|MarketDynamics", "confidence": 0.85}
  ],
  "summary": "2-3 paragraph sharp executive summary synthesizing actionable facts and immediate outreach angles.",
  "trends": ["Specific industry shift or signal", "Specific tooling or hiring trend"]
}`,
      },
      {
        role: "user",
        content: `Research Topic: ${prompt}\n\nContent to analyze:\n${safeContent}`,
      },
    ];

    try {
      const response = await this.retryWithBackoff(() =>
        this.chat(messages, 0.3),
      );

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [
        null,
        response,
      ];
      const jsonStr = jsonMatch[1] || response;
      return JSON.parse(jsonStr.trim());
    } catch (error) {
      console.error("[GroqClient] Analysis failed:", error);
      // Return a safe fallback instead of throwing
      return {
        insights: [
          {
            title: "Analysis Failed",
            content: "Could not analyze content due to an error.",
            category: "Error",
            confidence: 0,
          },
        ],
        summary: "Analysis failed.",
        trends: [],
      };
    }
  }

  /**
   * Identify gaps in research content and suggest follow-up queries
   */
  async identifyGaps(
    originalQuery: string,
    content: string,
  ): Promise<GapAnalysisResult> {
    const safeContent = this.truncateContent(content);

    const messages: GroqMessage[] = [
      {
        role: "system",
        content: `You are a Research Gap Analyst. Analyze the provided research content and identify CRITICAL gaps.
1. Only report gaps that are blocking the core research goal.
2. Ignore minor missing details if the main picture is clear.
3. Suggest queries that are distinctly different from previous ones (look for specific data points).

Respond in valid JSON format:
{
  "hasGaps": boolean,
  "gaps": ["string (specific missing data)"],
  "suggestedQueries": ["string (targeted search query)"]
}
`,
      },
      {
        role: "user",
        content: `Original Research Query: ${originalQuery}\n\nCurrent Research Content:\n${safeContent.substring(0, 8000)}`,
      },
    ];

    try {
      const response = await this.retryWithBackoff(() =>
        this.chat(messages, 0.3),
      );

      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [
        null,
        response,
      ];
      const jsonStr = jsonMatch[1] || response;
      return JSON.parse(jsonStr.trim());
    } catch (error) {
      console.error("[GroqClient] Gap analysis failed:", error);
      return {
        hasGaps: false,
        gaps: [],
        suggestedQueries: [],
      };
    }
  }

  /**
   * Synthesize final research report from multiple sources
   */
  async synthesizeFinalReport(
    query: string,
    allContent: string,
    iterations: number,
  ): Promise<string> {
    const safeContent = this.truncateContent(allContent);

    const messages: GroqMessage[] = [
      {
        role: "system",
        content: `You are a Senior Research Analyst creating a final research report.
Synthesize all the gathered information into a comprehensive, well-structured report.

Requirements:
- Use clear headings and subheadings
- Include key statistics and facts
- Cite sources where possible (use [Source: URL] format)
- Highlight conflicting viewpoints if any
- Provide actionable conclusions
- Use Markdown formatting`,
      },
      {
        role: "user",
        content: `Research Query: ${query}\n\nThis report is based on ${iterations} research iteration(s).\n\nResearch Content:\n${safeContent}`,
      },
    ];

    return this.retryWithBackoff(() => this.chat(messages, 0.5));
  }

  /**
   * Retry with exponential backoff
   */
  async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const isRateLimit =
          error.message?.includes("429") || error.message?.includes("rate");

        if (isRateLimit && attempt < maxRetries - 1) {
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          console.log(
            `[GroqClient] Rate limited. Retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`,
          );
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else if (!isRateLimit) {
          throw error;
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }
}
