/**
 * Source credibility dimensions and their weights.
 */
interface CredibilityFactors {
  domainAuthority: number; // 0-1
  recency: number; // 0-1
  sourceType: number; // 0-1
  crossSourceAgreement: number; // 0-1
}

/**
 * Scored source with credibility metadata.
 */
export interface ScoredSource {
  url: string;
  title: string;
  content: string;
  credibilityScore: number; // 0-1 weighted composite
  factors: CredibilityFactors;
  domain: string;
  sourceCategory: string;
}

// ── Domain authority tiers ──

const TIER_1_DOMAINS = new Set([
  // Government
  ".gov",
  ".gov.uk",
  ".gov.za",
  ".gov.au",
  // Education
  ".edu",
  ".ac.uk",
  ".ac.za",
  // International bodies
  "who.int",
  "worldbank.org",
  "imf.org",
  "un.org",
]);

const TIER_2_DOMAINS = new Set([
  // Major publications & wire services
  "reuters.com",
  "apnews.com",
  "bbc.com",
  "bbc.co.uk",
  "nytimes.com",
  "wsj.com",
  "economist.com",
  "nature.com",
  "sciencedirect.com",
  "pubmed.ncbi.nlm.nih.gov",
  "arxiv.org",
  "ieee.org",
  "acm.org",
  // Major tech publications
  "techcrunch.com",
  "theverge.com",
  "arstechnica.com",
  "wired.com",
]);

const TIER_3_DOMAINS = new Set([
  // Industry / aggregators
  "medium.com",
  "substack.com",
  "hackernews.com",
  "producthunt.com",
  "g2.com",
  "capterra.com",
  "trustradius.com",
  "crunchbase.com",
  "linkedin.com",
]);

const LOW_CREDIBILITY_DOMAINS = new Set([
  // Social media & forums
  "reddit.com",
  "quora.com",
  "twitter.com",
  "x.com",
  "facebook.com",
  "tiktok.com",
  "instagram.com",
  "pinterest.com",
  "tumblr.com",
]);

// ── Scoring weights ──
const WEIGHTS = {
  domainAuthority: 0.35,
  recency: 0.2,
  sourceType: 0.2,
  crossSourceAgreement: 0.25,
};

/**
 * CredibilityScorer — evaluates source reliability using heuristics.
 *
 * Scoring dimensions:
 * 1. Domain authority: .gov/.edu > known publications > generic > forums
 * 2. Recency: newer content scores higher for time-sensitive topics
 * 3. Source type: official sites > industry pubs > aggregators > social
 * 4. Cross-source agreement: facts confirmed by 2+ independent sources get a boost
 */
export class CredibilityScorer {
  /**
   * Score a single source for domain authority.
   */
  private scoreDomainAuthority(url: string): {
    score: number;
    category: string;
  } {
    try {
      const hostname = new URL(url).hostname.toLowerCase();

      // Check tier 1 (government/education)
      for (const domain of TIER_1_DOMAINS) {
        if (hostname.endsWith(domain) || hostname.includes(domain)) {
          return { score: 1.0, category: "government_education" };
        }
      }

      // Check tier 2 (major publications)
      for (const domain of TIER_2_DOMAINS) {
        if (hostname.includes(domain)) {
          return { score: 0.85, category: "major_publication" };
        }
      }

      // Check tier 3 (industry/aggregator)
      for (const domain of TIER_3_DOMAINS) {
        if (hostname.includes(domain)) {
          return { score: 0.5, category: "industry_aggregator" };
        }
      }

      // Check low credibility
      for (const domain of LOW_CREDIBILITY_DOMAINS) {
        if (hostname.includes(domain)) {
          return { score: 0.2, category: "social_media" };
        }
      }

      // Check if it's a company's official website (heuristic: short domain, no subdirectory)
      if (hostname.split(".").length <= 3) {
        return { score: 0.65, category: "company_official" };
      }

      return { score: 0.4, category: "generic" };
    } catch {
      return { score: 0.3, category: "unknown" };
    }
  }

  /**
   * Score recency. Content closer to the current date scores higher.
   * Uses heuristic: looks for date patterns in the content.
   */
  private scoreRecency(content: string): number {
    const now = new Date();
    const currentYear = now.getFullYear();

    // Look for year patterns in content
    const yearPattern = /\b(20[0-9]{2})\b/g;
    const years: number[] = [];
    let match;

    while ((match = yearPattern.exec(content)) !== null) {
      years.push(parseInt(match[1], 10));
    }

    if (years.length === 0) return 0.5; // Unknown recency

    const maxYear = Math.max(...years);
    const yearsOld = currentYear - maxYear;

    if (yearsOld <= 0) return 1.0; // Current year
    if (yearsOld === 1) return 0.85;
    if (yearsOld === 2) return 0.7;
    if (yearsOld <= 5) return 0.5;
    return 0.3; // Older than 5 years
  }

  /**
   * Score source type based on URL patterns.
   */
  private scoreSourceType(url: string): number {
    const lower = url.toLowerCase();

    if (lower.includes("/research") || lower.includes("/paper")) return 0.95;
    if (lower.includes("/report") || lower.includes("/whitepaper")) return 0.9;
    if (lower.includes("/blog") || lower.includes("/article")) return 0.6;
    if (lower.includes("/wiki")) return 0.5;
    if (lower.includes("/forum") || lower.includes("/discussion")) return 0.3;

    return 0.55; // Default
  }

  /**
   * Score cross-source agreement: facts appearing in multiple sources get boosted.
   */
  private scoreCrossSourceAgreement(
    content: string,
    allContents: string[],
  ): number {
    // Extract key phrases (simple heuristic: sentences with numbers)
    const keyPhrases = content
      .split(/[.!?]/)
      .filter((s) => /\d/.test(s))
      .map((s) => s.trim().toLowerCase())
      .filter((s) => s.length > 20)
      .slice(0, 10);

    if (keyPhrases.length === 0) return 0.5;

    let confirmedCount = 0;
    for (const phrase of keyPhrases) {
      // Check how many other sources contain similar key terms
      const keyTerms = phrase
        .split(/\s+/)
        .filter((w) => w.length > 4)
        .slice(0, 3);

      if (keyTerms.length === 0) continue;

      const matchingOtherSources = allContents.filter((otherContent) => {
        const lowerOther = otherContent.toLowerCase();
        return keyTerms.every((term) => lowerOther.includes(term));
      });

      if (matchingOtherSources.length > 1) confirmedCount++;
    }

    const ratio =
      keyPhrases.length > 0 ? confirmedCount / keyPhrases.length : 0;
    return Math.min(0.3 + ratio * 0.7, 1.0);
  }

  /**
   * Score all sources and return them ranked by credibility.
   */
  scoreSources(
    sources: { url: string; title: string; content: string }[],
  ): ScoredSource[] {
    const allContents = sources.map((s) => s.content);

    return sources
      .map((source) => {
        const { score: domainScore, category } = this.scoreDomainAuthority(
          source.url,
        );
        const recency = this.scoreRecency(source.content);
        const sourceType = this.scoreSourceType(source.url);
        const crossSource = this.scoreCrossSourceAgreement(
          source.content,
          allContents,
        );

        const factors: CredibilityFactors = {
          domainAuthority: domainScore,
          recency,
          sourceType,
          crossSourceAgreement: crossSource,
        };

        const compositeScore =
          factors.domainAuthority * WEIGHTS.domainAuthority +
          factors.recency * WEIGHTS.recency +
          factors.sourceType * WEIGHTS.sourceType +
          factors.crossSourceAgreement * WEIGHTS.crossSourceAgreement;

        let domain = "unknown";
        try {
          domain = new URL(source.url).hostname;
        } catch {}

        return {
          url: source.url,
          title: source.title,
          content: source.content,
          credibilityScore: Math.round(compositeScore * 100) / 100,
          factors,
          domain,
          sourceCategory: category,
        };
      })
      .sort((a, b) => b.credibilityScore - a.credibilityScore);
  }
}
