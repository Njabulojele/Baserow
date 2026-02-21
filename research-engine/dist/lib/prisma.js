"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.prisma = void 0;
require("dotenv/config");
const client_1 = require("@prisma/client");
const adapter_pg_1 = require("@prisma/adapter-pg");
// Validate DATABASE_URL before initializing
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
    console.error("[Prisma] ERROR: DATABASE_URL environment variable is not set!");
    console.error("[Prisma] Please configure DATABASE_URL in your Render service environment variables.");
    process.exit(1);
}
console.log("[Prisma] DATABASE_URL is configured, initializing client...");
const prisma = new client_1.PrismaClient({
    adapter: new adapter_pg_1.PrismaPg({
        connectionString: process.env.DATABASE_URL,
    }),
});
exports.prisma = prisma;
