import { PrismaClient } from "@prisma/client";

const WEIGHTS = {
  engagement: 0.35,
  relationship: 0.35,
  payment: 0.3,
};

export class ClientHealthService {
  constructor(private prisma: PrismaClient) {}

  async calculateHealth(clientId: string) {
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      include: {
        communications: { orderBy: { createdAt: "desc" }, take: 20 },
        projects: { where: { status: { not: "completed" } } },
        healthScore: true,
      },
    });

    if (!client) {
      throw new Error("Client not found");
    }

    // Calculate engagement score (0-100)
    const lastContact =
      client.lastContactedAt || client.lastInteractionAt || client.createdAt;
    const daysSinceContact = Math.floor(
      (Date.now() - lastContact.getTime()) / (1000 * 60 * 60 * 24),
    );
    // Formula: 100 - (days * 3). So 33 days = 0.
    const contactRecencyScore = Math.max(0, 100 - daysSinceContact * 3);

    const communicationCount = client.communications.length;
    // Simple cap
    const communicationScore = Math.min(communicationCount * 5, 100);

    const engagementScore =
      contactRecencyScore * 0.6 + communicationScore * 0.4;

    // Calculate relationship score (0-100)
    const activeProjects = client.projects.length;
    const projectScore = Math.min(activeProjects * 20, 60);

    const relationshipHealth = client.relationshipHealth ?? 50;
    const relationshipScore = projectScore + relationshipHealth * 0.4;

    // Calculate payment score (0-100)
    const outstandingBalance = client.outstandingBalance;
    const paymentScore =
      outstandingBalance > 0
        ? Math.max(0, 100 - outstandingBalance / 100)
        : 100;

    // Calculate overall score
    const overallScore =
      engagementScore * WEIGHTS.engagement +
      relationshipScore * WEIGHTS.relationship +
      paymentScore * WEIGHTS.payment;

    // Determine trend
    const previousScore = client.healthScore?.overallScore ?? overallScore;
    const trend =
      overallScore > previousScore + 5
        ? "improving"
        : overallScore < previousScore - 5
          ? "declining"
          : "stable";

    // Calculate churn risk (inverse of health)
    const churnRisk = Math.max(0, Math.min(1, (100 - overallScore) / 100));

    // Calculate expansion potential
    const expansionPotential =
      engagementScore > 70 && relationshipScore > 60 && paymentScore > 80
        ? 0.8
        : engagementScore > 50 && relationshipScore > 50
          ? 0.4
          : 0.1;

    // Determine lifecycle stage
    const daysAsClient = Math.floor(
      (Date.now() - client.createdAt.getTime()) / (1000 * 60 * 60 * 24),
    );
    let lifecycleStage = "onboarding";
    if (daysAsClient > 180 && overallScore > 70) lifecycleStage = "maturity";
    else if (daysAsClient > 90 && overallScore > 60) lifecycleStage = "growth";
    else if (daysAsClient > 30) lifecycleStage = "adoption";
    if (overallScore < 40) lifecycleStage = "at-risk";

    // Generate alerts
    const activeAlerts: string[] = [];
    if (daysSinceContact > 30) activeAlerts.push("no_recent_contact");
    if (outstandingBalance > 1000)
      activeAlerts.push("high_outstanding_balance");
    if (churnRisk > 0.6) activeAlerts.push("high_churn_risk");
    if (engagementScore < 30) activeAlerts.push("low_engagement");

    // Recommended actions
    const recommendedActions: any[] = [];
    if (daysSinceContact > 14) {
      recommendedActions.push({ action: "schedule_call", priority: "high" });
    }
    if (churnRisk > 0.5) {
      recommendedActions.push({
        action: "review_account",
        priority: "urgent",
      });
    }

    // Upsert health score
    const healthScore = await this.prisma.clientHealthScore.upsert({
      where: { clientId: clientId },
      update: {
        previousScore: client.healthScore?.overallScore,
        overallScore,
        trend,
        engagementScore,
        relationshipScore,
        paymentScore,
        lastContactDate: lastContact,
        daysSinceLastContact: daysSinceContact,
        churnRisk,
        expansionPotential,
        lifecycleStage,
        activeAlerts,
        recommendedActions,
        lastCalculatedAt: new Date(),
      },
      create: {
        clientId: clientId,
        overallScore,
        trend,
        engagementScore,
        relationshipScore,
        paymentScore,
        lastContactDate: lastContact,
        daysSinceLastContact: daysSinceContact,
        churnRisk,
        expansionPotential,
        lifecycleStage,
        activeAlerts,
        recommendedActions,
      },
    });

    return healthScore;
  }
}
