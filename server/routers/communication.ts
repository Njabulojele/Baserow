import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const communicationRouter = router({
  // Get communications for a client
  getCommunications: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        type: z.string().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().nullish(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Verify client belongs to user
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.clientId },
      });

      if (!client || client.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      const where: any = {
        clientId: input.clientId,
      };

      if (input.type && input.type !== "all") {
        where.type = input.type;
      }

      // Cursor-based pagination
      const limit = input.limit ?? 50;
      const { cursor } = input;

      const items = await ctx.prisma.communication.findMany({
        where,
        take: limit + 1,
        cursor: cursor ? { id: cursor } : undefined,
        orderBy: { createdAt: "desc" },
      });

      let nextCursor: typeof cursor | undefined = undefined;
      if (items.length > limit) {
        const nextItem = items.pop();
        nextCursor = nextItem!.id;
      }

      return {
        items,
        nextCursor,
      };
    }),

  // Create communication
  createCommunication: protectedProcedure
    .input(
      z.object({
        clientId: z.string(),
        projectId: z.string().optional(),
        type: z.enum(["email", "call", "meeting", "message", "note"]),
        direction: z.enum(["inbound", "outbound"]),
        subject: z.string().min(1, "Subject is required"),
        content: z.string(),
        summary: z.string().optional(),
        // Email
        from: z.string().optional(),
        to: z.array(z.string()).optional(),
        cc: z.array(z.string()).optional(),
        // Meeting
        meetingDate: z.date().optional(),
        meetingDuration: z.number().optional(),
        attendees: z.array(z.string()).optional(),
        meetingNotes: z.string().optional(),
        // Tracking
        sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
        requiresFollowUp: z.boolean().default(false),
        followUpDate: z.date().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify client ownership
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.clientId },
      });

      if (!client || client.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      // Update client's last interaction
      await ctx.prisma.client.update({
        where: { id: input.clientId },
        data: { lastInteractionAt: new Date() },
      });

      return ctx.prisma.communication.create({
        data: {
          clientId: input.clientId,
          projectId: input.projectId,
          type: input.type,
          direction: input.direction,
          subject: input.subject,
          content: input.content,
          summary: input.summary,
          from: input.from,
          to: input.to || [],
          cc: input.cc || [],
          meetingDate: input.meetingDate,
          meetingDuration: input.meetingDuration,
          attendees: input.attendees || [],
          meetingNotes: input.meetingNotes,
          sentiment: input.sentiment,
          requiresFollowUp: input.requiresFollowUp,
          followUpDate: input.followUpDate,
        },
      });
    }),

  // Update communication
  updateCommunication: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        subject: z.string().optional(),
        content: z.string().optional(),
        summary: z.string().optional(),
        sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
        requiresFollowUp: z.boolean().optional(),
        followUpDate: z.date().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const comm = await ctx.prisma.communication.findUnique({
        where: { id: input.id },
        include: { client: true },
      });

      if (!comm || comm.client.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Communication not found",
        });
      }

      return ctx.prisma.communication.update({
        where: { id: input.id },
        data: {
          subject: input.subject,
          content: input.content,
          summary: input.summary,
          sentiment: input.sentiment,
          requiresFollowUp: input.requiresFollowUp,
          followUpDate: input.followUpDate,
        },
      });
    }),

  // Delete communication
  deleteCommunication: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const comm = await ctx.prisma.communication.findUnique({
        where: { id: input.id },
        include: { client: true },
      });

      if (!comm || comm.client.userId !== ctx.userId) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Communication not found",
        });
      }

      return ctx.prisma.communication.delete({
        where: { id: input.id },
      });
    }),
});
