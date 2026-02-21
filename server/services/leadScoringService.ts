import { PrismaClient } from "@prisma/client";

/**
 * 6-Dimension Lead Scoring Matrix (from BOS PDF v2.0)
 *
 * Dimension          | Max  | Weight
 * -------------------|------|-------
 * Industry Fit       |  25  |  25%
 * Company Size Fit   |  20  |  20%
 * Pain Point Match   |  20  |  20%
 * Email Verified     |  15  |  15%
 * Tech Stack Signal  |  10  |  10%
 * Buying Intent      |  10  |  10%
 * TOTAL              | 100  | 100%
 *
 * Tier Routing:
 *   80-100 → HOT      → Auto-create CrmLead @ Discovery
 *   60-79  → WARM     → Create CrmLead, notify user
 *   40-59  → COLD     → Stay in Lead, 30-day re-score
 *   0-39   → DISCARD  → Archive + log
 */
export class LeadScoringService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Score a single Lead record using the 6-dimension matrix.
   * Requires the owning user's ICP config for Industry/Size/PainPoint scoring.
   */
  async scoreLead(
    leadId: string,
    userId: string,
  ): Promise<{ score: number; tier: string }> {
    const [lead, user] = await Promise.all([
      this.prisma.lead.findUnique({ where: { id: leadId } }),
      this.prisma.user.findUnique({
        where: { id: userId },
        select: {
          targetIndustries: true,
          targetCompanySize: true,
          targetPainPoints: true,
        },
      }),
    ]);

    if (!lead || !user) return { score: 0, tier: "UNSCORED" };

    let score = 0;

    // 1. Industry Fit (0–25)
    score += this.scoreIndustryFit(lead.industry, user.targetIndustries);

    // 2. Company Size Fit (0–20)
    score += this.scoreCompanySizeFit(lead.companySize, user.targetCompanySize);

    // 3. Pain Point Match (0–20)
    score += this.scorePainPointMatch(lead.painPoints, user.targetPainPoints);

    // 4. Email Verified (0–15)
    score += this.scoreEmailQuality(lead.email);

    // 5. Tech Stack Signal (0–10)
    score += this.scoreTechStack(lead.personalization as any);

    // 6. Buying Intent Signal (0–10)
    score += this.scoreBuyingIntent(lead.personalization as any);

    // Cap
    score = Math.min(Math.round(score), 100);

    // Determine tier
    const tier = this.getTier(score);

    // Persist
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { score, tier },
    });

    return { score, tier };
  }

  /**
   * Batch score all leads for a given LeadData set.
   * Returns summary counts per tier.
   */
  async scoreLeadBatch(
    leadDataId: string,
    userId: string,
  ): Promise<{ hot: number; warm: number; cold: number; discard: number }> {
    const leads = await this.prisma.lead.findMany({
      where: { leadDataId },
      select: { id: true },
    });

    const counts = { hot: 0, warm: 0, cold: 0, discard: 0 };

    for (const lead of leads) {
      const { tier } = await this.scoreLead(lead.id, userId);
      if (tier === "HOT") counts.hot++;
      else if (tier === "WARM") counts.warm++;
      else if (tier === "COLD") counts.cold++;
      else counts.discard++;
    }

    return counts;
  }

  // ──────────────────────────────────────────
  // Dimension Scorers
  // ──────────────────────────────────────────

  private scoreIndustryFit(
    leadIndustry: string | null,
    targetIndustries: string[],
  ): number {
    if (!leadIndustry || targetIndustries.length === 0) return 0;
    const normalised = leadIndustry.toLowerCase().trim();

    // Exact match → 25pts
    if (targetIndustries.some((t) => t.toLowerCase().trim() === normalised)) {
      return 25;
    }

    // Partial / adjacent match → 15pts
    if (
      targetIndustries.some(
        (t) =>
          normalised.includes(t.toLowerCase()) ||
          t.toLowerCase().includes(normalised),
      )
    ) {
      return 15;
    }

    return 0;
  }

  private scoreCompanySizeFit(
    leadSize: string | null | undefined,
    targetRange: string | null | undefined,
  ): number {
    if (!leadSize || !targetRange) return 5; // No data → neutral

    // Parse ranges like "10-200" or "50+"
    const parseRange = (s: string): { min: number; max: number } | null => {
      const match = s.match(/(\d+)\s*[-–to]+\s*(\d+)/);
      if (match) return { min: parseInt(match[1]), max: parseInt(match[2]) };
      const plus = s.match(/(\d+)\+/);
      if (plus) return { min: parseInt(plus[1]), max: Infinity };
      const single = s.match(/(\d+)/);
      if (single) {
        const n = parseInt(single[1]);
        return { min: n, max: n };
      }
      return null;
    };

    const target = parseRange(targetRange);
    const lead = parseRange(leadSize);
    if (!target || !lead) return 5;

    // Check overlap
    const overlaps = lead.min <= target.max && lead.max >= target.min;
    if (overlaps) return 20;

    // Close range (within 2x)
    const midTarget = (target.min + Math.min(target.max, 10000)) / 2;
    const midLead = (lead.min + Math.min(lead.max, 10000)) / 2;
    const ratio =
      midLead > midTarget ? midLead / midTarget : midTarget / midLead;
    if (ratio <= 2) return 10;

    return 5; // Too small or too large
  }

  private scorePainPointMatch(
    leadPainPoints: string[],
    targetPainPoints: string[],
  ): number {
    if (leadPainPoints.length === 0 || targetPainPoints.length === 0) return 0;

    const targetNormed = targetPainPoints.map((p) => p.toLowerCase());
    let matches = 0;

    for (const point of leadPainPoints) {
      const normed = point.toLowerCase();
      for (const target of targetNormed) {
        // Word overlap heuristic
        const targetWords = new Set(target.split(/\s+/));
        const pointWords = normed.split(/\s+/);
        const overlap = pointWords.filter((w) =>
          [...targetWords].some((tw) => tw.includes(w) || w.includes(tw)),
        ).length;
        if (overlap >= 2 || (pointWords.length <= 2 && overlap >= 1)) {
          matches++;
          break;
        }
      }
    }

    // Score: percentage of target pain points matched, scaled to 20
    const matchRatio = matches / targetPainPoints.length;
    return Math.round(matchRatio * 20);
  }

  private scoreEmailQuality(email: string | null): number {
    if (!email) return 0;

    const domain = email.split("@")[1]?.toLowerCase();
    if (!domain) return 0;

    const freeProviders = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
      "aol.com",
      "protonmail.com",
      "mail.com",
    ];

    if (freeProviders.includes(domain)) return 5; // Guessed / personal
    return 15; // Corporate email
  }

  private scoreTechStack(personalization: Record<string, any> | null): number {
    if (!personalization) return 0;

    const text = JSON.stringify(personalization).toLowerCase();
    const techSignals = [
      "hubspot",
      "salesforce",
      "marketo",
      "mailchimp",
      "activecampaign",
      "zoho",
      "pipedrive",
      "intercom",
      "drift",
      "wordpress",
      "shopify",
      "webflow",
      "make.com",
      "zapier",
      "n8n",
      "airtable",
    ];

    const hits = techSignals.filter((t) => text.includes(t)).length;
    if (hits >= 3) return 10;
    if (hits >= 1) return 5;
    return 0;
  }

  private scoreBuyingIntent(
    personalization: Record<string, any> | null,
  ): number {
    if (!personalization) return 0;

    const text = JSON.stringify(personalization).toLowerCase();
    const intentSignals = [
      "hiring",
      "looking for",
      "seeking",
      "outsource",
      "partner",
      "digital transformation",
      "growth",
      "expansion",
      "new office",
      "series a",
      "series b",
      "funding",
      "raised",
      "automation",
      "scaling",
    ];

    const hits = intentSignals.filter((s) => text.includes(s)).length;
    if (hits >= 3) return 10;
    if (hits >= 1) return 5;
    return 0;
  }

  // ──────────────────────────────────────────
  // Tier Classification
  // ──────────────────────────────────────────

  private getTier(score: number): string {
    if (score >= 80) return "HOT";
    if (score >= 60) return "WARM";
    if (score >= 40) return "COLD";
    return "DISCARD";
  }

  // ──────────────────────────────────────────
  // CrmLead Scoring (backward compat for CRM routers)
  // ──────────────────────────────────────────

  /**
   * Score a CrmLead record based on engagement signals.
   * Called by crmLead.ts and crmActivity.ts routers.
   */
  async calculateScore(crmLeadId: string): Promise<number> {
    const crmLead = await this.prisma.crmLead.findUnique({
      where: { id: crmLeadId },
      include: {
        _count: { select: { activities: true } },
      },
    });

    if (!crmLead) return 0;

    let score = 0;

    // Activity engagement (0–30)
    const activityCount = crmLead._count.activities;
    score += Math.min(activityCount * 5, 30);

    // Email quality (0–15)
    if (crmLead.email) {
      const domain = crmLead.email.split("@")[1]?.toLowerCase();
      const freeProviders = [
        "gmail.com",
        "yahoo.com",
        "hotmail.com",
        "outlook.com",
      ];
      score += domain && !freeProviders.includes(domain) ? 15 : 5;
    }

    // Company info completeness (0–15)
    if (crmLead.companyName) score += 5;
    if (crmLead.companyWebsite) score += 5;
    if (crmLead.industry) score += 5;

    // Pain points & needs (0–20)
    const painPointsCount =
      (crmLead.painPoints?.length || 0) +
      (crmLead.identifiedNeeds?.length || 0);
    score += Math.min(painPointsCount * 5, 20);

    // Recent engagement boost (0–20)
    if (crmLead.lastEngagement) {
      const daysSinceEngagement =
        (Date.now() - crmLead.lastEngagement.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceEngagement <= 7) score += 20;
      else if (daysSinceEngagement <= 30) score += 10;
      else if (daysSinceEngagement <= 90) score += 5;
    }

    score = Math.min(score, 100);

    await this.prisma.crmLead.update({
      where: { id: crmLeadId },
      data: { score },
    });

    return score;
  }
}
