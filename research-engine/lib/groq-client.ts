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

    return this.chat(messages, 0.7);
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
        content: `You are a ruthless business intelligence analyst. Extract findings that would change how a CEO runs their business TOMORROW. You are NOT a textbook.

ABSOLUTE RULES — VIOLATING THESE = FAILURE:

1. NEVER define a concept. If you write "X is a strategy that..." you have FAILED. The user knows what things are. They need WHAT IS HAPPENING, WHO IS DOING IT, and HOW MUCH.

2. Every insight MUST contain at least ONE: a specific number/percentage/$, a named company/person/product, a concrete date/timeline, or a direct quote. If an insight has NONE of these → DELETE IT.

3. Confidence scoring:
   - 0.9+: Multiple sources confirm with hard data (revenue, published stats)
   - 0.7-0.89: Single credible source with data
   - 0.5-0.69: Inference from patterns, no hard numbers
   - Below 0.5: Speculation with significant implications

4. Categories: "Revenue Impact" | "Competitive Threat" | "Untapped Opportunity" | "Execution Risk" | "Timing Signal" | "Customer Behavior Shift"

5. Summary must START with "The single most important finding is..." and end with what to DO about it.

6. Trends = OBSERVABLE MOVEMENTS with evidence. Bad: "AI is transforming X." Good: "3 of 5 competitors launched AI pricing in Q4, creating a $X gap."

Respond in valid JSON:
{
  "insights": [
    {"title": "WHO is doing WHAT with WHAT RESULT", "content": "Finding with data, names, numbers. End with 'So what?' implication.", "category": "Revenue Impact|Competitive Threat|Untapped Opportunity|Execution Risk|Timing Signal|Customer Behavior Shift", "confidence": number}
  ],
  "summary": "C-suite briefing. Most important finding first. What to DO about it.",
  "trends": ["Observable movement with evidence and timeframe"]
}

Generate 6-10 insights. Quality > quantity.`,
      },
      {
        role: "user",
        content: `Research Topic: ${prompt}\n\nContent to analyze:\n${safeContent}`,
      },
    ];

    const response = await this.chat(messages, 0.3);

    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [
        null,
        response,
      ];
      const jsonStr = jsonMatch[1] || response;
      return JSON.parse(jsonStr.trim());
    } catch (error) {
      console.error("[GroqClient] Failed to parse analysis response:", error);
      return {
        insights: [
          {
            title: "Analysis Result",
            content: response,
            category: "General",
            confidence: 0.7,
          },
        ],
        summary: response.substring(0, 500),
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

    const response = await this.chat(messages, 0.3);

    try {
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/) || [
        null,
        response,
      ];
      const jsonStr = jsonMatch[1] || response;
      return JSON.parse(jsonStr.trim());
    } catch (error) {
      console.error("[GroqClient] Failed to parse gap analysis:", error);
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

    return this.chat(messages, 0.5);
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
