import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { inngest } from "@/inngest/client";

export const prospectingRouter = router({
  // Get all agents for the user
  getAgents: protectedProcedure.query(async ({ ctx }) => {
    return await ctx.prisma.prospectingAgent.findMany({
      where: { userId: ctx.userId },
      include: {
        _count: {
          select: { leads: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }),

  // Create a new agent
  createAgent: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        platform: z.string(),
        searchKeywords: z.array(z.string()).min(1),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.prospectingAgent.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          platform: input.platform,
          searchKeywords: input.searchKeywords,
        },
      });
    }),

  // Toggle active status
  toggleAgent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.prospectingAgent.findUnique({
        where: { id: input.id },
      });

      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      if (agent.userId !== ctx.userId)
        throw new TRPCError({ code: "UNAUTHORIZED" });

      const newStatus = agent.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

      return await ctx.prisma.prospectingAgent.update({
        where: { id: input.id },
        data: { status: newStatus },
      });
    }),

  // Delete agent
  deleteAgent: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.prospectingAgent.findUnique({
        where: { id: input.id },
      });

      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      if (agent.userId !== ctx.userId)
        throw new TRPCError({ code: "UNAUTHORIZED" });

      await ctx.prisma.prospectingAgent.delete({
        where: { id: input.id },
      });

      return { success: true };
    }),

  // Get leads (filterable by agentId)
  getLeads: protectedProcedure
    .input(
      z.object({
        agentId: z.string().optional(),
        limit: z.number().default(50),
      }),
    )
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.lead.findMany({
        where: {
          ...(input.agentId
            ? { agentId: input.agentId }
            : // Only return leads belonging to this user's agents
              { agent: { userId: ctx.userId } }),
        },
        include: {
          agent: {
            select: { name: true, platform: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  // Trigger manual run
  triggerRun: protectedProcedure
    .input(z.object({ agentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const agent = await ctx.prisma.prospectingAgent.findUnique({
        where: { id: input.agentId },
      });

      if (!agent) throw new TRPCError({ code: "NOT_FOUND" });
      if (agent.userId !== ctx.userId)
        throw new TRPCError({ code: "UNAUTHORIZED" });

      // Trigger Inngest job immediately
      await inngest.send({
        name: "prospecting/run-agent",
        data: {
          agentId: agent.id,
          userId: ctx.userId,
        },
      });

      return { success: true, message: "Agent run triggered" };
    }),

  // Mark lead contacted
  markContacted: protectedProcedure
    .input(z.object({ leadId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.prisma.lead.findUnique({
        where: { id: input.leadId },
        include: { agent: true },
      });

      if (!lead || !lead.agent || lead.agent.userId !== ctx.userId) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      return await ctx.prisma.lead.update({
        where: { id: input.leadId },
        data: {
          contacted: true,
          contactedAt: new Date(),
        },
      });
    }),
});
