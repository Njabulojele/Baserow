import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";

export const clientRouter = router({
  // Get all clients for the user
  getClients: protectedProcedure
    .input(
      z
        .object({
          status: z.string().optional(),
          search: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: any = {
        userId: ctx.userId,
      };

      if (input?.status && input.status !== "all") {
        where.status = input.status;
      }

      if (input?.search) {
        where.OR = [
          { name: { contains: input.search, mode: "insensitive" } },
          { companyName: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
        ];
      }

      return ctx.prisma.client.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        include: {
          _count: {
            select: { projects: true, communications: true },
          },
        },
      });
    }),

  // Get single client
  getClient: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
        include: {
          projects: {
            where: { archivedAt: null },
            select: { id: true, name: true, color: true, status: true },
          },
          _count: {
            select: { communications: true, projects: true },
          },
        },
      });

      if (!client || client.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return client;
    }),

  // Create client
  createClient: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1, "Name is required"),
        companyName: z.string().optional(),
        email: z.string().email("Invalid email").optional().or(z.literal("")),
        phone: z.string().optional(),
        status: z.string().default("active"),
        notes: z.string().optional(),
        industry: z.string().optional(),
        website: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Basic validation handled by Zod, but we can add logic here if needed
      // For email, handle empty string as null if unique constraint issues arise (though optional string helps)

      return ctx.prisma.client.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          companyName: input.companyName,
          email: input.email || "", // Schema has String (not optional? let's check view_file output)
          phone: input.phone,
          status: input.status,
          notes: input.notes,
          industry: input.industry,
          website: input.website,
        },
      });
    }),

  // Update client
  updateClient: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).optional(),
        companyName: z.string().optional(),
        email: z.string().email().optional().or(z.literal("")),
        phone: z.string().optional(),
        status: z.string().optional(),
        notes: z.string().optional(),
        industry: z.string().optional(),
        website: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
      });

      if (!client || client.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.prisma.client.update({
        where: { id: input.id },
        data: {
          name: input.name,
          companyName: input.companyName,
          email: input.email,
          phone: input.phone,
          status: input.status,
          notes: input.notes,
          industry: input.industry,
          website: input.website,
        },
      });
    }),

  // Delete client
  deleteClient: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const client = await ctx.prisma.client.findUnique({
        where: { id: input.id },
      });

      if (!client || client.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
      }

      return ctx.prisma.client.delete({
        where: { id: input.id },
      });
    }),
});
