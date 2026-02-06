import { PrismaClient, CrmLead, CrmActivity } from "@prisma/client";

export class LeadScoringService {
  private prisma: PrismaClient;

  // Scoring Rules Config
  private static RULES = {
    // Profile
    TITLE_TIER_1: 15, // C-Level, VP, Founder
    TITLE_TIER_2: 10, // Director, Head of
    TITLE_TIER_3: 5, // Manager
    INDUSTRY_MATCH: 10,
    EMAIL_CORPORATE: 5, // Not gmail/yahoo etc

    // Engagement
    ACTIVITY_CALL: 5,
    ACTIVITY_MEETING: 10,
    ACTIVITY_EMAIL: 2,
    ACTIVITY_NOTE: 1,

    // Limits
    MAX_SCORE: 100,
  };

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Recalculate score for a specific lead
   */
  async calculateScore(leadId: string): Promise<number> {
    const lead = await this.prisma.crmLead.findUnique({
      where: { id: leadId },
      include: {
        activities: true,
      },
    });

    if (!lead) return 0;

    let score = 0;

    // 1. Profile Score
    score += this.getProfileScore(lead);

    // 2. Engagement Score
    score += this.getEngagementScore(lead.activities || []);

    // 3. Cap at 100
    score = Math.min(score, LeadScoringService.RULES.MAX_SCORE);

    // Update Lead if score changed
    if (score !== lead.score) {
      await this.prisma.crmLead.update({
        where: { id: leadId },
        data: { score },
      });
    }

    return score;
  }

  private getProfileScore(lead: CrmLead): number {
    let score = 0;
    const rules = LeadScoringService.RULES;

    // Title Scoring
    const title = (lead.title || "").toLowerCase();
    if (
      title.match(
        /\b(ceo|cto|cfo|coo|president|founder|owner|vp|vice president)\b/,
      )
    ) {
      score += rules.TITLE_TIER_1;
    } else if (title.match(/\b(director|head of)\b/)) {
      score += rules.TITLE_TIER_2;
    } else if (title.match(/\b(manager|lead)\b/)) {
      score += rules.TITLE_TIER_3;
    }

    // Industry Scoring (Placeholder for now, can be expanded)
    // Assuming 'Tech', 'Finance', 'Healthcare' are high value
    const industry = (lead.industry || "").toLowerCase();
    if (
      industry.match(/\b(technology|software|it|finance|healthcare|saas)\b/)
    ) {
      score += rules.INDUSTRY_MATCH;
    }

    // Email Scoring
    const email = (lead.email || "").toLowerCase();
    const freeProviders = [
      "gmail.com",
      "yahoo.com",
      "hotmail.com",
      "outlook.com",
      "icloud.com",
    ];
    const domain = email.split("@")[1];
    if (domain && !freeProviders.includes(domain)) {
      score += rules.EMAIL_CORPORATE;
    }

    return score;
  }

  private getEngagementScore(activities: CrmActivity[]): number {
    let score = 0;
    const rules = LeadScoringService.RULES;

    for (const activity of activities) {
      switch (activity.type) {
        case "MEETING":
          score += rules.ACTIVITY_MEETING;
          break;
        case "CALL":
          score += rules.ACTIVITY_CALL;
          break;
        case "EMAIL":
          score += rules.ACTIVITY_EMAIL;
          break;
        case "NOTE":
          score += rules.ACTIVITY_NOTE;
          break;
        default:
          score += 1;
      }
    }

    return score;
  }
}
