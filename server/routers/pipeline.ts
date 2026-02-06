import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { PipelineType } from "@prisma/client";

// Default stages for new pipelines
const DEFAULT_SALES_STAGES = [
  { name: "Discovery", order: 1, probability: 0.1 },
  { name: "Qualification", order: 2, probability: 0.25 },
  { name: "Proposal", order: 3, probability: 0.5 },
  { name: "Negotiation", order: 4, probability: 0.75 },
  {
    name: "Closed Won",
    order: 5,
    probability: 1.0,
    isClosed: true,
    isWon: true,
  },
  {
    name: "Closed Lost",
    order: 6,
    probability: 0,
    isClosed: true,
    isWon: false,
  },
];

export const pipelineRouter = router({
  // List all pipelines
  list: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.pipeline.findMany({
      where: { userId: ctx.userId },
      include: {
        stages: { orderBy: { order: "asc" } },
        _count: { select: { leads: true, deals: true } },
      },
      orderBy: { createdAt: "asc" },
    });
  }),

  // Get single pipeline with stages
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const pipeline = await ctx.prisma.pipeline.findUnique({
        where: { id: input.id },
        include: {
          stages: {
            orderBy: { order: "asc" },
            include: {
              _count: { select: { leads: true, deals: true } },
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

      return pipeline;
    }),

  // Create pipeline with default stages
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        type: z.nativeEnum(PipelineType).default(PipelineType.SALES),
        color: z.string().default("#3B82F6"),
        isDefault: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // If this is set as default, unset other defaults
      if (input.isDefault) {
        await ctx.prisma.pipeline.updateMany({
          where: { userId: ctx.userId, isDefault: true },
          data: { isDefault: false },
        });
      }

      return ctx.prisma.pipeline.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          type: input.type,
          color: input.color,
          isDefault: input.isDefault,
          stages: {
            create: DEFAULT_SALES_STAGES,
          },
        },
        include: { stages: { orderBy: { order: "asc" } } },
      });
    }),

  // Update pipeline
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        type: z.nativeEnum(PipelineType).optional(),
        color: z.string().optional(),
        isDefault: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const pipeline = await ctx.prisma.pipeline.findUnique({ where: { id } });
      if (!pipeline || pipeline.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      // If setting as default, unset others
      if (data.isDefault) {
        await ctx.prisma.pipeline.updateMany({
          where: { userId: ctx.userId, isDefault: true, id: { not: id } },
          data: { isDefault: false },
        });
      }

      return ctx.prisma.pipeline.update({
        where: { id },
        data,
        include: { stages: { orderBy: { order: "asc" } } },
      });
    }),

  // Delete pipeline (only if no leads/deals)
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const pipeline = await ctx.prisma.pipeline.findUnique({
        where: { id: input.id },
        include: { _count: { select: { leads: true, deals: true } } },
      });

      if (!pipeline || pipeline.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      if (pipeline._count.leads > 0 || pipeline._count.deals > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete pipeline with active leads or deals",
        });
      }

      return ctx.prisma.pipeline.delete({ where: { id: input.id } });
    }),

  // Create stage
  createStage: protectedProcedure
    .input(
      z.object({
        pipelineId: z.string(),
        name: z.string().min(1),
        order: z.number().int().min(1),
        probability: z.number().min(0).max(1).default(0),
        isClosed: z.boolean().default(false),
        isWon: z.boolean().default(false),
        daysInStageAlert: z.number().int().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pipeline = await ctx.prisma.pipeline.findUnique({
        where: { id: input.pipelineId },
      });

      if (!pipeline || pipeline.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      // Shift existing stages if needed
      await ctx.prisma.pipelineStage.updateMany({
        where: { pipelineId: input.pipelineId, order: { gte: input.order } },
        data: { order: { increment: 1 } },
      });

      return ctx.prisma.pipelineStage.create({
        data: {
          pipelineId: input.pipelineId,
          name: input.name,
          order: input.order,
          probability: input.probability,
          isClosed: input.isClosed,
          isWon: input.isWon,
          daysInStageAlert: input.daysInStageAlert,
        },
      });
    }),

  // Update stage
  updateStage: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        order: z.number().int().optional(),
        probability: z.number().min(0).max(1).optional(),
        isClosed: z.boolean().optional(),
        isWon: z.boolean().optional(),
        daysInStageAlert: z.number().int().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const stage = await ctx.prisma.pipelineStage.findUnique({
        where: { id: input.id },
        include: { pipeline: true },
      });

      if (!stage || stage.pipeline.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stage not found" });
      }

      const { id, ...data } = input;
      return ctx.prisma.pipelineStage.update({ where: { id }, data });
    }),

  // Delete stage (only if no leads/deals)
  deleteStage: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const stage = await ctx.prisma.pipelineStage.findUnique({
        where: { id: input.id },
        include: {
          pipeline: true,
          _count: { select: { leads: true, deals: true } },
        },
      });

      if (!stage || stage.pipeline.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Stage not found" });
      }

      if (stage._count.leads > 0 || stage._count.deals > 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot delete stage with active leads or deals",
        });
      }

      return ctx.prisma.pipelineStage.delete({ where: { id: input.id } });
    }),

  // Reorder stages
  reorderStages: protectedProcedure
    .input(
      z.object({
        pipelineId: z.string(),
        stageIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const pipeline = await ctx.prisma.pipeline.findUnique({
        where: { id: input.pipelineId },
      });

      if (!pipeline || pipeline.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Pipeline not found",
        });
      }

      // Update order for each stage
      await Promise.all(
        input.stageIds.map((stageId, index) =>
          ctx.prisma.pipelineStage.update({
            where: { id: stageId },
            data: { order: index + 1 },
          }),
        ),
      );

      return ctx.prisma.pipeline.findUnique({
        where: { id: input.pipelineId },
        include: { stages: { orderBy: { order: "asc" } } },
      });
    }),

  // Get or create default pipeline
  getOrCreateDefault: protectedProcedure.mutation(async ({ ctx }) => {
    let defaultPipeline = await ctx.prisma.pipeline.findFirst({
      where: { userId: ctx.userId, isDefault: true },
      include: { stages: { orderBy: { order: "asc" } } },
    });

    if (!defaultPipeline) {
      defaultPipeline = await ctx.prisma.pipeline.create({
        data: {
          userId: ctx.userId,
          name: "Sales Pipeline",
          type: PipelineType.SALES,
          isDefault: true,
          stages: { create: DEFAULT_SALES_STAGES },
        },
        include: { stages: { orderBy: { order: "asc" } } },
      });
    }

    return defaultPipeline;
  }),
});
