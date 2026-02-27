import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import { withTenant } from "../../lib/prisma";
import crypto from "crypto";

export const webhookRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        url: z.string().url(),
        events: z.array(z.string()).min(1),
        secret: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organizationId;
      if (!orgId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Organization required",
        });
      }

      return withTenant(orgId, async (prisma) => {
        const secret = input.secret || crypto.randomBytes(32).toString("hex");

        return await prisma.webhookEndpoint.create({
          data: {
            organizationId: orgId,
            url: input.url,
            events: input.events,
            secret,
            isActive: true,
          },
        });
      });
    }),

  list: protectedProcedure.query(async ({ ctx }) => {
    const orgId = ctx.organizationId;
    if (!orgId) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Organization required",
      });
    }

    return withTenant(orgId, async (prisma) => {
      return await prisma.webhookEndpoint.findMany({
        orderBy: {
          createdAt: "desc",
        },
      });
    });
  }),

  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        url: z.string().url().optional(),
        events: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organizationId;
      if (!orgId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Organization required",
        });
      }

      return withTenant(orgId, async (prisma) => {
        const data: any = {};
        if (input.url !== undefined) data.url = input.url;
        if (input.events !== undefined) data.events = input.events;
        if (input.isActive !== undefined) data.isActive = input.isActive;

        return await prisma.webhookEndpoint.update({
          where: { id: input.id },
          data,
        });
      });
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const orgId = ctx.organizationId;
      if (!orgId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Organization required",
        });
      }

      return withTenant(orgId, async (prisma) => {
        return await prisma.webhookEndpoint.delete({
          where: { id: input.id },
        });
      });
    }),

  getDeliveries: protectedProcedure
    .input(z.object({ endpointId: z.string() }))
    .query(async ({ ctx, input }) => {
      const orgId = ctx.organizationId;
      if (!orgId) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Organization required",
        });
      }

      return withTenant(orgId, async (prisma) => {
        // Enforce tenant isolation on the endpoint check
        const endpoint = await prisma.webhookEndpoint.findUnique({
          where: { id: input.endpointId },
        });

        if (!endpoint) {
          throw new Error("Webhook endpoint not found");
        }

        return await prisma.webhookDelivery.findMany({
          where: { webhookEndpointId: input.endpointId },
          orderBy: { createdAt: "desc" },
          take: 50,
        });
      });
    }),
});
