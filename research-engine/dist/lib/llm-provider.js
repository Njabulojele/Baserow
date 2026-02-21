"use strict";
/**
 * LLM Provider Abstraction
 * Factory pattern for selecting between Gemini and Groq
 * with automatic fallback support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getLLMClient = getLLMClient;
exports.getLLMClientWithFallback = getLLMClientWithFallback;
const gemini_client_1 = require("./gemini-client");
const groq_client_1 = require("./groq-client");
/**
 * Wrapper for GeminiClient to match unified interface
 */
class GeminiWrapper {
    constructor(encryptedApiKey, model) {
        this.client = new gemini_client_1.GeminiClient(encryptedApiKey, model || "gemini-2.0-flash");
    }
    async refinePrompt(prompt) {
        // GeminiClient.refinePrompt takes (prompt, scope), use prompt as both
        return this.client.refinePrompt(prompt, "general");
    }
    async generateText(prompt) {
        const result = await this.client.model.generateContent(prompt);
        return result.response.text();
    }
    async generateJSON(prompt) {
        const text = await this.generateText(prompt);
        // First try to extract from code blocks
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            try {
                return JSON.parse(codeBlockMatch[1]);
            }
            catch (e) {
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
        }
        else if (arrayStart !== -1) {
            start = arrayStart;
            end = text.lastIndexOf("]");
        }
        if (start !== -1 && end !== -1) {
            try {
                const potentialJson = text.substring(start, end + 1);
                return JSON.parse(potentialJson);
            }
            catch (e) {
                // Continue
            }
        }
        throw new Error("No valid JSON found in response");
    }
    async analyzeContent(prompt, content) {
        // Create a synthetic source for analyzeSources
        const sources = [
            {
                url: "research-content",
                title: "Research Content",
                content: content,
            },
        ];
        const result = await this.client.analyzeSources(sources, prompt);
        return result;
    }
    // Gemini doesn't have native gap detection, so we'll use a prompt-based approach
    async identifyGaps(query, content) {
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
        }
        catch (error) {
            console.error("[GeminiWrapper] Gap analysis failed:", error);
        }
        return { hasGaps: false, gaps: [], suggestedQueries: [] };
    }
    async synthesizeFinalReport(query, content, iterations) {
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
class GroqWrapper {
    constructor(encryptedApiKey, model) {
        this.client = new groq_client_1.GroqClient(encryptedApiKey, model);
    }
    async refinePrompt(prompt) {
        return this.client.refinePrompt(prompt);
    }
    async analyzeContent(prompt, content) {
        return this.client.analyzeContent(prompt, content);
    }
    async generateText(prompt) {
        const messages = [
            {
                role: "system",
                content: "You are a helpful AI assistant. Follow the user's instructions exactly.",
            },
            {
                role: "user",
                content: prompt,
            },
        ];
        return this.client.chat(messages, 0.5);
    }
    async generateJSON(prompt) {
        const text = await this.generateText(prompt);
        // First try to extract from code blocks
        const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (codeBlockMatch) {
            try {
                return JSON.parse(codeBlockMatch[1]);
            }
            catch (e) {
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
        }
        else if (arrayStart !== -1) {
            start = arrayStart;
            end = text.lastIndexOf("]");
        }
        if (start !== -1 && end !== -1) {
            try {
                const potentialJson = text.substring(start, end + 1);
                return JSON.parse(potentialJson);
            }
            catch (e) {
                // Continue
            }
        }
        throw new Error("No valid JSON found in response");
    }
    async identifyGaps(query, content) {
        return this.client.identifyGaps(query, content);
    }
    async synthesizeFinalReport(query, content, iterations) {
        return this.client.synthesizeFinalReport(query, content, iterations);
    }
}
/**
 * Factory function to get the appropriate LLM client
 */
/**
 * Factory function to get the appropriate LLM client
 */
function getLLMClient(provider, encryptedApiKey, model) {
    switch (provider) {
        case "GROQ":
            // Verify if the model is a valid Groq model, otherwise use default
            const isGroqModel = model?.includes("llama") ||
                model?.includes("mixtral") ||
                model?.includes("gemma") ||
                model?.includes("gpt-oss") ||
                model?.includes("qwen") ||
                model?.includes("deepseek");
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
async function getLLMClientWithFallback(primaryProvider, primaryKey, fallbackProvider, fallbackKey, model) {
    // Pass model only if it makes sense for the primary provider
    const sanitizedModel = sanitizeModelName(model);
    const primary = getLLMClient(primaryProvider, primaryKey, sanitizedModel);
    // Test primary with a simple request
    try {
        await primary.refinePrompt("test");
        return { client: primary, provider: primaryProvider };
    }
    catch (error) {
        const isFallbackError = error.message?.includes("429") ||
            error.message?.includes("quota") ||
            error.message?.includes("limit") ||
            error.message?.includes("404") ||
            error.message?.includes("not found");
        if (isFallbackError && fallbackKey) {
            console.log(`[LLMProvider] Primary provider ${primaryProvider} failed (${error.message}), falling back to ${fallbackProvider}`);
            // IMPORTANT: Do NOT pass the 'model' param to the fallback if it was the cause of the failure (likely 404 for Gemini)
            // If we fall back to Groq, we want it to use its default model, not the broken Gemini one.
            const fallback = getLLMClient(fallbackProvider, fallbackKey, undefined);
            return { client: fallback, provider: fallbackProvider };
        }
        throw error;
    }
}
function sanitizeModelName(model) {
    if (!model)
        return undefined;
    // If the model is the known bad one, return undefined to use default
    if (model.includes("gemini-2.5-flash-preview-05-20")) {
        return "gemini-2.0-flash";
    }
    return model;
}
