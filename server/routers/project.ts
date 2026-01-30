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

  // Get all projects classified by urgency
  getUrgencySummary: protectedProcedure.query(async ({ ctx }) => {
    const projects = await ctx.prisma.project.findMany({
      where: {
        userId: ctx.userId,
        status: { in: ["active", "planning"] },
        archivedAt: null,
      },
      include: {
        tasks: { select: { status: true } },
        client: { select: { name: true } },
      },
    });

    const scoredProjects = projects.map((project) => {
      // 1. Deadline Score
      let deadlineScore = 0;
      let daysUntil = 999;
      if (project.deadline) {
        const now = new Date();
        const deadline = new Date(project.deadline);
        daysUntil = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysUntil < 0) deadlineScore = 40;
        else if (daysUntil <= 3) deadlineScore = 35;
        else if (daysUntil <= 7) deadlineScore = 25;
        else if (daysUntil <= 14) deadlineScore = 15;
        else deadlineScore = 5;
      }

      // 2. Priority Score
      let priorityScore = 0;
      if (project.priority === "critical") priorityScore = 20;
      else if (project.priority === "high") priorityScore = 15;
      else if (project.priority === "medium") priorityScore = 5;

      // 3. Completion Score
      const total = project.tasks.length;
      const done = project.tasks.filter((t) => t.status === "done").length;
      const rate = total > 0 ? done / total : 0;
      let completionScore = 0;
      if (rate < 0.5) completionScore = 15;
      if (rate < 0.2) completionScore = 30;

      const totalScore = deadlineScore + priorityScore + completionScore;
      let urgency = "On Track";
      if (totalScore >= 70) urgency = "Critical";
      else if (totalScore >= 50) urgency = "Urgent";
      else if (totalScore >= 30) urgency = "Attention";

      return {
        ...project,
        urgency,
        score: totalScore,
        daysUntil,
        progress: Math.round(rate * 100),
      };
    });

    return {
      critical: scoredProjects.filter((p) => p.urgency === "Critical"),
      urgent: scoredProjects.filter((p) => p.urgency === "Urgent"),
      attention: scoredProjects.filter((p) => p.urgency === "Attention"),
    };
  }),

  // Calculate generic urgency score for a project
  getUrgencyStatus: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const project = await ctx.prisma.project.findUnique({
        where: { id: input.id },
        include: {
          client: true,
          tasks: { select: { status: true } },
        },
      });

      if (!project || project.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (project.status === "completed" || project.status === "cancelled") {
        return { status: "Completed", score: 0, color: "bg-gray-500" };
      }

      // 1. Deadline Score (0-40 points)
      let deadlineScore = 0;
      if (project.deadline) {
        const now = new Date();
        const deadline = new Date(project.deadline);
        const daysUntil = Math.ceil(
          (deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
        );

        if (daysUntil < 0)
          deadlineScore = 40; // Overdue
        else if (daysUntil <= 3)
          deadlineScore = 35; // < 3 days
        else if (daysUntil <= 7)
          deadlineScore = 25; // < 1 week
        else if (daysUntil <= 14)
          deadlineScore = 15; // < 2 weeks
        else deadlineScore = 5;
      }

      // 2. Client Priority Score (0-20 points)
      let priorityScore = 0;
      if (project.priority === "critical") priorityScore = 20;
      else if (project.priority === "high") priorityScore = 15;
      else if (project.priority === "medium") priorityScore = 5;

      // 3. Completion Score (Inverse: less complete = higher urgency if deadline near) (0-30 points)
      const totalTasks = project.tasks.length;
      const completedTasks = project.tasks.filter(
        (t) => t.status === "done",
      ).length;
      const completionRate = totalTasks > 0 ? completedTasks / totalTasks : 0;

      let completionScore = 0;
      // If we are < 50% done, that adds urgency
      if (completionRate < 0.5) completionScore = 15;
      if (completionRate < 0.2) completionScore = 30;

      const totalScore = deadlineScore + priorityScore + completionScore;

      let status = "On Track";
      let color = "bg-emerald-500";

      if (totalScore >= 70) {
        status = "Critical";
        color = "bg-red-500";
      } else if (totalScore >= 50) {
        status = "Urgent";
        color = "bg-orange-500";
      } else if (totalScore >= 30) {
        status = "Attention";
        color = "bg-yellow-500";
      }

      return {
        score: totalScore,
        status,
        color,
        details: {
          deadlineScore,
          priorityScore,
          completionScore,
        },
      };
    }),
});
