import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/inngest/client";

export const contentIdeaRouter = router({
  getIdeas: protectedProcedure
    .input(
      z
        .object({
          platform: z.string().optional(),
          status: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.contentIdea.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.platform ? { platform: input.platform } : {}),
          ...(input?.status ? { status: input.status } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  createIdea: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        platform: z
          .enum(["linkedin", "facebook", "youtube", "blog", "email"])
          .default("linkedin"),
        scheduledDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contentIdea.create({
        data: { ...input, userId: ctx.userId },
      });
    }),

  updateIdea: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        platform: z
          .enum(["linkedin", "facebook", "youtube", "blog", "email"])
          .optional(),
        status: z
          .enum(["idea", "researched", "drafted", "published"])
          .optional(),
        publishedUrl: z.string().optional(),
        scheduledDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.contentIdea.update({ where: { id }, data });
    }),

  deleteIdea: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.contentIdea.delete({ where: { id: input.id } });
    }),

  triggerResearch: protectedProcedure
    .input(z.object({ ideaId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const idea = await ctx.prisma.contentIdea.findUnique({
        where: { id: input.ideaId },
      });
      if (!idea) throw new TRPCError({ code: "NOT_FOUND" });

      // Create a research record linked to this content idea
      const research = await ctx.prisma.research.create({
        data: {
          userId: ctx.userId,
          title: `Content Research: ${idea.title}`,
          originalPrompt: `Research the following content idea for Open Infinity (openinfinity.co.za): "${idea.title}". ${idea.description || ""} Provide insights on: 1) What makes this topic compelling for SA businesses, 2) Key points to cover, 3) Best angles for LinkedIn/blog, 4) Competitor content analysis, 5) Suggested headline variations. Also analyze openinfinity.co.za and suggest improvements for higher conversion rates, more leads, and more calls booked.`,
          refinedPrompt: `Content research: ${idea.title}`,
          scope: "GENERAL_RESEARCH",
          status: "PENDING",
          searchMethod: "GEMINI_GROUNDING",
        },
      });

      // Update the content idea with the research link
      await ctx.prisma.contentIdea.update({
        where: { id: input.ideaId },
        data: { researchId: research.id, status: "researched" },
      });

      // Trigger the research via Inngest
      try {
        await inngest.send({
          name: "research/execute",
          data: {
            researchId: research.id,
            userId: ctx.userId,
          },
        });
      } catch (e) {
        // Inngest may not be running locally, that's ok — research is still created
        console.warn("Inngest send failed (may not be configured):", e);
      }

      return { researchId: research.id };
    }),
});
