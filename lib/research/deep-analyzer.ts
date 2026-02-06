import { GeminiClient } from "../gemini-client";
import { ScrapedSource } from "../scrapers";

export interface PainPoint {
  pain: string;
  severity: "critical" | "high" | "medium" | "low";
  frequency: number;
  willingnessToPay: string;
  currentSolutions: string[];
  quotes: string[];
  sources: string[];
  validated?: boolean;
  actionabilityScore?: number;
}

export interface Opportunity {
  title: string;
  description: string;
  targetMarket: {
    demographics: string;
    psychographics: string;
    size: string;
  };
  validationEvidence: string[];
  entryStrategy: string[];
  revenueEstimate: string;
  competition: {
    existing: string[];
    gaps: string[];
  };
  risks: string[];
  validationScore: number;
  redFlags?: string[];
  validated?: boolean;
}

export interface MarketInsight {
  type: "trend" | "pattern" | "shift" | "gap";
  insight: string;
  evidence: string[];
  impact: "high" | "medium" | "low";
  timeframe: string;
}

export class DeepAnalyzer {
  constructor(private geminiClient: GeminiClient) {}

  async analyze(sources: ScrapedSource[], prompt: string) {
    console.log("🧠 Starting deep analysis...");

    // Run sequentially with delays to avoid rate limits (Gemini Free Tier)
    const painPoints = await this.extractPainPoints(sources);
    await new Promise((resolve) => setTimeout(resolve, 15000));

    const opportunities = await this.identifyOpportunities(sources, prompt);
    await new Promise((resolve) => setTimeout(resolve, 15000));

    const marketInsights = await this.extractMarketInsights(sources);
    await new Promise((resolve) => setTimeout(resolve, 15000));

    const competitorIntel = await this.analyzeCompetitors(sources);
    await new Promise((resolve) => setTimeout(resolve, 5000));

    return {
      painPoints,
      opportunities,
      marketInsights,
      competitorIntel,
      summary: await this.synthesize({
        painPoints,
        opportunities,
        marketInsights,
        competitorIntel,
      }),
    };
  }

  private async extractPainPoints(
    sources: ScrapedSource[],
  ): Promise<PainPoint[]> {
    // Focus on Reddit/HN comments - gold mine for pain points
    const discussionSources = sources.filter(
      (s) => s.sourceType === "reddit" || s.sourceType === "hn",
    );

    const commentsText = discussionSources
      .flatMap((s) => s.topComments || [])
      .map((c) => `[${c.score} upvotes] ${c.text}`)
      .join("\n\n---\n\n");

    const postsText = discussionSources
      .map((s) => `Title: ${s.title}\nContent: ${s.content}`)
      .join("\n\n---\n\n");

    const prompt = `You are analyzing customer discussions to extract pain points.

REDDIT/HN POSTS:
${postsText.slice(0, 15000)}

TOP COMMENTS:
${commentsText.slice(0, 15000)}

Extract SPECIFIC, ACTIONABLE pain points. Focus on:
1. Problems people are actively trying to solve RIGHT NOW
2. Frustrations with existing solutions
3. Unmet needs they've explicitly stated
4. Evidence of willingness to pay
5. Workarounds they've built (indicates strong need)

Return a JSON array of pain points:
[
  {
    "pain": "specific problem statement in user's words",
    "severity": "critical|high|medium|low",
    "frequency": <number of times mentioned>,
    "willingnessToPay": "evidence they'd pay for solution (quote or inference)",
    "currentSolutions": ["what they use now", "why it's inadequate"],
    "quotes": ["exact user quote 1", "exact user quote 2"],
    "sources": ["reddit post title or comment excerpt"]
  }
]

CRITICAL RULES:
- Only include pain points with clear evidence (quotes)
- Severity "critical" means users are desperate, "high" means actively seeking solutions
- Include willingness to pay indicators (mentions of budget, already paying for alternatives, etc.)
- Be specific - "email is hard" is too vague, "email clients can't handle 1000+ daily emails from support tickets" is specific

Return ONLY valid JSON, no other text.`;

    try {
      const response = await this.geminiClient.generate(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/)?.[0];

      if (jsonMatch) {
        const painPoints = JSON.parse(jsonMatch);
        console.log(`💊 Extracted ${painPoints.length} pain points`);
        return painPoints;
      }
    } catch (error) {
      console.error("Failed to extract pain points:", error);
    }

    // FALLBACK: Generate synthetic pain points from source data
    console.log("⚠️ Using fallback pain point generation from sources");
    return this.generateFallbackPainPoints(sources);
  }

  private generateFallbackPainPoints(sources: ScrapedSource[]): PainPoint[] {
    // Extract keywords/themes from source titles to create basic pain points
    const discussionSources = sources.filter(
      (s) => s.sourceType === "reddit" || s.sourceType === "hn",
    );

    if (discussionSources.length === 0) {
      return [
        {
          pain: "Unable to extract specific pain points - API quota exceeded",
          severity: "medium",
          frequency: 1,
          willingnessToPay: "Unknown - manual research required",
          currentSolutions: ["Manual research needed"],
          quotes: [
            "Research data collected but analysis unavailable due to rate limits",
          ],
          sources: sources.slice(0, 3).map((s) => s.title),
          validated: false,
          actionabilityScore: 3,
        },
      ];
    }

    // Create pain points from high-engagement posts
    const topPosts = discussionSources
      .filter((s) => s.metadata.score && s.metadata.score > 10)
      .slice(0, 5);

    return topPosts.map((post) => ({
      pain: `Discussion: ${post.title.slice(0, 100)}`,
      severity:
        post.metadata.score && post.metadata.score > 100 ? "high" : "medium",
      frequency: 1,
      willingnessToPay: "See original discussion for context",
      currentSolutions: ["Review source for details"],
      quotes:
        post.topComments?.slice(0, 2).map((c) => c.text.slice(0, 200)) || [],
      sources: [post.url],
      validated: false,
      actionabilityScore: 4,
    }));
  }

  private async identifyOpportunities(
    sources: ScrapedSource[],
    originalPrompt: string,
  ): Promise<Opportunity[]> {
    const consolidatedContent = this.consolidateSources(sources);

    const prompt = `You are a business strategist analyzing market research.

ORIGINAL RESEARCH QUESTION:
${originalPrompt}

RESEARCH DATA:
${consolidatedContent}

Identify SPECIFIC, ACTIONABLE business opportunities.

Each opportunity must have:
1. Clear target market with demographics AND psychographics
2. Validated demand - cite specific evidence from sources
3. Concrete entry strategy - actual first steps to take
4. Realistic revenue potential with reasoning
5. Honest competition assessment
6. Risk factors

Return JSON array:
[
  {
    "title": "concise opportunity name",
    "description": "2-3 sentence description",
    "targetMarket": {
      "demographics": "age, location, income, etc.",
      "psychographics": "values, behaviors, pain points",
      "size": "estimated market size with source"
    },
    "validationEvidence": [
      "specific evidence from research with source citation",
      "e.g., '143 Reddit users in r/sales mentioned needing this in past month'"
    ],
    "entryStrategy": [
      "specific step 1",
      "specific step 2",
      "specific step 3"
    ],
    "revenueEstimate": "realistic estimate with reasoning",
    "competition": {
      "existing": ["competitor 1", "competitor 2"],
      "gaps": ["what they don't do well", "what's missing"]
    },
    "risks": ["risk 1", "risk 2"],
    "validationScore": <0-10, based on strength of evidence>
  }
]

REQUIREMENTS:
- Only include opportunities with validationScore > 6
- Evidence must be specific and traceable to sources
- Entry strategy must be actionable, not generic advice
- Revenue estimates must be grounded in research data

Return ONLY valid JSON.`;

    try {
      const response = await this.geminiClient.generate(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/)?.[0];

      if (jsonMatch) {
        const opportunities = JSON.parse(jsonMatch);
        console.log(`💡 Identified ${opportunities.length} opportunities`);

        // Filter by validation score
        return opportunities.filter((o: Opportunity) => o.validationScore > 6);
      }
    } catch (error) {
      console.error("Failed to identify opportunities:", error);
    }

    // FALLBACK: Generate synthetic opportunity from sources
    console.log("⚠️ Using fallback opportunity generation");
    return this.generateFallbackOpportunities(sources, originalPrompt);
  }

  private generateFallbackOpportunities(
    sources: ScrapedSource[],
    prompt: string,
  ): Opportunity[] {
    if (sources.length === 0) {
      return [
        {
          title: "Research Data Collected - Manual Analysis Required",
          description:
            "API quota exceeded during analysis. Review collected sources manually.",
          targetMarket: {
            demographics: "To be determined",
            psychographics: "To be determined",
            size: "Unknown",
          },
          validationEvidence: ["Sources collected but AI analysis unavailable"],
          entryStrategy: [
            "Review collected sources manually",
            "Identify patterns in discussions",
            "Re-run research when API quota resets",
          ],
          revenueEstimate: "Requires manual analysis",
          competition: { existing: [], gaps: [] },
          risks: ["Limited data due to API constraints"],
          validationScore: 5,
          validated: false,
        },
      ];
    }

    // Create opportunity from research context
    return [
      {
        title: `Opportunity based on: ${prompt.slice(0, 50)}...`,
        description: `Analysis based on ${sources.length} sources discovered. Full AI analysis unavailable due to rate limits.`,
        targetMarket: {
          demographics: "Review sources for demographics",
          psychographics: "Review sources for psychographics",
          size: "Unknown - manual research required",
        },
        validationEvidence: sources
          .slice(0, 3)
          .map((s) => `Source: ${s.title}`),
        entryStrategy: [
          "Review the collected sources for insights",
          "Identify common themes and pain points",
          "Re-run full analysis when API quota resets",
        ],
        revenueEstimate: "Requires detailed analysis",
        competition: { existing: [], gaps: [] },
        risks: ["Incomplete analysis due to API limits"],
        validationScore: 5,
        validated: false,
      },
    ];
  }

  private async extractMarketInsights(
    sources: ScrapedSource[],
  ): Promise<MarketInsight[]> {
    const consolidatedContent = this.consolidateSources(sources);

    const prompt = `Analyze this market research and extract key insights.

RESEARCH DATA:
${consolidatedContent}

Identify:
- Emerging trends
- Market patterns
- Behavioral shifts
- Market gaps

Return JSON array of insights:
[
  {
    "type": "trend|pattern|shift|gap",
    "insight": "specific, actionable insight",
    "evidence": ["evidence 1", "evidence 2"],
    "impact": "high|medium|low",
    "timeframe": "how long until this matters"
  }
]

Focus on insights that are:
1. Backed by multiple sources
2. Actionable (you can make decisions based on them)
3. Non-obvious (not just restating what everyone knows)

Return ONLY valid JSON.`;

    try {
      const response = await this.geminiClient.generate(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/)?.[0];

      if (jsonMatch) {
        const insights = JSON.parse(jsonMatch);
        console.log(`🔍 Extracted ${insights.length} market insights`);
        return insights;
      }
    } catch (error) {
      console.error("Failed to extract insights:", error);
    }

    // FALLBACK: Generate basic insight from sources
    console.log("⚠️ Using fallback market insight generation");
    if (sources.length === 0) {
      return [
        {
          type: "gap" as const,
          insight: "Unable to complete market analysis - API quota exceeded",
          evidence: ["Research data collected but analysis unavailable"],
          impact: "medium" as const,
          timeframe: "Immediate - re-run when quota resets",
        },
      ];
    }

    return [
      {
        type: "pattern" as const,
        insight: `${sources.length} sources discovered across ${new Set(sources.map((s) => s.sourceType)).size} platforms`,
        evidence: sources.slice(0, 3).map((s) => s.title),
        impact: "medium" as const,
        timeframe: "Review sources manually for detailed insights",
      },
    ];
  }

  private async analyzeCompetitors(sources: ScrapedSource[]) {
    // Extract competitor mentions from sources
    const consolidatedContent = this.consolidateSources(sources);

    const prompt = `Analyze competitor mentions in this research.

RESEARCH DATA:
${consolidatedContent}

Extract:
1. Competitors mentioned
2. What users say about them (pros/cons)
3. Pricing mentioned
4. Feature gaps users complain about

Return JSON:
{
  "competitors": [
    {
      "name": "competitor name",
      "mentions": <number>,
      "sentiment": "positive|negative|mixed",
      "strengths": ["strength 1"],
      "weaknesses": ["weakness 1"],
      "pricing": "pricing info if mentioned",
      "userQuotes": ["relevant quote 1"]
    }
  ]
}

Return ONLY valid JSON.`;

    try {
      const response = await this.geminiClient.generate(prompt);
      // find first { and last }
      const firstBrace = response.indexOf("{");
      const lastBrace = response.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1) {
        const jsonStr = response.substring(firstBrace, lastBrace + 1);
        const analysis = JSON.parse(jsonStr);
        console.log(
          `🏢 Analyzed ${analysis.competitors?.length || 0} competitors`,
        );
        return analysis;
      }
    } catch (error) {
      console.error("Failed to analyze competitors:", error);
    }

    return { competitors: [] };
  }

  async synthesize(analyses: any) {
    const prompt = `Synthesize these research findings into a concise executive summary.

PAIN POINTS FOUND: ${analyses.painPoints.length}
OPPORTUNITIES IDENTIFIED: ${analyses.opportunities.length}
MARKET INSIGHTS: ${analyses.marketInsights.length}

DATA:
${JSON.stringify(analyses, null, 2).slice(0, 10000)}

Create a 3-4 paragraph executive summary that:
1. Highlights the most critical findings
2. Connects pain points to opportunities
3. Provides clear recommendations
4. Notes confidence level and gaps in research

Be direct and actionable. Avoid fluff.`;

    try {
      const summary = await this.geminiClient.generate(prompt);
      return summary;
    } catch (error) {
      console.error("Failed to synthesize:", error);
      return "Summary generation failed.";
    }
  }

  private consolidateSources(sources: ScrapedSource[]): string {
    return sources
      .slice(0, 15) // Limit to avoid token limits
      .map((s) => {
        let text = `SOURCE: ${s.title}\nURL: ${s.url}\nTYPE: ${s.sourceType}\n`;

        if (s.content) {
          text += `CONTENT: ${s.content.slice(0, 1000)}\n`;
        }

        if (s.topComments && s.topComments.length > 0) {
          text += `TOP COMMENTS:\n`;
          s.topComments.slice(0, 5).forEach((c) => {
            text += `- [${c.score} pts] ${c.text.slice(0, 200)}\n`;
          });
        }

        return text;
      })
      .join("\n\n---\n\n")
      .slice(0, 30000); // Hard limit for context window
  }
}
