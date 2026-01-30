import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const wellbeingRouter = router({
  // Log a well-being check-in
  createEntry: protectedProcedure
    .input(
      z.object({
        date: z.date().optional(),
        morningEnergy: z.number().min(1).max(10).optional(),
        afternoonEnergy: z.number().min(1).max(10).optional(),
        eveningEnergy: z.number().min(1).max(10).optional(),
        mood: z.number().min(1).max(10).optional(),
        stressLevel: z.number().min(1).max(10).optional(),
        focusQuality: z.number().min(1).max(10).optional(),
        sleepQuality: z.number().min(1).max(10).optional(),
        sleepHours: z.number().min(0).max(24).optional(),
        exerciseMinutes: z.number().optional(),
        notes: z.string().optional(),
        dailyWin: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { dailyWin, date: inputDate, ...wellbeingData } = input;
      const date = inputDate || new Date();

      // Normalize to UTC midnight
      const normalizedDate = new Date(date);
      normalizedDate.setUTCHours(0, 0, 0, 0);

      try {
        // Calculate average energy if possible
        const energies = [
          wellbeingData.morningEnergy,
          wellbeingData.afternoonEnergy,
          wellbeingData.eveningEnergy,
        ].filter((v) => v !== undefined && v !== null) as number[];
        const averageEnergy =
          energies.length > 0
            ? energies.reduce((a, b) => a + b, 0) / energies.length
            : undefined;

        // 1. Save Wellbeing Entry (Find + Update or Create)
        const existingEntry = await ctx.prisma.wellBeingEntry.findFirst({
          where: {
            userId: ctx.userId,
            date: normalizedDate,
          },
        });

        let entry;
        if (existingEntry) {
          entry = await ctx.prisma.wellBeingEntry.update({
            where: { id: existingEntry.id },
            data: {
              ...wellbeingData,
              averageEnergy,
              dailyWin, // Also save to wellbeing entry
            },
          });
        } else {
          entry = await ctx.prisma.wellBeingEntry.create({
            data: {
              ...wellbeingData,
              averageEnergy,
              dailyWin,
              date: normalizedDate,
              userId: ctx.userId,
            },
          });
        }

        // 2. If a Daily Win is provided, sync it to the DayPlan for this date
        if (dailyWin) {
          // Direct lookup thanks to new userId field!
          const dayPlan = await ctx.prisma.dayPlan.findFirst({
            where: {
              userId: ctx.userId,
              date: normalizedDate,
            },
          });

          if (dayPlan) {
            await ctx.prisma.dayPlan.update({
              where: { id: dayPlan.id },
              data: { dailyWin },
            });
          } else {
            // PROACTIVE: If no day plan exists, we need to create one.
            // But DayPlan requires a WeekPlanId. We'll try to find a WeekPlan for this date.
            const weekStart = new Date(normalizedDate);
            // Assuming week starts on Monday (1)
            const day = weekStart.getUTCDay();
            const diff = weekStart.getUTCDate() - day + (day === 0 ? -6 : 1);
            weekStart.setUTCDate(diff);
            weekStart.setUTCHours(0, 0, 0, 0);

            const weekEnd = new Date(weekStart);
            weekEnd.setUTCDate(weekStart.getUTCDate() + 6);
            weekEnd.setUTCHours(23, 59, 59, 999);

            const weekPlan = await ctx.prisma.weekPlan.findFirst({
              where: {
                userId: ctx.userId,
                startDate: { gte: weekStart },
                endDate: { lte: weekEnd },
              },
            });

            if (weekPlan) {
              await ctx.prisma.dayPlan.create({
                data: {
                  userId: ctx.userId,
                  weekPlanId: weekPlan.id,
                  date: normalizedDate,
                  dailyWin,
                },
              });
            }
          }
        }

        return entry;
      } catch (error: any) {
        console.error("Error in createEntry:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message || "Failed to save daily review",
        });
      }
    }),

  // Get today's entry
  getTodayEntry: protectedProcedure.query(async ({ ctx }) => {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    return ctx.prisma.wellBeingEntry.findFirst({
      where: {
        userId: ctx.userId,
        date: today,
      },
    });
  }),

  // Get entries for a date range (for analytics)
  getEntries: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.wellBeingEntry.findMany({
        where: {
          userId: ctx.userId,
          date: {
            gte: input.startDate,
            lte: input.endDate,
          },
        },
        orderBy: { date: "asc" },
      });
    }),

  // Get energy stats for dashboard
  getEnergyStats: protectedProcedure
    .input(
      z.object({
        days: z.number().default(7),
      }),
    )
    .query(async ({ ctx, input }) => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - input.days);
      startDate.setHours(0, 0, 0, 0);

      const entries = await ctx.prisma.wellBeingEntry.findMany({
        where: {
          userId: ctx.userId,
          date: { gte: startDate },
        },
        orderBy: { date: "asc" },
      });

      if (entries.length === 0) {
        return {
          avgEnergy: null,
          avgStress: null,
          avgFocus: null,
          trend: "stable" as const,
          entries,
        };
      }

      // Helper to calculate avg of non-null values
      const getAvg = (arr: any[], key: string) => {
        const filtered = arr.filter((e) => e[key] !== null);
        return filtered.length > 0
          ? filtered.reduce((sum, e) => sum + e[key], 0) / filtered.length
          : null;
      };

      const avgEnergy =
        getAvg(entries, "averageEnergy") || getAvg(entries, "morningEnergy");
      const avgStress = getAvg(entries, "stressLevel");
      const avgFocus = getAvg(entries, "focusQuality");

      // Calculate trend (compare first half to second half)
      let trend: "improving" | "declining" | "stable" = "stable";
      if (entries.length >= 2) {
        const mid = Math.floor(entries.length / 2);
        const firstHalf = entries.slice(0, mid);
        const secondHalf = entries.slice(mid);
        const firstAvg = getAvg(firstHalf, "morningEnergy") || 0;
        const secondAvg = getAvg(secondHalf, "morningEnergy") || 0;

        if (secondAvg > firstAvg + 0.5) trend = "improving";
        else if (secondAvg < firstAvg - 0.5) trend = "declining";
      }

      return {
        avgEnergy: avgEnergy ? Math.round(avgEnergy * 10) / 10 : null,
        avgStress: avgStress ? Math.round(avgStress * 10) / 10 : null,
        avgFocus: avgFocus ? Math.round(avgFocus * 10) / 10 : null,
        trend,
        entries,
      };
    }),
});
