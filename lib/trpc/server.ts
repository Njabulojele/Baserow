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
    const caller = await createServerCaller();
    const [stats, todaysTasks, activeTimer] = await Promise.all([
      caller.analytics.getDashboardStats(),
      caller.task.getTodaysTasks(),
      caller.task.getActiveTimer(),
    ]);
    return { stats, todaysTasks, activeTimer };
  }),

  /**
   * Prefetch tasks list
   */
  tasks: cache(async (filters?: any) => {
    const caller = await createServerCaller();
    return caller.task.getTasks(filters);
  }),

  /**
   * Prefetch projects list
   */
  projects: cache(async (filters?: any) => {
    const caller = await createServerCaller();
    return caller.project.getProjects(filters);
  }),

  /**
   * Prefetch single project with tasks
   */
  project: cache(async (id: string) => {
    const caller = await createServerCaller();
    return caller.project.getProject({ id });
  }),

  /**
   * Prefetch week planning data
   */
  weekPlan: cache(async (filters: { weekStart?: Date }) => {
    const caller = await createServerCaller();
    return caller.planning.getWeekPlan(filters);
  }),

  /**
   * Prefetch day planning data
   */
  dayPlan: cache(async (filters: { date?: Date }) => {
    const caller = await createServerCaller();
    return caller.planning.getDayPlan(filters);
  }),

  /**
   * Prefetch weekly overview with projects and unscheduled tasks
   */
  weeklyOverview: cache(async (filters: { weekStart?: Date }) => {
    const caller = await createServerCaller();
    return caller.planning.getWeeklyOverview(filters);
  }),

  /**
   * Prefetch calendar events
   */
  calendar: {
    getEvents: cache(async (input: { start: Date; end: Date }) => {
      const caller = await createServerCaller();
      return caller.calendar.getEvents(input);
    }),
  },
};
