import { RedditScraper, Comment } from "./reddit-scraper";
import { HackerNewsScraper } from "./hackernews-scraper";
import { GoogleScholarScraper } from "./google-scholar-scraper";
import { NewsAPIScraper } from "./news-api-scraper";
import { GenericScraper } from "./generic-scraper";

export const scrapers = {
  reddit: new RedditScraper(),
  hn: new HackerNewsScraper(),
  academic: new GoogleScholarScraper(),
  news: new NewsAPIScraper(),
  generic: new GenericScraper(),
};

export interface ScrapedSource {
  title: string;
  url: string;
  content: string;
  sourceType: "reddit" | "hn" | "academic" | "news" | "web";
  metadata: {
    author?: string;
    date?: Date;
    score?: number;
    comments?: number;
    engagement?: any;
    subreddit?: string;
    searchUrl?: string;
    totalResults?: number;
    avgScore?: number;
    avgComments?: number;
    sentiment?: string;
    subreddits?: string[];
    processingTime?: number;
  };
  score?: number;
  topComments?: Comment[];
}

export type { Comment } from "./reddit-scraper";
