import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const aiContextRouter = router({
  /**
   * Get the current user's AI context (or null if not set).
   */
  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.userAIContext.findUnique({
      where: { userId: ctx.userId! },
    });
  }),

  /**
   * Create or update the user's AI context.
   */
  upsert: protectedProcedure
    .input(
      z.object({
        preferredTopics: z.array(z.string()).optional(),
        researchStyle: z.string().nullable().optional(),
        industryFocus: z.array(z.string()).optional(),
        communicationPref: z.string().nullable().optional(),
        customInstructions: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.userAIContext.upsert({
        where: { userId: ctx.userId! },
        create: {
          userId: ctx.userId!,
          preferredTopics: input.preferredTopics || [],
          researchStyle: input.researchStyle || null,
          industryFocus: input.industryFocus || [],
          communicationPref: input.communicationPref || null,
          customInstructions: input.customInstructions || null,
        },
        update: {
          ...(input.preferredTopics !== undefined && {
            preferredTopics: input.preferredTopics,
          }),
          ...(input.researchStyle !== undefined && {
            researchStyle: input.researchStyle,
          }),
          ...(input.industryFocus !== undefined && {
            industryFocus: input.industryFocus,
          }),
          ...(input.communicationPref !== undefined && {
            communicationPref: input.communicationPref,
          }),
          ...(input.customInstructions !== undefined && {
            customInstructions: input.customInstructions,
          }),
        },
      });
    }),

  /**
   * Append a research summary to the user's previousFindings.
   * Called automatically after each research completes.
   */
  appendFindings: protectedProcedure
    .input(
      z.object({
        researchId: z.string(),
        title: z.string(),
        summary: z.string().max(1000),
        topics: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.prisma.userAIContext.findUnique({
        where: { userId: ctx.userId! },
      });

      const previousFindings: any[] =
        (existing?.previousFindings as any[]) || [];

      // Keep only the 20 most recent findings to avoid unbounded growth
      const newEntry = {
        researchId: input.researchId,
        title: input.title,
        summary: input.summary,
        topics: input.topics,
        date: new Date().toISOString(),
      };

      const updatedFindings = [...previousFindings, newEntry].slice(-20);

      // Also accumulate topics into preferredTopics
      const existingTopics = existing?.preferredTopics || [];
      const mergedTopics = Array.from(
        new Set([...existingTopics, ...input.topics]),
      ).slice(-50); // Cap at 50 topics

      return ctx.prisma.userAIContext.upsert({
        where: { userId: ctx.userId! },
        create: {
          userId: ctx.userId!,
          previousFindings: updatedFindings,
          preferredTopics: mergedTopics,
        },
        update: {
          previousFindings: updatedFindings,
          preferredTopics: mergedTopics,
        },
      });
    }),
});
