"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SerperClient = void 0;
const encryption_1 = require("./encryption");
class SerperClient {
    constructor(encryptedApiKey) {
        const apiKey = (0, encryption_1.decryptApiKey)(encryptedApiKey);
        if (!apiKey) {
            throw new Error("Invalid or missing Serper API key after decryption");
        }
        this.apiKey = apiKey;
    }
    /**
     * Searches Google via Serper.dev API
     */
    async search(query, numResults = 10) {
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
            const data = await response.json();
            return (data.organic || []).map((result) => ({
                title: result.title,
                url: result.link,
                snippet: result.snippet,
                position: result.position,
            }));
        }
        catch (error) {
            console.error("Serper search error:", error);
            throw new Error(`Search failed: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
exports.SerperClient = SerperClient;
