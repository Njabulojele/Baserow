import axios from "axios";
import { Comment } from "./reddit-scraper";

export class HackerNewsScraper {
  private readonly API_BASE = "https://hn.algolia.com/api/v1";

  async search(
    query: string,
    options: {
      tags?: string[];
      numericFilters?: string[];
      hitsPerPage?: number;
    } = {},
  ) {
    const { tags = [], numericFilters = [], hitsPerPage = 20 } = options;

    try {
      const response = await axios.get(`${this.API_BASE}/search`, {
        params: {
          query,
          tags: tags.join(","),
          numericFilters: numericFilters.join(","),
          hitsPerPage,
        },
      });

      const hits = response.data.hits;

      // Fetch comments for top stories
      const enrichedHits = await Promise.all(
        hits.slice(0, 10).map(async (hit: any) => {
          const comments = await this.fetchComments(hit.objectID);
          return {
            ...hit,
            topComments: comments,
          };
        }),
      );

      return {
        stories: enrichedHits.map((hit: any) => ({
          title: hit.title,
          url:
            hit.url || `https://news.ycombinator.com/item?id=${hit.objectID}`,
          points: hit.points,
          author: hit.author,
          numComments: hit.num_comments,
          created: new Date(hit.created_at),
          topComments: hit.topComments,
        })),
        metadata: {
          totalResults: response.data.nbHits,
          processingTime: response.data.processingTimeMS,
        },
      };
    } catch (error) {
      console.error("HN scraping error:", error);
      return { stories: [], metadata: {} };
    }
  }

  private async fetchComments(storyId: string) {
    try {
      const response = await axios.get(`${this.API_BASE}/items/${storyId}`);
      const story = response.data;

      if (!story.children || story.children.length === 0) {
        return [];
      }

      // Extract top-level comments
      return story.children
        .slice(0, 5)
        .map((comment: any) => ({
          author: comment.author,
          text: this.stripHtml(comment.text || ""),
          created: new Date(comment.created_at),
        }))
        .filter((c: any) => c.text.length > 20);
    } catch (error) {
      return [];
    }
  }

  private stripHtml(html: string): string {
    return html
      .replace(/<[^>]*>/g, "")
      .replace(/&quot;/g, '"')
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">");
  }
}
