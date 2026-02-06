import { GenericScraper } from "../lib/scrapers/generic-scraper";

import { RedditScraper } from "../lib/scrapers/reddit-scraper";

async function testScraper() {
  console.log("--- TESTING GENERIC SCRAPER ---");
  const scraper = new GenericScraper();

  const urls = [
    // The one that returned text only for the user
    "https://www.electricsheepagency.co.za/blog/the-definitive-2022-guide-to-lead-generation-in-south-africa",
    // The blocked one
    "https://www.bastionflowe.com/mastering-lead-generation-south-africa/",
    // A PDF
    "https://www.themarketingcentre.co.za/hubfs/eBooks/SA%20eBooks/Lead%20Generation%20eBook%20South%20Africa.pdf",
    // Landing page with short content (Readability fail)
    "https://www.pinlocal.com/about.html",
  ];

  for (const url of urls) {
    console.log(`\n--- Testing URL: ${url} ---`);
    try {
      const result = await scraper.scrape(url);
      console.log("TITLE:", result.title);
      console.log("CONTENT PREVIEW (First 500 chars):");
      console.log(result.content.substring(0, 500));
      console.log("\nCONTENT END PREVIEW (Last 200 chars):");
      console.log(result.content.slice(-200));
    } catch (e) {
      console.error("Scrape failed:", e);
    }
  }

  console.log("\n\n--- TESTING REDDIT SCRAPER ---");
  const redditScraper = new RedditScraper();
  try {
    const query = "lead generation south africa";
    console.log(`Searching Reddit for: ${query}`);
    const result = await redditScraper.scrape(query, {
      maxResults: 5,
      scrapeComments: true,
    });

    console.log(`Found ${result.posts.length} posts.`);
    console.log("First Post Title:", result.posts[0]?.title);
    console.log("First Post Comments:", result.posts[0]?.topComments?.length);
    console.log("Metadata:", JSON.stringify(result.metadata, null, 2));
  } catch (e) {
    console.error("Reddit Scrape failed:", e);
  } finally {
    await redditScraper.close();
  }
}

testScraper().catch(console.error);
