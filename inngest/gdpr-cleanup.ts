import { inngest } from "./client";
import { prisma } from "@/lib/prisma";

/**
 * GDPR Soft-Delete TTL Policy
 *
 * Runs daily at 3 AM UTC. Hard-deletes all records where `deletedAt` is
 * older than 90 days across all models with soft-delete fields.
 * Logs each batch to AuditLog with a SYSTEM actor.
 *
 * Models with deletedAt: User, Project, Task, Client, Deal, CanvasBoard
 */
export const gdprCleanup = inngest.createFunction(
  {
    id: "gdpr-cleanup",
    name: "GDPR Soft Delete TTL Cleanup",
  },
  { cron: "0 3 * * *" }, // Daily at 3:00 AM UTC
  async ({ step }) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 90);

    const results: Record<string, number> = {};

    // Each model is processed in its own step for fault tolerance
    results.user = await step.run("purge-users", async () => {
      const records = await prisma.user.findMany({
        where: { deletedAt: { lt: cutoffDate } },
        select: { id: true },
      });
      if (records.length === 0) return 0;

      // Log before deletion
      await prisma.auditLog.create({
        data: {
          userId: "SYSTEM",
          action: "gdpr.hard_delete",
          entityType: "User",
          entityId: `batch:${records.length}`,
          newValue: {
            count: records.length,
            ids: records.map((r) => r.id),
            reason: "GDPR TTL 90-day expiry",
          },
        },
      });

      // Hard delete (cascade handles related records)
      await prisma.user.deleteMany({
        where: { deletedAt: { lt: cutoffDate } },
      });
      return records.length;
    });

    results.project = await step.run("purge-projects", async () => {
      const records = await prisma.project.findMany({
        where: { deletedAt: { lt: cutoffDate } },
        select: { id: true },
      });
      if (records.length === 0) return 0;

      await prisma.auditLog.create({
        data: {
          userId: "SYSTEM",
          action: "gdpr.hard_delete",
          entityType: "Project",
          entityId: `batch:${records.length}`,
          newValue: {
            count: records.length,
            ids: records.map((r) => r.id),
            reason: "GDPR TTL 90-day expiry",
          },
        },
      });

      await prisma.project.deleteMany({
        where: { deletedAt: { lt: cutoffDate } },
      });
      return records.length;
    });

    results.task = await step.run("purge-tasks", async () => {
      const records = await prisma.task.findMany({
        where: { deletedAt: { lt: cutoffDate } },
        select: { id: true },
      });
      if (records.length === 0) return 0;

      await prisma.auditLog.create({
        data: {
          userId: "SYSTEM",
          action: "gdpr.hard_delete",
          entityType: "Task",
          entityId: `batch:${records.length}`,
          newValue: {
            count: records.length,
            ids: records.map((r) => r.id),
            reason: "GDPR TTL 90-day expiry",
          },
        },
      });

      await prisma.task.deleteMany({
        where: { deletedAt: { lt: cutoffDate } },
      });
      return records.length;
    });

    results.client = await step.run("purge-clients", async () => {
      const records = await prisma.client.findMany({
        where: { deletedAt: { lt: cutoffDate } },
        select: { id: true },
      });
      if (records.length === 0) return 0;

      await prisma.auditLog.create({
        data: {
          userId: "SYSTEM",
          action: "gdpr.hard_delete",
          entityType: "Client",
          entityId: `batch:${records.length}`,
          newValue: {
            count: records.length,
            ids: records.map((r) => r.id),
            reason: "GDPR TTL 90-day expiry",
          },
        },
      });

      await prisma.client.deleteMany({
        where: { deletedAt: { lt: cutoffDate } },
      });
      return records.length;
    });

    results.deal = await step.run("purge-deals", async () => {
      const records = await prisma.deal.findMany({
        where: { deletedAt: { lt: cutoffDate } },
        select: { id: true },
      });
      if (records.length === 0) return 0;

      await prisma.auditLog.create({
        data: {
          userId: "SYSTEM",
          action: "gdpr.hard_delete",
          entityType: "Deal",
          entityId: `batch:${records.length}`,
          newValue: {
            count: records.length,
            ids: records.map((r) => r.id),
            reason: "GDPR TTL 90-day expiry",
          },
        },
      });

      await prisma.deal.deleteMany({
        where: { deletedAt: { lt: cutoffDate } },
      });
      return records.length;
    });

    results.canvasBoard = await step.run("purge-canvas-boards", async () => {
      const records = await prisma.canvasBoard.findMany({
        where: { deletedAt: { lt: cutoffDate } },
        select: { id: true },
      });
      if (records.length === 0) return 0;

      await prisma.auditLog.create({
        data: {
          userId: "SYSTEM",
          action: "gdpr.hard_delete",
          entityType: "CanvasBoard",
          entityId: `batch:${records.length}`,
          newValue: {
            count: records.length,
            ids: records.map((r) => r.id),
            reason: "GDPR TTL 90-day expiry",
          },
        },
      });

      await prisma.canvasBoard.deleteMany({
        where: { deletedAt: { lt: cutoffDate } },
      });
      return records.length;
    });

    console.log("[GDPR Cleanup] Results:", results);
    return { success: true, purged: results };
  },
);
