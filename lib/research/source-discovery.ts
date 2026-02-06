import { scrapers, ScrapedSource } from "../scrapers";
import { GeminiClient } from "../gemini-client";

export interface ResearchContext {
  prompt: string;
  industry?: string;
  targetAudience?: string;
  geography?: string;
  timeframe?: string;
}

import { SerperClient } from "../search-client";

export class SourceDiscovery {
  private serperClient: SerperClient | null = null;

  constructor(
    private geminiClient: GeminiClient,
    serperApiKey?: string,
  ) {
    if (serperApiKey) {
      this.serperClient = new SerperClient(serperApiKey);
    }
  }

  async discover(context: ResearchContext) {
    console.log("🔍 Starting multi-source discovery...");

    // Step 1: Generate targeted search queries & find subreddits
    const [subreddits, searchQueries] = await Promise.all([
      this.findRelevantSubreddits(context.prompt),
      this.generateSearchQueries(context.prompt),
    ]);

    console.log(`🔍 Generated queries: ${searchQueries.join(", ")}`);

    // Step 2: Execute searches across all sources in parallel
    // We use the first generated query for HN and Web to avoid long-prompt errors
    // For Reddit, we still use the main prompt keywords but could refine this too
    const primaryQuery = searchQueries[0] || context.prompt.substring(0, 100);

    const [redditResults, hnResults, webResults] = await Promise.all([
      this.searchReddit(primaryQuery, subreddits),
      this.searchHackerNews(primaryQuery),
      this.searchWeb(primaryQuery),
    ]);

    // Step 3: Combine and rank all sources
    const allSources = [...redditResults, ...hnResults, ...webResults];

    const rankedSources = await this.rankSources(allSources, context.prompt);

    // Step 4: Diversify - take top N from each category
    return {
      realWorld: rankedSources
        .filter((s) => s.sourceType === "reddit")
        .slice(0, 8),
      technical: rankedSources.filter((s) => s.sourceType === "hn").slice(0, 5),
      web: rankedSources.filter((s) => s.sourceType === "web").slice(0, 5),
      all: rankedSources.slice(0, 20),
    };
  }

  private async generateSearchQueries(topic: string): Promise<string[]> {
    const prompt = `Given this research topic: "${topic.substring(0, 1000)}..."
  
  Generate 3 short, specific search queries (max 5-6 words each) to find high-quality information.
  Return ONLY a JSON array of strings, e.g., ["latest trends in X", "X market size south africa", "challenges in X"]`;

    try {
      const response = await this.geminiClient.generate(prompt);
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.error("Failed to generate search queries:", error);
    }
    return [topic.substring(0, 50)]; // Fallback
  }

  private async findRelevantSubreddits(topic: string): Promise<string[]> {
    const prompt = `Given this research topic: "${topic}"

Suggest 3-5 highly relevant, active subreddits where people discuss this topic.

Return ONLY a JSON array of subreddit names (without r/), e.g., ["technology", "startups"]

Focus on:
- Active communities
- Mix of general and niche subreddits
- Where pain points and real experiences are discussed

Subreddits:`;

    try {
      const response = await this.geminiClient.generate(prompt);

      // Extract JSON from response
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const subreddits = JSON.parse(jsonMatch[0]);
        console.log(`📍 Identified subreddits: ${subreddits.join(", ")}`);
        return subreddits;
      }
    } catch (error) {
      console.error("Failed to parse subreddits:", error);
    }

    // Fallback to general subreddits
    return ["technology", "business", "entrepreneur"];
  }

  private async searchReddit(query: string, subreddits: string[]) {
    try {
      const redditData = await scrapers.reddit.scrape(query, {
        subreddits,
        timeRange: "month",
        sortBy: "top",
        minScore: 20,
        maxResults: 30,
        scrapeComments: true,
        maxCommentsPerPost: 15,
      });

      return redditData.posts.map((post) => ({
        title: post.title,
        url: post.url,
        content: post.preview,
        sourceType: "reddit" as const,
        metadata: {
          author: post.author,
          date: new Date(),
          score: post.score,
          comments: post.numComments,
          subreddit: post.subreddit,
          engagement: {
            upvotes: post.score,
            commentCount: post.numComments,
          },
        },
        topComments: post.topComments?.map((c: any) => ({
          author: c.author,
          text: c.text,
          score: c.score,
          depth: c.depth,
          created: new Date(),
        })),
      }));
    } catch (e) {
      console.error("Reddit search failed", e);
      return [];
    }
  }

  private async searchHackerNews(query: string) {
    try {
      const hnData = await scrapers.hn.search(query, {
        tags: ["story"],
        numericFilters: ["points>20"],
        hitsPerPage: 20,
      });

      return hnData.stories.map((story) => ({
        title: story.title,
        url: story.url,
        content: "",
        sourceType: "hn" as const,
        metadata: {
          author: story.author,
          date: story.created,
          score: story.points,
          comments: story.numComments,
          engagement: {
            points: story.points,
            commentCount: story.numComments,
          },
        },
        topComments: story.topComments?.map((c: any) => ({
          author: c.author,
          text: c.text,
          score: 0,
          depth: 0,
          created: c.created,
        })),
      }));
    } catch (e) {
      console.error("HN search failed", e);
      return [];
    }
  }

  private async searchWeb(query: string): Promise<ScrapedSource[]> {
    if (!this.serperClient) {
      console.warn("⚠️ No Serper API key provided. Skipping web search.");
      return [];
    }

    try {
      console.log(`🌐 Searching web for: ${query}`);
      const results = await this.serperClient.search(query, 10);

      return results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.snippet, // Snippet as content initially
        sourceType: "web" as const,
        score: 0,
        metadata: {
          searchUrl: "google",
          processingTime: 0,
        },
      }));
    } catch (e) {
      console.error("Web search failed:", e);
      return [];
    }
  }

  private async rankSources(sources: ScrapedSource[], query: string) {
    console.log(`📊 Ranking ${sources.length} sources...`);

    const scored = await Promise.all(
      sources.map(async (source) => {
        const score = await this.scoreSource(source, query);
        return { ...source, score };
      }),
    );

    return scored.sort((a, b) => (b.score || 0) - (a.score || 0));
  }

  private async scoreSource(
    source: ScrapedSource,
    query: string,
  ): Promise<number> {
    let score = 0;

    // Recency (max 25 points)
    if (source.metadata.date) {
      const daysOld =
        (Date.now() - new Date(source.metadata.date).getTime()) /
        (1000 * 60 * 60 * 24);
      if (daysOld < 7) score += 25;
      else if (daysOld < 30) score += 20;
      else if (daysOld < 90) score += 15;
      else if (daysOld < 180) score += 10;
      else score += 5;
    }

    // Engagement (max 25 points)
    if (source.metadata.score) {
      if (source.sourceType === "reddit") {
        if (source.metadata.score > 500) score += 25;
        else if (source.metadata.score > 200) score += 20;
        else if (source.metadata.score > 100) score += 15;
        else if (source.metadata.score > 50) score += 10;
        else score += 5;
      } else if (source.sourceType === "hn") {
        if (source.metadata.score > 200) score += 25;
        else if (source.metadata.score > 100) score += 20;
        else if (source.metadata.score > 50) score += 15;
        else score += 10;
      }
    }

    // Comments indicate discussion quality (max 15 points)
    if (source.metadata.comments) {
      if (source.metadata.comments > 100) score += 15;
      else if (source.metadata.comments > 50) score += 12;
      else if (source.metadata.comments > 20) score += 9;
      else if (source.metadata.comments > 5) score += 6;
      else score += 3;
    }

    // Has actual comments scraped (max 15 points)
    if (source.topComments && source.topComments.length > 0) {
      score += 15;
    }

    // Content length (max 10 points)
    if (source.content) {
      const wordCount = source.content.split(/\s+/).length;
      if (wordCount > 500) score += 10;
      else if (wordCount > 200) score += 7;
      else if (wordCount > 100) score += 5;
      else score += 2;
    }

    // Relevance via simple keyword matching (max 10 points)
    const titleRelevance = this.calculateRelevance(source.title, query);
    score += titleRelevance * 10;

    return score;
  }

  private calculateRelevance(text: string, query: string): number {
    const textLower = text.toLowerCase();
    const queryTerms = query.toLowerCase().split(/\s+/);

    let matches = 0;
    queryTerms.forEach((term) => {
      if (textLower.includes(term)) matches++;
    });

    return matches / queryTerms.length;
  }
}
