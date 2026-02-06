import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { ClientHealthService } from "../services/clientHealthService";

// Health score calculation weights
const WEIGHTS = {
  engagement: 0.35,
  relationship: 0.35,
  payment: 0.3,
};

export const clientHealthRouter = router({
  // Get health score for a client
  get: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.clientId },
        include: { healthScore: true },
      });

      if (!client || client.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return client.healthScore;
    }),

  // Calculate and update health score
  calculate: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const service = new ClientHealthService(ctx.prisma);
      return service.calculateHealth(input.clientId);
    }),

  // Get all clients at risk (churn risk > 0.5)
  listAtRisk: protectedProcedure.query(async ({ ctx }) => {
    const atRiskClients = await ctx.prisma.clientHealthScore.findMany({
      where: {
        churnRisk: { gte: 0.5 },
        client: { userId: ctx.userId },
      },
      include: {
        client: {
          select: { id: true, name: true, companyName: true, email: true },
        },
      },
      orderBy: { churnRisk: "desc" },
    });

    return atRiskClients;
  }),

  // Get expansion opportunities
  listExpansionOpportunities: protectedProcedure.query(async ({ ctx }) => {
    const opportunities = await ctx.prisma.clientHealthScore.findMany({
      where: {
        expansionPotential: { gte: 0.5 },
        client: { userId: ctx.userId },
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            companyName: true,
            lifetimeValue: true,
          },
        },
      },
      orderBy: { expansionPotential: "desc" },
    });

    return opportunities;
  }),

  // Get health summary for dashboard
  getSummary: protectedProcedure.query(async ({ ctx }) => {
    const clients = await ctx.prisma.client.findMany({
      where: { userId: ctx.userId, status: "active" },
      include: { healthScore: true },
    });

    const withScores = clients.filter((c) => c.healthScore);
    const avgScore =
      withScores.length > 0
        ? withScores.reduce(
            (sum, c) => sum + (c.healthScore?.overallScore ?? 0),
            0,
          ) / withScores.length
        : 0;

    const atRiskCount = withScores.filter(
      (c) => (c.healthScore?.churnRisk ?? 0) > 0.5,
    ).length;
    const healthyCount = withScores.filter(
      (c) => (c.healthScore?.overallScore ?? 0) > 70,
    ).length;
    const needsAttention = withScores.filter(
      (c) =>
        (c.healthScore?.overallScore ?? 0) <= 70 &&
        (c.healthScore?.overallScore ?? 0) > 40,
    ).length;

    return {
      totalClients: clients.length,
      clientsWithScores: withScores.length,
      averageScore: Math.round(avgScore),
      atRiskCount,
      healthyCount,
      needsAttentionCount: needsAttention,
    };
  }),

  // Add milestone for client
  addMilestone: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        type: z.string(),
        title: z.string(),
        description: z.string().optional(),
        impactOnHealth: z.number().min(-10).max(10).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.clientId },
      });

      if (!client || client.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.prisma.clientMilestone.create({
        data: {
          clientId: input.clientId,
          type: input.type,
          title: input.title,
          description: input.description,
          impactOnHealth: input.impactOnHealth,
        },
      });
    }),

  // Get client milestones
  getMilestones: protectedProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.clientId },
      });

      if (!client || client.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.prisma.clientMilestone.findMany({
        where: { clientId: input.clientId },
        orderBy: { achievedAt: "desc" },
      });
    }),
});
