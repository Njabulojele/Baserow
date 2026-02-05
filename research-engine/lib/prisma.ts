import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Validate DATABASE_URL before initializing
const databaseUrl = process.env.DATABASE_URL!;
if (!databaseUrl) {
  console.error(
    "[Prisma] ERROR: DATABASE_URL environment variable is not set!",
  );
  console.error(
    "[Prisma] Please configure DATABASE_URL in your Render service environment variables.",
  );
  process.exit(1);
}

console.log("[Prisma] DATABASE_URL is configured, initializing client...");

const prisma = new PrismaClient({
  adapter: new PrismaPg({
    connectionString: process.env.DATABASE_URL,
  }),
});

export { prisma };
