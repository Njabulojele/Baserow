import { initTRPC, TRPCError } from "@trpc/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import superjson from "superjson";
import { auth } from "@clerk/nextjs/server";
import * as Sentry from "@sentry/nextjs";

/**
 * Context for tRPC procedures
 */
export const createTRPCContext = async () => {
  const { userId } = await auth();

  let activeOrgId: string | null = null;

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { activeOrgId: true },
    });
    activeOrgId = user?.activeOrgId || null;
  }

  return {
    prisma,
    userId,
    organizationId: activeOrgId,
  };
};

export type Context = Awaited<ReturnType<typeof createTRPCContext>>;

/**
 * Initialize tRPC
 */
const t = initTRPC.context<Context>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    // In production, never let internal implementation details reach the client.
    // Only TRPCErrors with deliberate messages pass through; everything else
    // is replaced with a generic message. Stack traces are always stripped.
    if (process.env.NODE_ENV === "production") {
      const isTRPCError =
        error.code !== "INTERNAL_SERVER_ERROR" &&
        !(error.cause instanceof Prisma.PrismaClientKnownRequestError) &&
        !(error.cause instanceof Prisma.PrismaClientValidationError) &&
        !(error.cause instanceof Prisma.PrismaClientUnknownRequestError);

      if (!isTRPCError) {
        return {
          ...shape,
          message: "Internal server error",
          data: {
            ...shape.data,
            stack: undefined,
          },
        };
      }

      // Even for safe TRPCErrors, strip stack traces in production
      return {
        ...shape,
        data: {
          ...shape.data,
          stack: undefined,
        },
      };
    }
    return shape;
  },
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
      organizationId: ctx.organizationId,
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
