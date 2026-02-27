import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { generateApiKey } from "@/lib/api-auth";

export const apiKeyRouter = router({
  /**
   * List all API keys for the current user (only prefix shown, not full key).
   */
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.apiKey.findMany({
      where: { userId: ctx.userId! },
      select: {
        id: true,
        name: true,
        prefix: true,
        scopes: true,
        rateLimit: true,
        lastUsedAt: true,
        expiresAt: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  /**
   * Create a new API key. Returns the raw key ONCE (not stored in DB).
   */
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        scopes: z.array(z.string()).optional(),
        rateLimit: z.number().min(1).max(1000).optional(),
        expiresInDays: z.number().min(1).max(365).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { raw, hashed, prefix } = generateApiKey();

      const expiresAt = input.expiresInDays
        ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
        : null;

      await ctx.prisma.apiKey.create({
        data: {
          userId: ctx.userId!,
          name: input.name,
          key: hashed,
          prefix,
          scopes: input.scopes || ["research:read", "research:write"],
          rateLimit: input.rateLimit || 60,
          expiresAt,
        },
      });

      // Initialize credits for first-time API users
      const existingLedger = await ctx.prisma.creditLedger.findFirst({
        where: { userId: ctx.userId! },
      });

      if (!existingLedger) {
        await ctx.prisma.creditLedger.create({
          data: {
            userId: ctx.userId!,
            amount: 100,
            balance: 100,
            description: "Welcome bonus — 100 free API credits",
          },
        });
      }

      return {
        apiKey: raw, // Show the raw key ONCE — it cannot be recovered
        prefix,
        message: "Save this key securely — it will not be shown again.",
      };
    }),

  /**
   * Revoke an API key.
   */
  revoke: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.apiKey.updateMany({
        where: { id: input.id, userId: ctx.userId! },
        data: { isActive: false },
      });
      return { success: true };
    }),

  /**
   * Get credit balance and recent usage.
   */
  credits: protectedProcedure.query(async ({ ctx }) => {
    const lastEntry = await ctx.prisma.creditLedger.findFirst({
      where: { userId: ctx.userId! },
      orderBy: { createdAt: "desc" },
    });

    const recentUsage = await ctx.prisma.apiUsage.findMany({
      where: { apiKey: { userId: ctx.userId! } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        endpoint: true,
        method: true,
        statusCode: true,
        credits: true,
        latencyMs: true,
        createdAt: true,
      },
    });

    return {
      balance: lastEntry?.balance ?? 0,
      recentUsage,
    };
  }),
});
