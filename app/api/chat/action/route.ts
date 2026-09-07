import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { inngest } from "@/inngest/client";
import { ResearchScope, ResearchStatus, SearchMethod } from "@prisma/client";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, payload } = body;

    switch (type) {
      // ─── Task Actions ──────────────────────────────────────────
      case "addTask": {
        const task = await prisma.task.create({
          data: {
            userId,
            title: payload?.title || "Untitled Task",
            priority: payload?.priority || "medium",
            type: payload?.type || "task",
            status: "not_started",
            scheduledDate: new Date(),
            ...(payload?.dueDate ? { dueDate: new Date(payload.dueDate) } : {}),
            ...(payload?.projectId ? { projectId: payload.projectId } : {}),
          },
        });
        return Response.json({
          success: true,
          message: `Task "${task.title}" created`,
          id: task.id,
        });
      }

      case "updateTask": {
        if (!payload?.taskId)
          return Response.json(
            { success: false, message: "taskId required" },
            { status: 400 },
          );
        const data: any = {};
        if (payload.status) data.status = payload.status;
        if (payload.priority) data.priority = payload.priority;
        if (payload.title) data.title = payload.title;
        if (payload.status === "done") data.completedAt = new Date();
        await prisma.task.update({ where: { id: payload.taskId }, data });
        return Response.json({
          success: true,
          message: `Task updated (${Object.keys(data).join(", ")})`,
        });
      }

      case "startTimer": {
        if (!payload?.taskId)
          return Response.json(
            { success: false, message: "taskId required" },
            { status: 400 },
          );
        await prisma.task.updateMany({
          where: { userId, timerRunning: true },
          data: { timerRunning: false },
        });
        await prisma.task.update({
          where: { id: payload.taskId },
          data: {
            timerRunning: true,
            currentTimerStart: new Date(),
            status: "in_progress",
          },
        });
        return Response.json({ success: true, message: "Timer started" });
      }

      case "stopTimer": {
        const running = await prisma.task.findFirst({
          where: { userId, timerRunning: true },
        });
        if (!running)
          return Response.json({
            success: true,
            message: "No timer was running",
          });
        const elapsed = running.currentTimerStart
          ? Math.round(
              (Date.now() - new Date(running.currentTimerStart).getTime()) /
                60000,
            )
          : 0;
        await prisma.task.update({
          where: { id: running.id },
          data: {
            timerRunning: false,
            currentTimerStart: null,
            actualMinutes: { increment: elapsed },
          },
        });
        return Response.json({
          success: true,
          message: `Timer stopped — ${elapsed} min logged on "${running.title}"`,
        });
      }

      // ─── Client Actions ────────────────────────────────────────
      case "addClient": {
        if (!payload?.name || !payload?.email)
          return Response.json(
            { success: false, message: "name and email required" },
            { status: 400 },
          );
        const client = await prisma.client.create({
          data: {
            userId,
            name: payload.name,
            email: payload.email,
            companyName: payload.companyName || null,
            industry: payload.industry || null,
          },
        });
        return Response.json({
          success: true,
          message: `Client "${client.name}" created`,
          id: client.id,
        });
      }

      case "updateClient": {
        if (!payload?.clientId)
          return Response.json(
            { success: false, message: "clientId required" },
            { status: 400 },
          );
        const data: any = {};
        if (payload.status) data.status = payload.status;
        if (payload.notes) data.notes = payload.notes;
        if (payload.tags) data.tags = payload.tags;
        if (payload.industry) data.industry = payload.industry;
        await prisma.client.update({ where: { id: payload.clientId }, data });
        return Response.json({ success: true, message: `Client updated` });
      }

      // ─── CRM Lead Actions ─────────────────────────────────────
      case "addLead": {
        if (
          !payload?.firstName ||
          !payload?.lastName ||
          !payload?.email ||
          !payload?.companyName
        )
          return Response.json(
            {
              success: false,
              message: "firstName, lastName, email, companyName required",
            },
            { status: 400 },
          );

        // Find default pipeline and first stage
        let pipelineId: string | undefined;
        let stageId: string | undefined;
        const defaultPipeline = await prisma.pipeline.findFirst({
          where: { userId, isDefault: true },
          include: { stages: { orderBy: { order: "asc" }, take: 1 } },
        });
        if (defaultPipeline) {
          pipelineId = defaultPipeline.id;
          stageId = defaultPipeline.stages[0]?.id;
        }

        const lead = await prisma.crmLead.create({
          data: {
            userId,
            firstName: payload.firstName,
            lastName: payload.lastName,
            email: payload.email,
            companyName: payload.companyName,
            source: payload.source || "OTHER",
            estimatedValue: payload.estimatedValue || 0,
            industry: payload.industry || null,
            ...(pipelineId ? { pipelineId } : {}),
            ...(stageId ? { pipelineStageId: stageId } : {}),
          },
        });
        return Response.json({
          success: true,
          message: `Lead "${lead.firstName} ${lead.lastName}" created at ${defaultPipeline?.stages[0]?.name || "no pipeline"}`,
          id: lead.id,
        });
      }

      case "moveLead": {
        if (!payload?.leadId || !payload?.stageId)
          return Response.json(
            { success: false, message: "leadId and stageId required" },
            { status: 400 },
          );
        const stage = await prisma.pipelineStage.findUnique({
          where: { id: payload.stageId },
        });
        await prisma.crmLead.update({
          where: { id: payload.leadId },
          data: { pipelineStageId: payload.stageId },
        });
        return Response.json({
          success: true,
          message: `Lead moved to "${stage?.name || payload.stageId}"`,
        });
      }

      case "updateLead": {
        if (!payload?.leadId)
          return Response.json(
            { success: false, message: "leadId required" },
            { status: 400 },
          );
        const data: any = {};
        if (payload.status) data.status = payload.status;
        if (payload.score !== undefined) data.score = Number(payload.score);
        if (payload.estimatedValue !== undefined)
          data.estimatedValue = Number(payload.estimatedValue);
        await prisma.crmLead.update({ where: { id: payload.leadId }, data });
        return Response.json({ success: true, message: `Lead updated` });
      }

      case "convertLead": {
        if (!payload?.leadId)
          return Response.json(
            { success: false, message: "leadId required" },
            { status: 400 },
          );
        const lead = await prisma.crmLead.findUnique({
          where: { id: payload.leadId },
        });
        if (!lead)
          return Response.json(
            { success: false, message: "Lead not found" },
            { status: 404 },
          );
        // Create client from lead
        const newClient = await prisma.client.create({
          data: {
            userId,
            name: `${lead.firstName} ${lead.lastName}`,
            email: lead.email,
            companyName: lead.companyName,
            industry: lead.industry || undefined,
          },
        });
        // Link lead to client
        await prisma.crmLead.update({
          where: { id: lead.id },
          data: {
            convertedToClientId: newClient.id,
            convertedAt: new Date(),
            status: "WON",
          },
        });
        return Response.json({
          success: true,
          message: `Lead "${lead.firstName} ${lead.lastName}" converted to client`,
          clientId: newClient.id,
        });
      }

      // ─── Deal Actions ──────────────────────────────────────────
      case "addDeal": {
        if (
          !payload?.name ||
          !payload?.value ||
          !payload?.pipelineId ||
          !payload?.stageId
        )
          return Response.json(
            {
              success: false,
              message: "name, value, pipelineId, stageId required",
            },
            { status: 400 },
          );
        const deal = await prisma.deal.create({
          data: {
            userId,
            name: payload.name,
            value: Number(payload.value),
            pipelineId: payload.pipelineId,
            pipelineStageId: payload.stageId,
            expectedCloseDate: payload.expectedCloseDate
              ? new Date(payload.expectedCloseDate)
              : new Date(Date.now() + 30 * 86400000),
            probability: 0.5,
            weightedValue: Number(payload.value) * 0.5,
            ...(payload.leadId ? { leadId: payload.leadId } : {}),
            ...(payload.clientId ? { clientId: payload.clientId } : {}),
          },
        });
        return Response.json({
          success: true,
          message: `Deal "${deal.name}" created (R${deal.value})`,
          id: deal.id,
        });
      }

      case "updateDeal": {
        if (!payload?.dealId)
          return Response.json(
            { success: false, message: "dealId required" },
            { status: 400 },
          );
        const data: any = {};
        if (payload.stageId) data.pipelineStageId = payload.stageId;
        if (payload.value !== undefined) data.value = Number(payload.value);
        if (payload.status) {
          data.status = payload.status;
          if (payload.status === "WON") data.actualCloseDate = new Date();
          if (payload.status === "LOST") {
            data.actualCloseDate = new Date();
            data.lostReason = payload.reason || null;
          }
        }
        if (payload.nextStep) data.nextStep = payload.nextStep;
        await prisma.deal.update({ where: { id: payload.dealId }, data });
        return Response.json({ success: true, message: `Deal updated` });
      }

      // ─── Calendar Actions ──────────────────────────────────────
      case "addEvent": {
        if (!payload?.title || !payload?.startTime || !payload?.endTime)
          return Response.json(
            { success: false, message: "title, startTime, endTime required" },
            { status: 400 },
          );
        const event = await prisma.calendarEvent.create({
          data: {
            userId,
            title: payload.title,
            startTime: new Date(payload.startTime),
            endTime: new Date(payload.endTime),
            type: payload.type || "meeting",
            timezone: "Africa/Johannesburg",
            location: payload.location || null,
          },
        });
        return Response.json({
          success: true,
          message: `Event "${event.title}" created`,
          id: event.id,
        });
      }

      // ─── Research Actions ──────────────────────────────────────
      case "startResearch": {
        if (!payload?.title || !payload?.prompt)
          return Response.json(
            { success: false, message: "title and prompt required" },
            { status: 400 },
          );
        const scope = (payload.scope || "QUICK") as ResearchScope;
        const promptHash = crypto
          .createHash("sha256")
          .update(
            `${userId}:${payload.prompt.toLowerCase().trim().replace(/\s+/g, " ")}`,
          )
          .digest("hex");

        // Create the research record
        const research = await prisma.research.create({
          data: {
            userId,
            title: payload.title,
            originalPrompt: payload.prompt,
            refinedPrompt: payload.prompt,
            scope,
            searchMethod: SearchMethod.GEMINI_GROUNDING,
            status: ResearchStatus.IN_PROGRESS,
            progress: 5,
            promptHash,
          },
        });

        // Trigger via Inngest
        await inngest.send({
          name: "research/initiated",
          data: { researchId: research.id, userId },
        });

        return Response.json({
          success: true,
          message: `Research "${research.title}" started — check the Research page for progress`,
          id: research.id,
        });
      }

      // ─── Note Actions ──────────────────────────────────────────
      case "addNote": {
        if (!payload?.content)
          return Response.json(
            { success: false, message: "content required" },
            { status: 400 },
          );
        const note = await prisma.note.create({
          data: { userId, content: payload.content },
        });
        return Response.json({
          success: true,
          message: "Note created",
          id: note.id,
        });
      }

      // ─── Meeting Actions ───────────────────────────────────────
      case "addMeeting": {
        if (!payload?.title || !payload?.scheduledAt || !payload?.duration)
          return Response.json(
            {
              success: false,
              message: "title, scheduledAt, duration required",
            },
            { status: 400 },
          );
        const meeting = await prisma.meeting.create({
          data: {
            userId,
            title: payload.title,
            scheduledAt: new Date(payload.scheduledAt),
            duration: Number(payload.duration),
            requiredAttendees: payload.attendees || [],
          },
        });
        return Response.json({
          success: true,
          message: `Meeting "${meeting.title}" scheduled`,
          id: meeting.id,
        });
      }

      default:
        return Response.json(
          { success: false, message: `Unknown action type: "${type}"` },
          { status: 400 },
        );
    }
  } catch (error: any) {
    console.error("[Chat Action Error]", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
