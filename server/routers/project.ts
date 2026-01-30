import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const projectRouter = router({
  // Get all projects for the current user
  getProjects: protectedProcedure
    .input(
      z
        .object({
          status: z
            .enum(["planning", "active", "on_hold", "completed", "cancelled"])
            .optional(),
          type: z
            .enum(["client", "personal", "life_area", "recurring"])
            .optional(),
          clientId: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.project.findMany({
        where: {
          userId: ctx.userId,
          archivedAt: null,
          ...(input?.status && { status: input.status }),
          ...(input?.type && { type: input.type }),
          ...(input?.clientId && { clientId: input.clientId }),
        },
        include: {
          _count: {
            select: { tasks: true },
          },
          client: {
            select: { id: true, name: true },
          },
        },
        orderBy: [
          { priority: "asc" },
          { deadline: "asc" },
          { createdAt: "desc" },
        ],
      });
    }),

  // Get a single project with tasks
  getProject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: {
          tasks: {
            orderBy: [{ status: "asc" }, { priority: "asc" }],
          },
          client: true,
          timeEntries: {
            orderBy: { startTime: "desc" },
            take: 10,
          },
        },
      });

      if (!project || project.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return project;
    }),

  // Create a new project
  createProject: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        type: z
          .enum(["client", "personal", "life_area", "recurring"])
          .default("personal"),
        status: z
          .enum(["planning", "active", "on_hold", "completed", "cancelled"])
          .default("active"),
        priority: z
          .enum(["critical", "high", "medium", "low"])
          .default("medium"),
        clientId: z.string().optional(),
        billable: z.boolean().default(false),
        hourlyRate: z.number().optional(),
        budgetHours: z.number().optional(),
        startDate: z.date().optional(),
        deadline: z.date().optional(),
        estimatedHours: z.number().optional(),
        color: z.string().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.project.create({
        data: {
          ...input,
          userId: ctx.userId,
        },
      });
    }),

  // Update a project
  updateProject: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        description: z.string().nullable().optional(),
        type: z
          .enum(["client", "personal", "life_area", "recurring"])
          .optional(),
        status: z
          .enum(["planning", "active", "on_hold", "completed", "cancelled"])
          .optional(),
        priority: z.enum(["critical", "high", "medium", "low"]).optional(),
        clientId: z.string().nullable().optional(),
        billable: z.boolean().optional(),
        hourlyRate: z.number().nullable().optional(),
        budgetHours: z.number().nullable().optional(),
        startDate: z.date().nullable().optional(),
        deadline: z.date().nullable().optional(),
        estimatedHours: z.number().nullable().optional(),
        completionPercentage: z.number().min(0).max(100).optional(),
        color: z.string().nullable().optional(),
        tags: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const project = await ctx.prisma.project.findUnique({ where: { id } });
      if (!project || project.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // If status changed to completed, set completedAt
      if (input.status === "completed" && project.status !== "completed") {
        (data as Record<string, unknown>).completedAt = new Date();
      }

      return ctx.prisma.project.update({
        where: { id },
        data,
      });
    }),

  // Delete (archive) a project
  deleteProject: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
      });
      if (!project || project.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Soft delete by archiving
      return ctx.prisma.project.update({
        where: { id: input.id },
        data: { archivedAt: new Date() },
      });
    }),

  // Get project stats
  getProjectStats: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: {
          tasks: {
            select: {
              status: true,
              actualMinutes: true,
              estimatedMinutes: true,
            },
          },
          timeEntries: {
            select: { duration: true, billable: true, amount: true },
          },
        },
      });

      if (!project || project.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const taskStats = {
        total: project.tasks.length,
        completed: project.tasks.filter((t) => t.status === "done").length,
        inProgress: project.tasks.filter((t) => t.status === "in_progress")
          .length,
        notStarted: project.tasks.filter((t) => t.status === "not_started")
          .length,
      };

      const timeStats = {
        totalMinutes: project.timeEntries.reduce(
          (acc, e) => acc + e.duration,
          0,
        ),
        billableMinutes: project.timeEntries
          .filter((e) => e.billable)
          .reduce((acc, e) => acc + e.duration, 0),
        totalRevenue: project.timeEntries.reduce((acc, e) => acc + e.amount, 0),
      };

      return {
        ...taskStats,
        completionRate:
          taskStats.total > 0
            ? (taskStats.completed / taskStats.total) * 100
            : 0,
        ...timeStats,
      };
    }),
});
