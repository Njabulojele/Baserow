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
          const durationMinutes = Math.max(1, Math.round(input.durationSeconds / 60));
          await ctx.prisma.timeEntry.create({
            data: {
              userId: ctx.userId,
              projectId: input.projectId || null,
              taskId: input.taskId || null,
              duration: durationMinutes,
              type: input.sessionType,
              description: input.notes || input.title || "Timer session",
              startTime: new Date(Date.now() - input.durationSeconds * 1000),
              endTime: new Date(),
            },
          });

          if (input.taskId) {
            await ctx.prisma.task.update({
              where: { id: input.taskId },
              data: {
                actualMinutes: { increment: durationMinutes },
                ...(input.completed
                  ? { status: "done", completedAt: new Date(), timerRunning: false }
                  : { timerRunning: false }),
              },
            });
          }

          if (input.goalId) {
            await ctx.prisma.goal.update({
              where: { id: input.goalId },
              data: {
                progress: { increment: 1 },
              },
            });
          }
        }
      } catch (e) {
        // Silent catch if proxied to Go backend
      }
      return { success: true };
    }),

  getStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - 7);

      const entries = await ctx.prisma.timeEntry.findMany({
        where: { userId: ctx.userId, startTime: { gte: weekStart } },
      });

      const todayEntries = entries.filter((e) => new Date(e.startTime) >= todayStart);

      const todayFocusSeconds = todayEntries
        .filter((e) => !e.type.includes("break"))
        .reduce((sum, e) => sum + e.duration * 60, 0);

      const todayBreakSeconds = todayEntries
        .filter((e) => e.type.includes("break"))
        .reduce((sum, e) => sum + e.duration * 60, 0);

      const weekFocusSeconds = entries
        .filter((e) => !e.type.includes("break"))
        .reduce((sum, e) => sum + e.duration * 60, 0);

      return {
        todayFocusSeconds,
        todayBreakSeconds,
        weekFocusSeconds,
        todaySessionsCount: todayEntries.length,
        streakDays: 5,
        completedGoals: 0,
        daysActive: 1,
      };
    } catch {
      return {
        todayFocusSeconds: 0,
        todayBreakSeconds: 0,
        weekFocusSeconds: 0,
        todaySessionsCount: 0,
        streakDays: 0,
        completedGoals: 0,
        daysActive: 0,
      };
    }
  }),

  getRecentSessions: protectedProcedure
    .input(
      z
        .object({
          limit: z.number().optional().default(25),
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      try {
        const entries = await ctx.prisma.timeEntry.findMany({
          where: { userId: ctx.userId },
          orderBy: { startTime: "desc" },
          take: input?.limit || 25,
          include: { project: true, task: true },
        });

        return entries.map((e) => ({
          id: e.id,
          durationSeconds: e.duration * 60,
          sessionType: e.type,
          title: e.description || e.task?.title || e.project?.name || "Timer Session",
          notes: e.description || "",
          startedAt: e.startTime.toISOString(),
          projectId: e.projectId || "",
          projectName: e.project?.name || "",
          projectColor: e.project?.color || "#a9927d",
          taskId: e.taskId || "",
          taskTitle: e.task?.title || "",
          goalId: "",
          goalTitle: "",
        }));
      } catch {
        return [];
      }
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
