import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";
import superjson from "superjson";
import { auth } from "@clerk/nextjs/server";

/**
 * Context for tRPC procedures
 */
export const createTRPCContext = async () => {
  const { userId } = await auth();

  return {
    prisma,
    userId,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

/**
 * Middleware to ensure user is authenticated
 */
const isAuthed = t.middleware(async ({ ctx, next }) => {
  if (!ctx.userId) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      ...ctx,
      userId: ctx.userId,
    },
  });
});

/**
 * Exports
 */
export const router = t.router;
export const publicProcedure = t.procedure;
export const protectedProcedure = t.procedure.use(isAuthed);
