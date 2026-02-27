import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { type, payload } = body;

    if (type === "addTask") {
      const task = await prisma.task.create({
        data: {
          userId,
          title: payload?.title || "Untitled Task",
          priority: payload?.priority || "medium",
          status: "not_started",
          type: "task",
          scheduledDate: new Date(),
        },
      });
      return Response.json({
        success: true,
        message: `Task "${task.title}" created`,
        taskId: task.id,
      });
    }

    if (type === "startTimer") {
      const taskId = payload?.taskId;
      if (!taskId) {
        return Response.json(
          { success: false, message: "taskId is required" },
          { status: 400 },
        );
      }

      // Stop any running timer first
      await prisma.task.updateMany({
        where: { userId, timerRunning: true },
        data: { timerRunning: false },
      });

      await prisma.task.update({
        where: { id: taskId },
        data: { timerRunning: true, currentTimerStart: new Date() },
      });

      return Response.json({ success: true, message: "Timer started" });
    }

    return Response.json(
      { success: false, message: "Unknown action type" },
      { status: 400 },
    );
  } catch (error: any) {
    console.error("[Chat Action Error]", error);
    return Response.json(
      { error: error.message || "Internal server error" },
      { status: 500 },
    );
  }
}
