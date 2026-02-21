"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LeadScoringService = void 0;
class LeadScoringService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async scoreLead(leadId, userId) {
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
        if (!lead || !user)
            return { score: 0, tier: "UNSCORED" };
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
        score += this.scoreTechStack(lead.personalization);
        // 6. Buying Intent Signal (0–10)
        score += this.scoreBuyingIntent(lead.personalization);
        score = Math.min(Math.round(score), 100);
        const tier = this.getTier(score);
        await this.prisma.lead.update({
            where: { id: leadId },
            data: { score, tier },
        });
        return { score, tier };
    }
    async scoreLeadBatch(leadDataId, userId) {
        const leads = await this.prisma.lead.findMany({
            where: { leadDataId },
            select: { id: true },
        });
        const counts = { hot: 0, warm: 0, cold: 0, discard: 0 };
        for (const lead of leads) {
            const { tier } = await this.scoreLead(lead.id, userId);
            if (tier === "HOT")
                counts.hot++;
            else if (tier === "WARM")
                counts.warm++;
            else if (tier === "COLD")
                counts.cold++;
            else
                counts.discard++;
        }
        return counts;
    }
    scoreIndustryFit(leadIndustry, targetIndustries) {
        if (!leadIndustry || targetIndustries.length === 0)
            return 0;
        const normalised = leadIndustry.toLowerCase().trim();
        if (targetIndustries.some((t) => t.toLowerCase().trim() === normalised))
            return 25;
        if (targetIndustries.some((t) => normalised.includes(t.toLowerCase()) ||
            t.toLowerCase().includes(normalised)))
            return 15;
        return 0;
    }
    scoreCompanySizeFit(leadSize, targetRange) {
        if (!leadSize || !targetRange)
            return 5;
        const parseRange = (s) => {
            const match = s.match(/(\d+)\s*[-–to]+\s*(\d+)/);
            if (match)
                return { min: parseInt(match[1]), max: parseInt(match[2]) };
            const plus = s.match(/(\d+)\+/);
            if (plus)
                return { min: parseInt(plus[1]), max: Infinity };
            const single = s.match(/(\d+)/);
            if (single) {
                const n = parseInt(single[1]);
                return { min: n, max: n };
            }
            return null;
        };
        const target = parseRange(targetRange);
        const lead = parseRange(leadSize);
        if (!target || !lead)
            return 5;
        if (lead.min <= target.max && lead.max >= target.min)
            return 20;
        return 5;
    }
    scorePainPointMatch(leadPainPoints, targetPainPoints) {
        if (leadPainPoints.length === 0 || targetPainPoints.length === 0)
            return 0;
        const targetNormed = targetPainPoints.map((p) => p.toLowerCase());
        let matches = 0;
        for (const point of leadPainPoints) {
            const normed = point.toLowerCase();
            for (const target of targetNormed) {
                const targetWords = new Set(target.split(/\s+/));
                const pointWords = normed.split(/\s+/);
                const overlap = pointWords.filter((w) => [...targetWords].some((tw) => tw.includes(w) || w.includes(tw))).length;
                if (overlap >= 2 || (pointWords.length <= 2 && overlap >= 1)) {
                    matches++;
                    break;
                }
            }
        }
        return Math.round((matches / targetPainPoints.length) * 20);
    }
    scoreEmailQuality(email) {
        if (!email)
            return 0;
        const domain = email.split("@")[1]?.toLowerCase();
        if (!domain)
            return 0;
        const free = [
            "gmail.com",
            "yahoo.com",
            "hotmail.com",
            "outlook.com",
            "icloud.com",
            "aol.com",
            "protonmail.com",
        ];
        return free.includes(domain) ? 5 : 15;
    }
    scoreTechStack(personalization) {
        if (!personalization)
            return 0;
        const text = JSON.stringify(personalization).toLowerCase();
        const signals = [
            "hubspot",
            "salesforce",
            "mailchimp",
            "zoho",
            "pipedrive",
            "wordpress",
            "shopify",
            "webflow",
            "make.com",
            "zapier",
        ];
        const hits = signals.filter((t) => text.includes(t)).length;
        return hits >= 3 ? 10 : hits >= 1 ? 5 : 0;
    }
    scoreBuyingIntent(personalization) {
        if (!personalization)
            return 0;
        const text = JSON.stringify(personalization).toLowerCase();
        const signals = [
            "hiring",
            "looking for",
            "outsource",
            "digital transformation",
            "growth",
            "expansion",
            "funding",
            "automation",
            "scaling",
        ];
        const hits = signals.filter((s) => text.includes(s)).length;
        return hits >= 3 ? 10 : hits >= 1 ? 5 : 0;
    }
    getTier(score) {
        if (score >= 80)
            return "HOT";
        if (score >= 60)
            return "WARM";
        if (score >= 40)
            return "COLD";
        return "DISCARD";
    }
}
exports.LeadScoringService = LeadScoringService;
