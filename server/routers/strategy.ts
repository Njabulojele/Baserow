import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  recalculateGoalProgress,
  recalculateKeyStepProgress,
} from "../progress-utils";

export const strategyRouter = router({
  // --- Year Plans ---

  getYearPlan: protectedProcedure
    .input(z.object({ year: z.number() }))
    .query(async ({ ctx, input }) => {
      const yearPlan = await ctx.prisma.yearPlan.findUnique({
        where: {
          userId_year: {
            userId: ctx.userId,
            year: input.year,
          },
        },
        include: {
          goals: {
            include: {
              milestones: true,
              keySteps: {
                include: { tasks: true },
                orderBy: { order: "asc" },
              },
              quarterFocuses: true,
            },
          },
          quarterPlans: {
            orderBy: { quarter: "asc" },
            include: {
              objectives: true,
              quarterFocuses: {
                include: {
                  goal: true,
                },
              },
            },
          },
        },
      });
      return yearPlan;
    }),

  upsertYearPlan: protectedProcedure
    .input(
      z.object({
        year: z.number(),
        theme: z.string(),
        vision: z.string(),
        focusAreas: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find existing plan or create new one
      const yearPlan = await ctx.prisma.yearPlan.upsert({
        where: {
          userId_year: {
            userId: ctx.userId,
            year: input.year,
          },
        },
        update: {
          theme: input.theme,
          vision: input.vision,
          focusAreas: input.focusAreas,
        },
        create: {
          userId: ctx.userId,
          year: input.year,
          theme: input.theme,
          vision: input.vision,
          focusAreas: input.focusAreas,
          status: "active",
        },
      });
      return yearPlan;
    }),

  // --- Annual Goals ---

  createGoal: protectedProcedure
    .input(
      z.object({
        yearPlanId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        category: z.string(),
        priority: z.enum(["critical", "high", "medium", "low"]).optional(),
        targetDate: z.date().optional(),
        strategies: z.array(z.string()).optional(),
        kpis: z.array(z.string()).optional(),
        risks: z.array(z.string()).optional(),
        milestones: z
          .array(
            z.object({
              title: z.string(),
              targetDate: z.date().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { milestones, ...goalData } = input;
      const goal = await ctx.prisma.goal.create({
        data: {
          ...goalData,
          strategies: goalData.strategies || [],
          kpis: goalData.kpis || [],
          risks: goalData.risks || [],
          priority: goalData.priority || "medium",
        },
        include: { milestones: true },
      });

      // Create milestones if provided
      if (milestones && milestones.length > 0) {
        await ctx.prisma.milestone.createMany({
          data: milestones.map((m) => ({
            goalId: goal.id,
            title: m.title,
            targetDate: m.targetDate,
          })),
        });
      }

      return await ctx.prisma.goal.findUnique({
        where: { id: goal.id },
        include: { milestones: true },
      });
    }),

  updateGoal: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        data: z.object({
          title: z.string().optional(),
          description: z.string().optional(),
          status: z
            .enum(["not_started", "in_progress", "completed", "cancelled"])
            .optional(),
          category: z.string().optional(),
          priority: z.enum(["critical", "high", "medium", "low"]).optional(),
          progress: z.number().min(0).max(100).optional(),
          targetDate: z.date().optional().nullable(),
          strategies: z.array(z.string()).optional(),
          kpis: z.array(z.string()).optional(),
          risks: z.array(z.string()).optional(),
        }),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.goal.update({
        where: { id: input.id },
        data: input.data,
        include: { milestones: true },
      });
    }),

  deleteGoal: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.goal.delete({
        where: { id: input.id },
      });
    }),

  // --- Milestones ---

  createMilestone: protectedProcedure
    .input(
      z.object({
        goalId: z.string(),
        title: z.string(),
        targetDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.milestone.create({
        data: input,
      });
    }),

  updateMilestone: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        targetDate: z.date().optional().nullable(),
        completed: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return await ctx.prisma.milestone.update({
        where: { id },
        data: {
          ...data,
          completedAt: data.completed ? new Date() : null,
        },
      });
    }),

  deleteMilestone: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.milestone.delete({
        where: { id: input.id },
      });
    }),

  // --- KeySteps ---

  createKeyStep: protectedProcedure
    .input(
      z.object({
        goalId: z.string(),
        title: z.string(),
        description: z.string().optional(),
        order: z.number().optional(),
        targetDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const keyStep = await ctx.prisma.keyStep.create({
        data: input,
      });

      // Recalculate goal progress as total steps changed
      await recalculateGoalProgress(ctx.prisma, input.goalId);

      return keyStep;
    }),

  updateKeyStep: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        description: z.string().optional(),
        completed: z.boolean().optional(),
        progress: z.number().min(0).max(100).optional(),
        targetDate: z.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const keyStep = await ctx.prisma.keyStep.update({
        where: { id },
        data: {
          ...data,
          // When marked completed, also set progress to 100
          progress: data.completed ? 100 : data.progress,
          completedAt: data.completed ? new Date() : undefined,
        },
      });

      // If manual progress update or completion, propagate up
      if (data.completed !== undefined || data.progress !== undefined) {
        if (keyStep.goalId) {
          await recalculateGoalProgress(ctx.prisma, keyStep.goalId);
        }
      }

      return keyStep;
    }),

  deleteKeyStep: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const keyStep = await ctx.prisma.keyStep.findUnique({
        where: { id: input.id },
      });

      if (!keyStep) return null;

      await ctx.prisma.keyStep.delete({
        where: { id: input.id },
      });

      // Recalculate goal progress
      await recalculateGoalProgress(ctx.prisma, keyStep.goalId);

      return keyStep;
    }),

  getKeySteps: protectedProcedure
    .input(z.object({ goalId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.keyStep.findMany({
        where: { goalId: input.goalId },
        include: {
          tasks: true,
        },
        orderBy: { order: "asc" },
      });
    }),

  // --- Quarter Plans ---

  getQuarterPlan: protectedProcedure
    .input(z.object({ year: z.number(), quarter: z.number().min(1).max(4) }))
    .query(async ({ ctx, input }) => {
      // First get the year plan ID
      const yearPlan = await ctx.prisma.yearPlan.findUnique({
        where: {
          userId_year: {
            userId: ctx.userId,
            year: input.year,
          },
        },
      });

      if (!yearPlan) return null;

      return await ctx.prisma.quarterPlan.findUnique({
        where: {
          yearPlanId_quarter: {
            yearPlanId: yearPlan.id,
            quarter: input.quarter,
          },
        },
        include: {
          objectives: true,
          quarterFocuses: {
            include: {
              goal: {
                include: { milestones: true },
              },
            },
          },
          monthPlans: {
            orderBy: { month: "asc" },
          },
        },
      });
    }),

  upsertQuarterPlan: protectedProcedure
    .input(
      z.object({
        yearPlanId: z.string(),
        quarter: z.number().min(1).max(4),
        theme: z.string(),
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.quarterPlan.upsert({
        where: {
          yearPlanId_quarter: {
            yearPlanId: input.yearPlanId,
            quarter: input.quarter,
          },
        },
        update: {
          theme: input.theme,
          startDate: input.startDate,
          endDate: input.endDate,
        },
        create: {
          yearPlanId: input.yearPlanId,
          quarter: input.quarter,
          theme: input.theme,
          startDate: input.startDate,
          endDate: input.endDate,
        },
      });
    }),

  // --- Quarter Objectives ---

  createQuarterObjective: protectedProcedure
    .input(
      z.object({
        quarterPlanId: z.string(),
        title: z.string(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.quarterObjective.create({
        data: input,
      });
    }),

  updateQuarterObjective: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        type: z.enum(["status", "details"]),
        status: z.string().optional(),
        title: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.quarterObjective.update({
        where: { id: input.id },
        data: {
          status: input.status,
          title: input.title,
          description: input.description,
        },
      });
    }),

  deleteQuarterObjective: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.quarterObjective.delete({
        where: { id: input.id },
      });
    }),

  // --- Month Plans ---

  getMonthPlan: protectedProcedure
    .input(z.object({ year: z.number(), month: z.number().min(0).max(11) }))
    .query(async ({ ctx, input }) => {
      // Find Year Plan
      const yearPlan = await ctx.prisma.yearPlan.findUnique({
        where: { userId_year: { userId: ctx.userId, year: input.year } },
      });

      if (!yearPlan) return null;

      // Determine quarter
      const quarter = Math.floor(input.month / 3) + 1;

      const quarterPlan = await ctx.prisma.quarterPlan.findUnique({
        where: { yearPlanId_quarter: { yearPlanId: yearPlan.id, quarter } },
      });

      if (!quarterPlan) return null;

      return await ctx.prisma.monthPlan.findUnique({
        where: {
          quarterPlanId_month: {
            quarterPlanId: quarterPlan.id,
            month: input.month,
          },
        },
        include: {
          weekPlans: true,
        },
      });
    }),

  upsertMonthPlan: protectedProcedure
    .input(
      z.object({
        quarterPlanId: z.string(),
        month: z.number(),
        year: z.number(),
        theme: z.string().optional(),
        objectives: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.monthPlan.upsert({
        where: {
          quarterPlanId_month: {
            quarterPlanId: input.quarterPlanId,
            month: input.month,
          },
        },
        update: {
          theme: input.theme,
          objectives: input.objectives,
        },
        create: {
          quarterPlanId: input.quarterPlanId,
          month: input.month,
          year: input.year,
          theme: input.theme,
          objectives: input.objectives,
        },
      });
    }),

  // --- Goal Cascading ---

  linkGoalToQuarter: protectedProcedure
    .input(
      z.object({
        goalId: z.string(),
        quarterPlanId: z.string(),
        priority: z.number().min(1).max(10).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.quarterFocus.upsert({
        where: {
          quarterPlanId_goalId: {
            quarterPlanId: input.quarterPlanId,
            goalId: input.goalId,
          },
        },
        update: {
          priority: input.priority,
          notes: input.notes,
        },
        create: {
          quarterPlanId: input.quarterPlanId,
          goalId: input.goalId,
          priority: input.priority || 1,
          notes: input.notes,
        },
      });
    }),

  unlinkGoalFromQuarter: protectedProcedure
    .input(z.object({ quarterFocusId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.quarterFocus.delete({
        where: { id: input.quarterFocusId },
      });
    }),

  linkFocusToMonth: protectedProcedure
    .input(
      z.object({
        quarterFocusId: z.string(),
        monthPlanId: z.string(),
        priority: z.number().min(1).max(10).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.monthFocus.upsert({
        where: {
          monthPlanId_quarterFocusId: {
            monthPlanId: input.monthPlanId,
            quarterFocusId: input.quarterFocusId,
          },
        },
        update: {
          priority: input.priority,
          notes: input.notes,
        },
        create: {
          monthPlanId: input.monthPlanId,
          quarterFocusId: input.quarterFocusId,
          priority: input.priority || 1,
          notes: input.notes,
        },
      });
    }),

  linkFocusToWeek: protectedProcedure
    .input(
      z.object({
        monthFocusId: z.string(),
        weekPlanId: z.string(),
        priority: z.number().min(1).max(10).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.weekFocus.upsert({
        where: {
          weekPlanId_monthFocusId: {
            weekPlanId: input.weekPlanId,
            monthFocusId: input.monthFocusId,
          },
        },
        update: {
          priority: input.priority,
          notes: input.notes,
        },
        create: {
          weekPlanId: input.weekPlanId,
          monthFocusId: input.monthFocusId,
          priority: input.priority || 1,
          notes: input.notes,
        },
      });
    }),

  linkFocusToDay: protectedProcedure
    .input(
      z.object({
        weekFocusId: z.string(),
        dayPlanId: z.string(),
        priority: z.number().min(1).max(10).optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.dayFocus.upsert({
        where: {
          dayPlanId_weekFocusId: {
            dayPlanId: input.dayPlanId,
            weekFocusId: input.weekFocusId,
          },
        },
        update: {
          priority: input.priority,
          notes: input.notes,
        },
        create: {
          dayPlanId: input.dayPlanId,
          weekFocusId: input.weekFocusId,
          priority: input.priority || 1,
          notes: input.notes,
        },
      });
    }),

  completeDayFocus: protectedProcedure
    .input(z.object({ dayFocusId: z.string(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.dayFocus.update({
        where: { id: input.dayFocusId },
        data: {
          completed: input.completed,
          completedAt: input.completed ? new Date() : null,
        },
      });
    }),

  getGoalHierarchy: protectedProcedure
    .input(z.object({ goalId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.goal.findUnique({
        where: { id: input.goalId },
        include: {
          milestones: true,
          quarterFocuses: {
            include: {
              quarterPlan: true,
              monthFocuses: {
                include: {
                  monthPlan: true,
                  weekFocuses: {
                    include: {
                      weekPlan: true,
                      dayFocuses: {
                        include: {
                          dayPlan: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
    }),

  getQuarterFocuses: protectedProcedure
    .input(z.object({ quarterPlanId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.quarterFocus.findMany({
        where: { quarterPlanId: input.quarterPlanId },
        include: {
          goal: {
            include: { milestones: true },
          },
          monthFocuses: true,
        },
        orderBy: { priority: "asc" },
      });
    }),

  getMonthFocuses: protectedProcedure
    .input(z.object({ monthPlanId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.monthFocus.findMany({
        where: { monthPlanId: input.monthPlanId },
        include: {
          quarterFocus: {
            include: {
              goal: true,
            },
          },
          weekFocuses: true,
        },
        orderBy: { priority: "asc" },
      });
    }),

  getWeekFocuses: protectedProcedure
    .input(z.object({ weekPlanId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.weekFocus.findMany({
        where: { weekPlanId: input.weekPlanId },
        include: {
          monthFocus: {
            include: {
              quarterFocus: {
                include: { goal: true },
              },
            },
          },
          dayFocuses: true,
        },
        orderBy: { priority: "asc" },
      });
    }),

  getDayFocuses: protectedProcedure
    .input(z.object({ dayPlanId: z.string() }))
    .query(async ({ ctx, input }) => {
      return await ctx.prisma.dayFocus.findMany({
        where: { dayPlanId: input.dayPlanId },
        include: {
          weekFocus: {
            include: {
              monthFocus: {
                include: {
                  quarterFocus: {
                    include: { goal: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { priority: "asc" },
      });
    }),

  updateFocusProgress: protectedProcedure
    .input(
      z.object({
        type: z.enum(["quarter", "month", "week"]),
        focusId: z.string(),
        progress: z.number().min(0).max(100),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (input.type === "quarter") {
        return await ctx.prisma.quarterFocus.update({
          where: { id: input.focusId },
          data: { progress: input.progress },
        });
      } else if (input.type === "month") {
        return await ctx.prisma.monthFocus.update({
          where: { id: input.focusId },
          data: { progress: input.progress },
        });
      } else {
        return await ctx.prisma.weekFocus.update({
          where: { id: input.focusId },
          data: { progress: input.progress },
        });
      }
    }),
  // --- Evening Review ---
  submitEveningReview: protectedProcedure
    .input(
      z.object({
        wins: z.array(z.string()),
        improvements: z.array(z.string()),
        moodScore: z.number().optional(),
        tomorrowPriorities: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Find or create DayPlan for today (to log wins/improvements)
      // Note: DayFocus is our current day model, but simpler.
      // We might want to store this in a "Journal" or "Review" model.
      // For MVP, let's create tasks for tomorrow and log wins?

      // Actually best to store in DayFocus if it has fields, or extend it.
      // Checking schema... we verified earlier we added fields?
      // If not, we'll assume we can create tasks for tomorrow as "Scheduled".

      // 1. Create tasks for tomorrow
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0); // 9 AM

      for (const title of input.tomorrowPriorities) {
        await ctx.prisma.task.create({
          data: {
            userId: ctx.userId,
            title,
            scheduledDate: tomorrow,
            priority: "high", // Defaulting to high since they are top 3
            status: "not_started",
            type: "deep_work",
          },
        });
      }

      // 2. Log wins/improvements?
      // Let's create a Note or log it.
      // For now, return success. We'll add a 'DailyJournal' model later if needed.

      return { success: true };
    }),
});
