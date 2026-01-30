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
        projectId: true,
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

  // Get hours worked chart data (Productivity Trends)
  getProductivityTrends: protectedProcedure
    .input(
      z.object({
        range: z.enum(["7d", "30d", "90d"]).default("7d"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(23, 59, 59, 999);

      const startDate = new Date(today);
      if (input.range === "7d") startDate.setDate(startDate.getDate() - 7);
      else if (input.range === "30d")
        startDate.setDate(startDate.getDate() - 30);
      else startDate.setDate(startDate.getDate() - 90);
      startDate.setHours(0, 0, 0, 0);

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

      // Initialize map with all dates in range
      const dailyMap: Record<string, number> = {};
      const currentDate = new Date(startDate);
      while (currentDate <= today) {
        dailyMap[currentDate.toISOString().split("T")[0]] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Fill with data
      timeEntries.forEach((entry) => {
        const dateKey = entry.startTime.toISOString().split("T")[0];
        if (dailyMap[dateKey] !== undefined) {
          dailyMap[dateKey] += entry.duration / 60;
        }
      });

      return Object.entries(dailyMap).map(([date, hours]) => ({
        date,
        hours: Math.round(hours * 10) / 10,
      }));
    }),

  // Project Distribution (Pie Chart)
  getProjectDistribution: protectedProcedure.query(async ({ ctx }) => {
    // Get all time entries
    // Note: For a real large app, we should limit this to last 30/90 days or aggregate in DB
    const timeEntries = await ctx.prisma.timeEntry.findMany({
      where: { userId: ctx.userId },
      include: { project: true },
    });

    const projectHours: Record<
      string,
      { name: string; color: string; hours: number }
    > = {};
    const noProjectKey = "No Project";

    timeEntries.forEach((entry) => {
      const key = entry.projectId || noProjectKey;
      if (!projectHours[key]) {
        projectHours[key] = {
          name: entry.project?.name || "No Project",
          color: entry.project?.color || "#94a3b8", // slate-400
          hours: 0,
        };
      }
      projectHours[key].hours += entry.duration / 60;
    });

    return Object.values(projectHours)
      .map((p) => ({ ...p, hours: Math.round(p.hours * 10) / 10 }))
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 8); // Top 8 projects
  }),

  // Task Completion Trends (Bar Chart)
  getTaskCompletionTrends: protectedProcedure
    .input(z.object({ range: z.enum(["7d", "30d"]).default("7d") }))
    .query(async ({ ctx, input }) => {
      const today = new Date();
      const startDate = new Date(today);
      startDate.setDate(startDate.getDate() - (input.range === "7d" ? 7 : 30));
      startDate.setHours(0, 0, 0, 0);

      const tasks = await ctx.prisma.task.findMany({
        where: {
          userId: ctx.userId,
          OR: [
            { completedAt: { gte: startDate } },
            { createdAt: { gte: startDate } },
          ],
        },
        select: {
          createdAt: true,
          completedAt: true,
          status: true,
        },
      });

      const dailyStats: Record<string, { completed: number; created: number }> =
        {};
      const currentDate = new Date(startDate);
      while (currentDate <= today) {
        dailyStats[currentDate.toISOString().split("T")[0]] = {
          completed: 0,
          created: 0,
        };
        currentDate.setDate(currentDate.getDate() + 1);
      }

      tasks.forEach((task) => {
        const createdKey = task.createdAt.toISOString().split("T")[0];
        if (dailyStats[createdKey]) dailyStats[createdKey].created++;

        if (task.completedAt) {
          const completedKey = task.completedAt.toISOString().split("T")[0];
          if (dailyStats[completedKey]) dailyStats[completedKey].completed++;
        }
      });

      return Object.entries(dailyStats).map(([date, stats]) => ({
        date,
        completed: stats.completed,
        created: stats.created,
      }));
    }),

  // Keep compatible with existing getHoursWorked if used elsewhere,
  // or we can remove it if we replace all usages.
  // Leaving it for now to avoid breaking changes if sidebar/dashboard uses it.
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

  // Predict project completion date based on velocity
  getCompletionPrediction: protectedProcedure
    .input(z.object({ projectId: z.string() }))
    .query(async ({ ctx, input }) => {
      // 1. Calculate user's velocity (tasks/day) over last 30 days
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const tasksCompletedLast30Days = await ctx.prisma.task.count({
        where: {
          userId: ctx.userId,
          completedAt: { gte: thirtyDaysAgo },
        },
      });

      // Avoid division by zero, assume at least 0.5 tasks/day if new user
      const velocity = Math.max(tasksCompletedLast30Days / 30, 0.5);

      // 2. Count remaining tasks for this project
      const remainingTasks = await ctx.prisma.task.count({
        where: {
          projectId: input.projectId,
          status: { not: "done" },
        },
      });

      if (remainingTasks === 0) {
        return {
          predictedDate: null,
          daysRemaining: 0,
          status: "Completed",
          velocity: velocity.toFixed(2),
        };
      }

      // 3. Calculate days needed
      const daysNeeded = Math.ceil(remainingTasks / velocity);
      const predictedDate = new Date(today);
      predictedDate.setDate(predictedDate.getDate() + daysNeeded);

      return {
        predictedDate,
        daysRemaining: daysNeeded,
        velocity: velocity.toFixed(2),
        remainingTasks,
      };
    }),
});
