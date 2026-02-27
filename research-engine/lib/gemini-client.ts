import { GoogleGenAI } from "@google/genai";
import { decryptApiKey } from "./encryption";

export interface ResearchInsight {
  title: string;
  content: string;
  category: string;
  confidence: number;
}

export interface AnalysisResult {
  insights: ResearchInsight[];
  summary: string;
  trends: string[];
}

// Interactions API Types
export interface InteractionOutput {
  type: string;
  text?: string;
  thought?: string;
  summary?: string;
  signature?: string;
  mime_type?: string;
  data?: string;
  name?: string;
  id?: string;
  arguments?: any;
}

export interface Interaction {
  id: string;
  status:
    | "in_progress"
    | "completed"
    | "failed"
    | "cancelled"
    | "requires_action";
  outputs?: InteractionOutput[];
  usage?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
  };
  error?: {
    code?: number;
    message: string;
  };
}

export class GeminiClient {
  private client: GoogleGenAI;
  private apiKey: string;
  private modelName: string;

  constructor(encryptedApiKey: string, modelName: string = "gemini-2.5-flash") {
    const apiKey = decryptApiKey(encryptedApiKey);
    if (!apiKey) {
      throw new Error("Invalid or missing API key after decryption");
    }
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.client = new GoogleGenAI({ apiKey });
  }

  /**
   * Performs a grounded web search using the Interactions API with google_search tool.
   */
  async groundingSearch(prompt: string): Promise<{
    text: string;
    sources: { url: string; title: string }[];
    searchQueries: string[];
  }> {
    return this.retryWithBackoff(async () => {
      const interaction = await this.client.interactions.create({
        model: this.modelName,
        input: `Search the web and provide comprehensive, well-cited information about: ${prompt}. Include specific facts, data points, and statistics. Cite your sources.`,
        tools: [{ type: "google_search" }],
      });

      // Find the text output
      const textOutput = interaction.outputs?.find(
        (o: any) => o.type === "text",
      );
      const text = textOutput?.text || "";

      // Extract sources from google_search_result outputs
      const searchOutput = interaction.outputs?.find(
        (o: any) => o.type === "google_search_result",
      );
      const sources: { url: string; title: string }[] = [];
      const searchQueries: string[] = [];

      if (searchOutput && (searchOutput as any).search_results) {
        for (const result of (searchOutput as any).search_results) {
          if (result.url) {
            sources.push({
              url: result.url,
              title: result.title || result.url,
            });
          }
          if (result.search_query) {
            searchQueries.push(result.search_query);
          }
        }
      }

      return { text, sources, searchQueries };
    });
  }

  /**
   * Starts a Deep Research task using the Interactions API with the deep-research agent
   */
  async createDeepResearchTask(prompt: string): Promise<Interaction> {
    return this.retryWithBackoff(async () => {
      const response = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/interactions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": this.apiKey,
          },
          body: JSON.stringify({
            input: prompt,
            agent: "deep-research-pro-preview-12-2025",
            background: true,
          }),
        },
      );

      if (!response.ok) {
        const error = await response.json();
        const err: any = new Error(
          error.error?.message || `API Error: ${response.statusText}`,
        );
        err.status = response.status;
        err.errorDetails = error.error?.details;
        throw err;
      }

      return (await response.json()) as Interaction;
    });
  }

  /**
   * Polls for results of a Deep Research task
   */
  async getDeepResearchStatus(interactionId: string): Promise<Interaction> {
    return this.retryWithBackoff(async () => {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/interactions/${interactionId}`,
        {
          method: "GET",
          headers: {
            "x-goog-api-key": this.apiKey,
          },
        },
      );

      if (!response.ok) {
        const error = await response.json();
        const err: any = new Error(`Status Poll Error: ${response.statusText}`);
        err.status = response.status;
        throw err;
      }

      return (await response.json()) as Interaction;
    });
  }

  /**
   * Creates an interaction with streaming — returns an async iterable of chunks.
   * Use this for real-time analysis output.
   */
  async createStreamingInteraction(
    prompt: string,
    onDelta?: (text: string) => void,
  ): Promise<string> {
    const stream = await this.client.interactions.create({
      model: this.modelName,
      input: prompt,
      stream: true,
    });

    let fullText = "";

    for await (const chunk of stream as any) {
      if (chunk.event_type === "content.delta") {
        if (chunk.delta?.type === "text" && chunk.delta.text) {
          fullText += chunk.delta.text;
          if (onDelta) onDelta(chunk.delta.text);
        }
      } else if (chunk.event_type === "interaction.complete") {
        // Stream finished
        break;
      }
    }

    return fullText;
  }

  /**
   * Creates a standard (non-streaming) interaction for text generation.
   */
  async generateContent(prompt: string): Promise<string> {
    return this.retryWithBackoff(async () => {
      const interaction = await this.client.interactions.create({
        model: this.modelName,
        input: prompt,
      });

      const textOutput = interaction.outputs?.find(
        (o: any) => o.type === "text",
      );
      return textOutput?.text || "";
    });
  }

  /**
   * Cleans and extracts JSON from AI string response
   */
  public extractJson<T>(text: string): T {
    try {
      // 1. Try to find JSON within markdown triple backticks
      const markdownJsonMatch = text.match(/```(?:json)?\n?([\s\S]*?)```/);
      let jsonStr = markdownJsonMatch ? markdownJsonMatch[1] : text;

      // 2. If no markdown, try to find the first '{' and last '}'
      if (!markdownJsonMatch) {
        const firstBrace = text.indexOf("{");
        const lastBrace = text.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1) {
          jsonStr = text.substring(firstBrace, lastBrace + 1);
        }
      }

      // 3. Clean the string of problematic characters
      const cleaned = jsonStr
        .trim()
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "")
        .replace(/\\n/g, "\\n")
        .replace(/\\"/g, '\\"');

      return JSON.parse(cleaned) as T;
    } catch (error) {
      console.error(
        "JSON Extraction Error. Raw text snippet:",
        text.substring(0, 200),
      );
      console.error("Attempted to parse:", text);
      throw new Error(
        `Failed to parse AI response as JSON: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * Refines a raw research prompt into a structured research mission
   */
  async refinePrompt(originalPrompt: string, scope: string): Promise<string> {
    const prompt = `
      You are an expert research strategist. Refine the following user request into a highly specific, actionable, and comprehensive research prompt for a Deep Research Agent.
      
      User Scope: ${scope}
      User Request: "${originalPrompt}"
      
      The refined prompt should:
      1. Define specific data points to extract.
      2. Identify target industries or businesses if applicable.
      3. Set clear boundaries for what NOT to search for.
      4. Specify the desired format of the insights.
      
      Return ONLY the refined prompt text. Do not include any headers or meta-talk.
    `;

    try {
      const result = await this.retryWithBackoff(() =>
        this.generateContent(prompt),
      );
      return result.trim();
    } catch (error: any) {
      console.error("Error refining prompt:", error);
      if (error.status === 429) {
        throw new Error(
          "API quota exceeded. Please wait a minute or try a different Gemini API key. Free tier limits: 15 requests/minute.",
        );
      }
      return originalPrompt; // Fallback to original
    }
  }

  /**
   * Retry helper with exponential backoff for 429 errors
   */
  public async retryWithBackoff<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelayMs: number = 2000,
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;

        // Only retry on 429 errors
        if (error.status !== 429) {
          throw error;
        }

        // Extract retry delay from error if available
        const retryAfter = error.errorDetails?.find((d: any) =>
          d["@type"]?.includes("RetryInfo"),
        )?.retryDelay;

        let delayMs = retryAfter
          ? parseInt(retryAfter.replace("s", "")) * 1000
          : baseDelayMs * Math.pow(2, attempt);

        // If API returns 0s delay for a 429, enforce a minimum backoff
        if (delayMs < 1000) {
          delayMs = baseDelayMs * Math.pow(2, attempt);
        }

        console.log(
          `[GeminiClient] Rate limited. Retry ${attempt + 1}/${maxRetries} in ${delayMs}ms`,
        );

        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    throw lastError;
  }

  /**
   * Analyzes scraped content to extract structured insights
   */
  async analyzeSources(
    sources: Array<{ url: string; content: string; title: string }>,
    researchGoal: string,
  ): Promise<AnalysisResult> {
    const sourceText = sources
      .map(
        (s, i) =>
          `Source [${i + 1}] (${s.url}):\n${s.content.substring(0, 5000)}`,
      )
      .join("\n\n---\n\n");

    const prompt = `You are a ruthless business intelligence analyst. Your job is to extract findings that would change how a CEO runs their business TOMORROW. You are NOT a textbook. You are NOT writing a glossary.

RESEARCH GOAL:
${researchGoal}

SOURCES TO ANALYZE:
${sourceText}

════════════════════════════════════════
ABSOLUTE RULES — VIOLATING THESE = FAILURE:
════════════════════════════════════════

1. NEVER define a concept. If you write "X is a strategy that..." you have FAILED. The user already knows what things are. They need to know WHAT IS HAPPENING, WHO IS DOING IT, and HOW MUCH IT COSTS/EARNS.

2. Every insight MUST contain at least ONE of these:
   - A specific number, percentage, or dollar figure from the sources
   - A named company, person, or product doing something specific
   - A concrete date, timeline, or deadline
   - A direct quote from a credible source
   If an insight has NONE of these, DELETE IT.

3. Confidence scoring rules:
   - 0.9-1.0: Multiple sources confirm, hard data present (revenue figures, published stats)
   - 0.7-0.89: Single credible source with specific data
   - 0.5-0.69: Inference from patterns across sources, no hard numbers
   - Below 0.5: Speculation or thin evidence — still include if the implication is significant, but FLAG IT

4. Categories must be business-action oriented:
   - "Revenue Impact" (things that directly affect the top/bottom line)
   - "Competitive Threat" (what competitors are doing that could hurt)
   - "Untapped Opportunity" (gaps no one is filling yet)
   - "Execution Risk" (things that could go wrong if action is taken)
   - "Timing Signal" (windows opening or closing)
   - "Customer Behavior Shift" (how buyers are changing)

5. The summary must START with: "The single most important finding is..." followed by 2-3 paragraphs that read like a C-suite briefing. End with specific recommendations, not platitudes.

6. Trends must be OBSERVABLE MOVEMENTS, not concepts. Bad: "AI is transforming marketing." Good: "3 of 5 analyzed competitors launched AI-powered pricing tools in Q4 2024, suggesting $X market."

REQUIRED OUTPUT FORMAT (RETURN ONLY THIS JSON, NO OTHER TEXT):
\`\`\`json
{
  "insights": [
    {
      "title": "Specific finding — WHO is doing WHAT with WHAT RESULT",
      "content": "Detailed finding with specific data points, names, and numbers extracted from sources. Include the source reference [Source N] for each claim. End with a one-sentence 'So what?' explaining the business implication.",
      "category": "Revenue Impact|Competitive Threat|Untapped Opportunity|Execution Risk|Timing Signal|Customer Behavior Shift",
      "confidence": 0.85
    }
  ],
  "summary": "C-suite briefing starting with the most important finding. What should we DO about this?",
  "trends": [
    "Observable movement with specific evidence and timeframe"
  ]
}
\`\`\`

Generate 6-10 insights. Quality over quantity — 6 killer insights beats 15 generic ones.

Begin your analysis now:`;

    try {
      const text = await this.generateContent(prompt);
      return this.extractJson<AnalysisResult>(text);
    } catch (error) {
      console.error("Error analyzing sources:", error);
      if (error instanceof Error && error.message.includes("Failed to parse")) {
        throw error;
      }
      throw new Error(
        "Analysis mission failed: " +
          (error instanceof Error ? error.message : String(error)),
      );
    }
  }

  /**
   * Generates personalized outreach templates for a lead
   */
  async generateLeadOutreach(lead: {
    name: string;
    company?: string;
    industry?: string;
    painPoints: string[];
  }): Promise<{
    dm: string;
    email: string;
    facebookPost: string;
    facebookDM: string;
    redditPost: string;
    linkedinPost: string;
    twitterPost: string;
  }> {
    const prompt = `
      Generate a personalized LinkedIn DM, Facebook Post, Facebook DM, Reddit post, LinkedIn Post, Twitter Post and a cold email for the following business lead.
      
      Lead Name: ${lead.name}
      Company: ${lead.company || "Unknown"}
      Industry: ${lead.industry || "Unknown"}
      Pain Points: ${lead.painPoints.join(", ")}
      
      Guidelines:
      1. DM must be under 300 characters, conversational, and non-salesy.
      2. Email must be professional, focused on solving a pain point, and have a clear CTA.
      3. Use placeholders like [My Name] where appropriate.
      
      Return ONLY valid JSON:
      {
        "dm": "The LinkedIn DM text",
        "email": "The full email body",
        "facebookPost": "The Facebook Post text",
        "facebookDM": "The Facebook DM text",
        "redditPost": "The Reddit Post text",
        "linkedinPost": "The LinkedIn Post text",
        "twitterPost": "The Twitter Post text"
      }
      
      Wrap in triple backticks: \`\`\`json ... \`\`\`
    `;

    try {
      const text = await this.generateContent(prompt);
      return this.extractJson<{
        dm: string;
        email: string;
        facebookPost: string;
        facebookDM: string;
        redditPost: string;
        linkedinPost: string;
        twitterPost: string;
      }>(text);
    } catch (error) {
      console.error("Error generating outreach:", error);
      return {
        dm: "Hi [Name], saw your work at [Company] and wanted to connect!",
        email:
          "Hi [Name],\n\nI noticed [Company] might be facing [Pain Point]. I'd love to chat about how we can help.",
        facebookPost: "Looking for ways to help [Company] with [Pain Point]!",
        facebookDM: "Hi! We help companies like [Company] solve [Pain Point].",
        redditPost: "Anyone else at [Company] dealing with [Pain Point]?",
        linkedinPost: "Excited to connect with folks from [Company]!",
        twitterPost: "Helping [Company] overcome [Pain Point]!",
      };
    }
  }
}
