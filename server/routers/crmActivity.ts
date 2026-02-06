import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { ActivityType } from "@prisma/client";
import { LeadScoringService } from "../services/leadScoringService";
import { ClientHealthService } from "../services/clientHealthService";

export const crmActivityRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        leadId: z.string().optional(),
        dealId: z.string().optional(),
        clientId: z.string().optional(),
        type: z.nativeEnum(ActivityType),
        subject: z.string().min(1),
        description: z.string().optional(),
        duration: z.number().optional(),
        completedAt: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const activity = await ctx.prisma.crmActivity.create({
        data: {
          userId: ctx.userId,
          leadId: input.leadId,
          dealId: input.dealId,
          clientId: input.clientId,
          type: input.type,
          subject: input.subject,
          description: input.description,
          duration: input.duration,
          completedAt: input.completedAt || new Date(),
        },
      });

      // Recalculate score if linked to a lead
      // Recalculate score if linked to a lead
      if (input.leadId) {
        try {
          const scorer = new LeadScoringService(ctx.prisma);
          await scorer.calculateScore(input.leadId);
        } catch (error) {
          console.error("Failed to update lead score:", error);
        }
      }

      // Update Client Last Interaction & Health
      if (input.clientId) {
        await ctx.prisma.client.update({
          where: { id: input.clientId },
          data: { lastInteractionAt: new Date() },
        });

        // Trigger Health Recalculation
        try {
          const healthService = new ClientHealthService(ctx.prisma);
          await healthService.calculateHealth(input.clientId);
        } catch (e) {
          console.error("Failed to calc health", e);
        }
      }

      return activity;
    }),

  list: protectedProcedure
    .input(
      z.object({
        leadId: z.string().optional(),
        dealId: z.string().optional(),
        clientId: z.string().optional(),
        limit: z.number().default(20),
      }),
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId };
      if (input.leadId) where.leadId = input.leadId;
      if (input.dealId) where.dealId = input.dealId;
      if (input.clientId) where.clientId = input.clientId;

      return ctx.prisma.crmActivity.findMany({
        where,
        orderBy: { completedAt: "desc" },
        take: input.limit,
      });
    }),
});
