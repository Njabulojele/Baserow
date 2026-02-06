import { z } from "zod";
import { router, protectedProcedure } from "../trpc";
import {
  WorkflowTriggerType,
  WorkflowActionType,
  WorkflowStatus,
  Prisma,
} from "@prisma/client";
import { WorkflowService } from "../services/workflowService";

// Helper for JSON input
const jsonValue = z.any().transform((val) => val as Prisma.InputJsonValue);

export const crmAutomationRouter = router({
  // ============================================
  // WORKFLOW CRUD
  // ============================================

  listWorkflows: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.crmWorkflow.findMany({
      where: { userId: ctx.userId },
      include: {
        triggers: true,
        actions: {
          orderBy: { order: "asc" },
          include: { emailTemplate: { select: { id: true, name: true } } },
        },
        _count: { select: { executions: true } },
      },
      orderBy: { updatedAt: "desc" },
    });
  }),

  getWorkflow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.crmWorkflow.findFirst({
        where: { id: input.id, userId: ctx.userId },
        include: {
          triggers: true,
          actions: {
            orderBy: { order: "asc" },
            include: { emailTemplate: true },
          },
          executions: {
            orderBy: { startedAt: "desc" },
            take: 10,
          },
        },
      });
    }),

  createWorkflow: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        triggers: z
          .array(
            z.object({
              type: z.nativeEnum(WorkflowTriggerType),
              conditions: jsonValue.optional(),
              cronExpression: z.string().optional(),
            }),
          )
          .optional(),
        actions: z
          .array(
            z.object({
              type: z.nativeEnum(WorkflowActionType),
              order: z.number(),
              config: jsonValue.optional(),
              emailTemplateId: z.string().optional(),
              delayMinutes: z.number().optional(),
            }),
          )
          .optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Create workflow first, then add triggers and actions separately
      const workflow = await ctx.prisma.crmWorkflow.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          description: input.description,
          status: WorkflowStatus.DRAFT,
        },
      });

      // Add triggers if provided
      if (input.triggers?.length) {
        await ctx.prisma.workflowTrigger.createMany({
          data: input.triggers.map((t) => ({
            workflowId: workflow.id,
            type: t.type,
            conditions: (t.conditions || {}) as Prisma.InputJsonValue,
            cronExpression: t.cronExpression,
          })),
        });
      }

      // Add actions if provided
      if (input.actions?.length) {
        await ctx.prisma.workflowAction.createMany({
          data: input.actions.map((a) => ({
            workflowId: workflow.id,
            type: a.type,
            order: a.order,
            config: (a.config || {}) as Prisma.InputJsonValue,
            emailTemplateId: a.emailTemplateId,
            delayMinutes: a.delayMinutes,
          })),
        });
      }

      return ctx.prisma.crmWorkflow.findUnique({
        where: { id: workflow.id },
        include: { triggers: true, actions: true },
      });
    }),

  updateWorkflow: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        description: z.string().optional(),
        status: z.nativeEnum(WorkflowStatus).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.crmWorkflow.update({
        where: { id, userId: ctx.userId },
        data,
      });
    }),

  deleteWorkflow: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.crmWorkflow.delete({
        where: { id: input.id, userId: ctx.userId },
      });
    }),

  toggleWorkflow: protectedProcedure
    .input(z.object({ id: z.string(), active: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.crmWorkflow.update({
        where: { id: input.id, userId: ctx.userId },
        data: {
          status: input.active ? WorkflowStatus.ACTIVE : WorkflowStatus.PAUSED,
        },
      });
    }),

  // ============================================
  // TRIGGERS & ACTIONS
  // ============================================

  addTrigger: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        type: z.nativeEnum(WorkflowTriggerType),
        conditions: jsonValue.optional(),
        cronExpression: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const workflow = await ctx.prisma.crmWorkflow.findFirst({
        where: { id: input.workflowId, userId: ctx.userId },
      });
      if (!workflow) throw new Error("Workflow not found");

      return ctx.prisma.workflowTrigger.create({
        data: {
          workflowId: input.workflowId,
          type: input.type,
          conditions: (input.conditions || {}) as Prisma.InputJsonValue,
          cronExpression: input.cronExpression,
        },
      });
    }),

  deleteTrigger: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const trigger = await ctx.prisma.workflowTrigger.findFirst({
        where: { id: input.id },
        include: { workflow: { select: { userId: true } } },
      });
      if (!trigger || trigger.workflow.userId !== ctx.userId) {
        throw new Error("Trigger not found");
      }
      return ctx.prisma.workflowTrigger.delete({ where: { id: input.id } });
    }),

  addAction: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        type: z.nativeEnum(WorkflowActionType),
        order: z.number(),
        config: jsonValue.optional(),
        emailTemplateId: z.string().optional(),
        delayMinutes: z.number().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.crmWorkflow.findFirst({
        where: { id: input.workflowId, userId: ctx.userId },
      });
      if (!workflow) throw new Error("Workflow not found");

      return ctx.prisma.workflowAction.create({
        data: {
          workflowId: input.workflowId,
          type: input.type,
          order: input.order,
          config: (input.config || {}) as Prisma.InputJsonValue,
          emailTemplateId: input.emailTemplateId,
          delayMinutes: input.delayMinutes,
        },
      });
    }),

  deleteAction: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const action = await ctx.prisma.workflowAction.findFirst({
        where: { id: input.id },
        include: { workflow: { select: { userId: true } } },
      });
      if (!action || action.workflow.userId !== ctx.userId) {
        throw new Error("Action not found");
      }
      return ctx.prisma.workflowAction.delete({ where: { id: input.id } });
    }),

  reorderActions: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        actionIds: z.array(z.string()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.crmWorkflow.findFirst({
        where: { id: input.workflowId, userId: ctx.userId },
      });
      if (!workflow) throw new Error("Workflow not found");

      await Promise.all(
        input.actionIds.map((id, index) =>
          ctx.prisma.workflowAction.update({
            where: { id },
            data: { order: index },
          }),
        ),
      );
      return { success: true };
    }),

  // ============================================
  // EMAIL TEMPLATES
  // ============================================

  listTemplates: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.emailTemplate.findMany({
      where: { userId: ctx.userId },
      orderBy: { updatedAt: "desc" },
    });
  }),

  getTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.prisma.emailTemplate.findFirst({
        where: { id: input.id, userId: ctx.userId },
      });
    }),

  createTemplate: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        category: z.string().optional(),
        subject: z.string().min(1),
        bodyHtml: z.string().min(1),
        bodyText: z.string().optional(),
        variables: z.array(z.string()).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.emailTemplate.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          category: input.category,
          subject: input.subject,
          bodyHtml: input.bodyHtml,
          bodyText: input.bodyText,
          variables: input.variables || [],
        },
      });
    }),

  updateTemplate: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().optional(),
        category: z.string().optional(),
        subject: z.string().optional(),
        bodyHtml: z.string().optional(),
        bodyText: z.string().optional(),
        variables: z.array(z.string()).optional(),
        isActive: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      return ctx.prisma.emailTemplate.update({
        where: { id, userId: ctx.userId },
        data,
      });
    }),

  deleteTemplate: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.emailTemplate.delete({
        where: { id: input.id, userId: ctx.userId },
      });
    }),

  // ============================================
  // EXECUTION
  // ============================================

  getExecutions: protectedProcedure
    .input(
      z
        .object({
          workflowId: z.string().optional(),
          limit: z.number().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      return ctx.prisma.workflowExecution.findMany({
        where: {
          workflow: { userId: ctx.userId },
          ...(input?.workflowId && { workflowId: input.workflowId }),
        },
        include: {
          workflow: { select: { id: true, name: true } },
        },
        orderBy: { startedAt: "desc" },
        take: input?.limit || 50,
      });
    }),

  // Manual workflow execution (for testing)
  executeWorkflow: protectedProcedure
    .input(
      z.object({
        workflowId: z.string(),
        leadId: z.string().optional(),
        dealId: z.string().optional(),
        clientId: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const workflow = await ctx.prisma.crmWorkflow.findFirst({
        where: { id: input.workflowId, userId: ctx.userId },
        include: {
          actions: {
            orderBy: { order: "asc" },
            include: { emailTemplate: true },
          },
        },
      });

      if (!workflow) throw new Error("Workflow not found");

      const service = new WorkflowService(ctx.prisma);

      // Execute using the service
      await service.executeWorkflow(
        input.workflowId,
        {
          userId: ctx.userId,
          leadId: input.leadId,
          dealId: input.dealId,
          clientId: input.clientId,
          triggerData: { manual: true, type: "MANUAL" },
        },
        workflow.actions,
      );

      return { success: true };
    }),
});
