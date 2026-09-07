import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

/**
 * Timer Router — typed tRPC procedures for timer sessions, break accounting,
 * project/task/goal association, and user activity tracking.
 * 
 * At runtime, calls to /api/trpc/timer.* are proxied to Go backend or Prisma.
 */
export const timerRouter = router({
  logSession: protectedProcedure
    .input(
      z.object({
        durationSeconds: z.number().min(1),
        projectId: z.string().optional(),
        taskId: z.string().optional(),
        goalId: z.string().optional(),
        sessionType: z
          .enum(["focus", "break", "pomodoro", "short_break", "long_break"])
          .default("focus"),
        title: z.string().optional(),
        notes: z.string().optional(),
        completed: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Fallback implementation in Prisma if direct execution occurs
      try {
        if (ctx.userId) {
          await ctx.prisma.timeEntry.create({
            data: {
              userId: ctx.userId,
              projectId: input.projectId || null,
              taskId: input.taskId || null,
              duration: Math.round(input.durationSeconds / 60),
              type: input.sessionType,
              description: input.notes || input.title || "Timer session",
              startTime: new Date(Date.now() - input.durationSeconds * 1000),
              endTime: new Date(),
            },
          });
        }
      } catch (e) {
        // Silent catch if proxied
      }
      return { success: true };
    }),

  getStats: protectedProcedure.query(async () => {
    return {
      todayFocusSeconds: 0,
      todayBreakSeconds: 0,
      weekFocusSeconds: 0,
      todaySessionsCount: 0,
      streakDays: 0,
      completedGoals: 0,
      daysActive: 0,
    };
  }),

  getRecentSessions: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().optional().default(25),
        })
        .optional()
    )
    .query(async () => {
      return [] as Array<{
        id: string;
        durationSeconds: number;
        sessionType: string;
        title: string;
        notes: string;
        startedAt: string;
        projectId: string;
        projectName: string;
        projectColor: string;
        taskId: string;
        taskTitle: string;
        goalId: string;
        goalTitle: string;
      }>;
    }),

  logVisit: protectedProcedure
    .input(
      z
        .object({
          page: z.string().optional(),
        })
        .optional()
    )
    .mutation(async () => {
      return { success: true };
    }),
});
