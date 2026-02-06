// import puppeteer, { Browser, Page } from "puppeteer";

// export interface RedditScraperOptions {
//   subreddits?: string[];
//   timeRange?: "hour" | "day" | "week" | "month" | "year" | "all";
//   sortBy?: "relevance" | "hot" | "top" | "new" | "comments";
//   minScore?: number;
//   maxResults?: number;
//   scrapeComments?: boolean;
//   maxCommentsPerPost?: number;
// }

// export interface Comment {
//   author: string;
//   text: string;
//   score: number;
//   depth: number;
//   created: Date;
// }

// export class RedditScraper {
//   private browser: Browser | null = null;

//   async initialize() {
//     if (!this.browser) {
//       this.browser = await puppeteer.launch({
//         headless: true,
//         args: [
//           "--no-sandbox",
//           "--disable-setuid-sandbox",
//           "--disable-dev-shm-usage",
//           "--disable-accelerated-2d-canvas",
//           "--disable-gpu",
//         ],
//       });
//     }
//   }

//   async scrape(query: string, options: RedditScraperOptions = {}) {
//     await this.initialize();

//     const {
//       subreddits = [],
//       timeRange = "month",
//       sortBy = "relevance",
//       minScore = 10,
//       maxResults = 20,
//       scrapeComments = true,
//       maxCommentsPerPost = 10,
//     } = options;

//     // Build Reddit search URL
//     const subredditParam = subreddits.length
//       ? `subreddit:${subreddits.join("+subreddit:")}`
//       : "";

//     const searchQuery = subredditParam ? `${query} ${subredditParam}` : query;

//     const url = `https://www.reddit.com/search/?q=${encodeURIComponent(searchQuery)}&sort=${sortBy}&t=${timeRange}`;

//     console.log(`🔍 Searching Reddit: ${url}`);

//     const page = await this.browser!.newPage();

//     try {
//       await page.setUserAgent(
//         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
//       );
//       await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

//       // Wait for content to load - try multiple selectors as Reddit's DOM changes frequently
//       const selectors = [
//         '[data-testid="post-container"]',
//         "article",
//         "shreddit-post",
//         ".Post",
//         "[data-post-id]",
//       ];

//       let foundSelector = false;
//       for (const selector of selectors) {
//         try {
//           await page.waitForSelector(selector, { timeout: 5000 });
//           console.log(`✅ Found Reddit content with selector: ${selector}`);
//           foundSelector = true;
//           break;
//         } catch (e) {
//           // Try next selector
//         }
//       }

//       if (!foundSelector) {
//         console.warn(
//           "⚠️ No Reddit selectors matched - returning empty results",
//         );
//         await page.close();
//         return {
//           posts: [],
//           metadata: {
//             totalResults: 0,
//             avgScore: 0,
//             avgComments: 0,
//             sentiment: "neutral",
//             subreddits: [],
//             searchUrl: url,
//           },
//         };
//       }

//       // Scroll to load more results
//       await this.autoScroll(page, maxResults);

//       // Extract post data
//       const posts = await page.evaluate((minScore) => {
//         const posts: any[] = [];

//         document
//           .querySelectorAll('[data-testid="post-container"]')
//           .forEach((postEl) => {
//             try {
//               const titleEl = postEl.querySelector("h3");
//               const linkEl = postEl.querySelector('a[data-click-id="body"]');
//               const scoreEl = postEl.querySelector('[id^="vote-arrows-"]');
//               const commentsEl = postEl.querySelector(
//                 'a[data-click-id="comments"]',
//               );
//               const subredditEl = postEl.querySelector(
//                 'a[data-click-id="subreddit"]',
//               );
//               const authorEl = postEl.querySelector(
//                 'a[data-click-id="author"]',
//               );
//               const timeEl = postEl.querySelector(
//                 'a[data-click-id="timestamp"]',
//               );

//               const scoreText = scoreEl?.textContent?.trim() || "0";
//               const score =
//                 scoreText === "Vote"
//                   ? 0
//                   : parseInt(scoreText.replace(/[^0-9-]/g, "")) || 0;

//               if (score < minScore) return;

//               const commentsText = commentsEl?.textContent?.trim() || "0";
//               const numComments =
//                 parseInt(commentsText.replace(/[^0-9]/g, "")) || 0;

//               posts.push({
//                 title: titleEl?.textContent?.trim() || "",
//                 url: (linkEl as HTMLAnchorElement)?.href || "",
//                 score: score,
//                 numComments: numComments,
//                 subreddit: subredditEl?.textContent?.trim() || "",
//                 author: authorEl?.textContent?.trim() || "",
//                 timestamp: timeEl?.getAttribute("href") || "",
//                 // Try to get preview text
//                 preview:
//                   postEl
//                     .querySelector('[data-click-id="text"]')
//                     ?.textContent?.trim() || "",
//               });
//             } catch (err) {
//               console.error("Error parsing post:", err);
//             }
//           });

//         return posts;
//       }, minScore);

//       console.log(`📊 Found ${posts.length} posts matching criteria`);

//       // Scrape comments for high-value posts
//       let enrichedPosts = posts;

//       if (scrapeComments && posts.length > 0) {
//         console.log(`💬 Scraping comments from top posts...`);

//         // Take top posts by score
//         const topPosts = posts
//           .sort((a: any, b: any) => b.score - a.score)
//           .slice(0, Math.min(10, maxResults));

//         enrichedPosts = await Promise.all(
//           topPosts.map(async (post: any) => {
//             try {
//               const comments = await this.scrapeComments(
//                 post.url,
//                 maxCommentsPerPost,
//               );
//               return { ...post, topComments: comments };
//             } catch (err) {
//               console.error(`Failed to scrape comments for ${post.url}:`, err);
//               return { ...post, topComments: [] };
//             }
//           }),
//         );
//       }

//       await page.close();

//       // Calculate sentiment
//       const sentiment = this.analyzeSentiment(enrichedPosts);

//       return {
//         posts: enrichedPosts,
//         metadata: {
//           totalResults: enrichedPosts.length,
//           avgScore: this.average(enrichedPosts.map((p: any) => p.score)),
//           avgComments: this.average(
//             enrichedPosts.map((p: any) => p.numComments),
//           ),
//           sentiment: sentiment,
//           subreddits: [...new Set(enrichedPosts.map((p: any) => p.subreddit))],
//           searchUrl: url,
//         },
//       };
//     } catch (error) {
//       if (!page.isClosed()) await page.close();
//       throw error;
//     }
//   }

//   async scrapeComments(
//     postUrl: string,
//     maxComments: number = 10,
//   ): Promise<Comment[]> {
//     const page = await this.browser!.newPage();

//     try {
//       await page.setUserAgent(
//         "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
//       );

//       // Sort by "best" to get highest quality comments
//       const sortedUrl = postUrl.includes("?")
//         ? `${postUrl}&sort=best`
//         : `${postUrl}?sort=best`;

//       await page.goto(sortedUrl, { waitUntil: "networkidle2", timeout: 30000 });

//       // Wait for comments to load
//       try {
//         await page.waitForSelector('[data-testid="comment"]', {
//           timeout: 10000,
//         });
//       } catch (e) {
//         // Comments might not exist
//       }

//       // Extract comments
//       const comments = await page.evaluate((maxComments) => {
//         const comments: any[] = [];

//         document
//           .querySelectorAll('[data-testid="comment"]')
//           .forEach((commentEl, index) => {
//             if (index >= maxComments) return;

//             try {
//               const authorEl = commentEl.querySelector(
//                 'a[data-testid="comment_author_link"]',
//               );
//               const textEl = commentEl.querySelector('[data-testid="comment"]');
//               const scoreEl = commentEl.querySelector('[id^="vote-arrows-"]');

//               const scoreText = scoreEl?.textContent?.trim() || "0";
//               const score = parseInt(scoreText.replace(/[^0-9-]/g, "")) || 0;

//               // Get the actual comment text (excluding nested comments)
//               // This logic is a bit fragile across Reddit UI updates, but generic best effort
//               // Use textContent directly or try to filter children
//               const textContent = textEl?.textContent?.trim() || "";

//               if (textContent.length > 10) {
//                 comments.push({
//                   author: authorEl?.textContent?.trim() || "unknown",
//                   text: textContent,
//                   score: score,
//                   depth: 0, // Could calculate depth from DOM structure
//                 });
//               }
//             } catch (err) {
//               console.error("Error parsing comment:", err);
//             }
//           });

//         return comments;
//       }, maxComments);

//       await page.close();

//       return comments.sort((a: any, b: any) => b.score - a.score);
//     } catch (error) {
//       if (!page.isClosed()) await page.close();
//       console.error("Error scraping comments:", error);
//       return [];
//     }
//   }

//   private async autoScroll(page: Page, maxResults: number) {
//     await page.evaluate(async (maxResults) => {
//       await new Promise<void>((resolve) => {
//         let totalHeight = 0;
//         const distance = 100;
//         const maxScrolls = Math.ceil(maxResults / 5); // ~5 posts per scroll
//         let scrolls = 0;

//         const timer = setInterval(() => {
//           const scrollHeight = document.documentElement.scrollHeight;
//           window.scrollBy(0, distance);
//           totalHeight += distance;
//           scrolls++;

//           if (totalHeight >= scrollHeight || scrolls >= maxScrolls) {
//             clearInterval(timer);
//             resolve();
//           }
//         }, 200);
//       });
//     }, maxResults);

//     // Wait for any lazy-loaded content
//     await new Promise((resolve) => setTimeout(resolve, 1000));
//   }

//   private analyzeSentiment(posts: any[]): string {
//     // Simple sentiment analysis based on keywords in titles/content
//     const positiveKeywords = [
//       "great",
//       "awesome",
//       "love",
//       "best",
//       "excellent",
//       "amazing",
//       "recommend",
//     ];
//     const negativeKeywords = [
//       "terrible",
//       "awful",
//       "hate",
//       "worst",
//       "disappointed",
//       "frustrated",
//       "problem",
//     ];

//     let positiveCount = 0;
//     let negativeCount = 0;

//     posts.forEach((post) => {
//       const text = (post.title + " " + post.preview).toLowerCase();

//       positiveKeywords.forEach((keyword) => {
//         if (text.includes(keyword)) positiveCount++;
//       });

//       negativeKeywords.forEach((keyword) => {
//         if (text.includes(keyword)) negativeCount++;
//       });
//     });

//     if (positiveCount > negativeCount * 1.5) return "positive";
//     if (negativeCount > positiveCount * 1.5) return "negative";
//     return "neutral";
//   }

//   private average(numbers: number[]): number {
//     if (numbers.length === 0) return 0;
//     return numbers.reduce((a, b) => a + b, 0) / numbers.length;
//   }

//   async close() {
//     if (this.browser) {
//       await this.browser.close();
//       this.browser = null;
//     }
//   }
// }

import puppeteer, { Browser, Page, PuppeteerLaunchOptions } from "puppeteer";
import { setTimeout as sleep } from "timers/promises";

export interface RedditScraperOptions {
  subreddits?: string[];
  timeRange?: "hour" | "day" | "week" | "month" | "year" | "all";
  sortBy?: "relevance" | "hot" | "top" | "new" | "comments";
  minScore?: number;
  maxResults?: number;
  scrapeComments?: boolean;
  maxCommentsPerPost?: number;
  retryAttempts?: number;
  timeout?: number;
  useProxy?: boolean;
  proxyUrl?: string;
}

export interface Comment {
  author: string;
  text: string;
  score: number;
  depth: number;
  created: Date;
  isEdited?: boolean;
  awards?: number;
  replies?: number;
}

export interface RedditPost {
  id: string;
  title: string;
  url: string;
  score: number;
  numComments: number;
  subreddit: string;
  author: string;
  created: Date;
  preview: string;
  flair?: string;
  isStickied?: boolean;
  awards?: number;
  upvoteRatio?: number;
  topComments?: Comment[];
  fullText?: string; // For text posts
  mediaType?: "text" | "link" | "image" | "video";
}

export interface ScraperMetadata {
  totalResults: number;
  avgScore: number;
  avgComments: number;
  sentiment: "positive" | "negative" | "neutral";
  subreddits: string[];
  searchUrl: string;
  scrapeDuration: number;
  errors: string[];
  successRate: number;
}

export interface ScraperResult {
  posts: RedditPost[];
  metadata: ScraperMetadata;
}

/**
 * Production-ready Reddit scraper with:
 * - Anti-detection measures
 * - Comprehensive error handling
 * - Retry logic with exponential backoff
 * - Rate limiting
 * - Multiple selector strategies
 * - Data validation
 * - Performance optimization
 */
export class RedditScraper {
  private browser: Browser | null = null;
  private requestCount: number = 0;
  private lastRequestTime: number = 0;
  private readonly MIN_REQUEST_INTERVAL = 2000; // 2 seconds between requests
  private readonly USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:122.0) Gecko/20100101 Firefox/122.0",
  ];

  async initialize(options: { headless?: boolean; proxyUrl?: string } = {}) {
    if (!this.browser) {
      const launchOptions: PuppeteerLaunchOptions = {
        headless: options.headless ?? true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--disable-gpu",
          "--disable-blink-features=AutomationControlled", // Anti-detection
          "--window-size=1920,1080",
        ],
      };

      if (options.proxyUrl) {
        launchOptions.args?.push(`--proxy-server=${options.proxyUrl}`);
      }

      try {
        this.browser = await puppeteer.launch(launchOptions);
        console.log("✅ Browser initialized successfully");
      } catch (error) {
        console.error("❌ Failed to initialize browser:", error);
        throw new Error(`Browser initialization failed: ${error}`);
      }
    }
  }

  /**
   * Main scraping method with comprehensive error handling and retry logic
   */
  async scrape(
    query: string,
    options: RedditScraperOptions = {},
  ): Promise<ScraperResult> {
    const startTime = Date.now();
    const errors: string[] = [];

    const {
      subreddits = [],
      timeRange = "month",
      sortBy = "relevance",
      minScore = 10,
      maxResults = 20,
      scrapeComments = true,
      maxCommentsPerPost = 10,
      retryAttempts = 3,
      timeout = 30000,
      useProxy = false,
      proxyUrl,
    } = options;

    await this.initialize({ proxyUrl: useProxy ? proxyUrl : undefined });

    // Build Reddit search URL
    const subredditParam = subreddits.length
      ? `subreddit:${subreddits.join("+subreddit:")}`
      : "";

    const searchQuery = subredditParam ? `${query} ${subredditParam}` : query;

    const url = `https://www.reddit.com/search/?q=${encodeURIComponent(searchQuery)}&sort=${sortBy}&t=${timeRange}`;

    console.log(`🔍 Searching Reddit: ${url}`);

    let posts: RedditPost[] = [];
    let attempt = 0;

    // Retry logic with exponential backoff
    while (attempt < retryAttempts) {
      try {
        await this.rateLimit();
        posts = await this.scrapeWithTimeout(
          url,
          minScore,
          maxResults,
          timeout,
        );
        break; // Success, exit retry loop
      } catch (error) {
        attempt++;
        const errorMsg = `Attempt ${attempt}/${retryAttempts} failed: ${error}`;
        console.error(errorMsg);
        errors.push(errorMsg);

        if (attempt < retryAttempts) {
          const backoffTime = Math.min(1000 * Math.pow(2, attempt), 10000);
          console.log(`⏳ Retrying in ${backoffTime}ms...`);
          await sleep(backoffTime);
        } else {
          // All retries failed
          const duration = (Date.now() - startTime) / 1000;
          return {
            posts: [],
            metadata: {
              totalResults: 0,
              avgScore: 0,
              avgComments: 0,
              sentiment: "neutral",
              subreddits: [],
              searchUrl: url,
              scrapeDuration: duration,
              errors,
              successRate: 0,
            },
          };
        }
      }
    }

    console.log(`📊 Found ${posts.length} posts matching criteria`);

    // Scrape comments for high-value posts
    let enrichedPosts = posts;
    let commentErrors = 0;

    if (scrapeComments && posts.length > 0) {
      console.log(`💬 Scraping comments from top posts...`);

      // Take top posts by score
      const topPosts = [...posts]
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.min(10, maxResults));

      const commentPromises = topPosts.map(async (post) => {
        try {
          await this.rateLimit();
          const comments = await this.scrapeComments(
            post.url,
            maxCommentsPerPost,
            retryAttempts,
          );
          return { ...post, topComments: comments };
        } catch (err) {
          commentErrors++;
          const errorMsg = `Failed to scrape comments for ${post.url}: ${err}`;
          console.error(errorMsg);
          errors.push(errorMsg);
          return { ...post, topComments: [] };
        }
      });

      enrichedPosts = await Promise.all(commentPromises);
    }

    // Calculate sentiment
    const sentiment = this.analyzeSentiment(enrichedPosts);

    // Calculate metrics
    const duration = (Date.now() - startTime) / 1000;
    const totalAttempts =
      posts.length + (scrapeComments ? enrichedPosts.length : 0);
    const successRate =
      totalAttempts > 0
        ? ((totalAttempts - commentErrors) / totalAttempts) * 100
        : 0;

    return {
      posts: enrichedPosts,
      metadata: {
        totalResults: enrichedPosts.length,
        avgScore: this.average(enrichedPosts.map((p) => p.score)),
        avgComments: this.average(enrichedPosts.map((p) => p.numComments)),
        sentiment,
        subreddits: [...new Set(enrichedPosts.map((p) => p.subreddit))],
        searchUrl: url,
        scrapeDuration: duration,
        errors,
        successRate,
      },
    };
  }

  /**
   * Scrape with timeout protection
   */
  private async scrapeWithTimeout(
    url: string,
    minScore: number,
    maxResults: number,
    timeout: number,
  ): Promise<RedditPost[]> {
    return Promise.race([
      this.scrapePage(url, minScore, maxResults),
      this.timeoutPromise(timeout),
    ]);
  }

  /**
   * Core page scraping logic
   */
  private async scrapePage(
    url: string,
    minScore: number,
    maxResults: number,
  ): Promise<RedditPost[]> {
    const page = await this.createPage();

    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      // Wait for content to load with multiple fallback selectors
      const contentLoaded = await this.waitForRedditContent(page);

      if (!contentLoaded) {
        console.warn(
          "⚠️ No Reddit content found - page may have changed or be blocked",
        );
        await this.saveDebugScreenshot(page, "no-content");
        await page.close();
        return [];
      }

      // Scroll to load more results
      await this.autoScroll(page, maxResults);

      // Extract post data with enhanced selectors
      const posts = await this.extractPosts(page, minScore);

      await page.close();
      return posts;
    } catch (error) {
      await this.saveDebugScreenshot(page, "error");
      if (!page.isClosed()) await page.close();
      throw error;
    }
  }

  /**
   * Create page with anti-detection measures
   */
  private async createPage(): Promise<Page> {
    if (!this.browser) {
      throw new Error("Browser not initialized");
    }

    const page = await this.browser.newPage();

    // Set random user agent
    const userAgent =
      this.USER_AGENTS[Math.floor(Math.random() * this.USER_AGENTS.length)];
    await page.setUserAgent(userAgent);

    // Set viewport
    await page.setViewport({
      width: 1920,
      height: 1080,
      deviceScaleFactor: 1,
    });

    // Remove webdriver flag
    await page.evaluateOnNewDocument(() => {
      Object.defineProperty(navigator, "webdriver", {
        get: () => false,
      });
    });

    // Add realistic headers
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
    });

    return page;
  }

  /**
   * Wait for Reddit content with multiple selector strategies
   */
  private async waitForRedditContent(page: Page): Promise<boolean> {
    const selectors = [
      '[data-testid="post-container"]',
      "shreddit-post",
      "article[data-post-id]",
      ".Post",
      '[data-click-id="body"]',
      "faceplate-tracker[source='post']",
    ];

    for (const selector of selectors) {
      try {
        await page.waitForSelector(selector, { timeout: 10000 });
        console.log(`✅ Found Reddit content with selector: ${selector}`);
        return true;
      } catch (e) {
        // Try next selector
      }
    }

    return false;
  }

  /**
   * Extract posts with enhanced data extraction
   */
  private async extractPosts(
    page: Page,
    minScore: number,
  ): Promise<RedditPost[]> {
    return page.evaluate((minScore) => {
      const posts: any[] = [];

      // Try multiple container selectors
      const containers = [
        ...document.querySelectorAll('[data-testid="post-container"]'),
        ...document.querySelectorAll("shreddit-post"),
        ...document.querySelectorAll("article[data-post-id]"),
      ];

      containers.forEach((postEl) => {
        try {
          // Extract post ID
          const postId =
            postEl.getAttribute("data-post-id") ||
            postEl.getAttribute("id") ||
            "";

          // Title
          const titleEl =
            postEl.querySelector("h3") ||
            postEl.querySelector('[slot="title"]') ||
            postEl.querySelector("a[data-click-id='body']");
          const title = titleEl?.textContent?.trim() || "";

          // URL
          const linkEl =
            postEl.querySelector('a[data-click-id="body"]') ||
            postEl.querySelector("a[slot='full-post-link']");
          const url = (linkEl as HTMLAnchorElement)?.href || "";

          // Score
          const scoreEl =
            postEl.querySelector('[id^="vote-arrows-"]') ||
            postEl.querySelector('[slot="upvote"]') ||
            postEl.querySelector('[aria-label*="upvote"]');
          const scoreText = scoreEl?.textContent?.trim() || "0";
          const score =
            scoreText === "Vote" || scoreText === "•"
              ? 0
              : parseInt(scoreText.replace(/[^0-9-]/g, "")) || 0;

          if (score < minScore) return;

          // Comments
          const commentsEl =
            postEl.querySelector('a[data-click-id="comments"]') ||
            postEl.querySelector('[slot="comment-count"]');
          const commentsText = commentsEl?.textContent?.trim() || "0";
          const numComments =
            parseInt(commentsText.replace(/[^0-9]/g, "")) || 0;

          // Subreddit
          const subredditEl =
            postEl.querySelector('a[data-click-id="subreddit"]') ||
            postEl.querySelector('[slot="subreddit"]');
          const subreddit = (subredditEl?.textContent?.trim() || "")
            .replace("r/", "")
            .replace("/", "");

          // Author
          const authorEl =
            postEl.querySelector('a[data-click-id="author"]') ||
            postEl.querySelector('[slot="author"]');
          const author = (authorEl?.textContent?.trim() || "")
            .replace("u/", "")
            .replace("/", "");

          // Timestamp
          const timeEl =
            postEl.querySelector('a[data-click-id="timestamp"]') ||
            postEl.querySelector("time") ||
            postEl.querySelector('[slot="timestamp"]');
          const timestamp =
            timeEl?.getAttribute("datetime") ||
            timeEl?.getAttribute("title") ||
            "";
          const created = timestamp ? new Date(timestamp) : new Date();

          // Preview text
          const previewEl =
            postEl.querySelector('[data-click-id="text"]') ||
            postEl.querySelector('[slot="text-body"]') ||
            postEl.querySelector("p");
          const preview = previewEl?.textContent?.trim() || "";

          // Flair
          const flairEl =
            postEl.querySelector('[data-testid="post-flair"]') ||
            postEl.querySelector('[slot="flair"]');
          const flair = flairEl?.textContent?.trim();

          // Stickied/Pinned
          const isStickied = !!(
            postEl.querySelector('[data-testid="stickied-post"]') ||
            postEl.getAttribute("stickied") === "true"
          );

          // Awards
          const awardEl = postEl.querySelector('[data-testid="award-count"]');
          const awards = awardEl
            ? parseInt(awardEl.textContent?.replace(/[^0-9]/g, "") || "0")
            : 0;

          // Media type
          let mediaType: "text" | "link" | "image" | "video" = "link";
          if (postEl.querySelector("video, [data-testid='video']"))
            mediaType = "video";
          else if (
            postEl.querySelector(
              "img:not([alt='User Avatar']), [data-testid='image']",
            )
          )
            mediaType = "image";
          else if (preview.length > 50) mediaType = "text";

          if (title) {
            posts.push({
              id: postId,
              title,
              url,
              score,
              numComments,
              subreddit,
              author,
              created,
              preview,
              flair,
              isStickied,
              awards,
              mediaType,
            });
          }
        } catch (err) {
          console.error("Error parsing post:", err);
        }
      });

      return posts;
    }, minScore);
  }

  /**
   * Scrape comments with retry logic
   */
  async scrapeComments(
    postUrl: string,
    maxComments: number = 10,
    retryAttempts: number = 3,
  ): Promise<Comment[]> {
    let attempt = 0;

    while (attempt < retryAttempts) {
      try {
        return await this.scrapeCommentsOnce(postUrl, maxComments);
      } catch (error) {
        attempt++;
        if (attempt >= retryAttempts) {
          console.error(
            `Failed to scrape comments after ${retryAttempts} attempts:`,
            error,
          );
          return [];
        }
        await sleep(1000 * attempt); // Exponential backoff
      }
    }

    return [];
  }

  /**
   * Single attempt to scrape comments
   */
  private async scrapeCommentsOnce(
    postUrl: string,
    maxComments: number,
  ): Promise<Comment[]> {
    const page = await this.createPage();

    try {
      // Sort by "best" to get highest quality comments
      const sortedUrl = postUrl.includes("?")
        ? `${postUrl}&sort=best`
        : `${postUrl}?sort=best`;

      await page.goto(sortedUrl, { waitUntil: "networkidle2", timeout: 30000 });

      // Wait for comments to load
      const commentSelectors = [
        '[data-testid="comment"]',
        "shreddit-comment",
        '[id^="comment-"]',
      ];

      let foundComments = false;
      for (const selector of commentSelectors) {
        try {
          await page.waitForSelector(selector, { timeout: 5000 });
          foundComments = true;
          break;
        } catch (e) {
          // Try next selector
        }
      }

      if (!foundComments) {
        console.warn("No comments found on this post");
        await page.close();
        return [];
      }

      // Scroll to load more comments
      await page.evaluate(() => {
        window.scrollTo(0, document.body.scrollHeight);
      });
      await sleep(1000);

      // Extract comments
      const comments = await page.evaluate((maxComments) => {
        const comments: any[] = [];

        const commentElements = [
          ...document.querySelectorAll('[data-testid="comment"]'),
          ...document.querySelectorAll("shreddit-comment"),
        ];

        commentElements.forEach((commentEl, index) => {
          if (index >= maxComments) return;

          try {
            // Author
            const authorEl =
              commentEl.querySelector('a[data-testid="comment_author_link"]') ||
              commentEl.querySelector('[slot="author"]');
            const author = (authorEl?.textContent?.trim() || "unknown")
              .replace("u/", "")
              .replace("/", "");

            // Text
            const textEl =
              commentEl.querySelector('[data-testid="comment"]') ||
              commentEl.querySelector('[slot="comment"]') ||
              commentEl.querySelector("p");
            const text = textEl?.textContent?.trim() || "";

            // Score
            const scoreEl =
              commentEl.querySelector('[id^="vote-arrows-"]') ||
              commentEl.querySelector('[slot="upvote"]');
            const scoreText = scoreEl?.textContent?.trim() || "0";
            const score = parseInt(scoreText.replace(/[^0-9-]/g, "")) || 0;

            // Timestamp
            const timeEl =
              commentEl.querySelector("time") ||
              commentEl.querySelector('[slot="timestamp"]');
            const timestamp =
              timeEl?.getAttribute("datetime") ||
              timeEl?.getAttribute("title") ||
              "";
            const created = timestamp ? new Date(timestamp) : new Date();

            // Edited indicator
            const isEdited = !!(
              commentEl.querySelector('[data-testid="edited-indicator"]') ||
              commentEl.textContent?.includes("edited")
            );

            // Awards
            const awardEl = commentEl.querySelector('[data-testid="award"]');
            const awards = awardEl ? 1 : 0;

            // Replies count
            const repliesEl = commentEl.querySelector(
              '[data-testid="replies-count"]',
            );
            const replies = repliesEl
              ? parseInt(repliesEl.textContent?.replace(/[^0-9]/g, "") || "0")
              : 0;

            // Calculate depth from indentation or nesting
            const depth = 0; // Could be calculated from DOM structure

            if (text.length > 10) {
              comments.push({
                author,
                text,
                score,
                depth,
                created,
                isEdited,
                awards,
                replies,
              });
            }
          } catch (err) {
            console.error("Error parsing comment:", err);
          }
        });

        return comments;
      }, maxComments);

      await page.close();

      return comments.sort((a, b) => b.score - a.score);
    } catch (error) {
      if (!page.isClosed()) await page.close();
      throw error;
    }
  }

  /**
   * Auto-scroll with progressive loading
   */
  private async autoScroll(page: Page, maxResults: number) {
    await page.evaluate(async (maxResults) => {
      await new Promise<void>((resolve) => {
        let totalHeight = 0;
        const distance = 200;
        const maxScrolls = Math.ceil(maxResults / 5); // ~5 posts per scroll
        let scrolls = 0;
        let lastHeight = 0;
        let unchangedCount = 0;

        const timer = setInterval(() => {
          const scrollHeight = document.documentElement.scrollHeight;

          // Check if height changed
          if (scrollHeight === lastHeight) {
            unchangedCount++;
          } else {
            unchangedCount = 0;
            lastHeight = scrollHeight;
          }

          // Stop if height hasn't changed for 3 iterations or reached max
          if (unchangedCount >= 3 || scrolls >= maxScrolls) {
            clearInterval(timer);
            resolve();
            return;
          }

          window.scrollBy(0, distance);
          totalHeight += distance;
          scrolls++;

          if (totalHeight >= scrollHeight) {
            clearInterval(timer);
            resolve();
          }
        }, 300); // Slightly slower for more reliable loading
      });
    }, maxResults);

    // Wait for lazy-loaded content
    await sleep(1500);
  }

  /**
   * Rate limiting to avoid being blocked
   */
  private async rateLimit() {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    if (timeSinceLastRequest < this.MIN_REQUEST_INTERVAL) {
      const waitTime = this.MIN_REQUEST_INTERVAL - timeSinceLastRequest;
      console.log(`⏳ Rate limiting: waiting ${waitTime}ms`);
      await sleep(waitTime);
    }

    this.lastRequestTime = Date.now();
    this.requestCount++;
  }

  /**
   * Enhanced sentiment analysis
   */
  private analyzeSentiment(
    posts: RedditPost[],
  ): "positive" | "negative" | "neutral" {
    if (posts.length === 0) return "neutral";

    const positiveKeywords = [
      "great",
      "awesome",
      "love",
      "best",
      "excellent",
      "amazing",
      "recommend",
      "perfect",
      "fantastic",
      "wonderful",
    ];
    const negativeKeywords = [
      "terrible",
      "awful",
      "hate",
      "worst",
      "disappointed",
      "frustrated",
      "problem",
      "bad",
      "horrible",
      "useless",
    ];

    let positiveScore = 0;
    let negativeScore = 0;

    posts.forEach((post) => {
      const text = (post.title + " " + post.preview).toLowerCase();

      positiveKeywords.forEach((keyword) => {
        const matches = (text.match(new RegExp(keyword, "g")) || []).length;
        positiveScore += matches;
      });

      negativeKeywords.forEach((keyword) => {
        const matches = (text.match(new RegExp(keyword, "g")) || []).length;
        negativeScore += matches;
      });

      // Weight by score (higher scored posts have more influence)
      const weight = Math.log10(post.score + 10);
      positiveScore *= weight;
      negativeScore *= weight;
    });

    const threshold = 1.3;
    if (positiveScore > negativeScore * threshold) return "positive";
    if (negativeScore > positiveScore * threshold) return "negative";
    return "neutral";
  }

  /**
   * Helper: Calculate average
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Helper: Timeout promise
   */
  private timeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`Scraping timeout after ${ms}ms`)), ms);
    });
  }

  /**
   * Helper: Save debug screenshot
   */
  private async saveDebugScreenshot(page: Page, label: string) {
    try {
      const timestamp = Date.now();
      const filename = `reddit-debug-${label}-${timestamp}.png`;
      await page.screenshot({ path: filename, fullPage: false });
      console.log(`📸 Debug screenshot saved: ${filename}`);
    } catch (error) {
      console.error("Failed to save debug screenshot:", error);
    }
  }

  /**
   * Get scraper statistics
   */
  getStats() {
    return {
      requestCount: this.requestCount,
      isActive: this.browser !== null,
    };
  }

  /**
   * Cleanup browser instance
   */
  async close() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log("✅ Browser closed");
    }
  }
}

/**
 * Utility function for batch scraping with progress tracking
 */
export async function batchScrapeReddit(
  queries: { query: string; options?: RedditScraperOptions }[],
  onProgress?: (current: number, total: number, query: string) => void,
): Promise<ScraperResult[]> {
  const scraper = new RedditScraper();
  const results: ScraperResult[] = [];

  try {
    for (let i = 0; i < queries.length; i++) {
      const { query, options } = queries[i];

      if (onProgress) {
        onProgress(i + 1, queries.length, query);
      }

      console.log(`\n📊 Scraping ${i + 1}/${queries.length}: ${query}`);

      const result = await scraper.scrape(query, options);
      results.push(result);

      // Add delay between batches
      if (i < queries.length - 1) {
        console.log("⏳ Waiting 3s before next query...");
        await sleep(3000);
      }
    }
  } finally {
    await scraper.close();
  }

  return results;
}

/**
 * Utility function to validate and clean scraped data
 */
export function validateScraperResult(result: ScraperResult): ScraperResult {
  return {
    posts: result.posts.filter(
      (post) =>
        post.title &&
        post.url &&
        post.subreddit &&
        post.author &&
        post.score >= 0,
    ),
    metadata: result.metadata,
  };
}
