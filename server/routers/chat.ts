import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const chatRouter = router({
  /**
   * Get the user's current context for injection into AI chat.
   * This should be called once and cached heavily on the client.
   */
  getContext: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const weekEnd = new Date(today);
    weekEnd.setDate(weekEnd.getDate() + 7);

    const [todaysTasks, upcomingTasks, activeTimer, projects, events] =
      await Promise.all([
        // Today's tasks
        ctx.prisma.task.findMany({
          where: {
            userId: ctx.userId,
            OR: [
              { scheduledDate: { gte: today, lt: tomorrow } },
              { dueDate: { gte: today, lt: tomorrow } },
            ],
            status: { not: "done" },
          },
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            scheduledDate: true,
            dueDate: true,
            project: { select: { name: true } },
          },
          take: 15,
          orderBy: { priority: "asc" },
        }),
        // Upcoming tasks (next 7 days)
        ctx.prisma.task.findMany({
          where: {
            userId: ctx.userId,
            scheduledDate: { gte: tomorrow, lt: weekEnd },
            status: { not: "done" },
          },
          select: {
            id: true,
            title: true,
            priority: true,
            scheduledDate: true,
          },
          take: 10,
          orderBy: { scheduledDate: "asc" },
        }),
        // Active timer
        ctx.prisma.task.findFirst({
          where: { userId: ctx.userId, timerRunning: true },
          select: {
            id: true,
            title: true,
            currentTimerStart: true,
            project: { select: { name: true } },
          },
        }),
        // Active projects
        ctx.prisma.project.findMany({
          where: { userId: ctx.userId, status: "active", archivedAt: null },
          select: { id: true, name: true, completionPercentage: true },
          take: 10,
          orderBy: { updatedAt: "desc" },
        }),
        // Calendar events this week
        ctx.prisma.calendarEvent.findMany({
          where: {
            userId: ctx.userId,
            startTime: { gte: today, lt: weekEnd },
          },
          select: {
            id: true,
            title: true,
            startTime: true,
            endTime: true,
            type: true,
          },
          take: 15,
          orderBy: { startTime: "asc" },
        }),
      ]);

    return {
      todaysTasks,
      upcomingTasks,
      activeTimer,
      projects,
      events,
    };
  }),

  /**
   * Execute an action suggested by the AI.
   */
  executeAction: protectedProcedure
    .input(
      z.object({
        type: z.enum(["addTask", "startTimer"]),
        payload: z.record(z.string(), z.any()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.type === "addTask") {
        const task = await ctx.prisma.task.create({
          data: {
            userId: ctx.userId!,
            title: input.payload.title || "Untitled Task",
            priority: input.payload.priority || "medium",
            status: "not_started",
            scheduledDate: new Date(), // Schedule for today
          },
        });
        return {
          success: true,
          message: `Task "${task.title}" created`,
          taskId: task.id,
        };
      }

      if (input.type === "startTimer") {
        const taskId = input.payload.taskId;
        if (!taskId) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "taskId is required to start a timer",
          });
        }

        // Stop any running timer first
        await ctx.prisma.task.updateMany({
          where: { userId: ctx.userId, timerRunning: true },
          data: { timerRunning: false },
        });

        await ctx.prisma.task.update({
          where: { id: taskId },
          data: {
            timerRunning: true,
            currentTimerStart: new Date(),
          },
        });

        return { success: true, message: "Timer started" };
      }

      return { success: false, message: "Unknown action type" };
    }),
});
