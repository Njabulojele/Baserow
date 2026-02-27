import puppeteer, { Browser, Page } from "puppeteer";

/** Hard timeout for page navigation — prevents hung pages from leaking resources */
const NAV_TIMEOUT_MS = 30_000;

/** Timeout for browser.close() before force-killing the Chrome process */
const BROWSER_CLOSE_TIMEOUT_MS = 5_000;

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
   * Scrapes a single page and returns cleaned content.
   * Page is always closed in the finally block even on errors.
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

      // Hard 30s navigation timeout
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: NAV_TIMEOUT_MS,
      });

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
      try {
        if (page) await page.close();
      } catch {
        // Page may already be closed if browser crashed
      }
    }
  }

  /**
   * Scrapes multiple URLs in parallel (with limit).
   * If the browser crashes mid-scrape, it is force-closed.
   */
  async scrapeMultiple(
    urls: string[],
    limit: number = 5,
  ): Promise<ScrapedSource[]> {
    const results: ScrapedSource[] = [];

    try {
      for (let i = 0; i < urls.length; i += limit) {
        const chunk = urls.slice(i, i + limit);
        const chunkResults = await Promise.all(
          chunk.map((url) => this.scrapePage(url)),
        );

        chunkResults.forEach((res) => {
          if (res) results.push(res);
        });
      }
    } catch (error) {
      console.error(
        "[WebScraper] Unrecoverable error during scrapeMultiple:",
        error,
      );
      await this.safeClose();
      throw error;
    }

    return results;
  }

  /**
   * Gracefully closes the browser instance.
   */
  async close() {
    if (this.browser) {
      try {
        await this.browser.close();
      } catch (error) {
        console.error("[WebScraper] Error during browser.close():", error);
        await this.forceKillBrowser();
      }
      this.browser = null;
    }
  }

  /**
   * Safe close with timeout: if browser.close() hangs beyond BROWSER_CLOSE_TIMEOUT_MS,
   * force-kill the Chrome child process to prevent zombie accumulation.
   */
  async safeClose() {
    if (!this.browser) return;

    const closePromise = this.browser
      .close()
      .catch((err) =>
        console.error("[WebScraper] Error during safeClose:", err),
      );
    const timeoutPromise = new Promise<void>((resolve) =>
      setTimeout(resolve, BROWSER_CLOSE_TIMEOUT_MS),
    );

    await Promise.race([closePromise, timeoutPromise]);

    // If browser.close() didn't finish in time, force kill
    await this.forceKillBrowser();
    this.browser = null;
  }

  /**
   * Force-kill the Chrome child process if browser.close() is stuck.
   */
  private async forceKillBrowser() {
    if (!this.browser) return;
    try {
      const proc = this.browser.process();
      if (proc && proc.pid) {
        console.warn(
          `[WebScraper] Force-killing Chrome process PID=${proc.pid}`,
        );
        proc.kill("SIGKILL");
      }
    } catch (err) {
      console.error("[WebScraper] Failed to force-kill Chrome:", err);
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
