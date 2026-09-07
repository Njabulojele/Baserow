import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

/**
 * Goals router — provides TypeScript types for the tRPC client.
 *
 * At runtime, ALL calls are proxied to the Go backend via
 * app/api/trpc/[trpc]/route.ts → localhost:8080.
 * These procedure bodies are never executed in production;
 * they exist purely for type safety and IDE autocomplete.
 */
export const goalsRouter = router({
  list: protectedProcedure.query(async () => {
    // Proxied to Go: GET /api/trpc/goals.list
    return [] as Array<{
      id: string;
      title: string;
      category: string;
      pillar: string;
      status: string;
      streak: number;
      neglectThresholdDays: number;
      completedDates: string[];
      lastLoggedAt: string | null;
      targetHours: number;
      completedHours: number;
      targetValueZar: number;
      currentValueZar: number;
      createdAt: string;
    }>;
  }),

  create: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        pillar: z.string().optional(),
        category: z.string().optional(),
        frequency: z.string().optional(),
        scheduledDays: z.array(z.string()).optional(),
        targetMinutes: z.number().optional(),
        mode: z.string().optional(),
        pomodoroWorkMinutes: z.number().optional(),
        pomodoroBreakMinutes: z.number().optional(),
        autoStartBreaks: z.boolean().optional(),
      }),
    )
    .mutation(async ({ input }) => {
      // Proxied to Go: POST /api/trpc/goals.create
      return { id: "", success: true } as { id: string; success: boolean };
    }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        title: z.string().optional(),
        pillar: z.string().optional(),
        category: z.string().optional(),
        targetHours: z.number().optional(),
        targetValueZar: z.number().optional(),
      }),
    )
    .mutation(async () => {
      // Proxied to Go: POST /api/trpc/goals.update
      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async () => {
      // Proxied to Go: POST /api/trpc/goals.delete
      return { success: true };
    }),

  toggle: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        date: z.string().optional(),
      }),
    )
    .mutation(async () => {
      // Proxied to Go: POST /api/trpc/goals.toggle
      return { completed: true, streak: 0 };
    }),

  logSession: protectedProcedure
    .input(
      z.object({
        goalId: z.string(),
        durationSeconds: z.number(),
      }),
    )
    .mutation(async () => {
      // Proxied to Go: POST /api/trpc/goals.logSession
      return { success: true };
    }),
});
