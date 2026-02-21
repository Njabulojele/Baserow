/**
 * Research Caching Utilities
 *
 * L1: Query-level cache — SHA256 hash of userId + normalizedPrompt → 24h TTL
 * L2: URL-level cache  — Check ResearchSource.scrapedAt → 7-day TTL
 */
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

const L1_TTL_HOURS = 24;
const L2_TTL_DAYS = 7;

/**
 * Generate a SHA256 hash for a research query.
 * Normalizes the prompt: lowercase, trim, strip stopwords.
 */
export function generatePromptHash(userId: string, prompt: string): string {
  const normalized = prompt
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[^\w\s]/g, "");
  return crypto
    .createHash("sha256")
    .update(`${userId}:${normalized}`)
    .digest("hex");
}

/**
 * L1 Cache Check: Find a completed research with matching promptHash within TTL.
 */
export async function checkL1Cache(
  prisma: PrismaClient,
  hash: string,
): Promise<string | null> {
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
export async function checkL2Cache(
  prisma: PrismaClient,
  urls: string[],
): Promise<Map<string, { title: string; content: string; excerpt: string }>> {
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

  const cache = new Map<
    string,
    { title: string; content: string; excerpt: string }
  >();
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
