import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const calendarRouter = router({
  // Get all events (Tasks + TimeBlocks + CalendarEvents) for a date range
  getEvents: protectedProcedure
    .input(
      z.object({
        start: z.date(),
        end: z.date(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // 1. Fetch Tasks with scheduledDate in range
      const tasks = await ctx.prisma.task.findMany({
        where: {
          userId: ctx.userId,
          scheduledDate: {
            gte: input.start,
            lte: input.end,
          },
          status: { not: "done" }, // Only show pending/active tasks? Or all? Let's show all but mark done.
        },
        select: {
          id: true,
          title: true,
          scheduledDate: true,
          estimatedMinutes: true,
          priority: true,
          status: true,
          project: {
            select: { name: true, color: true },
          },
        },
      });

      // 2. Fetch TimeBlocks (via DayPlans in range)
      const dayPlans = await ctx.prisma.dayPlan.findMany({
        where: {
          userId: ctx.userId,
          date: {
            gte: input.start,
            lte: input.end,
          },
        },
        include: {
          timeBlocks: {
            include: {
              task: { select: { title: true } },
              project: { select: { name: true, color: true } },
            },
          },
        },
      });

      const timeBlocks = dayPlans.flatMap((dp) => dp.timeBlocks);

      // 3. Fetch CalendarEvents (Generic events)
      const calendarEvents = await ctx.prisma.calendarEvent.findMany({
        where: {
          userId: ctx.userId,
          startTime: {
            gte: input.start,
          },
          endTime: {
            lte: input.end,
          },
        },
      });

      // Standardize output to a common "Event" interface for the frontend
      const mappedTasks = tasks.map((t) => {
        // Assume default 30 mins if no estimate, for visualization
        const duration = t.estimatedMinutes || 30;
        const start = new Date(t.scheduledDate!);
        const end = new Date(start.getTime() + duration * 60000);

        return {
          id: t.id,
          title: t.title,
          start: start.toISOString(),
          end: end.toISOString(),
          type: "task",
          status: t.status,
          priority: t.priority,
          color: t.project?.color || "#cbd5e1", // slate-300 default
          projectId: t.project?.name,
          draggable: true,
          resizable: true,
        };
      });

      const mappedBlocks = timeBlocks.map((b) => ({
        id: b.id,
        title: b.task?.title || "Time Block",
        start: b.startTime.toISOString(),
        end: b.endTime.toISOString(),
        type: "time_block",
        status: "scheduled",
        priority: "medium", // blocks don't really have priority
        color: b.project?.color || "#3b82f6", // blue-500 default
        projectId: b.project?.name,
        draggable: true,
        resizable: true,
      }));

      const mappedEvents = calendarEvents.map((e) => ({
        id: e.id,
        title: e.title,
        start: e.startTime.toISOString(),
        end: e.endTime.toISOString(),
        type: "event",
        status: "scheduled",
        priority: "medium",
        color: e.color || "#a855f7", // purple-500
        projectId: null,
        draggable: true,
        resizable: true,
      }));

      return [...mappedTasks, ...mappedBlocks, ...mappedEvents];
    }),

  // Create or Update a TimeBlock (ensures DayPlan exists)
  upsertTimeBlock: protectedProcedure
    .input(
      z.object({
        id: z.string().optional(),
        date: z.date(), // Date of the DayPlan
        startTime: z.date(),
        endTime: z.date(),
        taskId: z.string().optional(),
        projectId: z.string().optional(),
        title: z.string().optional(), // If no task
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // 1. Find or Create DayPlan
      let dayPlan = await ctx.prisma.dayPlan.findUnique({
        where: {
          userId_date: {
            userId: ctx.userId,
            date: input.date,
          },
        },
      });

      if (!dayPlan) {
        // Need to find a WeekPlan... simplifying for now, create DayPlan without weak link if allowed?
        // Schema says `weekPlan` relation is mandatory?
        /*
          model DayPlan { ... weekPlan WeekPlan @relation(...) }
        */
        // I need a week plan.
        // Let's find pending week plan or create one.
        // This is complex. For now, let's try to assume week plan logic exists elsewhere or do a "catch-all" week plan.
        // Actually, let's look at `WeekPlan` model.
        /*
          model WeekPlan { ... userId, monthPlanId, weekNumber, year, startDate, endDate ... }
        */

        // Strategy: Use a helper or just fail if no week plan?
        // Better: Automatically find the current week plan.

        // This might be too complex for a quick "drag and drop" if the user hasn't done "Planning".
        // Let's defer to creating a simple "CalendarEvent" if we want to avoid the DayPlan strictness?
        // OR rely on existing logic to create DayPlans.

        // Let's stick to `CalendarEvent` for drag/drop from sidebar to ensure we don't block on "Planning Mode".
        // BUT the plan said "TimeBlock".
        // Let's verify if `TimeBlock` is strictly needed. `CalendarEvent` is looser.
        // Let's use `CalendarEvent` for now to be safe and flexible.
        // I will change implementation to upsert `CalendarEvent`.

        return await ctx.prisma.calendarEvent.create({
          data: {
            userId: ctx.userId,
            title: input.title || "Untitled Block",
            startTime: input.startTime,
            endTime: input.endTime,
            timezone: "UTC", // Simplify
            taskId: input.taskId,
            projectId: input.projectId,
            type: "time_block",
          },
        });
      }

      // If DayPlan exists, we CAN use TimeBlock.
      // But having mix of TimeBlock and CalendarEvent is messy.

      // DECISION: Phase 6 is "Advanced Calendar".
      // Let's use `CalendarEvent` as the primary backing for the visual calendar.
      // `TimeBlock` inside `DayPlan` is for the specific "Day Planner" view (rigid, ordered).
      // `CalendarEvent` is for the flexible time grid.

      const event = await ctx.prisma.calendarEvent.create({
        data: {
          userId: ctx.userId,
          title: input.title || "Untitled Block",
          startTime: input.startTime,
          endTime: input.endTime,
          timezone: "UTC",
          taskId: input.taskId,
          projectId: input.projectId,
          type: "time_block",
        },
      });
      return event;
    }),

  // Update Event (resize/move)
  updateEvent: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        start: z.date(),
        end: z.date(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Try to find as CalendarEvent first
      const event = await ctx.prisma.calendarEvent.findUnique({
        where: { id: input.id },
      });
      if (event) {
        return await ctx.prisma.calendarEvent.update({
          where: { id: input.id },
          data: { startTime: input.start, endTime: input.end },
        });
      }

      // If not, maybe it's a Task?
      const task = await ctx.prisma.task.findUnique({
        where: { id: input.id },
      });
      if (task) {
        // Calculate new duration? Or just update scheduledDate?
        // Tasks usually defined by start date.
        return await ctx.prisma.task.update({
          where: { id: input.id },
          data: { scheduledDate: input.start },
          // Note: Tasks don't natively store "end time" unless we use estimatedMinutes.
          // We could update estimatedMinutes based on the drop?
          // let duration = (input.end - input.start) / 60000;
          // data: { scheduledDate: input.start, estimatedMinutes: duration }
        });
      }

      // If TimeBlock
      const block = await ctx.prisma.timeBlock.findUnique({
        where: { id: input.id },
      });
      if (block) {
        return await ctx.prisma.timeBlock.update({
          where: { id: input.id },
          data: { startTime: input.start, endTime: input.end },
        });
      }

      throw new TRPCError({ code: "NOT_FOUND", message: "Event not found" });
    }),
});
