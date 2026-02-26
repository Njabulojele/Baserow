import { initTRPC, TRPCError } from "@trpc/server";
import { prisma } from "@/lib/prisma";
import superjson from "superjson";
import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";

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
 * Global Error Boundary Middleware
 */
const errorHandler = t.middleware(async ({ next, ctx, path, type, input }) => {
  try {
    return await next();
  } catch (error) {
    Sentry.captureException(error, {
      extra: { path, type, input, userId: ctx.userId },
    });
    console.error(`❌ [tRPC Error on ${path}]:`, error);
    throw error;
  }
});

/**
 * Audit Logging Middleware
 */
const auditLogger = t.middleware(async ({ next, ctx, path, type, input }) => {
  const result = await next();

  if (type === "mutation" && result.ok && ctx.userId) {
    let entityId = "SYSTEM";
    if (input && typeof input === "object") {
      if ("id" in input && typeof input.id === "string") entityId = input.id;
      else if ("orgId" in input && typeof input.orgId === "string")
        entityId = input.orgId;
      else if ("projectId" in input && typeof input.projectId === "string")
        entityId = input.projectId;
      else if ("taskId" in input && typeof input.taskId === "string")
        entityId = input.taskId;
    }

    try {
      await ctx.prisma.auditLog.create({
        data: {
          userId: ctx.userId,
          action: path,
          entityType: path.split(".")[0] || "Unknown",
          entityId: entityId,
          newValue: input ? JSON.parse(JSON.stringify(input)) : null,
        },
      });
    } catch (e) {
      console.error("[AuditLog Error]", e);
    }
  }

  return result;
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
export const publicProcedure = t.procedure.use(errorHandler);
export const protectedProcedure = t.procedure
  .use(errorHandler)
  .use(isAuthed)
  .use(auditLogger);
