"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadPromotionService = void 0;
/**
 * Lead Promotion Service for Research Engine
 * Auto-promotes scored Leads to CrmLead based on tier thresholds.
 */
const client_1 = require("@prisma/client");
class LeadPromotionService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async promote(leadId, userId) {
        const lead = await this.prisma.lead.findUnique({
            where: { id: leadId },
        });
        if (!lead)
            return { promoted: false, tier: "UNSCORED" };
        if (lead.promotedToCrmId)
            return {
                promoted: false,
                tier: lead.tier,
                crmLeadId: lead.promotedToCrmId,
            };
        if (lead.tier !== "HOT" && lead.tier !== "WARM")
            return { promoted: false, tier: lead.tier };
        const pipeline = await this.getOrCreateDefaultPipeline(userId);
        const discoveryStage = pipeline.stages.find((s) => s.order === 1);
        if (!discoveryStage)
            return { promoted: false, tier: lead.tier };
        const nameParts = (lead.name || "Unknown Contact").split(" ");
        const firstName = nameParts[0] || "Unknown";
        const lastName = nameParts.slice(1).join(" ") || "Contact";
        const status = lead.tier === "HOT" ? client_1.CrmLeadStatus.QUALIFIED : client_1.CrmLeadStatus.NEW;
        const crmLead = await this.prisma.crmLead.create({
            data: {
                userId,
                source: client_1.CrmLeadSource.OUTBOUND,
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
        await this.prisma.lead.update({
            where: { id: leadId },
            data: { promotedToCrmId: crmLead.id },
        });
        return { promoted: true, crmLeadId: crmLead.id, tier: lead.tier };
    }
    async promoteBatch(leadDataId, userId) {
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
                if (result.tier === "HOT")
                    details.hot++;
                else
                    details.warm++;
            }
            else {
                skipped++;
            }
        }
        return { promoted, skipped, details };
    }
    async getOrCreateDefaultPipeline(userId) {
        let pipeline = await this.prisma.pipeline.findFirst({
            where: { userId, isDefault: true },
            include: { stages: { orderBy: { order: "asc" } } },
        });
        if (!pipeline) {
            pipeline = await this.prisma.pipeline.create({
                data: {
                    userId,
                    name: "Sales Pipeline",
                    type: client_1.PipelineType.SALES,
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
exports.LeadPromotionService = LeadPromotionService;
