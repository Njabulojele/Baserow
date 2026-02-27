import { getLLMClientWithFallback } from "./llm-provider";

/**
 * A citation mapping linking a claim to its source.
 */
export interface Citation {
  claimIndex: number;
  claim: string;
  sourceURL: string;
  sourceTitle: string;
  supportingPassage: string;
  confidence: number; // 0-1 — how well the source supports the claim
}

/**
 * The output of the citation agent — annotated report with bibliography.
 */
export interface CitedReport {
  annotatedText: string; // Report with [1][2] style inline citations
  bibliography: {
    index: number;
    url: string;
    title: string;
    accessDate: string;
  }[];
  citations: Citation[];
  uncitedClaims: string[]; // Claims that couldn't be linked to a source
}

/**
 * CitationAgent — post-synthesis fact-checking and citation mapping.
 *
 * Takes a draft report and the original source documents, then:
 * 1. Identifies factual claims in the report
 * 2. Maps each claim to the supporting source passage
 * 3. Inserts inline citation markers [1][2]
 * 4. Generates a bibliography section
 * 5. Flags any claims that couldn't be verified against sources
 */
export class CitationAgent {
  async addCitations(
    draftReport: string,
    sources: { url: string; title: string; content: string }[],
    userConfig: {
      geminiApiKey?: string;
      groqApiKey?: string;
      geminiModel?: string;
      llmProvider?: string;
    },
  ): Promise<CitedReport> {
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

    // Build a source reference map
    const sourceMap = sources.map((s, i) => ({
      index: i + 1,
      url: s.url,
      title: s.title,
      // Trim content to avoid token limits
      snippet: s.content.substring(0, 3000),
    }));

    const prompt = `You are a citation agent. Your job is to verify factual claims in a research report and link them to their original sources.

DRAFT REPORT:
${draftReport.substring(0, 8000)}

SOURCES:
${sourceMap.map((s) => `[${s.index}] ${s.title} (${s.url})\n${s.snippet}`).join("\n\n---\n\n")}

INSTRUCTIONS:
1. Identify each factual claim in the report (specific numbers, dates, names, statistics).
2. For each claim, find the supporting passage in the sources above.
3. Create an annotated version of the report with inline [N] citations.
4. Build a bibliography.
5. Flag claims you cannot verify against any source.

Return a JSON object:
{
  "annotatedText": "The report with [1][2] style inline citations inserted...",
  "bibliography": [
    { "index": 1, "url": "https://...", "title": "Source Title", "accessDate": "${new Date().toISOString().split("T")[0]}" }
  ],
  "citations": [
    {
      "claimIndex": 1,
      "claim": "The specific claim text",
      "sourceURL": "https://...",
      "sourceTitle": "Source Title",
      "supportingPassage": "The exact passage from the source",
      "confidence": 0.9
    }
  ],
  "uncitedClaims": ["Any claim that couldn't be verified"]
}

RULES:
- Only cite claims that are actually supported by the source content.
- If a claim appears in multiple sources, cite the most authoritative one.
- Set confidence based on how closely the source supports the claim.
- It's OK to have uncitedClaims — better to be honest than fabricate citations.`;

    const result = await llm.generateJSON<CitedReport>(prompt);

    // Ensure all fields exist
    return {
      annotatedText: result.annotatedText || draftReport,
      bibliography: result.bibliography || [],
      citations: result.citations || [],
      uncitedClaims: result.uncitedClaims || [],
    };
  }
}
