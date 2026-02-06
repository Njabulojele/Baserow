import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { DealStatus } from "@prisma/client";

export const dealRouter = router({
  // List deals with filters
  list: protectedProcedure
    .input(
      z
        .object({
          pipelineId: z.string().optional(),
          status: z.nativeEnum(DealStatus).optional(),
          minValue: z.number().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId };

      if (input?.pipelineId) where.pipelineId = input.pipelineId;
      if (input?.status) where.status = input.status;
      if (input?.minValue) where.value = { gte: input.minValue };

      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { description: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const deals = await ctx.prisma.deal.findMany({
        where,
        take: input?.limit ?? 50,
        orderBy: [{ expectedCloseDate: "asc" }, { value: "desc" }],
        include: {
          pipeline: { select: { id: true, name: true, color: true } },
          pipelineStage: {
            select: { id: true, name: true, order: true, probability: true },
          },
          lead: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              companyName: true,
            },
          },
          client: { select: { id: true, name: true, companyName: true } },
          _count: { select: { activities: true, notes: true } },
        },
      });

      return deals;
    }),

  // Get deals grouped by pipeline stage (for Kanban view)
  getByStage: protectedProcedure
    .input(z.object({ pipelineId: z.string() }))
    .query(async ({ ctx, input }) => {
      const pipeline = await ctx.prisma.pipeline.findUnique({
        where: { id: input.pipelineId },
        include: {
          stages: {
            orderBy: { order: "asc" },
            include: {
              deals: {
                where: { userId: ctx.userId },
                orderBy: [{ expectedCloseDate: "asc" }],
                include: {
                  lead: {
                    select: {
                      firstName: true,
                      lastName: true,
                      companyName: true,
                    },
                  },
                  client: { select: { name: true, companyName: true } },
                },
              },
            },
          },
        },
      });

      if (!pipeline || pipeline.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      return pipeline.stages;
    }),

  // Get single deal
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const deal = await ctx.prisma.deal.findUnique({
        where: { id: input.id },
        include: {
          pipeline: true,
          pipelineStage: true,
          lead: true,
          client: true,
          activities: {
            orderBy: { completedAt: "desc" },
            take: 15,
          },
          notes: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { user: { select: { name: true, email: true } } },
          },
        },
      });

      if (!deal || deal.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
      }

      return deal;
    }),

  // Create deal
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        description: z.string().optional(),
        value: z.number().min(0),
        probability: z.number().min(0).max(1).default(0.5),
        pipelineId: z.string(),
        pipelineStageId: z.string(),
        expectedCloseDate: z.date(),
        leadId: z.string().optional(),
        clientId: z.string().optional(),
        primaryContact: z.string().optional(),
        nextStep: z.string().optional(),
        nextStepDueDate: z.date().optional(),
        tags: z.array(z.string()).default([]),
        competitors: z.array(z.string()).default([]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify pipeline and stage
      const stage = await ctx.prisma.pipelineStage.findUnique({
        where: { id: input.pipelineStageId },
        include: { pipeline: true },
      });

      if (!stage || stage.pipeline.userId !== ctx.userId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid pipeline stage",
        });
      }

      const weightedValue = input.value * input.probability;

      return ctx.prisma.deal.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          description: input.description,
          value: input.value,
          probability: input.probability,
          weightedValue,
          pipelineId: input.pipelineId,
          pipelineStageId: input.pipelineStageId,
          expectedCloseDate: input.expectedCloseDate,
          leadId: input.leadId,
          clientId: input.clientId,
          primaryContact: input.primaryContact,
          nextStep: input.nextStep,
          nextStepDueDate: input.nextStepDueDate,
          tags: input.tags,
          competitors: input.competitors,
        },
        include: {
          pipeline: { select: { name: true } },
          pipelineStage: { select: { name: true } },
        },
      });
    }),

  // Update deal
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional().nullable(),
        value: z.number().min(0).optional(),
        probability: z.number().min(0).max(1).optional(),
        expectedCloseDate: z.date().optional(),
        primaryContact: z.string().optional().nullable(),
        nextStep: z.string().optional().nullable(),
        nextStepDueDate: z.date().optional().nullable(),
        tags: z.array(z.string()).optional(),
        competitors: z.array(z.string()).optional(),
        decisionMakers: z.array(z.string()).optional(),
        influencers: z.array(z.string()).optional(),
        champions: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const deal = await ctx.prisma.deal.findUnique({ where: { id } });
      if (!deal || deal.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
      }

      // Recalculate weighted value if value or probability changed
      const newValue = data.value ?? deal.value;
      const newProbability = data.probability ?? deal.probability;
      const weightedValue = newValue * newProbability;

      return ctx.prisma.deal.update({
        where: { id },
        data: { ...data, weightedValue },
      });
    }),

  // Move deal to different stage
  moveStage: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        pipelineStageId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deal = await ctx.prisma.deal.findUnique({
        where: { id: input.id },
      });
      if (!deal || deal.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
      }

      const stage = await ctx.prisma.pipelineStage.findUnique({
        where: { id: input.pipelineStageId },
      });

      if (!stage || stage.pipelineId !== deal.pipelineId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid stage" });
      }

      // Update probability based on stage probability
      const weightedValue = deal.value * stage.probability;

      return ctx.prisma.deal.update({
        where: { id: input.id },
        data: {
          pipelineStageId: input.pipelineStageId,
          probability: stage.probability,
          weightedValue,
          stageEnteredAt: new Date(),
          daysInCurrentStage: 0,
          // Close deal if moving to closed stage
          status: stage.isClosed
            ? stage.isWon
              ? DealStatus.WON
              : DealStatus.LOST
            : DealStatus.OPEN,
          actualCloseDate: stage.isClosed ? new Date() : null,
        },
        include: {
          pipelineStage: { select: { name: true } },
        },
      });
    }),

  // Close deal (won or lost)
  close: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        won: z.boolean(),
        lostReason: z.string().optional(),
        actualValue: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deal = await ctx.prisma.deal.findUnique({
        where: { id: input.id },
        include: { pipeline: { include: { stages: true } } },
      });

      if (!deal || deal.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
      }

      // Find appropriate closed stage
      const closedStage = deal.pipeline.stages.find(
        (s) => s.isClosed && s.isWon === input.won,
      );

      return ctx.prisma.deal.update({
        where: { id: input.id },
        data: {
          status: input.won ? DealStatus.WON : DealStatus.LOST,
          actualCloseDate: new Date(),
          lostReason: input.lostReason,
          value: input.actualValue ?? deal.value,
          probability: input.won ? 1 : 0,
          weightedValue: input.won ? (input.actualValue ?? deal.value) : 0,
          pipelineStageId: closedStage?.id ?? deal.pipelineStageId,
        },
      });
    }),

  // Delete deal
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const deal = await ctx.prisma.deal.findUnique({
        where: { id: input.id },
      });
      if (!deal || deal.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
      }

      return ctx.prisma.deal.delete({ where: { id: input.id } });
    }),

  // Add note to deal
  addNote: protectedProcedure
    .input(
      z.object({
        dealId: z.string(),
        content: z.string().min(1),
        isPinned: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const deal = await ctx.prisma.deal.findUnique({
        where: { id: input.dealId },
      });
      if (!deal || deal.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Deal not found" });
      }

      return ctx.prisma.dealNote.create({
        data: {
          dealId: input.dealId,
          userId: ctx.userId,
          content: input.content,
          isPinned: input.isPinned,
        },
      });
    }),

  // Get deal statistics and forecasting
  getStats: protectedProcedure
    .input(z.object({ pipelineId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId };
      if (input?.pipelineId) where.pipelineId = input.pipelineId;

      const [
        totalDeals,
        openDeals,
        wonDeals,
        lostDeals,
        pipelineValue,
        forecastValue,
      ] = await Promise.all([
        ctx.prisma.deal.count({ where }),
        ctx.prisma.deal.count({ where: { ...where, status: DealStatus.OPEN } }),
        ctx.prisma.deal.count({ where: { ...where, status: DealStatus.WON } }),
        ctx.prisma.deal.count({ where: { ...where, status: DealStatus.LOST } }),
        ctx.prisma.deal.aggregate({
          where: { ...where, status: DealStatus.OPEN },
          _sum: { value: true },
        }),
        ctx.prisma.deal.aggregate({
          where: { ...where, status: DealStatus.OPEN },
          _sum: { weightedValue: true },
        }),
      ]);

      const winRate =
        wonDeals + lostDeals > 0 ? wonDeals / (wonDeals + lostDeals) : 0;

      return {
        totalDeals,
        openDeals,
        wonDeals,
        lostDeals,
        winRate,
        pipelineValue: pipelineValue._sum.value ?? 0,
        forecastValue: forecastValue._sum.weightedValue ?? 0,
      };
    }),
});
