import { GoogleGenerativeAI, GenerativeModel } from "@google/generative-ai";
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
export interface InteractionPart {
  text?: string;
  thought?: {
    summary?: string;
    signature: string;
  };
  functionCall?: {
    name: string;
    args: any;
  };
}

export interface InteractionContent {
  role: string;
  parts: InteractionPart[];
}

export interface Interaction {
  id: string;
  status: "processing" | "completed" | "failed" | "requires_action";
  outputs?: InteractionContent[];
  error?: {
    message: string;
  };
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  public model: GenerativeModel;
  private apiKey: string;

  constructor(encryptedApiKey: string, modelName: string = "gemini-2.0-pro") {
    const apiKey = decryptApiKey(encryptedApiKey);
    if (!apiKey) {
      throw new Error("Invalid or missing API key after decryption");
    }
    this.apiKey = apiKey;
    // Initialize with v1 API for better stability across models
    this.genAI = new GoogleGenerativeAI(apiKey);
    // Using user-selected model
    this.model = this.genAI.getGenerativeModel({ model: modelName });
  }

  /**
   * Starts a Deep Research task using the Interactions API
   */
  /**
   * Starts a Deep Research task using the Interactions API
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
   * Cleans and extracts JSON from AI string response
   */
  private extractJson<T>(text: string): T {
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
      // Remove horizontal tabs, newlines, and carriage returns that are often naked in AI responses
      // but also handle escaped characters correctly.
      const cleaned = jsonStr
        .trim()
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, "") // Remove control characters
        .replace(/\\n/g, "\\n") // Keep valid escaped newlines
        .replace(/\\"/g, '\\"'); // Keep valid escaped quotes

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
        this.model.generateContent(prompt),
      );
      const response = await result.response;
      return response.text().trim();
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

    // const prompt = `
    //   You are a Deep Research Analyst. Based on the following sources, provide a comprehensive analysis for the goal: "${researchGoal}"

    //   SOURCES:
    //   ${sourceText}

    //   Return the analysis in VALID JSON format with this exact structure:
    //   {
    //     "insights": [
    //       {
    //         "title": "Specific finding title",
    //         "content": "Detailed explanation of the finding",
    //         "category": "Market/Competitor/Technology/etc",
    //         "confidence": 0.0 to 1.0
    //       }
    //     ],
    //     "summary": "High-level executive summary of all findings",
    //     "trends": ["Trend 1", "Trend 2"]
    //   }

    //   Ensure the JSON is properly escaped and valid. Wrap the JSON in triple backticks: \`\`\`json ... \`\`\`
    // `;

    const prompt = `You are a Senior Strategic intelligence Analyst generating actionable B2B intelligence for a Lead Generation Agency.

RESEARCH GOAL:
${researchGoal}

SOURCES TO ANALYZE:
${sourceText}

INSTRUCTIONS:
1. Analyze all provided sources to extract strict, highly actionable business intelligence.
2. Focus intensely on extracting B2B Lead Generation Signals:
   - Identify precise decision-maker roles (e.g., Marketing Director, CTO, Founder).
   - Highlight explicit organizational pain points, recent software transitions, or expansion efforts.
   - Extract hard data signals: Funding rounds, hiring surges, and recent tech stack additions.
3. Categorize findings into Strategic Intelligence (e.g., MarketDynamics, CompetitorMoves, PainPoints, TechStack, HiringSignals, IntentTriggers).
4. Assign strong confidence scores; facts and numbers get 0.8+, vague marketing copy gets <0.5.
5. Provide a sharp, hard-hitting executive summary emphasizing specific actions and strategic implications—do NOT write a generic summary. Be concise.

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON - no additional text before or after
- Use proper JSON escaping for quotes, newlines, and special characters
- Ensure all strings are properly quoted
- Do not use trailing commas
- Confidence must be a number between 0.0 and 1.0
- All arrays must contain at least one element (use empty string if needed)

REQUIRED OUTPUT FORMAT:
\`\`\`json
{
  "insights": [
    {
      "title": "Specific Signal: (e.g., Hiring 5 New Sales Reps)",
      "content": "Detailed explanation with facts from sources indicating clear intent or pain points.",
      "category": "PainPoints|TechStack|HiringSignals|IntentTriggers|MarketDynamics",
      "confidence": 0.85
    }
  ],
  "summary": "2-3 paragraph sharp executive summary synthesizing actionable facts and immediate outreach angles.",
  "trends": [
    "Specific industry shift or signal",
    "Specific tooling or hiring trend"
  ]
}
\`\`\`

VALIDATION CHECKLIST:
- [ ] JSON is properly formatted and parseable
- [ ] All required fields are present
- [ ] insights array has at least 1 item
- [ ] Each insight has title, content, category, and confidence
- [ ] confidence values are numbers between 0 and 1
- [ ] trends array has at least 1 item
- [ ] summary is substantive (not just "No findings")
- [ ] Content is wrapped in triple backticks with json language identifier

Begin your analysis now:`;

    try {
      const result = await this.retryWithBackoff(() =>
        this.model.generateContent(prompt),
      );
      const response = await result.response;
      const text = response.text();

      return this.extractJson<AnalysisResult>(text);
    } catch (error) {
      console.error("Error analyzing sources:", error);
      if (error instanceof Error && error.message.includes("Failed to parse")) {
        throw error;
      }
      throw new Error(
        "Analyis mission failed: " +
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
      const result = await this.retryWithBackoff(() =>
        this.model.generateContent(prompt),
      );
      const response = await result.response;
      const text = response.text();

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
