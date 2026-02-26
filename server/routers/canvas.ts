import { router, protectedProcedure } from "../trpc";
import { z } from "zod";

export const canvasRouter = router({
  // List all boards for the user
  list: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().optional(),
          clientId: z.string().optional(),
          search: z.string().optional(),
          type: z.string().optional(),
          favoritesOnly: z.boolean().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: Record<string, unknown> = { userId: ctx.userId };

      if (input?.projectId) where.projectId = input.projectId;
      if (input?.clientId) where.clientId = input.clientId;
      if (input?.type) where.type = input.type;
      if (input?.favoritesOnly) where.isFavorited = true;
      if (input?.search) {
        where.name = { contains: input.search, mode: "insensitive" };
      }

      return ctx.prisma.canvasBoard.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          emoji: true,
          type: true,
          color: true,
          projectId: true,
          clientId: true,
          goalId: true,
          taskId: true,
          thumbnail: true,
          isFavorited: true,
          createdAt: true,
          updatedAt: true,
          project: {
            select: { id: true, name: true, color: true, icon: true },
          },
          client: { select: { id: true, name: true, companyName: true } },
        },
      });
    }),

  // Get a single board with full data
  getById: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const board = await ctx.prisma.canvasBoard.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: {
          project: {
            select: { id: true, name: true, color: true, icon: true },
          },
          client: { select: { id: true, name: true, companyName: true } },
        },
      });
      if (!board) throw new Error("Board not found");
      return board;
    }),

  // Create a new board
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        emoji: z.string().optional(),
        type: z.string().optional(),
        color: z.string().optional(),
        projectId: z.string().optional(),
        clientId: z.string().optional(),
        goalId: z.string().optional(),
        taskId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.canvasBoard.create({
        data: {
          ...input,
          userId: ctx.userId,
          boardData: {
            nodes: [],
            connections: [],
            drawings: [],
            viewport: { x: 0, y: 0, zoom: 1 },
          },
        },
      });
    }),

  // Update board data (auto-save)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        emoji: z.string().optional(),
        type: z.string().optional(),
        color: z.string().optional(),
        boardData: z.any().optional(),
        thumbnail: z.string().optional(),
        projectId: z.string().nullable().optional(),
        clientId: z.string().nullable().optional(),
        goalId: z.string().nullable().optional(),
        taskId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.canvasBoard.update({
        where: { id, userId: ctx.userId },
        data,
      });
    }),

  // Delete a board
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.canvasBoard.delete({
        where: { id: input.id, userId: ctx.userId },
      });
    }),

  // Duplicate a board
  duplicate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const original = await ctx.prisma.canvasBoard.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
      if (!original) throw new Error("Board not found");

      return ctx.prisma.canvasBoard.create({
        data: {
          userId: ctx.userId,
          name: `${original.name} (Copy)`,
          emoji: original.emoji,
          type: original.type,
          color: original.color,
          boardData: original.boardData as object,
          projectId: original.projectId,
          clientId: original.clientId,
          goalId: original.goalId,
          taskId: original.taskId,
        },
      });
    }),

  // Toggle favorite
  toggleFavorite: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const board = await ctx.prisma.canvasBoard.findFirst({
        where: { id: input.id, userId: ctx.userId },
        select: { isFavorited: true },
      });
      if (!board) throw new Error("Board not found");

      return ctx.prisma.canvasBoard.update({
        where: { id: input.id },
        data: { isFavorited: !board.isFavorited },
      });
    }),

  // Get all linkable entities for the "Attach Entity" modal
  getLinkedEntities: protectedProcedure.query(async ({ ctx }) => {
    const [projects, tasks, clients, goals, deals, leads, research, meetings] =
      await Promise.all([
        ctx.prisma.project.findMany({
          where: { userId: ctx.userId, archivedAt: null },
          select: {
            id: true,
            name: true,
            status: true,
            color: true,
            icon: true,
            type: true,
            completionPercentage: true,
            deadline: true,
            priority: true,
            client: { select: { id: true, name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        }),
        ctx.prisma.task.findMany({
          where: { userId: ctx.userId, completedAt: null },
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            scheduledDate: true,
            estimatedMinutes: true,
            actualMinutes: true,
            tags: true,
            project: { select: { id: true, name: true, color: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        }),
        ctx.prisma.client.findMany({
          where: { userId: ctx.userId, status: "active" },
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            industry: true,
            status: true,
            tags: true,
            lifetimeValue: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 50,
        }),
        ctx.prisma.goal.findMany({
          where: {
            yearPlan: { userId: ctx.userId },
            status: { not: "completed" },
          },
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            priority: true,
            progress: true,
            targetDate: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 30,
        }),
        ctx.prisma.deal.findMany({
          where: { userId: ctx.userId, status: "OPEN" },
          select: {
            id: true,
            name: true,
            value: true,
            probability: true,
            status: true,
            expectedCloseDate: true,
            client: { select: { id: true, name: true } },
            pipelineStage: { select: { name: true } },
          },
          orderBy: { updatedAt: "desc" },
          take: 30,
        }),
        ctx.prisma.crmLead.findMany({
          where: {
            userId: ctx.userId,
            status: { notIn: ["WON", "LOST", "UNQUALIFIED"] },
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            companyName: true,
            email: true,
            status: true,
            score: true,
            source: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 30,
        }),
        ctx.prisma.research.findMany({
          where: { userId: ctx.userId, status: "COMPLETED" },
          select: {
            id: true,
            title: true,
            scope: true,
            status: true,
            completedAt: true,
            isFavorited: true,
          },
          orderBy: { updatedAt: "desc" },
          take: 20,
        }),
        ctx.prisma.meeting.findMany({
          where: { userId: ctx.userId },
          select: {
            id: true,
            title: true,
            type: true,
            scheduledAt: true,
            status: true,
            duration: true,
            client: { select: { id: true, name: true } },
          },
          orderBy: { scheduledAt: "desc" },
          take: 20,
        }),
      ]);

    return {
      projects,
      tasks,
      clients,
      goals,
      deals,
      leads,
      research,
      meetings,
    };
  }),
});
