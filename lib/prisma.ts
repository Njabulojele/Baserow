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

if (process.env.NODE_ENV !== "production") globalThis.prismaGlobal = prisma;

export { prisma };
