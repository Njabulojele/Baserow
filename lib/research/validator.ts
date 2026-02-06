import { GeminiClient } from "../gemini-client";
import { PainPoint, Opportunity } from "./deep-analyzer";

export class InsightValidator {
  constructor(private geminiClient: GeminiClient) {}

  async validatePainPoints(painPoints: PainPoint[]): Promise<PainPoint[]> {
    console.log("✅ Validating pain points...");

    // Run SEQUENTIALLY to avoid rate limits
    const validated: PainPoint[] = [];

    for (const point of painPoints) {
      try {
        // Check evidence strength
        const hasStrongEvidence =
          point.quotes.length >= 2 && point.sources.length >= 2;

        if (!hasStrongEvidence) {
          point.severity = "low";
        }

        // Check actionability (with graceful fallback)
        let actionabilityScore = 5; // Default
        try {
          actionabilityScore = await this.scoreActionability(point.pain);
          await new Promise((resolve) => setTimeout(resolve, 3000)); // Rate limit delay
        } catch {
          console.log("⚠️ Actionability scoring failed, using default");
        }

        validated.push({
          ...point,
          validated: hasStrongEvidence,
          actionabilityScore,
        });
      } catch (error) {
        // Graceful degradation: return original point with defaults
        console.error("Validation failed for point, using defaults:", error);
        validated.push({
          ...point,
          validated: false,
          actionabilityScore: 5,
        });
      }
    }

    return validated;
  }

  async validateOpportunities(
    opportunities: Opportunity[],
  ): Promise<Opportunity[]> {
    console.log("✅ Validating opportunities...");

    // This method doesn't make API calls, but we'll still add try/catch for robustness
    const validated: Opportunity[] = [];

    for (const opp of opportunities) {
      try {
        // Recalculate validation score based on evidence
        const evidenceScore = (opp.validationEvidence?.length || 0) * 2;
        const entryScore = (opp.entryStrategy?.length || 0) >= 3 ? 3 : 1;
        const competitionScore =
          (opp.competition?.gaps?.length || 0) > 0 ? 2 : 0;

        const recalculatedScore = Math.min(
          10,
          evidenceScore + entryScore + competitionScore,
        );

        // Check for red flags
        const redFlags: string[] = [];

        if (!opp.competition?.existing?.length) {
          redFlags.push("No competition mentioned - may indicate no market");
        }

        if ((opp.validationEvidence?.length || 0) < 3) {
          redFlags.push("Limited evidence - needs more validation");
        }

        if (!opp.revenueEstimate?.match(/\d/)) {
          redFlags.push("No numeric revenue estimate provided");
        }

        validated.push({
          ...opp,
          validationScore: recalculatedScore,
          redFlags,
          validated: recalculatedScore >= 7 && redFlags.length === 0,
        });
      } catch (error) {
        console.error("Opportunity validation error, using defaults:", error);
        validated.push({
          ...opp,
          validationScore: opp.validationScore || 5,
          redFlags: ["Validation error occurred"],
          validated: false,
        });
      }
    }

    return validated;
  }

  private async scoreActionability(text: string): Promise<number> {
    const prompt = `Rate the actionability of this insight on a scale of 0-10.

INSIGHT: "${text}"

An actionable insight should have:
- Specific target audience (not "users" but "B2B SaaS founders with 10-50 employees")
- Clear problem statement
- Implied or explicit solution direction
- Measurable outcome potential

Score (0-10):`;

    try {
      const response = await this.geminiClient.generate(prompt);
      const score = parseInt(response.match(/\d+/)?.[0] || "5");
      return Math.min(10, Math.max(0, score));
    } catch {
      return 5; // Default mid-range
    }
  }

  async enrichLowQualityInsights(insights: any[]): Promise<any[]> {
    console.log("🔧 Enriching low-quality insights...");

    return await Promise.all(
      insights.map(async (insight) => {
        if (insight.actionabilityScore < 6) {
          const enriched = await this.makeMoreActionable(insight);
          return { ...insight, enriched };
        }
        return insight;
      }),
    );
  }

  private async makeMoreActionable(insight: any): Promise<string> {
    const prompt = `Make this insight more actionable by adding specificity:

ORIGINAL: "${insight.pain || insight.insight}"

Transform it by adding:
1. WHO specifically this affects (demographics, role, company size)
2. WHAT specific action to take
3. HOW to measure success
4. WHEN to do it (timeframe)

Return the improved, actionable version:`;

    try {
      const enriched = await this.geminiClient.generate(prompt);
      return enriched.trim();
    } catch {
      return insight.pain || insight.insight;
    }
  }
}
