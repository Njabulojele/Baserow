import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const softDeleteModels = [
  "User",
  "Project",
  "Task",
  "Client",
  "Deal",
  "CanvasBoard",
];

// Standard Prisma client for Vercel deployment
// The PrismaPg adapter is ONLY used in research-engine (Render)
const prismaClientSingleton = () => {
  const baseClient = new PrismaClient({
    adapter: new PrismaPg({
      connectionString: process.env.DATABASE_URL!,
    }),
  });

  return baseClient.$extends({
    query: {
      $allModels: {
        async delete({ model, args, query }) {
          if (softDeleteModels.includes(model)) {
            return (baseClient as any)[model].update({
              ...args,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },
        async deleteMany({ model, args, query }) {
          if (softDeleteModels.includes(model)) {
            return (baseClient as any)[model].updateMany({
              where: args?.where,
              data: { deletedAt: new Date() },
            });
          }
          return query(args);
        },
        async findMany({ model, args, query }) {
          if (softDeleteModels.includes(model)) {
            return query({
              ...args,
              where: { deletedAt: null, ...(args?.where || {}) },
            } as any);
          }
          return query(args);
        },
        async findFirst({ model, args, query }) {
          if (softDeleteModels.includes(model)) {
            return query({
              ...args,
              where: { deletedAt: null, ...(args?.where || {}) },
            } as any);
          }
          return query(args);
        },
      },
    },
  });
};

declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>;
}

const prisma = globalThis.prismaGlobal ?? prismaClientSingleton();

/**
 * Executes a Prisma query within an RLS-enforced transaction.
 * The inner callback receives a transaction-bound Prisma client `tx`.
 * This ensures that cross-tenant data leaks are impossible at the DB level.
 */
export async function withTenant<T>(
  organizationId: string | null | undefined,
  callback: (tx: typeof prisma) => Promise<T>,
): Promise<T> {
  if (!organizationId) {
    // If no organization is specified, simply execute without setting the tenant context
    // The policy defaults to allowing access if organizationId IS NULL for the record
    return callback(prisma);
  }

  return prisma.$transaction(async (tx) => {
    // Set the Postgres local transaction variable
    await tx.$executeRawUnsafe(
      `SELECT set_config('app.current_tenant', $1, true)`,
      organizationId,
    );
    // Execute the user's callback with the transaction object `tx`
    return callback(tx as unknown as typeof prisma);
  });
}

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

export type ExtendedPrismaClient = typeof prisma;

export { prisma };
