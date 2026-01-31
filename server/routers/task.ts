import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  recalculateKeyStepProgress,
  recalculateGoalProgress,
} from "../progress-utils";

export const taskRouter = router({
  // Get all tasks for the current user
  getTasks: protectedProcedure
    .input(
      z
        .object({
          projectId: z.string().optional(),
          status: z
            .enum([
              "not_started",
              "in_progress",
              "blocked",
              "done",
              "cancelled",
            ])
            .optional(),
          scheduledDate: z.date().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.task.findMany({
        where: {
          userId: ctx.userId,
          ...(input?.projectId && { projectId: input.projectId }),
          ...(input?.status && { status: input.status }),
          ...(input?.scheduledDate && { scheduledDate: input.scheduledDate }),
        },
        include: {
          project: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: [
          { priority: "asc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
      });
    }),

  // Get a single task
  getTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
        include: {
          project: true,
          timeEntries: true,
        },
      });

      if (!task || task.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return task;
    }),

  // Create a new task
  createTask: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        projectId: z.string().optional(),
        priority: z
          .enum(["critical", "high", "medium", "low"])
          .default("medium"),
        type: z
          .enum(["deep_work", "shallow_work", "admin", "meeting", "learning"])
          .default("shallow_work"),
        dueDate: z.date().optional(),
        scheduledDate: z.date().optional(),
        estimatedMinutes: z.number().optional(),
        energyRequired: z.number().min(1).max(10).optional(),
        tags: z.array(z.string()).optional(),
        goalId: z.string().optional(),
        keyStepId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.task.create({
        data: {
          ...input,
          userId: ctx.userId,
          status: "not_started",
        },
      });
    }),

  // Update a task (triggering rebuild)
  updateTask: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        projectId: z.string().nullable().optional(),
        priority: z.enum(["critical", "high", "medium", "low"]).optional(),
        type: z
          .enum(["deep_work", "shallow_work", "admin", "meeting", "learning"])
          .optional(),
        status: z
          .enum(["not_started", "in_progress", "blocked", "done", "cancelled"])
          .optional(),
        dueDate: z.date().nullable().optional(),
        scheduledDate: z.date().nullable().optional(),
        estimatedMinutes: z.number().nullable().optional(),
        energyRequired: z.number().min(1).max(10).nullable().optional(),
        tags: z.array(z.string()).optional(),
        goalId: z.string().nullable().optional(),
        keyStepId: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const task = await ctx.prisma.task.findUnique({ where: { id } });
      if (!task || task.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      const updatedTask = await ctx.prisma.task.update({
        where: { id },
        data,
      });

      // Trigger progress recalculation if task has a keyStepId and status changed
      if (updatedTask.keyStepId && input.status) {
        await recalculateKeyStepProgress(ctx.prisma, updatedTask.keyStepId);
      }

      return updatedTask;
    }),

  // Delete a task
  deleteTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
      });
      if (!task || task.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      await ctx.prisma.task.delete({ where: { id: input.id } });

      // Recalculate progress if linked
      if (task.keyStepId) {
        await recalculateKeyStepProgress(ctx.prisma, task.keyStepId);
      } else if (task.goalId) {
        // If linked directly to goal, we might want to handle that too
        // For now, let's just re-check direct goal tasks if we support that
      }

      return task;
    }),

  // Start working on a task (simple status-based tracking, no timer complexity)
  startTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
      });
      if (!task || task.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // Only set startedAt if not already started
      const startedAt = task.startedAt || new Date();

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          status: "in_progress",
          startedAt,
        },
      });
    }),

  // Start timer on a task
  startTimer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Stop any running timers first
      await ctx.prisma.task.updateMany({
        where: {
          userId: ctx.userId,
          timerRunning: true,
        },
        data: {
          timerRunning: false,
        },
      });

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          timerRunning: true,
          currentTimerStart: new Date(),
          status: "in_progress",
          startedAt: new Date(),
        },
      });
    }),

  // Stop timer on a task
  stopTimer: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
      });
      if (!task || task.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      if (!task.timerRunning || !task.currentTimerStart) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Timer not running",
        });
      }

      const elapsed = Math.floor(
        (Date.now() - task.currentTimerStart.getTime()) / 60000,
      );

      // Create time entry
      await ctx.prisma.timeEntry.create({
        data: {
          userId: ctx.userId,
          taskId: task.id,
          projectId: task.projectId,
          startTime: task.currentTimerStart,
          endTime: new Date(),
          duration: elapsed,
          type: "timer",
        },
      });

      return ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          timerRunning: false,
          currentTimerStart: null,
          actualMinutes: task.actualMinutes + elapsed,
        },
      });
    }),

  // Complete a task
  completeTask: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
      });
      if (!task || task.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      // If timer is running, stop it first
      let additionalMinutes = 0;
      if (task.timerRunning && task.currentTimerStart) {
        additionalMinutes = Math.floor(
          (Date.now() - task.currentTimerStart.getTime()) / 60000,
        );

        await ctx.prisma.timeEntry.create({
          data: {
            userId: ctx.userId,
            taskId: task.id,
            projectId: task.projectId,
            startTime: task.currentTimerStart,
            endTime: new Date(),
            duration: additionalMinutes,
            type: "timer",
          },
        });
      } else if (task.startedAt && task.actualMinutes === 0) {
        // If no timer was used but task was started, calculate from startedAt
        additionalMinutes = Math.floor(
          (Date.now() - task.startedAt.getTime()) / 60000,
        );

        await ctx.prisma.timeEntry.create({
          data: {
            userId: ctx.userId,
            taskId: task.id,
            projectId: task.projectId,
            startTime: task.startedAt,
            endTime: new Date(),
            duration: additionalMinutes,
            type: "work_session",
          },
        });
      }

      const updatedTask = await ctx.prisma.task.update({
        where: { id: input.id },
        data: {
          status: "done",
          completedAt: new Date(),
          timerRunning: false,
          currentTimerStart: null,
          actualMinutes: task.actualMinutes + additionalMinutes,
        },
      });

      // Propagate progress
      if (updatedTask.keyStepId) {
        await recalculateKeyStepProgress(ctx.prisma, updatedTask.keyStepId);
      }

      return updatedTask;
    }),

  // Get active timer
  getActiveTimer: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.task.findFirst({
      where: {
        userId: ctx.userId,
        timerRunning: true,
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
    });
  }),

  // Get tasks for today
  getTodaysTasks: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return ctx.prisma.task.findMany({
      where: {
        userId: ctx.userId,
        OR: [
          {
            scheduledDate: {
              gte: today,
              lt: tomorrow,
            },
          },
          {
            dueDate: {
              gte: today,
              lt: tomorrow,
            },
          },
        ],
        status: {
          not: "done",
        },
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { priority: "asc" },
    });
  }),

  // Get backlog tasks (unscheduled)
  getBacklogTasks: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.task.findMany({
      where: {
        userId: ctx.userId,
        // Remove strictly null filter for now so user can see their tasks
        // and drag them to reschedule or time block them.
        // scheduledDate: null,
        status: { not: "done" },
      },
      include: {
        project: {
          select: { id: true, name: true, color: true },
        },
      },
      orderBy: { priority: "asc" },
    });
  }),
});
