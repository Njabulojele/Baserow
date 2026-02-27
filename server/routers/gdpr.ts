import { protectedProcedure, router } from "../trpc";

/**
 * GDPR Router — handles user data erasure requests.
 */
export const gdprRouter = router({
  /**
   * DELETE MY DATA — GDPR Article 17 "Right to Erasure"
   *
   * Hard-deletes all user data across all tables (cascading from User).
   * Logs to AuditLog before deletion for compliance audit trail.
   */
  deleteMyData: protectedProcedure.mutation(async ({ ctx }) => {
    const userId = ctx.userId;

    // Log the erasure request before deletion
    await ctx.prisma.auditLog.create({
      data: {
        userId,
        action: "gdpr.user_erasure_request",
        entityType: "User",
        entityId: userId,
        newValue: {
          reason: "User-initiated GDPR data erasure",
          timestamp: new Date().toISOString(),
        },
      },
    });

    // Hard-delete the user — Prisma cascades handle all related records
    await ctx.prisma.user.delete({
      where: { id: userId },
    });

    return {
      success: true,
      message:
        "All your data has been permanently deleted. This action cannot be undone.",
    };
  }),
});
