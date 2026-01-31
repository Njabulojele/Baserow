import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const meetingRouter = router({
  // Get meetings for a client or project
  getMeetings: protectedProcedure
    .input(
      z.object({
        clientId: z.string().optional(),
        projectId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { clientId, projectId } = input;

      if (!clientId && !projectId) return [];

      return ctx.prisma.meeting.findMany({
        where: {
          userId: ctx.userId,
          ...(clientId ? { clientId } : {}),
          ...(projectId ? { projectId } : {}),
        },
        include: {
          tasks: {
            select: { id: true, title: true, status: true },
          },
        },
        orderBy: { scheduledAt: "desc" },
      });
    }),

  // Create a new meeting
  createMeeting: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1),
        date: z.date(),
        duration: z.number().default(30),
        clientId: z.string().optional(),
        projectId: z.string().optional(),
        type: z.string().optional(),
        notes: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.meeting.create({
        data: {
          userId: ctx.userId,
          title: input.title,
          scheduledAt: input.date, // Map date -> scheduledAt
          duration: input.duration,
          clientId: input.clientId,
          projectId: input.projectId,
          type: input.type || "meeting",
        },
      });
    }),

  // Update meeting notes
  updateMeeting: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        notes: z.string().optional(),
        title: z.string().optional(),
        date: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const meeting = await ctx.prisma.meeting.findUnique({
        where: { id: input.id },
      });

      if (!meeting || meeting.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return ctx.prisma.meeting.update({
        where: { id: input.id },
        data: {
          meetingNotes: input.notes,
          title: input.title,
          scheduledAt: input.date, // Map date -> scheduledAt
        },
      });
    }),

  // Create a task from a meeting (Action Item)
  createActionItem: protectedProcedure
    .input(
      z.object({
        meetingId: z.string(),
        title: z.string().min(1),
        description: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const meeting = await ctx.prisma.meeting.findUnique({
        where: { id: input.meetingId },
        select: { userId: true, clientId: true, projectId: true },
      });

      if (!meeting || meeting.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Meeting not found",
        });
      }

      return ctx.prisma.task.create({
        data: {
          userId: ctx.userId,
          title: input.title,
          description: input.description,
          meetingId: input.meetingId,
          projectId: meeting.projectId, // Inherit project context
          status: "not_started",
          type: "task",
          priority: "medium",
        },
      });
    }),
});
