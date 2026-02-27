import { NextRequest, NextResponse } from "next/server";
import { verifyApiKey, trackApiUsage, checkCredits } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";

/**
 * POST /api/v1/research
 *
 * Public API endpoint to trigger a research job.
 * Requires a valid API key via `Authorization: Bearer brw_xxx`.
 *
 * Body: { query: string, searchMethod?: string, scope?: string }
 * Returns: { researchId: string, message: string }
 */
export async function POST(req: NextRequest) {
  const start = Date.now();

  // 1. Verify API key
  const auth = await verifyApiKey(req);
  if ("error" in auth) return auth.error;

  // 2. Check scope
  if (!auth.apiKey.scopes.includes("research:write")) {
    return NextResponse.json(
      { error: "API key does not have 'research:write' scope" },
      { status: 403 },
    );
  }

  // 3. Check credits (research costs 5 credits)
  const creditCheck = await checkCredits(auth.userId, 5);
  if ("error" in creditCheck) return creditCheck.error;

  // 4. Parse body
  let body: { query: string; searchMethod?: string; scope?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (!body.query || typeof body.query !== "string" || body.query.length < 3) {
    return NextResponse.json(
      { error: "Field 'query' is required and must be at least 3 characters" },
      { status: 400 },
    );
  }

  // 5. Create research record
  const research = await prisma.research.create({
    data: {
      userId: auth.userId,
      title: body.query.substring(0, 200),
      originalPrompt: body.query,
      refinedPrompt: body.query,
      scope: (body.scope as any) || "GENERAL",
      searchMethod: (body.searchMethod as any) || "GEMINI_GROUNDING",
      status: "PENDING",
    },
  });

  // 6. Trigger Inngest function
  await inngest.send({
    name: "research/initiated",
    data: {
      researchId: research.id,
      userId: auth.userId,
    },
  });

  // 7. Track usage
  const latency = Date.now() - start;
  await trackApiUsage(
    auth.apiKey.id,
    auth.userId,
    "/api/v1/research",
    "POST",
    202,
    latency,
    5, // 5 credits for a research job
    req,
  );

  return NextResponse.json(
    {
      researchId: research.id,
      message: "Research job queued successfully",
      creditsUsed: 5,
      remainingBalance: creditCheck.balance - 5,
    },
    { status: 202 },
  );
}

/**
 * GET /api/v1/research?id=<researchId>
 *
 * Retrieve the status and results of a research job.
 * Costs 1 credit per call.
 */
export async function GET(req: NextRequest) {
  const start = Date.now();

  const auth = await verifyApiKey(req);
  if ("error" in auth) return auth.error;

  if (!auth.apiKey.scopes.includes("research:read")) {
    return NextResponse.json(
      { error: "API key does not have 'research:read' scope" },
      { status: 403 },
    );
  }

  const creditCheck = await checkCredits(auth.userId, 1);
  if ("error" in creditCheck) return creditCheck.error;

  const researchId = req.nextUrl.searchParams.get("id");
  if (!researchId) {
    return NextResponse.json(
      { error: "Query parameter 'id' is required" },
      { status: 400 },
    );
  }

  const research = await prisma.research.findFirst({
    where: { id: researchId, userId: auth.userId },
    include: {
      sources: {
        select: { url: true, title: true, excerpt: true, credibility: true },
      },
      insights: {
        select: {
          title: true,
          content: true,
          category: true,
          confidence: true,
        },
      },
      actionItems: {
        select: { description: true, priority: true, effort: true },
      },
    },
  });

  if (!research) {
    return NextResponse.json({ error: "Research not found" }, { status: 404 });
  }

  const latency = Date.now() - start;
  await trackApiUsage(
    auth.apiKey.id,
    auth.userId,
    "/api/v1/research",
    "GET",
    200,
    latency,
    1,
    req,
  );

  return NextResponse.json({
    id: research.id,
    title: research.title,
    status: research.status,
    progress: research.progress,
    searchMethod: research.searchMethod,
    createdAt: research.createdAt,
    completedAt: research.completedAt,
    sources: research.sources,
    insights: research.insights,
    actionItems: research.actionItems,
    creditsUsed: 1,
    remainingBalance: creditCheck.balance - 1,
  });
}
