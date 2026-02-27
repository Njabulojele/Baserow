import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { withTenant } from "../../lib/prisma";

export const notificationRouter = router({
  // Get count of unread notifications for the bell badge
  getUnreadCount: protectedProcedure.query(async ({ ctx }) => {
    // Notifications are typically user-specific, but we can also filter by tenant if applicable
    return withTenant(ctx.organizationId, async (prisma) => {
      return await prisma.notification.count({
        where: {
          userId: ctx.userId,
          isRead: false,
        },
      });
    });
  }),

  // Get the 20 most recent notifications
  getRecent: protectedProcedure.query(async ({ ctx }) => {
    return withTenant(ctx.organizationId, async (prisma) => {
      return await prisma.notification.findMany({
        where: {
          userId: ctx.userId,
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 20,
      });
    });
  }),

  // Mark a specific notification as read
  markAsRead: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return withTenant(ctx.organizationId, async (prisma) => {
        return await prisma.notification.update({
          where: {
            id: input.id,
            userId: ctx.userId, // Ensure the user owns it
          },
          data: {
            isRead: true,
          },
        });
      });
    }),

  // Mark all notifications as read
  markAllAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    return withTenant(ctx.organizationId, async (prisma) => {
      return await prisma.notification.updateMany({
        where: {
          userId: ctx.userId,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });
    });
  }),
});
