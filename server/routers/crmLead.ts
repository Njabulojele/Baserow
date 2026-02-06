import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import { TRPCError } from "@trpc/server";
import {
  CrmLeadSource,
  CrmLeadStatus,
  WorkflowTriggerType,
} from "@prisma/client";
import { WorkflowService } from "../services/workflowService";
import { LeadScoringService } from "../services/leadScoringService";

// Input schemas
const createLeadSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
  linkedInUrl: z.string().url().optional().or(z.literal("")),
  title: z.string().optional(),
  companyName: z.string().min(1, "Company name is required"),
  companyWebsite: z.string().url().optional().or(z.literal("")),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  revenue: z.string().optional(),
  source: z.nativeEnum(CrmLeadSource).default(CrmLeadSource.OTHER),
  estimatedValue: z.number().optional(),
  estimatedCloseDate: z.date().optional(),
  pipelineId: z.string().optional(),
  pipelineStageId: z.string().optional(),
  tags: z.array(z.string()).default([]),
  painPoints: z.array(z.string()).default([]),
  identifiedNeeds: z.array(z.string()).default([]),
});

const updateLeadSchema = z.object({
  id: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional().nullable(),
  linkedInUrl: z.string().url().optional().or(z.literal("")).nullable(),
  title: z.string().optional().nullable(),
  companyName: z.string().optional(),
  companyWebsite: z.string().url().optional().or(z.literal("")).nullable(),
  companySize: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  revenue: z.string().optional().nullable(),
  source: z.nativeEnum(CrmLeadSource).optional(),
  status: z.nativeEnum(CrmLeadStatus).optional(),
  score: z.number().min(0).max(100).optional(),
  estimatedValue: z.number().optional().nullable(),
  estimatedCloseDate: z.date().optional().nullable(),
  lostReason: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  painPoints: z.array(z.string()).optional(),
  identifiedNeeds: z.array(z.string()).optional(),
  buyingSignals: z.array(z.string()).optional(),
});

export const crmLeadRouter = router({
  // List leads with filters
  list: protectedProcedure
    .input(
      z
        .object({
          status: z.nativeEnum(CrmLeadStatus).optional(),
          source: z.nativeEnum(CrmLeadSource).optional(),
          pipelineId: z.string().optional(),
          minScore: z.number().optional(),
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const where: any = { userId: ctx.userId };

      if (input?.status) where.status = input.status;
      if (input?.source) where.source = input.source;
      if (input?.pipelineId) where.pipelineId = input.pipelineId;
      if (input?.minScore) where.score = { gte: input.minScore };

      if (input?.search) {
        where.OR = [
          { firstName: { contains: input.search, mode: "insensitive" } },
          { lastName: { contains: input.search, mode: "insensitive" } },
          { email: { contains: input.search, mode: "insensitive" } },
          { companyName: { contains: input.search, mode: "insensitive" } },
        ];
      }

      const leads = await ctx.prisma.crmLead.findMany({
        where,
        take: (input?.limit ?? 50) + 1,
        cursor: input?.cursor ? { id: input.cursor } : undefined,
        orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
        include: {
          pipeline: { select: { id: true, name: true, color: true } },
          pipelineStage: { select: { id: true, name: true, order: true } },
          _count: { select: { activities: true, deals: true } },
        },
      });

      let nextCursor: string | undefined;
      if (leads.length > (input?.limit ?? 50)) {
        const nextItem = leads.pop();
        nextCursor = nextItem?.id;
      }

      return { leads, nextCursor };
    }),

  // Get single lead with full details
  get: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const lead = await ctx.prisma.crmLead.findUnique({
        where: { id: input.id },
        include: {
          pipeline: true,
          pipelineStage: true,
          activities: {
            orderBy: { completedAt: "desc" },
            take: 10,
          },
          notes: {
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { user: { select: { name: true, email: true } } },
          },
          communications: {
            orderBy: { sentAt: "desc" },
            take: 10,
          },
          deals: {
            include: {
              pipeline: { select: { name: true } },
              pipelineStage: { select: { name: true } },
            },
          },
          convertedToClient: { select: { id: true, name: true } },
        },
      });

      if (!lead || lead.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      return lead;
    }),

  // Create new lead
  create: protectedProcedure
    .input(createLeadSchema)
    .mutation(async ({ ctx, input }) => {
      // Check for duplicate email
      const existing = await ctx.prisma.crmLead.findFirst({
        where: { userId: ctx.userId, email: input.email },
      });

      if (existing) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "A lead with this email already exists",
        });
      }

      const lead = await ctx.prisma.crmLead.create({
        data: {
          userId: ctx.userId,
          ...input,
          companyWebsite: input.companyWebsite || null,
          linkedInUrl: input.linkedInUrl || null,
        },
      });

      // Trigger workflows
      try {
        const workflowService = new WorkflowService(ctx.prisma);
        await workflowService.processEvent(WorkflowTriggerType.LEAD_CREATED, {
          userId: ctx.userId,
          leadId: lead.id,
          triggerData: { source: lead.source },
        });
      } catch (error) {
        console.error("Failed to process workflows:", error);
        // Don't fail the request if workflows fail
      }

      // Calculate initial score
      try {
        const scorer = new LeadScoringService(ctx.prisma);
        await scorer.calculateScore(lead.id);
      } catch (error) {
        console.error("Failed to calculate score:", error);
      }

      return lead;
    }),

  // Update lead
  update: protectedProcedure
    .input(updateLeadSchema)
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;

      const lead = await ctx.prisma.crmLead.findUnique({ where: { id } });
      if (!lead || lead.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      const updatedLead = await ctx.prisma.crmLead.update({
        where: { id },
        data: {
          ...data,
          lastEngagement: new Date(),
        },
      });

      // Recalculate score if relevant fields changed
      // (For simplicity, we recalculate on any update for now, or check specific fields)
      if (
        data.title ||
        data.industry ||
        data.companySize ||
        data.companyName ||
        data.email
      ) {
        try {
          const scorer = new LeadScoringService(ctx.prisma);
          await scorer.calculateScore(id);
        } catch (error) {
          console.error("Failed to recalculate score:", error);
        }
      }

      return updatedLead;
    }),

  // Move lead to different pipeline stage
  updateStage: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        pipelineId: z.string(),
        pipelineStageId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.prisma.crmLead.findUnique({
        where: { id: input.id },
      });

      if (!lead || lead.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      // Verify stage belongs to pipeline
      const stage = await ctx.prisma.pipelineStage.findUnique({
        where: { id: input.pipelineStageId },
      });

      if (!stage || stage.pipelineId !== input.pipelineId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid pipeline stage",
        });
      }

      return ctx.prisma.crmLead.update({
        where: { id: input.id },
        data: {
          pipelineId: input.pipelineId,
          pipelineStageId: input.pipelineStageId,
          lastEngagement: new Date(),
        },
      });
    }),

  // Convert lead to client
  convertToClient: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.prisma.crmLead.findUnique({
        where: { id: input.id },
      });

      if (!lead || lead.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      if (lead.convertedToClientId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Lead already converted to client",
        });
      }

      // Create client and update lead in transaction
      const result = await ctx.prisma.$transaction(async (tx) => {
        const client = await tx.client.create({
          data: {
            userId: ctx.userId,
            name: `${lead.firstName} ${lead.lastName}`,
            companyName: lead.companyName,
            email: lead.email,
            phone: lead.phone,
            industry: lead.industry,
            website: lead.companyWebsite,
            status: "active",
          },
        });

        await tx.crmLead.update({
          where: { id: input.id },
          data: {
            status: CrmLeadStatus.WON,
            convertedAt: new Date(),
            convertedToClientId: client.id,
          },
        });

        return client;
      });

      return result;
    }),

  // Delete lead
  delete: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.prisma.crmLead.findUnique({
        where: { id: input.id },
      });

      if (!lead || lead.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      return ctx.prisma.crmLead.delete({ where: { id: input.id } });
    }),

  // Add note to lead
  addNote: protectedProcedure
    .input(
      z.object({
        leadId: z.string(),
        content: z.string().min(1),
        isPinned: z.boolean().default(false),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const lead = await ctx.prisma.crmLead.findUnique({
        where: { id: input.leadId },
      });

      if (!lead || lead.userId !== ctx.userId) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Lead not found" });
      }

      return ctx.prisma.crmLeadNote.create({
        data: {
          leadId: input.leadId,
          userId: ctx.userId,
          content: input.content,
          isPinned: input.isPinned,
        },
      });
    }),

  // Get leads grouped by status for Kanban view
  getByStatus: protectedProcedure.query(async ({ ctx }) => {
    const leads = await ctx.prisma.crmLead.findMany({
      where: { userId: ctx.userId },
      orderBy: [{ score: "desc" }, { updatedAt: "desc" }],
      include: {
        pipelineStage: { select: { name: true } },
        _count: { select: { activities: true } },
      },
    });

    // Group by status
    const grouped = leads.reduce(
      (acc, lead) => {
        const status = lead.status;
        if (!acc[status]) acc[status] = [];
        acc[status].push(lead);
        return acc;
      },
      {} as Record<string, typeof leads>,
    );

    return grouped;
  }),

  // Get lead statistics
  getStats: protectedProcedure.query(async ({ ctx }) => {
    const [total, byStatus, bySource, avgScore] = await Promise.all([
      ctx.prisma.crmLead.count({ where: { userId: ctx.userId } }),
      ctx.prisma.crmLead.groupBy({
        by: ["status"],
        where: { userId: ctx.userId },
        _count: true,
      }),
      ctx.prisma.crmLead.groupBy({
        by: ["source"],
        where: { userId: ctx.userId },
        _count: true,
      }),
      ctx.prisma.crmLead.aggregate({
        where: { userId: ctx.userId },
        _avg: { score: true },
      }),
    ]);

    return {
      total,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count])),
      bySource: Object.fromEntries(bySource.map((s) => [s.source, s._count])),
      averageScore: avgScore._avg.score ?? 0,
    };
  }),
});
