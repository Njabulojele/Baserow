import puppeteer from "puppeteer";
import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import TurndownService from "turndown";

export class GenericScraper {
  private turndown: TurndownService;

  constructor() {
    this.turndown = new TurndownService({
      headingStyle: "atx", // Use # for headings
      codeBlockStyle: "fenced",
      bulletListMarker: "*",
    });

    // Configure turndown to handle common elements better
    this.turndown.addRule("removeScripts", {
      filter: ["script", "style", "noscript", "iframe"],
      replacement: () => "",
    });
  }

  async scrape(url: string): Promise<{
    title: string;
    content: string;
    author?: string;
    publishDate?: Date;
  }> {
    const browser = await puppeteer.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-accelerated-2d-canvas",
        "--disable-gpu",
      ],
    });
    const page = await browser.newPage();

    try {
      await page.setUserAgent(
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      );
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

      const html = await page.content();
      let title = await page.title();

      // Check for common block/captcha indicators
      const isBlocked =
        title.includes("403 Forbidden") ||
        title.includes("Access denied") ||
        title.includes("Cloudflare") ||
        title.includes("Just a moment") ||
        (await page.$('body[class*="denied"]')) !== null ||
        html.includes("Access to this page is forbidden");

      if (isBlocked) {
        throw new Error("Scraper blocked by efficient anti-bot or 403 error");
      }

      // Try to extract publish date from meta tags
      const publishedTime = await page.evaluate(() => {
        const meta =
          document.querySelector('meta[property="article:published_time"]') ||
          document.querySelector('meta[name="date"]') ||
          document.querySelector('meta[name="publish-date"]') ||
          document.querySelector("time[datetime]");
        if (meta) {
          return meta.getAttribute("content") || meta.getAttribute("datetime");
        }
        return null;
      });

      // Use Readability to extract main article content
      const dom = new JSDOM(html, { url });
      const reader = new Readability(dom.window.document);
      const article = reader.parse();

      let markdownContent = "";
      let author = undefined;

      // Fallback strategy: If Readability fails or returns very short content (< 200 chars),
      // manually convert the body content using Turndown. This is common for landing pages.
      if (!article || (article.content && article.content.length < 200)) {
        console.log(
          "⚠️ Readability returned short/empty content. Using raw body fallback.",
        );

        // Clean up DOM before manual extraction
        await page.evaluate(() => {
          document
            .querySelectorAll("script, style, noscript, nav, footer, header")
            .forEach((el) => el.remove());
        });

        const bodyContent = await page.evaluate(() => document.body.innerHTML);
        markdownContent = this.turndown.turndown(bodyContent || "");
      } else if (article) {
        markdownContent = this.turndown.turndown(article.content || "");
        title = article.title || title;
        author = article.byline || undefined;
      }

      // Build structured markdown output
      const structuredContent = this.buildStructuredMarkdown({
        title: title || "Untitled",
        url: url,
        publishedTime: publishedTime || undefined,
        markdownContent: markdownContent,
      });

      return {
        title: title || "Untitled",
        content: structuredContent,
        author: author,
        publishDate: publishedTime ? new Date(publishedTime) : undefined,
      };
    } catch (error) {
      await browser.close();
      throw error;
    }
  }

  private buildStructuredMarkdown(params: {
    title: string;
    url: string;
    publishedTime?: string;
    markdownContent: string;
  }): string {
    const lines: string[] = [];

    lines.push(`Title: ${params.title}`);
    lines.push("");
    lines.push(`URL Source: ${params.url}`);
    lines.push("");

    if (params.publishedTime) {
      lines.push(`Published Time: ${params.publishedTime}`);
      lines.push("");
    }

    lines.push("Markdown Content:");
    lines.push("");
    lines.push(params.markdownContent);

    return lines.join("\n");
  }
}
