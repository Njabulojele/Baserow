import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const analyticsRouter = router({
  // Get dashboard stats
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)

    // Tasks due today
    const todaysTasks = await ctx.prisma.task.count({
      where: {
        userId: ctx.userId,
        OR: [
          { scheduledDate: { gte: today, lt: tomorrow } },
          { dueDate: { gte: today, lt: tomorrow } },
        ],
        status: { not: "done" },
      },
    });

    // Tasks completed today
    const completedToday = await ctx.prisma.task.count({
      where: {
        userId: ctx.userId,
        completedAt: { gte: today, lt: tomorrow },
      },
    });

    // Active projects
    const activeProjects = await ctx.prisma.project.count({
      where: {
        userId: ctx.userId,
        status: "active",
        archivedAt: null,
      },
    });

    // Hours worked this week
    const weekTimeEntries = await ctx.prisma.timeEntry.aggregate({
      where: {
        userId: ctx.userId,
        startTime: { gte: weekStart },
      },
      _sum: {
        duration: true,
      },
    });

    const hoursThisWeek =
      Math.round(((weekTimeEntries._sum.duration || 0) / 60) * 10) / 10;

    // Active timer
    const activeTimer = await ctx.prisma.task.findFirst({
      where: {
        userId: ctx.userId,
        timerRunning: true,
      },
      select: {
        id: true,
        title: true,
        currentTimerStart: true,
        project: {
          select: { name: true, color: true },
        },
      },
    });

    return {
      todaysTasks,
      completedToday,
      activeProjects,
      hoursThisWeek,
      activeTimer,
    };
  }),

  // Get hours worked chart data
  getHoursWorked: protectedProcedure
    .input(
      z.object({
        period: z.enum(["week", "month"]).default("week"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = new Date(today);
      if (input.period === "week") {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setDate(startDate.getDate() - 30);
      }

      const timeEntries = await ctx.prisma.timeEntry.findMany({
        where: {
          userId: ctx.userId,
          startTime: { gte: startDate },
        },
        select: {
          startTime: true,
          duration: true,
        },
        orderBy: { startTime: "asc" },
      });

      // Group by day
      const dailyHours: Record<string, number> = {};
      timeEntries.forEach((entry) => {
        const dateKey = entry.startTime.toISOString().split("T")[0];
        dailyHours[dateKey] = (dailyHours[dateKey] || 0) + entry.duration / 60;
      });

      return Object.entries(dailyHours).map(([date, hours]) => ({
        date,
        hours: Math.round(hours * 10) / 10,
      }));
    }),

  // Get task completion stats
  getTaskStats: protectedProcedure
    .input(
      z.object({
        period: z.enum(["week", "month"]).default("week"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDate = new Date(today);
      if (input.period === "week") {
        startDate.setDate(startDate.getDate() - 7);
      } else {
        startDate.setDate(startDate.getDate() - 30);
      }

      const completed = await ctx.prisma.task.count({
        where: {
          userId: ctx.userId,
          completedAt: { gte: startDate },
        },
      });

      const created = await ctx.prisma.task.count({
        where: {
          userId: ctx.userId,
          createdAt: { gte: startDate },
        },
      });

      const pending = await ctx.prisma.task.count({
        where: {
          userId: ctx.userId,
          status: { in: ["not_started", "in_progress", "blocked"] },
        },
      });

      return {
        completed,
        created,
        pending,
        completionRate:
          created > 0 ? Math.round((completed / created) * 100) : 0,
      };
    }),
});
