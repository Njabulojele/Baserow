import { PrismaClient, CrmLeadSource, CrmLeadStatus } from "@prisma/client";
import { WorkflowService } from "./workflowService";
import { WorkflowTriggerType } from "@prisma/client";

/**
 * Automatically promotes scored Leads into the CRM pipeline based on tier.
 *
 * HOT  (80-100): Auto-create CrmLead → Discovery stage → Fire LEAD_CREATED workflow
 * WARM (60-79):  Create CrmLead in NEW status → Notify user for review
 * COLD (40-59):  No promotion — stays in Lead table for 30-day re-score
 * DISCARD (0-39): No promotion — archived
 */
export class LeadPromotionService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  /**
   * Promote a single scored Lead to CrmLead if it meets the threshold.
   * Returns the CrmLead ID if promoted, null otherwise.
   */
  async promote(
    leadId: string,
    userId: string,
  ): Promise<{ promoted: boolean; crmLeadId?: string; tier: string }> {
    const lead = await this.prisma.lead.findUnique({
      where: { id: leadId },
    });

    if (!lead) return { promoted: false, tier: "UNSCORED" };

    // Already promoted — skip
    if (lead.promotedToCrmId) {
      return {
        promoted: false,
        tier: lead.tier,
        crmLeadId: lead.promotedToCrmId,
      };
    }

    // Only promote HOT and WARM leads
    if (lead.tier !== "HOT" && lead.tier !== "WARM") {
      return { promoted: false, tier: lead.tier };
    }

    // Find or create default pipeline + discovery stage
    const pipeline = await this.getOrCreateDefaultPipeline(userId);
    const discoveryStage = pipeline.stages.find((s) => s.order === 1);

    if (!discoveryStage) {
      console.error(
        "[LeadPromotion] No discovery stage found on default pipeline",
      );
      return { promoted: false, tier: lead.tier };
    }

    // Parse name into first/last
    const nameParts = (lead.name || "Unknown Contact").split(" ");
    const firstName = nameParts[0] || "Unknown";
    const lastName = nameParts.slice(1).join(" ") || "Contact";

    // Determine initial status based on tier
    const status =
      lead.tier === "HOT" ? CrmLeadStatus.QUALIFIED : CrmLeadStatus.NEW;

    // Create CrmLead
    const crmLead = await this.prisma.crmLead.create({
      data: {
        userId,
        source: CrmLeadSource.OUTBOUND,
        status,
        score: lead.score,
        firstName,
        lastName,
        email: lead.email || "",
        phone: lead.phone,
        companyName: lead.company || "Unknown Company",
        companyWebsite: lead.website,
        industry: lead.industry,
        painPoints: lead.painPoints,
        pipelineId: pipeline.id,
        pipelineStageId: discoveryStage.id,
        estimatedValue: 0,
      },
    });

    // Link lead to CrmLead
    await this.prisma.lead.update({
      where: { id: leadId },
      data: { promotedToCrmId: crmLead.id },
    });

    // Fire workflow triggers for HOT leads
    if (lead.tier === "HOT") {
      try {
        const workflowService = new WorkflowService(this.prisma);
        await workflowService.processEvent(WorkflowTriggerType.LEAD_CREATED, {
          leadId: crmLead.id,
          userId,
        });
      } catch (error) {
        console.error("[LeadPromotion] Workflow trigger failed:", error);
      }
    }

    return { promoted: true, crmLeadId: crmLead.id, tier: lead.tier };
  }

  /**
   * Batch promote all scored leads for a LeadData set.
   */
  async promoteBatch(
    leadDataId: string,
    userId: string,
  ): Promise<{
    promoted: number;
    skipped: number;
    details: { hot: number; warm: number };
  }> {
    const leads = await this.prisma.lead.findMany({
      where: {
        leadDataId,
        promotedToCrmId: null,
        tier: { in: ["HOT", "WARM"] },
      },
      select: { id: true },
    });

    let promoted = 0;
    let skipped = 0;
    const details = { hot: 0, warm: 0 };

    for (const lead of leads) {
      const result = await this.promote(lead.id, userId);
      if (result.promoted) {
        promoted++;
        if (result.tier === "HOT") details.hot++;
        else details.warm++;
      } else {
        skipped++;
      }
    }

    return { promoted, skipped, details };
  }

  private async getOrCreateDefaultPipeline(userId: string) {
    let pipeline = await this.prisma.pipeline.findFirst({
      where: { userId, isDefault: true },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    if (!pipeline) {
      pipeline = await this.prisma.pipeline.create({
        data: {
          userId,
          name: "Sales Pipeline",
          type: "SALES",
          isDefault: true,
          stages: {
            create: [
              { name: "Discovery", order: 1, probability: 0.1 },
              { name: "Qualification", order: 2, probability: 0.25 },
              { name: "Proposal", order: 3, probability: 0.5 },
              { name: "Negotiation", order: 4, probability: 0.75 },
              {
                name: "Closed Won",
                order: 5,
                probability: 1.0,
                isClosed: true,
                isWon: true,
              },
              {
                name: "Closed Lost",
                order: 6,
                probability: 0,
                isClosed: true,
                isWon: false,
              },
            ],
          },
        },
        include: { stages: { orderBy: { order: "asc" } } },
      });
    }

    return pipeline;
  }
}
