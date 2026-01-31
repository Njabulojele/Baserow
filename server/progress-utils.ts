import { PrismaClient } from "@prisma/client";

/**
 * Recalculates the progress of a KeyStep based on its linked tasks.
 * Progress = (Completed Tasks / Total Tasks) * 100
 */
export async function recalculateKeyStepProgress(
  prisma: PrismaClient,
  keyStepId: string,
) {
  const tasks = await prisma.task.findMany({
    where: { keyStepId },
    select: { status: true },
  });

  if (tasks.length === 0) return 0;

  const completedCount = tasks.filter((t) => t.status === "completed").length;
  const progress = Math.round((completedCount / tasks.length) * 100);

  // Update KeyStep
  const keyStep = await prisma.keyStep.update({
    where: { id: keyStepId },
    data: {
      progress,
      completed: progress === 100,
      completedAt: progress === 100 ? new Date() : null,
    },
  });

  // Propagate up to Goal
  if (keyStep.goalId) {
    await recalculateGoalProgress(prisma, keyStep.goalId);
  }

  return progress;
}

/**
 * Recalculates the progress of a Goal based on its KeySteps.
 * Goal Progress = Average of KeyStep progress + weighting considerations (future)
 * For now: (Sum of KeyStep Progress / (Num KeySteps * 100)) * 100
 * OR simply: (Completed KeySteps / Total KeySteps) * 100?
 *
 * The user said: "when i click on substep 1 which is then labbeled a task then the keystep one updated by 1/3...
 * when i am done with all steps, the keystep then updates relative to how many keysteps there are so basucally when i have done all steps, the main keystep also auto updates(complete) then the goal progress updates."
 *
 * So Goal Progress should be average of KeySteps progress.
 */
export async function recalculateGoalProgress(
  prisma: PrismaClient,
  goalId: string,
) {
  const keySteps = await prisma.keyStep.findMany({
    where: { goalId },
    select: { progress: true, completed: true },
  });

  if (keySteps.length === 0) {
    // If no keysteps, maybe check direct tasks?
    // For now, if no keysteps, progress is manual or 0?
    // Let's assume 0 if no keysteps and no direct tasks logic yet.
    return 0;
  }

  const totalProgress = keySteps.reduce((sum, ks) => sum + ks.progress, 0);
  const goalProgress = Math.round(totalProgress / keySteps.length);

  await prisma.goal.update({
    where: { id: goalId },
    data: {
      progress: goalProgress,
      status:
        goalProgress === 100
          ? "completed"
          : goalProgress > 0
            ? "in_progress"
            : "not_started",
    },
  });

  return goalProgress;
}
