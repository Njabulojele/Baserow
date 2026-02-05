import { decryptApiKey } from "./encryption";

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  position: number;
}

export interface SerperSearchResponse {
  searchParameters: {
    q: string;
    gl: string;
    hl: string;
    num: number;
  };
  organic: Array<{
    title: string;
    link: string;
    snippet: string;
    position: number;
  }>;
}

export class SerperClient {
  private apiKey: string;

  constructor(encryptedApiKey: string) {
    const apiKey = decryptApiKey(encryptedApiKey);
    if (!apiKey) {
      throw new Error("Invalid or missing Serper API key after decryption");
    }
    this.apiKey = apiKey;
  }

  /**
   * Searches Google via Serper.dev API
   */
  async search(
    query: string,
    numResults: number = 10,
  ): Promise<SearchResult[]> {
    try {
      const response = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
          "X-API-KEY": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          q: query,
          num: numResults,
          gl: "za", // South Africa
          hl: "en",
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Serper API error: ${response.status} - ${errorText}`);
      }

      const data: SerperSearchResponse = await response.json();

      return (data.organic || []).map((result) => ({
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        position: result.position,
      }));
    } catch (error) {
      console.error("Serper search error:", error);
      throw new Error(
        `Search failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
