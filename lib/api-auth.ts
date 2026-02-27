import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

/**
 * Verify an API key from the `Authorization: Bearer brw_xxx` header.
 * Returns the user ID and API key record, or an error response.
 */
export async function verifyApiKey(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      error: NextResponse.json(
        {
          error:
            "Missing or invalid Authorization header. Use: Bearer <api_key>",
        },
        { status: 401 },
      ),
    };
  }

  const rawKey = authHeader.slice(7).trim();

  // Hash the key (we store hashed keys, not plaintext)
  const hashedKey = crypto.createHash("sha256").update(rawKey).digest("hex");

  const apiKey = await prisma.apiKey.findUnique({
    where: { key: hashedKey },
    include: { user: { select: { id: true, subscriptionPlan: true } } },
  });

  if (!apiKey || !apiKey.isActive) {
    return {
      error: NextResponse.json(
        { error: "Invalid or revoked API key" },
        { status: 401 },
      ),
    };
  }

  if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
    return {
      error: NextResponse.json(
        { error: "API key has expired" },
        { status: 401 },
      ),
    };
  }

  // Update last used timestamp (fire-and-forget)
  prisma.apiKey
    .update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    })
    .catch(() => {}); // Non-blocking

  return { apiKey, userId: apiKey.userId };
}

/**
 * Track API usage and deduct credits.
 */
export async function trackApiUsage(
  apiKeyId: string,
  userId: string,
  endpoint: string,
  method: string,
  statusCode: number,
  latencyMs: number,
  credits: number = 1,
  req?: NextRequest,
) {
  // Log usage
  await prisma.apiUsage.create({
    data: {
      apiKeyId,
      endpoint,
      method,
      statusCode,
      credits,
      latencyMs,
      ip:
        req?.headers.get("x-forwarded-for") ||
        req?.headers.get("x-real-ip") ||
        null,
      userAgent: req?.headers.get("user-agent") || null,
    },
  });

  // Get current balance
  const lastEntry = await prisma.creditLedger.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const currentBalance = lastEntry?.balance ?? 100; // Default 100 credits for new users

  // Deduct credits
  await prisma.creditLedger.create({
    data: {
      userId,
      amount: -credits,
      balance: currentBalance - credits,
      description: `API call: ${method} ${endpoint}`,
      referenceId: apiKeyId,
    },
  });
}

/**
 * Check if user has enough credits.
 */
export async function checkCredits(userId: string, required: number = 1) {
  const lastEntry = await prisma.creditLedger.findFirst({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });

  const balance = lastEntry?.balance ?? 100;

  if (balance < required) {
    return {
      error: NextResponse.json(
        {
          error: "Insufficient credits",
          balance,
          required,
        },
        { status: 402 },
      ),
    };
  }

  return { balance };
}

/**
 * Generate a new API key with the `brw_` prefix.
 */
export function generateApiKey(): {
  raw: string;
  hashed: string;
  prefix: string;
} {
  const random = crypto.randomBytes(32).toString("hex");
  const raw = `brw_${random}`;
  const hashed = crypto.createHash("sha256").update(raw).digest("hex");
  const prefix = raw.substring(0, 12); // e.g. "brw_a1b2c3d4"

  return { raw, hashed, prefix };
}
