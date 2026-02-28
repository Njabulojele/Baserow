import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { GeminiClient } from "@/lib/gemini-client";
import { format } from "date-fns";

// ─── System Prompt ────────────────────────────────────────────────
const SYSTEM_PROMPT = `You are BaseRow AI — the user's full-power productivity assistant. You have complete context on their tasks, projects, clients, CRM leads, deals, pipeline stages, calendar, research, meetings, time entries, and well-being data.

CAPABILITIES — you can execute any of these actions (emit as JSON on a new line):
  ACTION: {"type": "<actionType>", ...params}

Available actions:
• addTask — {"type":"addTask", "title":"...", "priority":"high|medium|low", "projectId":"optional", "dueDate":"optional ISO"}
• updateTask — {"type":"updateTask", "taskId":"...", "status":"not_started|in_progress|done", "priority":"optional", "title":"optional"}
• startTimer — {"type":"startTimer", "taskId":"..."}
• stopTimer — {"type":"stopTimer"}
• addClient — {"type":"addClient", "name":"...", "email":"...", "companyName":"optional", "industry":"optional"}
• updateClient — {"type":"updateClient", "clientId":"...", "status":"optional", "notes":"optional", "tags":"optional[]"}
• addLead — {"type":"addLead", "firstName":"...", "lastName":"...", "email":"...", "companyName":"...", "source":"optional", "estimatedValue":"optional number"}
• moveLead — {"type":"moveLead", "leadId":"...", "stageId":"..."}
• updateLead — {"type":"updateLead", "leadId":"...", "status":"optional", "score":"optional number"}
• convertLead — {"type":"convertLead", "leadId":"..."}
• addDeal — {"type":"addDeal", "name":"...", "value":"number", "pipelineId":"...", "stageId":"...", "leadId":"optional", "clientId":"optional", "expectedCloseDate":"ISO"}
• updateDeal — {"type":"updateDeal", "dealId":"...", "stageId":"optional", "value":"optional", "status":"optional (OPEN|WON|LOST)"}
• addEvent — {"type":"addEvent", "title":"...", "startTime":"ISO", "endTime":"ISO", "type":"meeting|task|reminder|personal"}
• startResearch — {"type":"startResearch", "title":"...", "prompt":"...", "scope":"QUICK|DETAILED|COMPREHENSIVE"}
• addNote — {"type":"addNote", "content":"..."}
• addMeeting — {"type":"addMeeting", "title":"...", "scheduledAt":"ISO", "duration":"minutes number", "attendees":"optional[]"}

RULES:
• Be concise — 2-4 sentences max unless the user asks for detail.
• Reference real data from context. NEVER make up IDs, names, or numbers.
• When listing items, include their IDs so the user can refer to them.
• For multi-step requests, ask the user to confirm before executing.
• Put ACTION blocks on their own line at the END of your message only.
• You can emit multiple ACTION blocks if the user asks for multiple things.
• If the user says "start research on X", create and trigger a research with their prompt.
• Always be helpful, direct, and efficient.`;

// ─── Full Context Builder ─────────────────────────────────────────
async function buildFullContext(userId: string): Promise<string> {
  const now = new Date();
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 14); // 2 weeks ahead

  try {
    const [
      todaysTasks,
      upcomingTasks,
      activeTimer,
      projects,
      clients,
      crmLeads,
      deals,
      pipelineStages,
      events,
      researches,
      meetings,
      timeEntries,
      wellbeing,
      recentNotes,
    ] = await Promise.all([
      // ── Tasks ──
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
          type: true,
          estimatedMinutes: true,
          actualMinutes: true,
          project: { select: { name: true } },
        },
        take: 20,
        orderBy: { priority: "asc" },
      }),
      prisma.task.findMany({
        where: {
          userId,
          scheduledDate: { gte: tomorrow, lt: weekEnd },
          status: { not: "done" },
        },
        select: { id: true, title: true, priority: true, scheduledDate: true },
        take: 15,
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

      // ── Projects ──
      prisma.project.findMany({
        where: { userId, status: "active", archivedAt: null },
        select: {
          id: true,
          name: true,
          type: true,
          status: true,
          completionPercentage: true,
          client: { select: { name: true } },
          _count: { select: { tasks: true } },
        },
        take: 15,
        orderBy: { updatedAt: "desc" },
      }),

      // ── Clients ──
      prisma.client.findMany({
        where: { userId, status: "active" },
        select: {
          id: true,
          name: true,
          companyName: true,
          email: true,
          industry: true,
          status: true,
          outstandingBalance: true,
          lifetimeValue: true,
          lastContactedAt: true,
          healthScore: {
            select: { overallScore: true, churnRisk: true, trend: true },
          },
          _count: { select: { projects: true, deals: true } },
        },
        take: 20,
        orderBy: { updatedAt: "desc" },
      }),

      // ── CRM Leads ──
      prisma.crmLead.findMany({
        where: { userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          companyName: true,
          status: true,
          score: true,
          estimatedValue: true,
          industry: true,
          pipelineStage: { select: { id: true, name: true } },
          pipeline: { select: { name: true } },
          _count: { select: { activities: true, deals: true } },
        },
        take: 25,
        orderBy: { updatedAt: "desc" },
      }),

      // ── Deals ──
      prisma.deal.findMany({
        where: { userId, status: "OPEN" },
        select: {
          id: true,
          name: true,
          value: true,
          probability: true,
          expectedCloseDate: true,
          nextStep: true,
          pipelineStage: { select: { id: true, name: true } },
          pipeline: { select: { name: true } },
          lead: { select: { firstName: true, lastName: true } },
          client: { select: { name: true } },
        },
        take: 20,
        orderBy: { expectedCloseDate: "asc" },
      }),

      // ── Pipeline Stages ──
      prisma.pipelineStage.findMany({
        where: { pipeline: { userId } },
        select: {
          id: true,
          name: true,
          order: true,
          probability: true,
          isClosed: true,
          isWon: true,
          pipeline: { select: { id: true, name: true } },
          _count: { select: { leads: true, deals: true } },
        },
        orderBy: [{ pipeline: { name: "asc" } }, { order: "asc" }],
      }),

      // ── Calendar Events ──
      prisma.calendarEvent.findMany({
        where: { userId, startTime: { gte: today, lt: weekEnd } },
        select: {
          id: true,
          title: true,
          startTime: true,
          endTime: true,
          type: true,
          location: true,
        },
        take: 15,
        orderBy: { startTime: "asc" },
      }),

      // ── Research ──
      prisma.research.findMany({
        where: { userId },
        select: {
          id: true,
          title: true,
          status: true,
          scope: true,
          progress: true,
          createdAt: true,
          searchMethod: true,
        },
        take: 10,
        orderBy: { createdAt: "desc" },
      }),

      // ── Meetings ──
      prisma.meeting.findMany({
        where: { userId, scheduledAt: { gte: now } },
        select: {
          id: true,
          title: true,
          scheduledAt: true,
          duration: true,
          status: true,
          client: { select: { name: true } },
        },
        take: 10,
        orderBy: { scheduledAt: "asc" },
      }),

      // ── Time Entries (today) ──
      prisma.timeEntry.findMany({
        where: { userId, startTime: { gte: today, lt: tomorrow } },
        select: {
          id: true,
          duration: true,
          type: true,
          description: true,
          task: { select: { title: true } },
          project: { select: { name: true } },
        },
        take: 10,
        orderBy: { startTime: "desc" },
      }),

      // ── Well-Being (latest) ──
      prisma.wellBeingEntry.findFirst({
        where: { userId },
        select: {
          date: true,
          averageEnergy: true,
          mood: true,
          stressLevel: true,
          sleepHours: true,
          exerciseMinutes: true,
        },
        orderBy: { date: "desc" },
      }),

      // ── Recent Notes ──
      prisma.note.findMany({
        where: { userId },
        select: { id: true, content: true, createdAt: true },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
    ]);

    // ── Format Context ──
    const sections: string[] = [];

    // Timer
    if (activeTimer) {
      const elapsed = activeTimer.currentTimerStart
        ? Math.round(
            (now.getTime() -
              new Date(activeTimer.currentTimerStart).getTime()) /
              60000,
          )
        : 0;
      sections.push(
        `🔴 ACTIVE TIMER: "${activeTimer.title}" (${elapsed} min) | project: ${activeTimer.project?.name || "none"} [id:${activeTimer.id}]`,
      );
    }

    // Today's Tasks
    if (todaysTasks.length > 0) {
      sections.push(
        `📋 TODAY'S TASKS (${todaysTasks.length}):\n${todaysTasks
          .map(
            (t) =>
              `  • [${t.status}] ${t.title} (${t.priority}${t.estimatedMinutes ? `, ~${t.estimatedMinutes}min` : ""}) ${t.project?.name ? `| ${t.project.name}` : ""} [id:${t.id}]`,
          )
          .join("\n")}`,
      );
    } else {
      sections.push("📋 No tasks scheduled for today.");
    }

    // Upcoming Tasks
    if (upcomingTasks.length > 0) {
      sections.push(
        `📅 UPCOMING TASKS (${upcomingTasks.length}):\n${upcomingTasks
          .map(
            (t) =>
              `  • ${t.title} (${t.priority}) — ${t.scheduledDate ? format(new Date(t.scheduledDate), "EEE, MMM d") : "unscheduled"} [id:${t.id}]`,
          )
          .join("\n")}`,
      );
    }

    // Projects
    if (projects.length > 0) {
      sections.push(
        `📁 ACTIVE PROJECTS (${projects.length}):\n${projects
          .map(
            (p) =>
              `  • ${p.name} (${Math.round(Number(p.completionPercentage))}% done, ${p._count.tasks} tasks) ${p.client?.name ? `| Client: ${p.client.name}` : ""} [id:${p.id}]`,
          )
          .join("\n")}`,
      );
    }

    // Clients
    if (clients.length > 0) {
      sections.push(
        `👥 CLIENTS (${clients.length}):\n${clients
          .map((c) => {
            const health = c.healthScore
              ? ` | health:${Math.round(c.healthScore.overallScore)}/100 (${c.healthScore.trend})`
              : "";
            return `  • ${c.name}${c.companyName ? ` (${c.companyName})` : ""} | ${c.industry || "no industry"} | LTV:R${Math.round(c.lifetimeValue)}${health} | ${c._count.projects} projects, ${c._count.deals} deals [id:${c.id}]`;
          })
          .join("\n")}`,
      );
    }

    // CRM Leads
    if (crmLeads.length > 0) {
      sections.push(
        `🎯 CRM LEADS (${crmLeads.length}):\n${crmLeads
          .map(
            (l) =>
              `  • ${l.firstName} ${l.lastName} @ ${l.companyName} | ${l.status} | score:${Math.round(l.score)} | stage:${l.pipelineStage?.name || "none"} | est:R${l.estimatedValue || 0} [id:${l.id}]${l.pipelineStage ? ` [stageId:${l.pipelineStage.id}]` : ""}`,
          )
          .join("\n")}`,
      );
    }

    // Deals
    if (deals.length > 0) {
      const totalPipeline = deals.reduce((sum, d) => sum + d.value, 0);
      sections.push(
        `💰 OPEN DEALS (${deals.length}, total pipeline: R${Math.round(totalPipeline)}):\n${deals
          .map(
            (d) =>
              `  • ${d.name} — R${Math.round(d.value)} (${Math.round(d.probability * 100)}%) | stage:${d.pipelineStage?.name} | close:${format(new Date(d.expectedCloseDate), "MMM d")} | next:${d.nextStep || "none"} [id:${d.id}] [stageId:${d.pipelineStage?.id}]`,
          )
          .join("\n")}`,
      );
    }

    // Pipeline Stages
    if (pipelineStages.length > 0) {
      const byPipeline = new Map<string, typeof pipelineStages>();
      for (const s of pipelineStages) {
        const key = s.pipeline.name;
        if (!byPipeline.has(key)) byPipeline.set(key, []);
        byPipeline.get(key)!.push(s);
      }
      const pipelineLines: string[] = [];
      for (const [name, stages] of byPipeline) {
        pipelineLines.push(`  Pipeline: ${name}`);
        for (const s of stages) {
          pipelineLines.push(
            `    ${s.order}. ${s.name} — ${s._count.leads} leads, ${s._count.deals} deals (${Math.round(s.probability * 100)}% prob) [stageId:${s.id}] [pipelineId:${s.pipeline.id}]`,
          );
        }
      }
      sections.push(`🔀 PIPELINE STAGES:\n${pipelineLines.join("\n")}`);
    }

    // Calendar
    if (events.length > 0) {
      sections.push(
        `🗓️ CALENDAR (next 2 weeks, ${events.length} events):\n${events
          .map(
            (e) =>
              `  • ${e.title} — ${format(new Date(e.startTime), "EEE, MMM d HH:mm")}-${format(new Date(e.endTime), "HH:mm")} (${e.type}) ${e.location ? `@ ${e.location}` : ""} [id:${e.id}]`,
          )
          .join("\n")}`,
      );
    }

    // Research
    if (researches.length > 0) {
      sections.push(
        `🔬 RESEARCH (${researches.length}):\n${researches
          .map(
            (r) =>
              `  • ${r.title} — ${r.status} (${r.progress}%) | ${r.scope} | ${r.searchMethod} | ${format(new Date(r.createdAt), "MMM d")} [id:${r.id}]`,
          )
          .join("\n")}`,
      );
    }

    // Meetings
    if (meetings.length > 0) {
      sections.push(
        `📞 UPCOMING MEETINGS (${meetings.length}):\n${meetings
          .map(
            (m) =>
              `  • ${m.title} — ${format(new Date(m.scheduledAt), "EEE, MMM d HH:mm")} (${m.duration}min) ${m.client?.name ? `| ${m.client.name}` : ""} [id:${m.id}]`,
          )
          .join("\n")}`,
      );
    }

    // Time Entries
    if (timeEntries.length > 0) {
      const totalMinutes = timeEntries.reduce((sum, t) => sum + t.duration, 0);
      sections.push(
        `⏱️ TIME LOGGED TODAY (${Math.round(totalMinutes / 60)}h ${totalMinutes % 60}m):\n${timeEntries
          .map(
            (t) =>
              `  • ${t.task?.title || t.description || "Untracked"} — ${t.duration}min ${t.project?.name ? `| ${t.project.name}` : ""}`,
          )
          .join("\n")}`,
      );
    }

    // Well-Being
    if (wellbeing) {
      sections.push(
        `💚 WELL-BEING (${format(new Date(wellbeing.date), "MMM d")}): energy:${wellbeing.averageEnergy || "?"}/10 | mood:${wellbeing.mood || "?"}/10 | stress:${wellbeing.stressLevel || "?"}/10 | sleep:${wellbeing.sleepHours || "?"}h | exercise:${wellbeing.exerciseMinutes || 0}min`,
      );
    }

    // Notes
    if (recentNotes.length > 0) {
      sections.push(
        `📝 RECENT NOTES:\n${recentNotes
          .map(
            (n) =>
              `  • ${n.content.slice(0, 100)}${n.content.length > 100 ? "..." : ""} (${format(new Date(n.createdAt), "MMM d")}) [id:${n.id}]`,
          )
          .join("\n")}`,
      );
    }

    return sections.join("\n\n") || "No data available.";
  } catch (err) {
    console.warn("[Chat Context] Failed to build context:", err);
    return "Context unavailable — database query failed.";
  }
}

// ─── POST Handler ─────────────────────────────────────────────────
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

    const context = await buildFullContext(userId);
    const fullPrompt = `${SYSTEM_PROMPT}\n\n--- FULL USER CONTEXT ---\n${context}\n--- END CONTEXT ---\n\nUser: ${message}`;

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
