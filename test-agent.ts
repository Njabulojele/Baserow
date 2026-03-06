import "dotenv/config";
import { prisma } from "./lib/prisma";
import { GeminiClient } from "./lib/gemini-client";

async function main() {
  const agent = await prisma.prospectingAgent.findFirst({
    where: { status: "ACTIVE" },
    include: { user: true },
  });

  if (!agent) {
    console.log("No active agent found");
    return;
  }

  console.log(
    `Agent: ${agent.name}, Platform: ${agent.platform}, Keywords: ${agent.searchKeywords}`,
  );

  const llm = new GeminiClient(agent.user.geminiApiKey!);
  const keywordString = agent.searchKeywords.join(" OR ");
  let searchQuery = keywordString;

  if (agent.platform.toLowerCase() === "reddit") {
    searchQuery = `site:reddit.com ("South Africa" OR "ZA") (${keywordString}) ("need help" OR "looking for" OR "advice")`;
  } else if (agent.platform.toLowerCase() === "google") {
    searchQuery = `("South Africa" OR "ZA") (${keywordString}) ("under construction" OR "coming soon" OR "facebook page" OR "our new website")`;
  } else if (agent.platform.toLowerCase() === "linkedin") {
    searchQuery = `site:linkedin.com/in ("South Africa" OR "ZA") (${keywordString}) ("looking for recommendations" OR "need a web developer" OR "website redesign")`;
  }

  console.log("Search Query:", searchQuery);

  try {
    const searchResult = await llm.groundingSearch(searchQuery);
    console.log(`Sources found: ${searchResult.sources?.length || 0}`);

    if (!searchResult.sources || searchResult.sources.length === 0) return;

    const extractionPrompt = `
You are an expert B2B lead generation prospector for "Open Infinity", a South African web development and digital marketing agency (openinfinity.co.za).

Review the following web search data and extract businesses or individuals who need web design, SEO, digital marketing, or custom software services.

Search Context:
${searchResult.text}

Sources found:
${searchResult.sources.map((s) => `- ${s.title}: ${s.url}`).join("\n")}

IMPORTANT: Extract as much contact info as possible. If they mention their business name, website, email, phone number, or location — capture it ALL. Also quote the EXACT text/post where they expressed their need — this is critical for context.

Return ONLY valid JSON matching this schema:
[
  {
    "name": "Person's name if available, otherwise business name",
    "company": "Business or company name if mentioned",
    "email": "Email if mentioned or visible, otherwise empty string",
    "phone": "Phone number if mentioned, otherwise empty string",
    "website": "Their website URL if mentioned, otherwise empty string",
    "industry": "What industry they appear to be in",
    "location": "City/province/country if mentioned",
    "painPoints": ["specific pain point 1", "specific pain point 2"],
    "whyIsLead": "Exactly why they need Open Infinity's services based on what they said",
    "offerPositioning": "How Open Infinity should approach them",
    "sourceUrl": "The exact URL or source link where you found this lead",
    "contextSnippet": "Copy-paste the EXACT quote or relevant excerpt from their post/comment/page that shows they need help. Include surrounding context so the user can understand the situation."
  }
]
If no clear leads are found, return [].
    `;

    console.log("Extracting...");
    const rawText = await llm.generateContent(extractionPrompt);
    const rawLeads = llm.extractJson<any[]>(rawText);

    console.log(`Extracted ${rawLeads.length} leads:`);
    console.log(JSON.stringify(rawLeads, null, 2));
  } catch (e) {
    console.error("Error:", e);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
