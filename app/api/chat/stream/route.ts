import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GeminiClient } from "@/lib/gemini-client";
import { format } from "date-fns";

// System prompt for the AI assistant
const SYSTEM_PROMPT = `You are BaseRow AI, a concise productivity assistant. You have access to the user's current context (tasks, timer, calendar events, projects).

Rules:
- Be extremely concise. Max 2-3 sentences unless more is needed.
- When the user asks to add a task, respond with a JSON action block on a NEW LINE at the very end:
  ACTION: {"type": "addTask", "title": "...", "priority": "high|medium|low"}
- When the user asks to start a timer, respond with:
  ACTION: {"type": "startTimer", "taskId": "..."}
- When asked about schedule/tasks, reference the context provided.
- Never make up data. Only reference what's in the context.
- Be direct and helpful. No fluff.`;

/**
 * Build context string server-side by querying the DB directly.
 * This avoids relying on tRPC (which has intermittent 401s).
 */
async function buildServerContext(userId: string): Promise<string> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  try {
    const [todaysTasks, upcomingTasks, activeTimer, projects, events] =
      await Promise.all([
        prisma.task.findMany({
          where: {
            userId,
            OR: [
              { scheduledDate: { gte: today, lt: tomorrow } },
              { dueDate: { gte: today, lt: tomorrow } },
            ],
            status: { not: "done" },
          },
          select: {
            id: true,
            title: true,
            priority: true,
            status: true,
            project: { select: { name: true } },
          },
          take: 15,
          orderBy: { priority: "asc" },
        }),
        prisma.task.findMany({
          where: {
            userId,
            scheduledDate: { gte: tomorrow, lt: weekEnd },
            status: { not: "done" },
          },
          select: {
            id: true,
            title: true,
            priority: true,
            scheduledDate: true,
          },
          take: 10,
          orderBy: { scheduledDate: "asc" },
        }),
        prisma.task.findFirst({
          where: { userId, timerRunning: true },
          select: {
            id: true,
            title: true,
            currentTimerStart: true,
            project: { select: { name: true } },
          },
        }),
        prisma.project.findMany({
          where: { userId, status: "active", archivedAt: null },
          select: { name: true, completionPercentage: true },
          take: 10,
          orderBy: { updatedAt: "desc" },
        }),
        prisma.calendarEvent.findMany({
          where: { userId, startTime: { gte: today, lt: weekEnd } },
          select: { title: true, startTime: true, endTime: true },
          take: 10,
          orderBy: { startTime: "asc" },
        }),
      ]);

    const parts: string[] = [];

    if (activeTimer) {
      parts.push(
        `🔴 Active Timer: "${activeTimer.title}" (project: ${activeTimer.project?.name || "none"})`,
      );
    }

    if (todaysTasks.length > 0) {
      parts.push(
        `📋 Today's Tasks (${todaysTasks.length}):\n${todaysTasks
          .map(
            (t) =>
              `  - [${t.status}] ${t.title} (${t.priority}) ${t.project?.name ? `| ${t.project.name}` : ""} [id:${t.id}]`,
          )
          .join("\n")}`,
      );
    } else {
      parts.push("📋 No tasks scheduled for today.");
    }

    if (upcomingTasks.length > 0) {
      parts.push(
        `📅 Upcoming (7 days):\n${upcomingTasks
          .map(
            (t) =>
              `  - ${t.title} (${t.scheduledDate ? format(new Date(t.scheduledDate), "EEE, MMM d") : "no date"}) [id:${t.id}]`,
          )
          .join("\n")}`,
      );
    }

    if (events.length > 0) {
      parts.push(
        `🗓️ Calendar Events:\n${events
          .map(
            (e) =>
              `  - ${e.title} (${format(new Date(e.startTime), "EEE HH:mm")} - ${format(new Date(e.endTime), "HH:mm")})`,
          )
          .join("\n")}`,
      );
    }

    if (projects.length > 0) {
      parts.push(
        `📁 Active Projects: ${projects
          .map(
            (p) => `${p.name} (${Math.round(Number(p.completionPercentage))}%)`,
          )
          .join(", ")}`,
      );
    }

    return parts.join("\n\n");
  } catch (err) {
    console.warn("[Chat Context] Failed to build context:", err);
    return "Context unavailable.";
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { message } = body;

    if (!message || typeof message !== "string") {
      return new Response(JSON.stringify({ error: "Message is required" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Get user's API key settings
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { geminiApiKey: true, geminiModel: true },
    });

    if (!user?.geminiApiKey) {
      return new Response(
        JSON.stringify({
          error: "No Gemini API key configured. Add one in Settings.",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    // Build context server-side — no tRPC dependency
    const context = await buildServerContext(userId);

    const fullPrompt = `${SYSTEM_PROMPT}\n\n--- USER CONTEXT ---\n${context}\n--- END CONTEXT ---\n\nUser: ${message}`;

    const client = new GeminiClient(
      user.geminiApiKey,
      user.geminiModel || "gemini-2.5-flash",
    );

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          await client.createStreamingInteraction(
            fullPrompt,
            (delta: string) => {
              controller.enqueue(
                encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
              );
            },
          );
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
        } catch (streamError: any) {
          console.warn(
            "[Chat] Streaming failed, falling back:",
            streamError.message,
          );
          try {
            const result = await client.generateContent(fullPrompt);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ delta: result })}\n\n`),
            );
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          } catch (fallbackError: any) {
            controller.enqueue(
              encoder.encode(
                `data: ${JSON.stringify({ error: fallbackError.message })}\n\n`,
              ),
            );
            controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
            controller.close();
          }
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  } catch (error: any) {
    console.error("[Chat API Error]", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
}
