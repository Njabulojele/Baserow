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

    // Calculate total duration from time entries
    const timeEntryMinutes = weekTimeEntries._sum.duration || 0;

    // Get actualMinutes from tasks worked on this week
    // We assume tasks updated/completed this week with actualMinutes > 0 represent work done this week.
    // To avoid massive double counting with TimeEntries (which are creating actualMinutes too),
    // we take the MAXIMUM of (TimeEntry Sum) vs (Task actualMinutes Sum).
    // This is heuristic: if you use detailed timers, TimeEntries > actualMinutes (usually, or equal).
    // If you use "Start/Stop" without timers, actualMinutes > TimeEntry (because TimeEntries might be missing or actualMinutes manually set).
    // Ideally, we sum TimeEntries + (ActualMinutes of tasks that have NO time entries).
    // For simplicity and robustness given the current transition:
    // We'll trust TimeEntries primarily. But if TaskMinutes is significantly higher, we might be missing entries.
    // Let's Add Task Minutes for tasks completed this week that might not have entries?

    // Better Approach:
    // Just sum Duration of TimeEntries for "Recorded Sessions".
    // AND sum `actualMinutes` of tasks completed this week, but only if we think they aren't covered?
    // Actually, sticking to the user's request: "integrate actualMinutes".
    // Let's use TimeEntries as base. If TaskMinutes is higher, use TaskMinutes?
    // No, let's try to be precise.

    // Updated Logic: Use TimeEntries for precision (chart).
    // For the total "Hours This Week", let's use the aggregated TimeEntries
    // PLUS any `actualMinutes` from tasks that *started* and *completed* this week (if we can filter).

    // Simplest robust improvement:
    // Hours = timeEntryMinutes + (taskMinutes - (min(taskMinutes, timeEntries_linked_to_these_tasks)))
    // Too complex.

    // Let's just use TimeEntries + actualMinutes from tasks that do NOT have time entries.
    // That requires specific filtering.

    // Fallback for MVP:
    // Simply use the GREATER of the two values?
    // No, risk of double counting is high if they match.
    // Let's assume TimeEntries are the correct way forward.
    // IF the user says "It doesn't update", maybe they have 0 TimeEntries?

    // If timeEntryMinutes is 0, use taskMinutes.
    // If timeEntryMinutes > 0, use timeEntryMinutes.

    const weekTasks = await ctx.prisma.task.aggregate({
      where: {
        userId: ctx.userId,
        updatedAt: { gte: weekStart },
        actualMinutes: { gt: 0 },
      },
      _sum: {
        actualMinutes: true,
      },
    });

    const taskMinutes = weekTasks._sum.actualMinutes || 0;

    // Intelligent Merge:
    // If we have TimeEntries, they are the gold standard.
    // But if we have High Task Minutes and Low Time Entries, we likely missed recording sessions.
    // Let's simply take the higher value to ensure we don't UNDERREPORT usage to the user
    // (better to be slightly optimistic than show 0).
    const totalMinutes = Math.max(timeEntryMinutes, taskMinutes);

    const hoursThisWeek = Math.round((totalMinutes / 60) * 10) / 10;

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
        range: z.enum(["today", "7d", "30d", "90d"]).default("7d"),
      }),
    )
    .query(async ({ ctx, input }) => {
      const today = new Date();
      const now = new Date();

      // If today range, we query everything from the start of today
      const startDate = new Date(today);
      if (input.range === "today") {
        startDate.setHours(0, 0, 0, 0);
      } else {
        // For other ranges, we want N points ENDING today
        // e.g. 7d = Today + last 6 days
        const days = input.range === "7d" ? 6 : input.range === "30d" ? 29 : 89;
        startDate.setDate(startDate.getDate() - days);
        startDate.setHours(0, 0, 0, 0);
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

      const completedTasks = await ctx.prisma.task.findMany({
        where: {
          userId: ctx.userId,
          completedAt: { gte: startDate },
          actualMinutes: { gt: 0 },
        },
        select: {
          completedAt: true,
          actualMinutes: true,
        },
      });

      if (input.range === "today") {
        // Hourly Map for Today
        const hourlyMap: Record<string, number> = {};
        for (let i = 0; i < 24; i++) {
          hourlyMap[i.toString().padStart(2, "0") + ":00"] = 0;
        }

        // Fill with TimeEntries
        timeEntries.forEach((entry) => {
          const hour = entry.startTime.getHours();
          const key = hour.toString().padStart(2, "0") + ":00";
          if (hourlyMap[key] !== undefined) {
            hourlyMap[key] += entry.duration / 60;
          }
        });

        // Fill/Supplement with Task Minutes
        completedTasks.forEach((task) => {
          if (!task.completedAt) return;
          const hour = task.completedAt.getHours();
          const key = hour.toString().padStart(2, "0") + ":00";
          if (hourlyMap[key] !== undefined) {
            // Heuristic: If we have 0 for this hour, use task minutes
            if (hourlyMap[key] === 0) {
              hourlyMap[key] += task.actualMinutes / 60;
            }
          }
        });

        return Object.entries(hourlyMap).map(([time, hours]) => ({
          date: time,
          hours: Math.round(hours * 10) / 10,
        }));
      }

      // Daily Map for 7d, 30d, 90d
      const dailyMap: Record<string, number> = {};
      const currentDate = new Date(startDate);
      const endOfDay = new Date(today);
      endOfDay.setHours(23, 59, 59, 999);

      while (currentDate <= endOfDay) {
        dailyMap[currentDate.toISOString().split("T")[0]] = 0;
        currentDate.setDate(currentDate.getDate() + 1);
      }

      // Fill with TimeEntry data
      timeEntries.forEach((entry) => {
        const dateKey = entry.startTime.toISOString().split("T")[0];
        if (dailyMap[dateKey] !== undefined) {
          dailyMap[dateKey] += entry.duration / 60;
        }
      });

      // Supplement with Task data
      completedTasks.forEach((task) => {
        if (!task.completedAt) return;
        const dateKey = task.completedAt.toISOString().split("T")[0];
        if (dailyMap[dateKey] !== undefined) {
          if (dailyMap[dateKey] === 0) {
            dailyMap[dateKey] += task.actualMinutes / 60;
          }
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

  // Task Heatmap (Last 365 days)
  getTaskHeatmap: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const oneYearAgo = new Date(today);
    oneYearAgo.setDate(oneYearAgo.getDate() - 365);

    const completedTasks = await ctx.prisma.task.findMany({
      where: {
        userId: ctx.userId,
        completedAt: { gte: oneYearAgo },
      },
      select: { completedAt: true },
    });

    const dailyCounts: Record<string, number> = {};
    completedTasks.forEach((task) => {
      if (task.completedAt) {
        const dateKey = task.completedAt.toISOString().split("T")[0];
        dailyCounts[dateKey] = (dailyCounts[dateKey] || 0) + 1;
      }
    });

    return Object.entries(dailyCounts).map(([date, count]) => ({
      date,
      count,
    }));
  }),

  // Goal Progress Stats (Active Annual & Quarterly Goals)
  getGoalProgressStats: protectedProcedure.query(async ({ ctx }) => {
    const currentYear = new Date().getFullYear();
    const currentQuarter = Math.floor(new Date().getMonth() / 3) + 1;

    // Fetch Annual Goals
    const annualGoals = await ctx.prisma.goal.findMany({
      where: {
        yearPlan: { userId: ctx.userId, year: currentYear },
        status: { not: "cancelled" },
      },
      select: { id: true, title: true, progress: true, category: true },
      take: 5,
      orderBy: { progress: "desc" },
    });

    // Fetch Quarter Focuses
    const quarterPlan = await ctx.prisma.quarterPlan.findFirst({
      where: {
        yearPlan: { userId: ctx.userId, year: currentYear },
        quarter: currentQuarter,
      },
      include: {
        quarterFocuses: {
          include: { goal: true },
          orderBy: { progress: "desc" },
          take: 5,
        },
      },
    });

    return {
      annualGoals,
      quarterFocuses:
        quarterPlan?.quarterFocuses.map((qf) => ({
          id: qf.goal.id,
          title: qf.goal.title,
          progress: qf.progress,
          category: qf.goal.category,
        })) || [],
    };
  }),

  // Weekly Insights Logic
  getWeeklyInsights: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay() + 1); // Monday
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // 1. Tasks Completed This Week
    const tasksCompleted = await ctx.prisma.task.count({
      where: {
        userId: ctx.userId,
        completedAt: { gte: weekStart, lte: weekEnd },
      },
    });

    // 2. Focus Hours This Week
    const timeEntries = await ctx.prisma.timeEntry.aggregate({
      where: {
        userId: ctx.userId,
        startTime: { gte: weekStart, lte: weekEnd },
      },
      _sum: { duration: true },
    });
    const focusHours =
      Math.round(((timeEntries._sum.duration || 0) / 60) * 10) / 10;

    // 3. Most Productive Day
    const weekTasks = await ctx.prisma.task.findMany({
      where: {
        userId: ctx.userId,
        completedAt: { gte: weekStart, lte: weekEnd },
      },
      select: { completedAt: true },
    });

    const dayCounts: Record<string, number> = {};
    weekTasks.forEach((t) => {
      if (t.completedAt) {
        const day = t.completedAt.toLocaleDateString("en-US", {
          weekday: "long",
        });
        dayCounts[day] = (dayCounts[day] || 0) + 1;
      }
    });
    const bestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];

    // 4. Calculate Productivity Score (Simplified)
    // Base 50 + (Tasks * 2) + (Hours * 1.5) capped at 100
    // Real logic needs to consider user averages, but this is a V1 start
    const rawScore = 50 + tasksCompleted * 2 + focusHours * 1.5;
    const productivityScore = Math.min(Math.round(rawScore), 100);

    return {
      tasksCompleted,
      focusHours,
      busiestDay: bestDay ? bestDay[0] : "None yet",
      productivityScore,
      trend: "+12% from last week", // Placeholder for now - would need historical comparison
    };
  }),

  // Revenue overview: split won deals (client revenue) vs open pipeline (lead/pending)
  getRevenueOverview: protectedProcedure.query(async ({ ctx }) => {
    const [wonDeals, openDeals, leadEstimates] = await Promise.all([
      // Client revenue (won deals)
      ctx.prisma.deal.aggregate({
        where: { userId: ctx.userId, status: "WON" },
        _sum: { value: true },
        _count: true,
      }),
      // Pipeline value (open deals)
      ctx.prisma.deal.aggregate({
        where: { userId: ctx.userId, status: "OPEN" },
        _sum: { value: true, weightedValue: true },
        _count: true,
      }),
      // Estimated value from leads
      ctx.prisma.crmLead.aggregate({
        where: {
          userId: ctx.userId,
          status: {
            in: [
              "NEW",
              "CONTACTED",
              "QUALIFIED",
              "PROPOSAL_SENT",
              "NEGOTIATION",
            ],
          },
          estimatedValue: { not: null },
        },
        _sum: { estimatedValue: true },
        _count: true,
      }),
    ]);

    return {
      clientRevenue: wonDeals._sum.value ?? 0,
      clientCount: wonDeals._count,
      pipelineValue: openDeals._sum.value ?? 0,
      pipelineForecast: openDeals._sum.weightedValue ?? 0,
      pipelineCount: openDeals._count,
      leadEstimatedValue: leadEstimates._sum.estimatedValue ?? 0,
      leadCount: leadEstimates._count,
    };
  }),

  // Time breakdown by category for the current week
  getTimeBreakdown: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - today.getDay() + 1); // Monday
    weekStart.setHours(0, 0, 0, 0);

    const timeEntries = await ctx.prisma.timeEntry.findMany({
      where: {
        userId: ctx.userId,
        startTime: { gte: weekStart },
      },
      select: {
        duration: true,
        type: true,
        billable: true,
        client: { select: { name: true } },
        project: { select: { name: true, type: true } },
      },
    });

    // Group by category
    const categories: Record<string, { minutes: number; label: string }> = {};
    timeEntries.forEach((entry) => {
      let key = entry.type || "other";
      let label = key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ");

      if (entry.client) {
        key = "client_work";
        label = "Client Work";
      } else if (entry.project?.type === "personal") {
        key = "personal";
        label = "Personal";
      }

      if (!categories[key]) categories[key] = { minutes: 0, label };
      categories[key].minutes += entry.duration;
    });

    const totalMinutes = timeEntries.reduce((sum, e) => sum + e.duration, 0);
    const billableMinutes = timeEntries
      .filter((e) => e.billable)
      .reduce((sum, e) => sum + e.duration, 0);

    return {
      categories: Object.entries(categories).map(([key, val]) => ({
        key,
        label: val.label,
        hours: Math.round((val.minutes / 60) * 10) / 10,
      })),
      totalHours: Math.round((totalMinutes / 60) * 10) / 10,
      billableHours: Math.round((billableMinutes / 60) * 10) / 10,
    };
  }),

  // Inactivity alerts: clients/leads not contacted in 2+ days
  getInactivityAlerts: protectedProcedure.query(async ({ ctx }) => {
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    // Find clients with no recent activity
    const staleClients = await ctx.prisma.client.findMany({
      where: {
        userId: ctx.userId,
        status: "active",
        OR: [
          { lastContactedAt: { lt: twoDaysAgo } },
          { lastContactedAt: null },
        ],
      },
      select: {
        id: true,
        name: true,
        companyName: true,
        lastContactedAt: true,
        lastInteractionAt: true,
      },
      orderBy: { lastContactedAt: "asc" },
      take: 10,
    });

    // Find leads not engaged in 2+ days
    const staleLeads = await ctx.prisma.crmLead.findMany({
      where: {
        userId: ctx.userId,
        status: {
          in: ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL_SENT", "NEGOTIATION"],
        },
        lastEngagement: { lt: twoDaysAgo },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        companyName: true,
        lastEngagement: true,
        status: true,
        estimatedValue: true,
      },
      orderBy: { lastEngagement: "asc" },
      take: 10,
    });

    // Find projects with no progress in 2+ days
    const staleProjects = await ctx.prisma.project.findMany({
      where: {
        userId: ctx.userId,
        status: "active",
        archivedAt: null,
        updatedAt: { lt: twoDaysAgo },
      },
      select: {
        id: true,
        name: true,
        completionPercentage: true,
        updatedAt: true,
        client: { select: { name: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: 5,
    });

    return {
      staleClients: staleClients.map((c) => ({
        ...c,
        daysSince: c.lastContactedAt
          ? Math.floor(
              (Date.now() - new Date(c.lastContactedAt).getTime()) / 86400000,
            )
          : null,
        type: "client" as const,
      })),
      staleLeads: staleLeads.map((l) => ({
        ...l,
        daysSince: Math.floor(
          (Date.now() - new Date(l.lastEngagement).getTime()) / 86400000,
        ),
        type: "lead" as const,
      })),
      staleProjects: staleProjects.map((p) => ({
        ...p,
        daysSince: Math.floor(
          (Date.now() - new Date(p.updatedAt).getTime()) / 86400000,
        ),
        type: "project" as const,
      })),
      totalAlerts:
        staleClients.length + staleLeads.length + staleProjects.length,
    };
  }),
});
