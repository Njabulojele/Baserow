/**
 * Jina Reader Client
 * Converts web pages to clean Markdown for LLM consumption
 * Uses the free r.jina.ai API
 */

export interface JinaExtractionResult {
  url: string;
  title: string;
  content: string; // Clean Markdown
  excerpt: string;
  success: boolean;
  error?: string;
}

export class JinaClient {
  private baseUrl = "https://r.jina.ai";
  private rateLimitDelayMs: number;

  constructor(rateLimitDelayMs: number = 1000) {
    this.rateLimitDelayMs = rateLimitDelayMs;
  }

  /**
   * Extracts content from a URL as clean Markdown
   */
  async extractContent(url: string): Promise<JinaExtractionResult> {
    try {
      const jinaUrl = `${this.baseUrl}/${url}`;

      const response = await fetch(jinaUrl, {
        method: "GET",
        headers: {
          Accept: "text/plain",
          "User-Agent": "Mozilla/5.0 (compatible; ResearchAgent/1.0)",
        },
      });

      if (!response.ok) {
        return {
          url,
          title: "",
          content: "",
          excerpt: "",
          success: false,
          error: `Jina extraction failed: ${response.status} ${response.statusText}`,
        };
      }

      const markdown = await response.text();

      // Extract title from first H1 or first line
      const titleMatch = markdown.match(/^#\s+(.+)$/m);
      const title = titleMatch
        ? titleMatch[1].trim()
        : markdown.split("\n")[0]?.substring(0, 100) || "Untitled";

      // Create excerpt from first 500 chars of content
      const cleanContent = markdown.replace(/^#.+$/gm, "").trim();
      const excerpt =
        cleanContent.substring(0, 500) +
        (cleanContent.length > 500 ? "..." : "");

      return {
        url,
        title,
        content: markdown,
        excerpt,
        success: true,
      };
    } catch (error) {
      return {
        url,
        title: "",
        content: "",
        excerpt: "",
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Extracts content from multiple URLs with rate limiting
   */
  async extractMultiple(urls: string[]): Promise<JinaExtractionResult[]> {
    const results: JinaExtractionResult[] = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      console.log(`[JinaClient] Extracting (${i + 1}/${urls.length}): ${url}`);

      const result = await this.extractContent(url);
      results.push(result);

      // Rate limiting - wait between requests
      if (i < urls.length - 1) {
        await this.sleep(this.rateLimitDelayMs);
      }
    }

    return results;
  }

  /**
   * Filter out low-quality or irrelevant URLs
   */
  filterUrls(urls: string[]): string[] {
    const blockedDomains = [
      "facebook.com",
      "twitter.com",
      "x.com",
      "instagram.com",
      "linkedin.com",
      "youtube.com",
      "tiktok.com",
      "pinterest.com",
      "reddit.com",
    ];

    return urls.filter((url) => {
      try {
        const urlObj = new URL(url);
        const domain = urlObj.hostname.toLowerCase();
        return !blockedDomains.some((blocked) => domain.includes(blocked));
      } catch {
        return false;
      }
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
