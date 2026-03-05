import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { startOfDay, subDays, format, addDays } from "date-fns";

export const habitRouter = router({
  // ─── Pillars ──────────────────────────────────────────────────────

  getPillars: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.pillar.findMany({
      where: { userId: ctx.userId, isActive: true },
      include: {
        habitTemplates: {
          where: { isActive: true },
          orderBy: { order: "asc" },
        },
      },
      orderBy: { order: "asc" },
    });
  }),

  createPillar: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        icon: z.string().default("target"),
        color: z.string().default("#a9927d"),
        dailyMinutes: z.number().default(45),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.pillar.create({
        data: { ...input, userId: ctx.userId },
      });
    }),

  updatePillar: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        icon: z.string().optional(),
        color: z.string().optional(),
        dailyMinutes: z.number().optional(),
        order: z.number().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.pillar.update({ where: { id }, data });
    }),

  deletePillar: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.pillar.delete({ where: { id: input.id } });
    }),

  // ─── Habit Templates ──────────────────────────────────────────────

  createHabit: protectedProcedure
    .input(
      z.object({
        pillarId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
        estimatedMinutes: z.number().default(10),
        platform: z.string().optional(),
        platformIcon: z.string().optional(),
        recurrence: z.enum(["daily", "weekly", "custom"]).default("daily"),
        customDays: z.array(z.string()).default([]),
        order: z.number().default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.habitTemplate.create({
        data: { ...input, userId: ctx.userId },
      });
    }),

  updateHabit: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().min(1).optional(),
        description: z.string().optional(),
        estimatedMinutes: z.number().optional(),
        platform: z.string().optional(),
        platformIcon: z.string().optional(),
        recurrence: z.enum(["daily", "weekly", "custom"]).optional(),
        customDays: z.array(z.string()).optional(),
        order: z.number().optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.habitTemplate.update({ where: { id }, data });
    }),

  deleteHabit: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.habitTemplate.delete({ where: { id: input.id } });
    }),

  // ─── Daily Checklist ──────────────────────────────────────────────

  getDailyChecklist: protectedProcedure
    .input(z.object({ date: z.date().optional() }))
    .query(async ({ ctx, input }) => {
      const date = input?.date || new Date();
      const dateOnly = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
      );
      const dayName = format(date, "EEEE").toLowerCase(); // e.g. "monday"

      // Get all active pillars with their habits
      const pillars = await ctx.prisma.pillar.findMany({
        where: { userId: ctx.userId, isActive: true },
        include: {
          habitTemplates: {
            where: { isActive: true },
            orderBy: { order: "asc" },
          },
        },
        orderBy: { order: "asc" },
      });

      // Get all habit logs for this date
      const logs = await ctx.prisma.habitLog.findMany({
        where: { userId: ctx.userId, date: dateOnly },
      });
      const logMap = new Map(logs.map((l) => [l.habitTemplateId, l]));

      // Build the checklist, filtering habits by their recurrence
      const checklist = pillars.map((pillar) => {
        const habits = pillar.habitTemplates
          .filter((h) => {
            if (h.recurrence === "daily") return true;
            if (h.recurrence === "weekly") {
              // Weekly habits only show on Mondays
              return dayName === "monday";
            }
            if (h.recurrence === "custom") {
              return h.customDays.includes(dayName);
            }
            return true;
          })
          .map((h) => ({
            ...h,
            completed: logMap.has(h.id),
            logId: logMap.get(h.id)?.id || null,
          }));

        const completedCount = habits.filter((h) => h.completed).length;

        return {
          ...pillar,
          habits,
          totalHabits: habits.length,
          completedHabits: completedCount,
          completionRate:
            habits.length > 0
              ? Math.round((completedCount / habits.length) * 100)
              : 0,
        };
      });

      const totalHabits = checklist.reduce((s, p) => s + p.totalHabits, 0);
      const totalCompleted = checklist.reduce(
        (s, p) => s + p.completedHabits,
        0,
      );

      return {
        date: dateOnly,
        pillars: checklist,
        totalHabits,
        totalCompleted,
        overallRate:
          totalHabits > 0
            ? Math.round((totalCompleted / totalHabits) * 100)
            : 0,
      };
    }),

  // ─── Toggle Habit ─────────────────────────────────────────────────

  toggleHabit: protectedProcedure
    .input(
      z.object({
        habitTemplateId: z.string(),
        date: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const date = input.date || new Date();
      const dateOnly = new Date(
        Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
      );

      // Check if already completed
      const existing = await ctx.prisma.habitLog.findUnique({
        where: {
          habitTemplateId_date: {
            habitTemplateId: input.habitTemplateId,
            date: dateOnly,
          },
        },
      });

      if (existing) {
        // Un-check: delete the log
        await ctx.prisma.habitLog.delete({ where: { id: existing.id } });
        return { completed: false };
      }

      // Check: create the log
      await ctx.prisma.habitLog.create({
        data: {
          userId: ctx.userId,
          habitTemplateId: input.habitTemplateId,
          date: dateOnly,
        },
      });
      return { completed: true };
    }),

  // ─── Weekly Stats (for charts) ────────────────────────────────────

  getWeeklyStats: protectedProcedure
    .input(z.object({ date: z.date().optional() }))
    .query(async ({ ctx, input }) => {
      const endDate = input?.date || new Date();
      const startDate = subDays(endDate, 6);

      const startDateOnly = new Date(
        Date.UTC(
          startDate.getFullYear(),
          startDate.getMonth(),
          startDate.getDate(),
        ),
      );
      const endDateOnly = new Date(
        Date.UTC(endDate.getFullYear(), endDate.getMonth(), endDate.getDate()),
      );

      // Get all pillars
      const pillars = await ctx.prisma.pillar.findMany({
        where: { userId: ctx.userId, isActive: true },
        include: {
          habitTemplates: {
            where: { isActive: true },
          },
        },
        orderBy: { order: "asc" },
      });

      // Get all habit logs for the 7-day range
      const logs = await ctx.prisma.habitLog.findMany({
        where: {
          userId: ctx.userId,
          date: { gte: startDateOnly, lte: endDateOnly },
        },
      });

      // Build daily stats
      const dailyStats = [];
      for (let i = 0; i < 7; i++) {
        const day = addDays(startDateOnly, i);
        const dayStr = format(day, "yyyy-MM-dd");
        const dayLogs = logs.filter(
          (l) => format(l.date, "yyyy-MM-dd") === dayStr,
        );
        const totalHabits = pillars.reduce(
          (s, p) => s + p.habitTemplates.length,
          0,
        );
        dailyStats.push({
          date: dayStr,
          dayLabel: format(day, "EEE"),
          completed: dayLogs.length,
          total: totalHabits,
          rate:
            totalHabits > 0
              ? Math.round((dayLogs.length / totalHabits) * 100)
              : 0,
        });
      }

      // Per-pillar stats
      const pillarStats = pillars.map((p) => {
        const pillarHabitIds = new Set(p.habitTemplates.map((h) => h.id));
        const pillarLogs = logs.filter((l) =>
          pillarHabitIds.has(l.habitTemplateId),
        );
        return {
          id: p.id,
          name: p.name,
          color: p.color,
          icon: p.icon,
          totalPossible: p.habitTemplates.length * 7,
          totalCompleted: pillarLogs.length,
          rate:
            p.habitTemplates.length * 7 > 0
              ? Math.round(
                  (pillarLogs.length / (p.habitTemplates.length * 7)) * 100,
                )
              : 0,
        };
      });

      return { dailyStats, pillarStats };
    }),

  // ─── Streak ───────────────────────────────────────────────────────

  getStreaks: protectedProcedure.query(async ({ ctx }) => {
    // Calculate the overall streak: consecutive days where at least 1 habit was completed
    const logs = await ctx.prisma.habitLog.findMany({
      where: { userId: ctx.userId },
      orderBy: { date: "desc" },
      select: { date: true },
    });

    if (logs.length === 0) return { currentStreak: 0, longestStreak: 0 };

    // Get unique dates in descending order
    const uniqueDates = [
      ...new Set(logs.map((l) => format(l.date, "yyyy-MM-dd"))),
    ].sort((a, b) => b.localeCompare(a));

    let currentStreak = 0;
    let today = format(new Date(), "yyyy-MM-dd");

    // Allow today or yesterday as the starting point
    if (
      uniqueDates[0] === today ||
      uniqueDates[0] === format(subDays(new Date(), 1), "yyyy-MM-dd")
    ) {
      currentStreak = 1;
      for (let i = 1; i < uniqueDates.length; i++) {
        const expectedDate = format(
          subDays(new Date(uniqueDates[0] + "T00:00:00Z"), i),
          "yyyy-MM-dd",
        );
        if (uniqueDates[i] === expectedDate) {
          currentStreak++;
        } else {
          break;
        }
      }
    }

    return { currentStreak, totalDaysTracked: uniqueDates.length };
  }),

  // ─── Seed Default Pillars & Habits ────────────────────────────────

  seedDefaults: protectedProcedure.mutation(async ({ ctx }) => {
    // Only seed if user has no pillars
    const existing = await ctx.prisma.pillar.count({
      where: { userId: ctx.userId },
    });
    if (existing > 0) return { seeded: false };

    const defaults = [
      {
        name: "Lead Generation",
        icon: "target",
        color: "#ef4444",
        dailyMinutes: 45,
        order: 0,
        habits: [
          {
            title: "Send 5 LinkedIn connection requests",
            platform: "linkedin",
            estimatedMinutes: 10,
            order: 0,
          },
          {
            title: "Comment on 3 posts of potential clients",
            platform: "linkedin",
            estimatedMinutes: 8,
            order: 1,
          },
          {
            title: "Send 2 personalised cold emails",
            platform: "gmail",
            estimatedMinutes: 10,
            order: 2,
          },
          {
            title: "Post 1 piece of content",
            platform: "linkedin",
            estimatedMinutes: 10,
            order: 3,
          },
          {
            title: "Follow up on open leads in CRM",
            platform: "crm",
            estimatedMinutes: 7,
            order: 4,
          },
        ],
      },
      {
        name: "Client Management",
        icon: "users",
        color: "#3b82f6",
        dailyMinutes: 60,
        order: 1,
        habits: [
          {
            title: "Review all active projects — any blockers?",
            platform: "projects",
            estimatedMinutes: 15,
            order: 0,
          },
          {
            title: "Send at least 1 client update",
            platform: "gmail",
            estimatedMinutes: 10,
            order: 1,
          },
          {
            title: "Respond to all client messages (within 4 hrs)",
            platform: "whatsapp",
            estimatedMinutes: 20,
            order: 2,
          },
          {
            title: "Update CRM pipeline with latest status",
            platform: "crm",
            estimatedMinutes: 15,
            order: 3,
          },
        ],
      },
      {
        name: "Products & Dev",
        icon: "code",
        color: "#10b981",
        dailyMinutes: 60,
        order: 2,
        habits: [
          {
            title: "Ship 1 SaaS improvement OR fix 1 bug",
            platform: "code",
            estimatedMinutes: 25,
            order: 0,
          },
          {
            title: "Make progress on client site build",
            platform: "code",
            estimatedMinutes: 20,
            order: 1,
          },
          {
            title: "Update article platform (draft, edit, or publish)",
            platform: "blog",
            estimatedMinutes: 15,
            order: 2,
          },
        ],
      },
      {
        name: "Content Engine",
        icon: "pen-tool",
        color: "#f59e0b",
        dailyMinutes: 45,
        order: 3,
        habits: [
          {
            title: "Create or schedule 1 piece of content",
            platform: "linkedin",
            estimatedMinutes: 25,
            order: 0,
          },
          {
            title: "Distribute published content to 2+ channels",
            platform: "share",
            estimatedMinutes: 20,
            order: 1,
          },
        ],
      },
      {
        name: "Review & Metrics",
        icon: "bar-chart-3",
        color: "#8b5cf6",
        dailyMinutes: 30,
        order: 4,
        habits: [
          {
            title: "Check key metrics (leads, revenue, content reach)",
            platform: "analytics",
            estimatedMinutes: 10,
            order: 0,
          },
          {
            title: "Update task list for tomorrow",
            platform: "tasks",
            estimatedMinutes: 10,
            order: 1,
          },
          {
            title: "Identify 1 thing to improve tomorrow",
            platform: "notes",
            estimatedMinutes: 10,
            order: 2,
          },
        ],
      },
    ];

    for (const pillarData of defaults) {
      const { habits, ...pillarFields } = pillarData;
      const pillar = await ctx.prisma.pillar.create({
        data: { ...pillarFields, userId: ctx.userId },
      });
      for (const habit of habits) {
        await ctx.prisma.habitTemplate.create({
          data: { ...habit, userId: ctx.userId, pillarId: pillar.id },
        });
      }
    }

    return { seeded: true };
  }),
});
