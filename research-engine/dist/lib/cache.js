"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generatePromptHash = generatePromptHash;
exports.checkL1Cache = checkL1Cache;
exports.checkL2Cache = checkL2Cache;
/**
 * Research Caching Utilities
 *
 * L1: Query-level cache — SHA256 hash of userId + normalizedPrompt → 24h TTL
 * L2: URL-level cache  — Check ResearchSource.scrapedAt → 7-day TTL
 */
const crypto_1 = __importDefault(require("crypto"));
const L1_TTL_HOURS = 24;
const L2_TTL_DAYS = 7;
/**
 * Generate a SHA256 hash for a research query.
 * Normalizes the prompt: lowercase, trim, strip stopwords.
 */
function generatePromptHash(userId, prompt) {
    const normalized = prompt
        .toLowerCase()
        .trim()
        .replace(/\s+/g, " ")
        .replace(/[^\w\s]/g, "");
    return crypto_1.default
        .createHash("sha256")
        .update(`${userId}:${normalized}`)
        .digest("hex");
}
/**
 * L1 Cache Check: Find a completed research with matching promptHash within TTL.
 */
async function checkL1Cache(prisma, hash) {
    const cutoff = new Date(Date.now() - L1_TTL_HOURS * 60 * 60 * 1000);
    const cached = await prisma.research.findFirst({
        where: {
            promptHash: hash,
            status: "COMPLETED",
            completedAt: { gte: cutoff },
        },
        select: { id: true },
        orderBy: { completedAt: "desc" },
    });
    return cached?.id ?? null;
}
/**
 * L2 Cache Check: Find URLs that have already been scraped within the TTL.
 * Returns a map of url → cached content.
 */
async function checkL2Cache(prisma, urls) {
    const cutoff = new Date(Date.now() - L2_TTL_DAYS * 24 * 60 * 60 * 1000);
    const cachedSources = await prisma.researchSource.findMany({
        where: {
            url: { in: urls },
            scrapedAt: { gte: cutoff },
            content: { not: "" },
        },
        select: {
            url: true,
            title: true,
            content: true,
            excerpt: true,
        },
        orderBy: { scrapedAt: "desc" },
        distinct: ["url"],
    });
    const cache = new Map();
    for (const source of cachedSources) {
        if (!cache.has(source.url)) {
            cache.set(source.url, {
                title: source.title,
                content: source.content,
                excerpt: source.excerpt,
            });
        }
    }
    return cache;
}
