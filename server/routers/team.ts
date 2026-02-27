import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { prisma } from "@/lib/prisma";
import { TRPCError } from "@trpc/server";
import { EmailService } from "../services/emailService";

export const teamRouter = router({
  // ----- Organization Methods -----

  // Get the default organization for the user (or active one if specified)
  getOrganization: protectedProcedure.query(async ({ ctx }) => {
    // For now, just find the first org the user is a member of or owns.
    // In a full implementation, the user would have an `activeOrgId` on their profile.
    const user = await prisma.user.findUnique({
      where: { id: ctx.userId },
      select: { activeOrgId: true },
    });

    let orgId = user?.activeOrgId;

    if (!orgId) {
      const membership = await prisma.organizationMember.findFirst({
        where: { userId: ctx.userId },
        orderBy: { joinedAt: "asc" },
      });
      if (!membership) return null; // User has no orgs
      orgId = membership.orgId;
    }

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, avatar: true },
            },
          },
        },
      },
    });

    return org;
  }),

  // Create a new organization
  createOrganization: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        slug: z
          .string()
          .min(3)
          .max(40)
          .regex(/^[a-z0-9-]+$/),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check slug uniqueness
      const existing = await prisma.organization.findUnique({
        where: { slug: input.slug },
      });
      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "Organization slug already taken",
        });
      }

      // Create org and owner membership transactionally
      const result = await prisma.$transaction(async (tx) => {
        const org = await tx.organization.create({
          data: {
            name: input.name,
            slug: input.slug,
            ownerId: ctx.userId,
            members: {
              create: {
                userId: ctx.userId,
                role: "OWNER",
              },
            },
          },
        });

        // Set as active org
        await tx.user.update({
          where: { id: ctx.userId },
          data: { activeOrgId: org.id },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            userId: ctx.userId,
            orgId: org.id,
            action: "CREATED",
            entityType: "ORGANIZATION",
            entityId: org.id,
            entityName: org.name,
          },
        });

        return org;
      });

      return result;
    }),

  // Update active org
  setActiveOrganization: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify membership
      const membership = await prisma.organizationMember.findUnique({
        where: {
          userId_orgId: { userId: ctx.userId, orgId: input.orgId },
        },
      });

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await prisma.user.update({
        where: { id: ctx.userId },
        data: { activeOrgId: input.orgId },
      });

      return { success: true };
    }),

  // ----- Invitation Methods -----

  // Send an invite
  inviteMember: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        orgId: z.string(),
        role: z.enum(["ADMIN", "MEMBER", "VIEWER"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Must be owner or admin
      const membership = await prisma.organizationMember.findUnique({
        where: { userId_orgId: { userId: ctx.userId, orgId: input.orgId } },
      });

      if (
        !membership ||
        (membership.role !== "OWNER" && membership.role !== "ADMIN")
      ) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Check if already member
      const existingUser = await prisma.user.findUnique({
        where: { email: input.email },
      });
      if (existingUser) {
        const existingMember = await prisma.organizationMember.findUnique({
          where: {
            userId_orgId: { userId: existingUser.id, orgId: input.orgId },
          },
        });
        if (existingMember) {
          throw new TRPCError({
            code: "CONFLICT",
            message: "User is already a member",
          });
        }
      }

      // Set expiry to 7 days
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);

      const invite = await prisma.invitation.create({
        data: {
          email: input.email,
          orgId: input.orgId,
          role: input.role,
          invitedById: ctx.userId,
          expiresAt,
        },
      });

      const org = await prisma.organization.findUnique({
        where: { id: input.orgId },
      });
      const inviter = await prisma.user.findUnique({
        where: { id: ctx.userId },
      });

      const emailService = new EmailService();
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const inviteUrl = `${appUrl}/invite/${invite.token}`;

      await emailService.sendEmail({
        to: input.email,
        subject: `You have been invited to join ${org?.name}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2 style="color: #10b981;">You've been invited!</h2>
            <p><strong>${inviter?.name || inviter?.email || "A team member"}</strong> has invited you to join <strong>${org?.name}</strong> as a ${input.role.toLowerCase()}.</p>
            <p>Click the button below to accept your invitation and access the workspace.</p>
            <a href="${inviteUrl}" style="display: inline-block; padding: 12px 24px; background-color: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 16px;">Accept Invitation</a>
            <p style="margin-top: 32px; font-size: 12px; color: #888;">If you did not expect this invitation, you can safely ignore this email.</p>
          </div>
        `,
      });
      await prisma.activityLog.create({
        data: {
          userId: ctx.userId,
          orgId: input.orgId,
          action: "INVITED",
          entityType: "MEMBER",
          entityName: input.email,
        },
      });

      return invite;
    }),

  getPendingInvites: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      const membership = await prisma.organizationMember.findUnique({
        where: { userId_orgId: { userId: ctx.userId, orgId: input.orgId } },
      });

      if (
        !membership ||
        (membership.role !== "OWNER" && membership.role !== "ADMIN")
      ) {
        return [];
      }

      return prisma.invitation.findMany({
        where: { orgId: input.orgId, status: "PENDING" },
        include: {
          invitedBy: { select: { name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      });
    }),

  // Accept an invite
  acceptInvite: protectedProcedure
    .input(z.object({ token: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const invite = await prisma.invitation.findUnique({
        where: { token: input.token },
      });

      if (!invite) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Invalid invitation link.",
        });
      }

      if (invite.status !== "PENDING" || invite.expiresAt < new Date()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invitation expired or already used.",
        });
      }

      // Check if user is already a member
      const existingMember = await prisma.organizationMember.findUnique({
        where: { userId_orgId: { userId: ctx.userId, orgId: invite.orgId } },
      });

      if (existingMember) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "You are already a member of this organization.",
        });
      }

      const result = await prisma.$transaction(async (tx) => {
        // Create membership
        await tx.organizationMember.create({
          data: {
            userId: ctx.userId,
            orgId: invite.orgId,
            role: invite.role,
          },
        });

        // Mark invite as accepted
        await tx.invitation.update({
          where: { id: invite.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
          },
        });

        // Set as user's active org
        await tx.user.update({
          where: { id: ctx.userId },
          data: { activeOrgId: invite.orgId },
        });

        const org = await tx.organization.findUnique({
          where: { id: invite.orgId },
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            userId: ctx.userId,
            orgId: invite.orgId,
            action: "JOINED",
            entityType: "MEMBER",
            entityName: "Organization",
          },
        });

        return { success: true, orgId: invite.orgId, orgName: org?.name };
      });

      return result;
    }),

  // ----- Activity Feed -----

  getActivityFeed: protectedProcedure
    .input(z.object({ orgId: z.string(), limit: z.number().default(50) }))
    .query(async ({ ctx, input }) => {
      // Verify membership
      const membership = await prisma.organizationMember.findUnique({
        where: { userId_orgId: { userId: ctx.userId, orgId: input.orgId } },
      });

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return prisma.activityLog.findMany({
        where: { orgId: input.orgId },
        include: {
          user: { select: { name: true, email: true, avatar: true } },
        },
        orderBy: { createdAt: "desc" },
        take: input.limit,
      });
    }),

  // ----- Team Stats -----

  getTeamStats: protectedProcedure
    .input(z.object({ orgId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify membership
      const membership = await prisma.organizationMember.findUnique({
        where: { userId_orgId: { userId: ctx.userId, orgId: input.orgId } },
      });

      if (!membership) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const [projectsCount, activeTasks, clientsCount, members] =
        await Promise.all([
          prisma.project.count({
            where: { organizationId: input.orgId, status: "in_progress" },
          }),
          prisma.task.count({
            where: { organizationId: input.orgId, status: "in_progress" },
          }),
          prisma.client.count({
            where: { organizationId: input.orgId, status: "active" },
          }),
          prisma.organizationMember.count({ where: { orgId: input.orgId } }),
        ]);

      return {
        activeProjects: projectsCount,
        activeTasks,
        activeClients: clientsCount,
        totalMembers: members,
      };
    }),
});
