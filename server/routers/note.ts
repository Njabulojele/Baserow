import { z } from "zod";
import { router, protectedProcedure } from "../trpc";

export const noteRouter = router({
  createNote: protectedProcedure
    .input(
      z.object({
        content: z.string(),
        goalId: z.string().optional(),
        keyStepId: z.string().optional(),
        dayPlanId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.note.create({
        data: {
          userId: ctx.userId,
          content: input.content,
          goalId: input.goalId,
          keyStepId: input.keyStepId,
          dayPlanId: input.dayPlanId,
        },
      });
    }),

  updateNote: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        content: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.note.update({
        where: { id: input.id },
        data: { content: input.content },
      });
    }),

  deleteNote: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return await ctx.prisma.note.delete({
        where: { id: input.id },
      });
    }),

  getNotes: protectedProcedure
    .input(
      z.object({
        goalId: z.string().optional(),
        keyStepId: z.string().optional(),
        dayPlanId: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { goalId, keyStepId, dayPlanId } = input;
      return await ctx.prisma.note.findMany({
        where: {
          userId: ctx.userId,
          ...(goalId ? { goalId } : {}),
          ...(keyStepId ? { keyStepId } : {}),
          ...(dayPlanId ? { dayPlanId } : {}),
        },
        orderBy: { createdAt: "desc" },
      });
    }),
});
