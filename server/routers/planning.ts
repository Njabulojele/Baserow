import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { startOfWeek, endOfWeek, addDays, format } from "date-fns";

export const planningRouter = router({
  // Get week plan for a specific week
  getWeekPlan: protectedProcedure
    .input(
      z.object({
        weekStart: z.date().optional(), // Defaults to current week
      }),
    )
    .query(async ({ ctx, input }) => {
      const weekStart = input?.weekStart
        ? startOfWeek(input.weekStart, { weekStartsOn: 1 })
        : startOfWeek(new Date(), { weekStartsOn: 1 });

      // Normalize to UTC midnight
      weekStart.setUTCHours(0, 0, 0, 0);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      weekEnd.setUTCHours(23, 59, 59, 999);

      // Get week plan if exists
      const weekPlan = await ctx.prisma.weekPlan.findFirst({
        where: {
          userId: ctx.userId,
          startDate: { gte: weekStart },
          endDate: { lte: weekEnd },
        },
        include: {
          dayPlans: {
            orderBy: { date: "asc" },
          },
        },
      });

      // Get tasks scheduled for this week
      const tasks = await ctx.prisma.task.findMany({
        where: {
          userId: ctx.userId,
          scheduledDate: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        include: {
          project: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: [{ scheduledDate: "asc" }, { priority: "asc" }],
      });

      // Get time entries for this week
      const timeEntries = await ctx.prisma.timeEntry.aggregate({
        where: {
          userId: ctx.userId,
          startTime: {
            gte: weekStart,
            lte: weekEnd,
          },
        },
        _sum: {
          duration: true,
        },
      });

      // Group tasks by day
      const tasksByDay: Record<string, typeof tasks> = {};
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dayKey = format(day, "yyyy-MM-dd");
        tasksByDay[dayKey] = tasks.filter(
          (t) =>
            t.scheduledDate &&
            format(new Date(t.scheduledDate), "yyyy-MM-dd") === dayKey,
        );
      }

      return {
        weekStart,
        weekEnd,
        weekPlan,
        tasksByDay,
        totalTasks: tasks.length,
        completedTasks: tasks.filter((t) => t.status === "done").length,
        hoursLogged:
          Math.round(((timeEntries._sum.duration || 0) / 60) * 10) / 10,
      };
    }),

  // Enhanced weekly overview with projects and unscheduled tasks
  getWeeklyOverview: protectedProcedure
    .input(
      z.object({
        weekStart: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const weekStart = input?.weekStart
        ? startOfWeek(input.weekStart, { weekStartsOn: 1 })
        : startOfWeek(new Date(), { weekStartsOn: 1 });

      weekStart.setUTCHours(0, 0, 0, 0);
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
      weekEnd.setUTCHours(23, 59, 59, 999);

      // Get week plan
      const weekPlan = await ctx.prisma.weekPlan.findFirst({
        where: {
          userId: ctx.userId,
          startDate: { gte: weekStart },
          endDate: { lte: weekEnd },
        },
      });

      // Get ALL tasks for this user (simpler, matches getTasks approach)
      const allTasks = await ctx.prisma.task.findMany({
        where: {
          userId: ctx.userId,
        },
        include: {
          project: { select: { id: true, name: true, color: true } },
        },
        orderBy: [
          { priority: "asc" },
          { dueDate: "asc" },
          { createdAt: "desc" },
        ],
      });

      // Filter scheduled tasks for this week
      const scheduledTasks = allTasks.filter((t) => {
        if (!t.scheduledDate) return false;
        const taskDate = new Date(t.scheduledDate);
        return taskDate >= weekStart && taskDate <= weekEnd;
      });

      // Unscheduled tasks (no scheduledDate, not completed)
      const unscheduledTasks = allTasks.filter(
        (t) => !t.scheduledDate && t.status !== "done",
      );

      // Get projects with tasks this week
      const projectsWithTasks = await ctx.prisma.project.findMany({
        where: {
          userId: ctx.userId,
          archivedAt: null,
          tasks: {
            some: {
              scheduledDate: { gte: weekStart, lte: weekEnd },
            },
          },
        },
        include: {
          _count: {
            select: {
              tasks: {
                where: { scheduledDate: { gte: weekStart, lte: weekEnd } },
              },
            },
          },
        },
      });

      // Get time entries for this week
      const timeEntries = await ctx.prisma.timeEntry.aggregate({
        where: {
          userId: ctx.userId,
          startTime: { gte: weekStart, lte: weekEnd },
        },
        _sum: { duration: true },
      });

      // Group tasks by day
      const tasksByDay: Record<string, typeof scheduledTasks> = {};
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        const dayKey = format(day, "yyyy-MM-dd");
        tasksByDay[dayKey] = scheduledTasks.filter(
          (t) =>
            t.scheduledDate &&
            format(new Date(t.scheduledDate), "yyyy-MM-dd") === dayKey,
        );
      }

      return {
        weekStart,
        weekEnd,
        weekPlan,
        tasksByDay,
        unscheduledTasks,
        projects: projectsWithTasks.map((p) => ({
          id: p.id,
          name: p.name,
          color: p.color,
          taskCount: p._count.tasks,
        })),
        stats: {
          totalTasks: scheduledTasks.length,
          completedTasks: scheduledTasks.filter((t) => t.status === "done")
            .length,
          hoursLogged:
            Math.round(((timeEntries._sum.duration || 0) / 60) * 10) / 10,
          unscheduledCount: unscheduledTasks.length,
        },
      };
    }),

  // Get day plan for a specific date
  getDayPlan: protectedProcedure
    .input(
      z.object({
        date: z.date().optional(), // Defaults to today
      }),
    )
    .query(async ({ ctx, input }) => {
      const date = input?.date || new Date();
      const dayStart = new Date(date);
      dayStart.setUTCHours(0, 0, 0, 0);
      const dayEnd = new Date(date);
      dayEnd.setUTCHours(23, 59, 59, 999);

      // Get tasks for this day
      const tasks = await ctx.prisma.task.findMany({
        where: {
          userId: ctx.userId,
          OR: [
            { scheduledDate: { gte: dayStart, lte: dayEnd } },
            { dueDate: { gte: dayStart, lte: dayEnd } },
          ],
        },
        include: {
          project: {
            select: { id: true, name: true, color: true },
          },
        },
        orderBy: [{ priority: "asc" }, { scheduledDate: "asc" }],
      });

      // Get day plan
      const dayPlan = await ctx.prisma.dayPlan.findFirst({
        where: {
          userId: ctx.userId,
          date: { gte: dayStart, lte: dayEnd },
        },
        include: {
          timeBlocks: {
            include: {
              task: { select: { id: true, title: true } },
            },
            orderBy: { startTime: "asc" },
          },
        },
      });

      // Get time entries logged today
      const timeEntries = await ctx.prisma.timeEntry.aggregate({
        where: {
          userId: ctx.userId,
          startTime: { gte: dayStart, lte: dayEnd },
        },
        _sum: { duration: true },
      });

      return {
        date,
        tasks,
        dayPlan,
        hoursLogged:
          Math.round(((timeEntries._sum.duration || 0) / 60) * 10) / 10,
        completedTasks: tasks.filter((t) => t.status === "done").length,
        totalTasks: tasks.length,
      };
    }),

  // Schedule a task for a specific date
  scheduleTask: protectedProcedure
    .input(
      z.object({
        taskId: z.string(),
        date: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.taskId },
      });

      if (!task || task.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.prisma.task.update({
        where: { id: input.taskId },
        data: { scheduledDate: input.date },
      });
    }),

  // Create a time block
  createTimeBlock: protectedProcedure
    .input(
      z.object({
        dayPlanId: z.string(),
        taskId: z.string().optional(),
        projectId: z.string().optional(),
        type: z.string(), // deep_work, shallow_work, etc.
        startTime: z.date(),
        endTime: z.date(),
        duration: z.number(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.timeBlock.create({
        data: {
          ...input,
        },
      });
    }),

  // Update a time block
  updateTimeBlock: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        startTime: z.date().optional(),
        endTime: z.date().optional(),
        duration: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const block = await ctx.prisma.timeBlock.findUnique({ where: { id } });
      if (!block) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.prisma.timeBlock.update({
        where: { id },
        data,
      });
    }),

  // Delete a time block
  deleteTimeBlock: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const block = await ctx.prisma.timeBlock.findUnique({
        where: { id: input.id },
      });
      if (!block) {
        throw new TRPCError({ code: "NOT_FOUND" });
      }

      return ctx.prisma.timeBlock.delete({ where: { id: input.id } });
    }),

  // Upsert a week plan (for setting outcomes etc)
  upsertWeekPlan: protectedProcedure
    .input(
      z.object({
        weekStart: z.date(),
        topOutcomes: z.array(z.string()).optional(),
        keyWins: z.array(z.string()).optional(),
        challenges: z.array(z.string()).optional(),
        lessonsLearned: z.array(z.string()).optional(),
        rating: z.number().optional(),
        reviewNotes: z.string().optional(),
        plannedClientHours: z.number().optional(),
        plannedPersonalHours: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { weekStart, ...data } = input;
      const normalizedWeekStart = startOfWeek(weekStart, { weekStartsOn: 1 });
      normalizedWeekStart.setUTCHours(0, 0, 0, 0);

      const weekEnd = endOfWeek(normalizedWeekStart, { weekStartsOn: 1 });
      weekEnd.setUTCHours(23, 59, 59, 999);

      const existingPlan = await ctx.prisma.weekPlan.findFirst({
        where: {
          userId: ctx.userId,
          startDate: { gte: normalizedWeekStart },
          endDate: { lte: weekEnd },
        },
      });

      if (existingPlan) {
        return ctx.prisma.weekPlan.update({
          where: { id: existingPlan.id },
          data,
        });
      }

      // Find or create YearPlan -> QuarterPlan -> MonthPlan
      let yearPlan = await ctx.prisma.yearPlan.findFirst({
        where: {
          userId: ctx.userId,
          year: normalizedWeekStart.getUTCFullYear(),
        },
      });

      if (!yearPlan) {
        yearPlan = await ctx.prisma.yearPlan.create({
          data: {
            userId: ctx.userId,
            year: normalizedWeekStart.getUTCFullYear(),
            theme: "New Year",
            vision: "A successful year",
          },
        });
      }

      const quarter = Math.floor(normalizedWeekStart.getUTCMonth() / 3) + 1;
      let quarterPlan = await ctx.prisma.quarterPlan.findFirst({
        where: { yearPlanId: yearPlan.id, quarter },
      });

      if (!quarterPlan) {
        const qStart = new Date(
          normalizedWeekStart.getUTCFullYear(),
          (quarter - 1) * 3,
          1,
        );
        const qEnd = new Date(
          normalizedWeekStart.getUTCFullYear(),
          quarter * 3,
          0,
        );
        quarterPlan = await ctx.prisma.quarterPlan.create({
          data: {
            yearPlanId: yearPlan.id,
            quarter,
            theme: `Quarter ${quarter}`,
            startDate: qStart,
            endDate: qEnd,
          },
        });
      }

      let monthPlan = await ctx.prisma.monthPlan.findFirst({
        where: {
          quarterPlanId: quarterPlan.id,
          month: normalizedWeekStart.getUTCMonth() + 1,
          year: normalizedWeekStart.getUTCFullYear(),
        },
      });

      if (!monthPlan) {
        monthPlan = await ctx.prisma.monthPlan.create({
          data: {
            quarterPlanId: quarterPlan.id,
            month: normalizedWeekStart.getUTCMonth() + 1,
            year: normalizedWeekStart.getUTCFullYear(),
          },
        });
      }

      return ctx.prisma.weekPlan.create({
        data: {
          ...data,
          userId: ctx.userId,
          monthPlanId: monthPlan.id,
          weekNumber: 1, // Simple fallback
          year: normalizedWeekStart.getUTCFullYear(),
          startDate: normalizedWeekStart,
          endDate: weekEnd,
        },
      });
    }),

  // Update a day plan (for setting daily win, priorities etc)
  updateDayPlan: protectedProcedure
    .input(
      z.object({
        date: z.date(),
        dailyWin: z.string().optional(),
        topPriorities: z.array(z.string()).optional(),
        gratitude: z.array(z.string()).optional(),
        tomorrowPrep: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { date, ...data } = input;
      const normalizedDate = new Date(date);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      const existingPlan = await ctx.prisma.dayPlan.findFirst({
        where: {
          userId: ctx.userId,
          date: normalizedDate,
        },
      });

      if (existingPlan) {
        return ctx.prisma.dayPlan.update({
          where: { id: existingPlan.id },
          data,
        });
      }

      // If not, we need a week plan.
      const normalizedWeekStart = startOfWeek(normalizedDate, {
        weekStartsOn: 1,
      });
      normalizedWeekStart.setUTCHours(0, 0, 0, 0);
      const weekEnd = endOfWeek(normalizedWeekStart, { weekStartsOn: 1 });

      let weekPlan = await ctx.prisma.weekPlan.findFirst({
        where: {
          userId: ctx.userId,
          startDate: { gte: normalizedWeekStart },
          endDate: { lte: weekEnd },
        },
      });

      if (!weekPlan) {
        // Automatically create a base week plan if it doesn't exist
        // This is recursive/flexible as requested.
        // We'll call the create logic inline for simplicity since TRPC mutations aren't easily called internally.

        // Need MonthPlan hierarchy again...
        // Let's just create a basic week plan shell.

        // To avoid code duplication, I'll just throw error for now or implement a helper.
        // Actually, let's just make weekPlanId optional in the schema? No, it's a relation.
        // I'll implement the shell creation.

        const year = normalizedWeekStart.getUTCFullYear();
        const month = normalizedWeekStart.getUTCMonth() + 1;

        // Find or create hierarchy
        const user = await ctx.prisma.user.findUnique({
          where: { id: ctx.userId },
          include: { yearPlans: { where: { year } } },
        });
        let yp = user?.yearPlans[0];
        if (!yp) {
          yp = await ctx.prisma.yearPlan.create({
            data: {
              userId: ctx.userId,
              year,
              theme: "Yearly Focus",
              vision: "Vision",
            },
          });
        }

        const quarter = Math.floor((month - 1) / 3) + 1;
        let qp = await ctx.prisma.quarterPlan.findFirst({
          where: { yearPlanId: yp.id, quarter },
        });
        if (!qp) {
          qp = await ctx.prisma.quarterPlan.create({
            data: {
              yearPlanId: yp.id,
              quarter,
              theme: "Quarterly Focus",
              startDate: new Date(year, (quarter - 1) * 3, 1),
              endDate: new Date(year, quarter * 3, 0),
            },
          });
        }

        let mp = await ctx.prisma.monthPlan.findFirst({
          where: { quarterPlanId: qp.id, month },
        });
        if (!mp) {
          mp = await ctx.prisma.monthPlan.create({
            data: { quarterPlanId: qp.id, month, year },
          });
        }

        weekPlan = await ctx.prisma.weekPlan.create({
          data: {
            userId: ctx.userId,
            monthPlanId: mp.id,
            weekNumber: 1,
            year,
            startDate: normalizedWeekStart,
            endDate: weekEnd,
          },
        });
      }

      return ctx.prisma.dayPlan.create({
        data: {
          ...data,
          userId: ctx.userId,
          date: normalizedDate,
          weekPlanId: weekPlan.id,
        },
      });
    }),
});
