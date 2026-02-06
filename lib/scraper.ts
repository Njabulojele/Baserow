import puppeteer, { Browser, Page } from "puppeteer";

export interface ScrapedSource {
  url: string;
  title: string;
  content: string;
  excerpt: string;
  scrapedAt: Date;
}

export class WebScraper {
  private browser: Browser | null = null;

  /**
   * Initializes the Puppeteer browser
   */
  async initialize() {
    try {
      this.browser = await puppeteer.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--disable-gpu",
        ],
      });
    } catch (error) {
      console.error("Failed to initialize Puppeteer:", error);
      throw error;
    }
  }

  /**
   * Scrapes a single page and returns cleaned content
   */
  async scrapePage(url: string): Promise<ScrapedSource | null> {
    if (!this.browser) await this.initialize();

    let page: Page | null = null;
    try {
      page = await this.browser!.newPage();

      // Set a realistic user agent
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      );

      // Set timeout
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 30000 });

      // Clean up the page and extract content
      const data = await page.evaluate(() => {
        // Remove noise
        const selectorsToRemove = [
          "script",
          "style",
          "nav",
          "footer",
          "iframe",
          "header",
          "aside",
          ".ads",
          ".sidebar",
          "#comments",
          ".cookie-banner",
        ];
        selectorsToRemove.forEach((s) => {
          document.querySelectorAll(s).forEach((el) => el.remove());
        });

        const title =
          document.title ||
          document.querySelector("h1")?.textContent ||
          "Untitled Source";

        // Extract main text content
        const mainContent =
          document.querySelector("main") ||
          document.querySelector("article") ||
          document.querySelector("#content") ||
          document.body;

        // Get text and clean up whitespace
        const content =
          mainContent?.innerText || mainContent?.textContent || "";
        const cleanContent = content.replace(/\s+/g, " ").trim();

        return {
          title: title.trim(),
          content: cleanContent,
          excerpt: cleanContent.substring(0, 500) + "...",
        };
      });

      return {
        ...data,
        url,
        scrapedAt: new Date(),
      };
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
      return null;
    } finally {
      if (page) await page.close();
    }
  }

  /**
   * Scrapes multiple URLs in parallel (with limit)
   */
  async scrapeMultiple(
    urls: string[],
    limit: number = 5,
  ): Promise<ScrapedSource[]> {
    const results: ScrapedSource[] = [];

    // Process in chunks to avoid overwhelming the system
    for (let i = 0; i < urls.length; i += limit) {
      const chunk = urls.slice(i, i + limit);
      const chunkResults = await Promise.all(
        chunk.map((url) => this.scrapePage(url)),
      );

      chunkResults.forEach((res) => {
        if (res) results.push(res);
      });
    }

    return results;
  }

  /**
   * Closes the browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  /**
   * Searches using SerperClient and then scrapes the result URLs
   */
  async searchAndScrape(
    query: string,
    serperClient: import("./search-client").SerperClient,
    maxResults: number = 10,
  ): Promise<ScrapedSource[]> {
    console.log(`[WebScraper] Searching for: "${query}"`);

    // Get search results from Serper
    const searchResults = await serperClient.search(query, maxResults);
    console.log(`[WebScraper] Found ${searchResults.length} search results`);

    if (searchResults.length === 0) {
      return [];
    }

    // Extract URLs and scrape content
    const urls = searchResults.map((r) => r.url);
    const scraped = await this.scrapeMultiple(urls, 5);

    console.log(`[WebScraper] Successfully scraped ${scraped.length} pages`);
    return scraped;
  }
}
