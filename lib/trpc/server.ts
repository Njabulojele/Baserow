import "server-only";
import { cache } from "react";
import { createTRPCContext } from "@/server/trpc";
import { appRouter } from "@/server/routers/_app";

/**
 * Server-side tRPC caller for prefetching data
 * Uses React cache() for request deduplication
 */
export const createServerCaller = cache(async () => {
  const context = await createTRPCContext();
  return appRouter.createCaller(context);
});

/**
 * Prefetch helpers for common queries
 */
export const prefetch = {
  /**
   * Prefetch dashboard data
   */
  dashboard: cache(async () => {
    try {
      const caller = await createServerCaller();
      const [stats, todaysTasks, activeTimer] = await Promise.all([
        caller.analytics.getDashboardStats(),
        caller.task.getTodaysTasks(),
        caller.task.getActiveTimer(),
      ]);
      return { stats, todaysTasks, activeTimer };
    } catch {
      return { stats: null, todaysTasks: [], activeTimer: null };
    }
  }),

  /**
   * Prefetch tasks list
   */
  tasks: cache(async (filters?: any) => {
    try {
      const caller = await createServerCaller();
      return await caller.task.getTasks(filters);
    } catch {
      return [];
    }
  }),

  /**
   * Prefetch projects list
   */
  projects: cache(async (filters?: any) => {
    try {
      const caller = await createServerCaller();
      return await caller.project.getProjects(filters);
    } catch {
      return [];
    }
  }),

  /**
   * Prefetch single project with tasks
   */
  project: cache(async (id: string) => {
    try {
      const caller = await createServerCaller();
      return await caller.project.getProject({ id });
    } catch {
      return null;
    }
  }),

  /**
   * Prefetch week planning data
   */
  weekPlan: cache(async (filters: { weekStart?: Date }) => {
    try {
      const caller = await createServerCaller();
      return await caller.planning.getWeekPlan(filters);
    } catch {
      return null;
    }
  }),

  /**
   * Prefetch day planning data
   */
  dayPlan: cache(async (filters: { date?: Date }) => {
    try {
      const caller = await createServerCaller();
      return await caller.planning.getDayPlan(filters);
    } catch {
      return null;
    }
  }),

  /**
   * Prefetch weekly overview with projects and unscheduled tasks
   */
  weeklyOverview: cache(async (filters: { weekStart?: Date }) => {
    try {
      const caller = await createServerCaller();
      return await caller.planning.getWeeklyOverview(filters);
    } catch {
      return null;
    }
  }),

  /**
   * Prefetch calendar events
   */
  calendar: {
    getEvents: cache(async (input: { start: Date; end: Date }) => {
      try {
        const caller = await createServerCaller();
        return await caller.calendar.getEvents(input);
      } catch {
        return [];
      }
    }),
  },
};
