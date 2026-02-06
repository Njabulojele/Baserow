import {
  PrismaClient,
  WorkflowActionType,
  WorkflowTriggerType,
} from "@prisma/client";
import { EmailService } from "./emailService";

type PrismaInstance = PrismaClient;

interface WorkflowContext {
  leadId?: string;
  dealId?: string;
  clientId?: string;
  userId: string;
  triggerData?: any;
}

export class WorkflowService {
  private prisma: PrismaInstance;

  constructor(prisma: PrismaInstance) {
    this.prisma = prisma;
  }

  /**
   * Main entry point to process an event
   */
  async processEvent(type: WorkflowTriggerType, context: WorkflowContext) {
    // 1. Find active workflows for this trigger type
    const workflows = await this.prisma.crmWorkflow.findMany({
      where: {
        userId: context.userId,
        status: "ACTIVE",
        triggers: {
          some: {
            type: type,
          },
        },
      },
      include: {
        triggers: true,
        actions: {
          orderBy: { order: "asc" },
          include: { emailTemplate: true },
        },
      },
    });

    console.log(
      `[WorkflowService] Found ${workflows.length} workflows for event ${type}`,
    );

    // 2. Evaluate conditions and execute
    for (const workflow of workflows) {
      const trigger = workflow.triggers.find((t) => t.type === type);
      if (!trigger) continue;

      // TODO: Evaluate trigger conditions here
      // For now, we assume if the type matches, we run it (unless specific conditions fail)
      const shouldRun = await this.evaluateConditions(
        trigger.conditions,
        context,
      );

      if (shouldRun) {
        await this.executeWorkflow(workflow.id, context, workflow.actions);
      }
    }
  }

  /**
   * Evaluate conditions against context
   * e.g. condition: { source: "WEBSITE" } -> context.lead.source === "WEBSITE"
   */
  private async evaluateConditions(
    conditions: any,
    context: WorkflowContext,
  ): Promise<boolean> {
    if (!conditions || Object.keys(conditions).length === 0) return true;

    // Fetch data if needed
    let lead = null;
    if (context.leadId) {
      lead = await this.prisma.crmLead.findUnique({
        where: { id: context.leadId },
      });
    }

    // Simple equality check for now
    // logic: "if lead.source == condition.source"
    if (lead && conditions.source) {
      if (lead.source !== conditions.source) return false;
    }

    if (lead && conditions.status) {
      if (lead.status !== conditions.status) return false;
    }

    return true;
  }

  /**
   * Execute a sequence of actions
   */
  async executeWorkflow(
    workflowId: string,
    context: WorkflowContext,
    actions: any[],
  ) {
    console.log(`[WorkflowService] Executing workflow ${workflowId}`);

    // Create execution log
    const execution = await this.prisma.workflowExecution.create({
      data: {
        workflowId,
        status: "running",
        triggerType: context.triggerData?.type || "MANUAL",
        triggerData: context.triggerData || {},
        leadId: context.leadId,
        dealId: context.dealId,
        clientId: context.clientId,
      },
    });

    const results: any[] = [];
    let hasError = false;

    for (const action of actions) {
      try {
        const result = await this.executeAction(action, context);
        results.push({
          actionId: action.id,
          type: action.type,
          status: "completed",
          result,
        });
      } catch (error: any) {
        console.error(`[WorkflowService] Action failed: ${error.message}`);
        results.push({
          actionId: action.id,
          type: action.type,
          status: "failed",
          error: error.message,
        });
        hasError = true;
        // Stop execution on error? For now, continue other actions or stop?
        // Let's stop sequence on error
        break;
      }
    }

    // Update execution log
    await this.prisma.workflowExecution.update({
      where: { id: execution.id },
      data: {
        status: hasError ? "failed" : "completed",
        completedAt: new Date(),
        actionResults: results,
      },
    });

    // Update workflow stats
    await this.prisma.crmWorkflow.update({
      where: { id: workflowId },
      data: {
        executionCount: { increment: 1 },
        lastExecutedAt: new Date(),
      },
    });
  }

  /**
   * Execute a single action
   */
  private async executeAction(action: any, context: WorkflowContext) {
    switch (action.type) {
      case WorkflowActionType.SEND_EMAIL:
        return this.handleSendEmail(action, context);
      case WorkflowActionType.CREATE_TASK:
        return this.handleCreateTask(action, context);
      case WorkflowActionType.NOTIFY_USER:
        return this.handleNotifyUser(action, context);
      default:
        console.warn(`[WorkflowService] Unknown action type: ${action.type}`);
        return { skipped: true, reason: "Unknown action type" };
    }
  }

  // --- Action Handlers ---

  private async handleSendEmail(action: any, context: WorkflowContext) {
    if (!action.emailTemplate && !action.config.body) {
      throw new Error("Missing email template or body");
    }

    // Resolve variables
    let subject = action.emailTemplate?.subject || action.config.subject || "";
    let body = action.emailTemplate?.bodyHtml || action.config.body || "";

    // Fetch lead details for variable substitution
    if (context.leadId) {
      const lead = await this.prisma.crmLead.findUnique({
        where: { id: context.leadId },
      });
      if (lead) {
        subject = this.replaceVariables(subject, lead);
        body = this.replaceVariables(body, lead);

        console.log(`[WorkflowService] Sending email to ${lead.email}`);

        try {
          const emailService = new EmailService();
          await emailService.sendEmail({
            to: lead.email,
            subject,
            html: body,
          });
        } catch (error) {
          console.error("Failed to send email:", error);
          throw error;
        }
      }
    }

    return { sent: true, subject };
  }

  private async handleCreateTask(action: any, context: WorkflowContext) {
    const config = action.config || {};

    // Fetch lead for variable substitution in task title
    let title = config.title || "Follow up task";
    if (context.leadId) {
      const lead = await this.prisma.crmLead.findUnique({
        where: { id: context.leadId },
      });
      if (lead) title = this.replaceVariables(title, lead);
    }

    const task = await this.prisma.task.create({
      data: {
        userId: context.userId,
        title: title,
        priority: config.priority || "medium", // low, medium, high
        description: config.description || "Created by CRM Automation",
        dueDate: config.dueDays
          ? new Date(Date.now() + config.dueDays * 24 * 60 * 60 * 1000)
          : undefined,
        status: "not_started",
        type: "lead_followup",
      },
    });

    return { taskId: task.id };
  }

  private async handleNotifyUser(action: any, context: WorkflowContext) {
    const config = action.config || {};
    let message = config.message || "Notification";

    if (context.leadId) {
      const lead = await this.prisma.crmLead.findUnique({
        where: { id: context.leadId },
      });
      if (lead) message = this.replaceVariables(message, lead);
    }

    // Create a Capture item as a notification for now
    await this.prisma.capture.create({
      data: {
        userId: context.userId,
        type: "notification",
        content: message,
        status: "inbox",
        tags: ["crm-notification"],
      },
    });

    return { notified: true, message };
  }

  private replaceVariables(text: string, data: any): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return data[key] || `{{${key}}}`;
    });
  }
}
