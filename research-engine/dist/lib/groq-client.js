"use strict";
/**
 * Groq Client
 * Free-tier LLM provider using Llama 3.1
 * Fast inference with generous rate limits
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroqClient = void 0;
const encryption_1 = require("./encryption");
class GroqClient {
    constructor(encryptedApiKey, model = "llama-3.3-70b-versatile") {
        this.baseUrl = "https://api.groq.com/openai/v1";
        const apiKey = (0, encryption_1.decryptApiKey)(encryptedApiKey);
        if (!apiKey) {
            throw new Error("Invalid or missing Groq API key after decryption");
        }
        this.apiKey = apiKey;
        this.model = model;
    }
    /**
     * Send a chat completion request to Groq
     */
    async chat(messages, temperature = 0.7) {
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
        const data = await response.json();
        return data.choices[0]?.message?.content || "";
    }
    /**
     * Refine a research prompt
     */
    async refinePrompt(originalPrompt) {
        const messages = [
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
    truncateContent(content, limit = 30000) {
        if (content.length <= limit)
            return content;
        console.warn(`[GroqClient] Truncating content from ${content.length} to ${limit} chars to avoid rate limits`);
        return (content.substring(0, limit) +
            "\n...[Content truncated to fit free tier limits]...");
    }
    /**
     * Analyze research content and extract insights
     */
    async analyzeContent(prompt, content) {
        const safeContent = this.truncateContent(content);
        const messages = [
            {
                role: "system",
                content: `You are a Senior Research Analyst. Analyze the provided content and extract specific, high-value insights.
1. Key insights must be supported by specific facts, numbers, or direct evidence from the text.
2. Avoid generic statements. Focus on "Strategic Intelligence" (Market Dynamics, Competitor Moves, Technical Specs).
3. confidence score should reflect the reliability of the source and specific evidence found (0.8+ requires multiple sources or hard data).

Respond in valid JSON format:
{
  "insights": [
    {"title": "Specific finding title", "content": "Detailed finding with facts/numbers", "category": "Market|Competitor|Tech|Risk|Opportunity", "confidence": number}
  ],
  "summary": "Executive summary emphasizing critical actions and strategic implications",
  "trends": ["Trend 1 with context", "Trend 2 with context"]
}`,
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
        }
        catch (error) {
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
    async identifyGaps(originalQuery, content) {
        const safeContent = this.truncateContent(content);
        const messages = [
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
        }
        catch (error) {
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
    async synthesizeFinalReport(query, allContent, iterations) {
        const safeContent = this.truncateContent(allContent);
        const messages = [
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
    async retryWithBackoff(fn, maxRetries = 3) {
        let lastError = null;
        for (let attempt = 0; attempt < maxRetries; attempt++) {
            try {
                return await fn();
            }
            catch (error) {
                lastError = error;
                const isRateLimit = error.message?.includes("429") || error.message?.includes("rate");
                if (isRateLimit && attempt < maxRetries - 1) {
                    const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
                    console.log(`[GroqClient] Rate limited. Retry ${attempt + 1}/${maxRetries} in ${Math.round(delay)}ms`);
                    await new Promise((resolve) => setTimeout(resolve, delay));
                }
                else if (!isRateLimit) {
                    throw error;
                }
            }
        }
        throw lastError || new Error("Max retries exceeded");
    }
}
exports.GroqClient = GroqClient;
