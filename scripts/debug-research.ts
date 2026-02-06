import dotenv from "dotenv";
import path from "path";

// Load environment variables FIRST
dotenv.config({ path: path.resolve(__dirname, "../.env") });

async function main() {
  // Dynamic imports to ensure env vars are loaded
  const { encryptApiKey } = await import("../lib/encryption");
  const { GeminiClient } = await import("../lib/gemini-client");
  const { SourceDiscovery } = await import("../lib/research/source-discovery");
  const { scrapers } = await import("../lib/scrapers");

  console.log("🚀 Starting Research Debugger...");

  const apiKey = process.env.GEMINI_API_KEY;
  const encryptionSecret = process.env.ENCRYPTION_SECRET;

  if (!apiKey || !encryptionSecret) {
    console.error("❌ Missing GEMINI_API_KEY or ENCRYPTION_SECRET in .env");
    process.exit(1);
  }

  // Encrypt key as GeminiClient expects an encrypted key
  const encryptedKey = encryptApiKey(apiKey);
  const client = new GeminiClient(encryptedKey, "gemini-2.0-flash");

  // Test 1: Source Discovery
  console.log("\n--- Testing Source Discovery ---");
  const context = {
    prompt:
      "the state of lean generation state in south africa and what skills i need to successfully get in",
  };

  const serperKey = process.env.SERPER_API_KEY;
  const encryptedSerperKey = serperKey ? encryptApiKey(serperKey) : undefined;

  try {
    const discovery = new SourceDiscovery(client, encryptedSerperKey);
    const results = await discovery.discover(context);
    console.log(`✅ Discovery Results: ${results.all.length} sources found`);
    // console.log(JSON.stringify(results, null, 2));

    if (results.all.length === 0) {
      console.warn(
        "⚠️ No sources found via Discovery. Testing Individual Scrapers...",
      );

      // Test 2: Reddit Scraper Direct
      console.log("\n--- Testing Reddit Scraper Direct ---");
      const redditResults = await scrapers.reddit.scrape(
        "lean generation south africa",
        {
          maxResults: 5,
          timeRange: "year",
        },
      );
      console.log(`Reddit Found: ${redditResults.posts.length} posts`);

      // Test 3: Generic Scraper
      console.log("\n--- Testing Generic Scraper ---");
      try {
        const scrapeResult = await scrapers.generic.scrape(
          "https://example.com",
        );
        console.log(`Generic Scraper: ${scrapeResult.title}`);
      } catch (e) {
        console.error("Generic Scraper Failed:", e);
      }
    } else {
      console.log("Sample Source:", results.all[0]);
    }
  } catch (error) {
    console.error("❌ Discovery Failed:", error);
  } finally {
    await scrapers.reddit.close();
  }
}

main();
