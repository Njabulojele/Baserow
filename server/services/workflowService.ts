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

    // Simple equality check
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
        // Handle delay action
        if (action.type === WorkflowActionType.DELAY) {
          const delayMs =
            (action.config?.delayMinutes || action.delayMinutes || 0) *
            60 *
            1000;
          if (delayMs > 0) {
            console.log(`[WorkflowService] Delaying for ${delayMs / 1000}s`);
            // In production, this would queue the remaining actions.
            // For now, we simulate with a short wait (max 5s for safety).
            await new Promise((resolve) =>
              setTimeout(resolve, Math.min(delayMs, 5000)),
            );
          }
          results.push({
            actionId: action.id,
            type: action.type,
            status: "completed",
            result: {
              delayed: true,
              minutes: action.config?.delayMinutes || 0,
            },
          });
          continue;
        }

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
      case WorkflowActionType.ADD_TAG:
        return this.handleAddTag(action, context);
      case WorkflowActionType.REMOVE_TAG:
        return this.handleRemoveTag(action, context);
      case WorkflowActionType.MOVE_TO_STAGE:
        return this.handleMoveToStage(action, context);
      case WorkflowActionType.UPDATE_LEAD_FIELD:
        return this.handleUpdateLeadField(action, context);
      case WorkflowActionType.UPDATE_DEAL_FIELD:
        return this.handleUpdateDealField(action, context);
      case WorkflowActionType.CREATE_ACTIVITY:
        return this.handleCreateActivity(action, context);
      case WorkflowActionType.WEBHOOK:
        return this.handleWebhook(action, context);
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

    let subject = action.emailTemplate?.subject || action.config.subject || "";
    let body = action.emailTemplate?.bodyHtml || action.config.body || "";

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
        priority: config.priority || "medium",
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

  private async handleAddTag(action: any, context: WorkflowContext) {
    const config = action.config || {};
    const tag = config.tag;
    if (!tag) throw new Error("Tag name is required for ADD_TAG action");

    if (context.leadId) {
      const lead = await this.prisma.crmLead.findUnique({
        where: { id: context.leadId },
      });
      if (lead && !lead.tags.includes(tag)) {
        await this.prisma.crmLead.update({
          where: { id: context.leadId },
          data: { tags: { push: tag } },
        });
      }
      return { tagged: true, tag, entity: "lead" };
    }

    if (context.dealId) {
      const deal = await this.prisma.deal.findUnique({
        where: { id: context.dealId },
      });
      if (deal && !deal.tags.includes(tag)) {
        await this.prisma.deal.update({
          where: { id: context.dealId },
          data: { tags: { push: tag } },
        });
      }
      return { tagged: true, tag, entity: "deal" };
    }

    return { tagged: false, reason: "No lead or deal in context" };
  }

  private async handleRemoveTag(action: any, context: WorkflowContext) {
    const config = action.config || {};
    const tag = config.tag;
    if (!tag) throw new Error("Tag name is required for REMOVE_TAG action");

    if (context.leadId) {
      const lead = await this.prisma.crmLead.findUnique({
        where: { id: context.leadId },
      });
      if (lead) {
        const newTags = lead.tags.filter((t) => t !== tag);
        await this.prisma.crmLead.update({
          where: { id: context.leadId },
          data: { tags: newTags },
        });
      }
      return { removed: true, tag, entity: "lead" };
    }

    if (context.dealId) {
      const deal = await this.prisma.deal.findUnique({
        where: { id: context.dealId },
      });
      if (deal) {
        const newTags = deal.tags.filter((t) => t !== tag);
        await this.prisma.deal.update({
          where: { id: context.dealId },
          data: { tags: newTags },
        });
      }
      return { removed: true, tag, entity: "deal" };
    }

    return { removed: false, reason: "No lead or deal in context" };
  }

  private async handleMoveToStage(action: any, context: WorkflowContext) {
    const config = action.config || {};
    const stageName = config.stageName;
    if (!stageName)
      throw new Error("Stage name is required for MOVE_TO_STAGE action");

    if (context.leadId) {
      const lead = await this.prisma.crmLead.findUnique({
        where: { id: context.leadId },
      });
      if (!lead || !lead.pipelineId)
        throw new Error("Lead has no pipeline assigned");

      // Find the stage by name in the lead's pipeline
      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          pipelineId: lead.pipelineId,
          name: { equals: stageName, mode: "insensitive" },
        },
      });

      if (!stage) throw new Error(`Stage "${stageName}" not found in pipeline`);

      await this.prisma.crmLead.update({
        where: { id: context.leadId },
        data: { pipelineStageId: stage.id },
      });

      return { moved: true, stageName, stageId: stage.id, entity: "lead" };
    }

    if (context.dealId) {
      const deal = await this.prisma.deal.findUnique({
        where: { id: context.dealId },
      });
      if (!deal) throw new Error("Deal not found");

      const stage = await this.prisma.pipelineStage.findFirst({
        where: {
          pipelineId: deal.pipelineId,
          name: { equals: stageName, mode: "insensitive" },
        },
      });

      if (!stage) throw new Error(`Stage "${stageName}" not found in pipeline`);

      await this.prisma.deal.update({
        where: { id: context.dealId },
        data: {
          pipelineStageId: stage.id,
          stageEnteredAt: new Date(),
          daysInCurrentStage: 0,
        },
      });

      return { moved: true, stageName, stageId: stage.id, entity: "deal" };
    }

    return { moved: false, reason: "No lead or deal in context" };
  }

  private async handleUpdateLeadField(action: any, context: WorkflowContext) {
    const config = action.config || {};
    const { fieldName, fieldValue } = config;
    if (!fieldName || fieldValue === undefined)
      throw new Error("Field name and value are required");

    if (!context.leadId)
      throw new Error("No lead in context for UPDATE_LEAD_FIELD");

    // Whitelist allowed fields to prevent arbitrary updates
    const allowedFields = [
      "status",
      "score",
      "engagementScore",
      "assignedTo",
      "estimatedValue",
      "lostReason",
      "companySize",
      "industry",
      "revenue",
    ];

    if (!allowedFields.includes(fieldName)) {
      throw new Error(
        `Field "${fieldName}" is not updatable. Allowed: ${allowedFields.join(", ")}`,
      );
    }

    // Parse numeric values
    let parsedValue: any = fieldValue;
    if (["score", "engagementScore", "estimatedValue"].includes(fieldName)) {
      parsedValue = parseFloat(fieldValue);
      if (isNaN(parsedValue)) throw new Error(`Invalid number: ${fieldValue}`);
    }

    await this.prisma.crmLead.update({
      where: { id: context.leadId },
      data: { [fieldName]: parsedValue },
    });

    return { updated: true, field: fieldName, value: parsedValue };
  }

  private async handleUpdateDealField(action: any, context: WorkflowContext) {
    const config = action.config || {};
    const { fieldName, fieldValue } = config;
    if (!fieldName || fieldValue === undefined)
      throw new Error("Field name and value are required");

    if (!context.dealId)
      throw new Error("No deal in context for UPDATE_DEAL_FIELD");

    const allowedFields = [
      "status",
      "value",
      "probability",
      "nextStep",
      "lostReason",
      "primaryContact",
    ];

    if (!allowedFields.includes(fieldName)) {
      throw new Error(
        `Field "${fieldName}" is not updatable. Allowed: ${allowedFields.join(", ")}`,
      );
    }

    let parsedValue: any = fieldValue;
    if (["value", "probability"].includes(fieldName)) {
      parsedValue = parseFloat(fieldValue);
      if (isNaN(parsedValue)) throw new Error(`Invalid number: ${fieldValue}`);
    }

    await this.prisma.deal.update({
      where: { id: context.dealId },
      data: { [fieldName]: parsedValue },
    });

    return { updated: true, field: fieldName, value: parsedValue };
  }

  private async handleCreateActivity(action: any, context: WorkflowContext) {
    const config = action.config || {};

    let subject = config.subject || "Automated activity";
    let description = config.description || "";

    // Variable substitution
    if (context.leadId) {
      const lead = await this.prisma.crmLead.findUnique({
        where: { id: context.leadId },
      });
      if (lead) {
        subject = this.replaceVariables(subject, lead);
        description = this.replaceVariables(description, lead);
      }
    }

    const activity = await this.prisma.crmActivity.create({
      data: {
        userId: context.userId,
        leadId: context.leadId,
        dealId: context.dealId,
        clientId: context.clientId,
        type: config.activityType || "NOTE",
        subject,
        description,
        recordedBy: "automation",
      },
    });

    return { activityId: activity.id };
  }

  private async handleWebhook(action: any, context: WorkflowContext) {
    const config = action.config || {};
    const url = config.url;
    if (!url) throw new Error("Webhook URL is required");

    const method = config.method || "POST";
    let headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (config.headers) {
      try {
        const parsed =
          typeof config.headers === "string"
            ? JSON.parse(config.headers)
            : config.headers;
        headers = { ...headers, ...parsed };
      } catch {
        console.warn("[WorkflowService] Failed to parse webhook headers");
      }
    }

    // Build payload with context data
    const payload: any = {
      workflowEvent: true,
      timestamp: new Date().toISOString(),
      userId: context.userId,
    };

    if (context.leadId) {
      const lead = await this.prisma.crmLead.findUnique({
        where: { id: context.leadId },
      });
      if (lead) payload.lead = lead;
    }

    if (context.dealId) {
      const deal = await this.prisma.deal.findUnique({
        where: { id: context.dealId },
      });
      if (deal) payload.deal = deal;
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        ...(method !== "GET" ? { body: JSON.stringify(payload) } : {}),
      });

      const status = response.status;
      console.log(`[WorkflowService] Webhook ${url} responded with ${status}`);

      return {
        sent: true,
        url,
        status,
        ok: response.ok,
      };
    } catch (error: any) {
      console.error(`[WorkflowService] Webhook failed: ${error.message}`);
      throw new Error(`Webhook request failed: ${error.message}`);
    }
  }

  private replaceVariables(text: string, data: any): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
      return data[key] || `{{${key}}}`;
    });
  }
}
