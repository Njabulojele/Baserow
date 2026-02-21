"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  Target,
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Circle,
  Milestone as MilestoneIcon,
  Loader2,
  Calendar,
  Plus,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { InlineCreator } from "@/components/strategy/InlineCreator";
import { toast } from "sonner";

const priorityColors = {
  critical: "bg-red-500/10 text-red-500 border-red-500/20",
  high: "bg-orange-500/10 text-orange-500 border-orange-500/20",
  medium: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  low: "bg-slate-500/10 text-slate-500 border-slate-500/20",
};

export default function GoalDetailPage() {
  const params = useParams();
  const router = useRouter();
  const goalId = params.id as string;
  const utils = trpc.useUtils();

  // Local state for UI interactions
  const [addingKeyStep, setAddingKeyStep] = useState(false);
  const [addingTaskToStepId, setAddingTaskToStepId] = useState<string | null>(
    null,
  );

  // Queries
  const { data: goal, isLoading } = trpc.strategy.getGoal.useQuery({
    id: goalId,
  });

  // Mutations
  const updateGoal = trpc.strategy.updateGoal.useMutation({
    onSuccess: () => utils.strategy.getGoal.invalidate({ id: goalId }),
  });

  const createKeyStep = trpc.strategy.createKeyStep.useMutation({
    onSuccess: () => {
      setAddingKeyStep(false);
      utils.strategy.getGoal.invalidate({ id: goalId });
      toast.success("Key step created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateKeyStep = trpc.strategy.updateKeyStep.useMutation({
    onSuccess: () => utils.strategy.getGoal.invalidate({ id: goalId }),
  });

  const deleteKeyStep = trpc.strategy.deleteKeyStep.useMutation({
    onSuccess: () => utils.strategy.getGoal.invalidate({ id: goalId }),
  });

  const createTask = trpc.task.createTask.useMutation({
    onSuccess: () => {
      setAddingTaskToStepId(null);
      utils.strategy.getGoal.invalidate({ id: goalId });
      toast.success("Task created");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateTask = trpc.task.updateTask.useMutation({
    onMutate: async (updated: any) => {
      await utils.strategy.getGoal.cancel({ id: goalId });
      const previous = utils.strategy.getGoal.getData({ id: goalId });
      if (previous) {
        utils.strategy.getGoal.setData({ id: goalId }, (old: any) => ({
          ...old,
          keySteps: old.keySteps.map((ks: any) => ({
            ...ks,
            tasks: ks.tasks.map((t: any) =>
              t.id === updated.id ? { ...t, status: updated.status } : t,
            ),
          })),
        }));
      }
      return { previous };
    },
    onSettled: () => utils.strategy.getGoal.invalidate({ id: goalId }),
  });

  const deleteTask = trpc.task.deleteTask.useMutation({
    onSuccess: () => utils.strategy.getGoal.invalidate({ id: goalId }),
  });

  const updateMilestone = trpc.strategy.updateMilestone.useMutation({
    onSuccess: () => utils.strategy.getGoal.invalidate({ id: goalId }),
  });

  if (isLoading) {
    return (
      <div className="flex h-[calc(100vh-4rem)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        <Target className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Goal not found</h2>
        <Button variant="outline" onClick={() => router.push("/strategy")}>
          Return to Strategy
        </Button>
      </div>
    );
  }

  const handleProgressChange = (newVal: number) => {
    updateGoal.mutate({
      id: goal.id,
      data: {
        progress: newVal,
        status:
          newVal >= 100
            ? "completed"
            : newVal > 0
              ? "in_progress"
              : "not_started",
      },
    });
  };

  return (
    <div className="container max-w-5xl py-6 mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push("/strategy")}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <Badge
                variant="outline"
                className={cn(
                  "uppercase text-[10px] font-bold tracking-wider",
                  priorityColors[goal.priority as keyof typeof priorityColors],
                )}
              >
                {goal.priority}
              </Badge>
              <Badge variant="secondary" className="bg-[#1a252f] text-gray-300">
                {goal.category}
              </Badge>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white">
              {goal.title}
            </h1>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Progress Overview */}
          <Card className="border-[#2f3e46] bg-[#1a252f]/40 backdrop-blur">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Master Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={goal.progress || 0}
                  onChange={(e) =>
                    handleProgressChange(parseInt(e.target.value))
                  }
                  className="flex-1 accent-[#6b9080]"
                />
                <span className="text-2xl font-bold text-[#6b9080] w-16 text-right">
                  {goal.progress || 0}%
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Execution Pipeline (Key Steps & Tasks) */}
          <Card className="border-[#2f3e46] bg-[#1a252f]/40 backdrop-blur shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between border-b border-[#2f3e46] pb-4 bg-black/20">
              <div>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-[#6b9080]" />
                  Execution Pipeline
                </CardTitle>
                <CardDescription>
                  Break this exact goal into actionable phases and tasks
                </CardDescription>
              </div>
              <Button
                size="sm"
                onClick={() => setAddingKeyStep(true)}
                className="bg-[#6b9080] hover:bg-[#6b9080]/90 text-white"
              >
                <Plus className="h-4 w-4 mr-1" /> New Phase
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {addingKeyStep && (
                <div className="p-4 border-b border-[#2f3e46] bg-black/40">
                  <InlineCreator
                    placeholder="E.g., Phase 1: Market Research..."
                    buttonText="Create Phase"
                    onSave={(title: string) =>
                      createKeyStep.mutate({ goalId: goal.id, title })
                    }
                    onCancel={() => setAddingKeyStep(false)}
                  />
                </div>
              )}

              {goal.keySteps.length === 0 && !addingKeyStep ? (
                <div className="p-8 text-center text-muted-foreground border-b border-[#2f3e46]">
                  <p>No execution phases defined yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-[#2f3e46]">
                  {goal.keySteps.map((step: any) => (
                    <div key={step.id} className="group">
                      {/* Step Header */}
                      <div className="p-4 bg-black/10 flex items-center justify-between hover:bg-black/20 transition-colors">
                        <div className="flex items-center gap-3 flex-1">
                          <button
                            onClick={() =>
                              updateKeyStep.mutate({
                                id: step.id,
                                completed: !step.completedAt,
                              })
                            }
                            className="hover:scale-110 transition-transform"
                          >
                            {step.completedAt ? (
                              <CheckCircle2 className="h-5 w-5 text-[#6b9080]" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground hover:text-white" />
                            )}
                          </button>
                          <h3
                            className={cn(
                              "font-medium",
                              step.completedAt &&
                                "line-through text-muted-foreground",
                            )}
                          >
                            {step.title}
                          </h3>
                        </div>
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-[#6b9080]"
                            onClick={() => setAddingTaskToStepId(step.id)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 text-destructive hover:bg-destructive/20"
                            onClick={() =>
                              deleteKeyStep.mutate({ id: step.id })
                            }
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Tasks under step */}
                      <div className="p-3 bg-black/5 pl-12 space-y-1">
                        {step.tasks?.map((task: any) => (
                          <div
                            key={task.id}
                            className="flex items-center justify-between group/task px-3 py-2 rounded-md hover:bg-white/5 transition-colors"
                          >
                            <div className="flex items-center gap-2.5">
                              <button
                                onClick={() =>
                                  updateTask.mutate({
                                    id: task.id,
                                    status:
                                      task.status === "done"
                                        ? "not_started"
                                        : "done",
                                  })
                                }
                              >
                                {task.status === "done" ? (
                                  <CheckCircle2 className="h-4 w-4 text-[#6b9080]" />
                                ) : (
                                  <Circle className="h-4 w-4 text-muted-foreground" />
                                )}
                              </button>
                              <span
                                className={cn(
                                  "text-sm",
                                  task.status === "completed" &&
                                    "line-through text-muted-foreground",
                                )}
                              >
                                {task.title}
                              </span>
                            </div>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 opacity-0 group-hover/task:opacity-100 text-destructive hover:bg-destructive/20"
                              onClick={() => deleteTask.mutate({ id: task.id })}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        ))}

                        {addingTaskToStepId === step.id && (
                          <div className="px-3 py-2">
                            <InlineCreator
                              placeholder="Add a concrete task..."
                              buttonText="Add"
                              onSave={(title: string) =>
                                createTask.mutate({
                                  goalId: goal.id,
                                  keyStepId: step.id,
                                  title,
                                  priority: "medium",
                                  type: "shallow_work",
                                })
                              }
                              onCancel={() => setAddingTaskToStepId(null)}
                            />
                          </div>
                        )}

                        {(!step.tasks || step.tasks.length === 0) &&
                          addingTaskToStepId !== step.id && (
                            <p className="text-xs text-muted-foreground italic px-3 py-2">
                              No tasks mapped to this phase. Break it down!
                            </p>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Context & Metrics */}
        <div className="space-y-6">
          <Card className="border-[#2f3e46] bg-[#1a252f]/40">
            <CardHeader className="pb-3 border-b border-[#2f3e46]">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                Strategic Context
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-6">
              {goal.description && (
                <div>
                  <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">
                    Description
                  </h4>
                  <p className="text-sm text-gray-300 leading-relaxed">
                    {goal.description}
                  </p>
                </div>
              )}

              {goal.strategies?.length > 0 && (
                <div className="border-l-2 border-blue-500/50 pl-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-blue-400 mb-2 flex items-center gap-1.5">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Strategies
                  </h4>
                  <ul className="space-y-1.5">
                    {goal.strategies.map((s: string, i: number) => (
                      <li
                        key={i}
                        className="text-xs text-gray-300 flex items-start gap-2"
                      >
                        <span className="text-blue-400 mt-0.5 shrink-0">•</span>
                        <span className="leading-snug">{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {goal.kpis?.length > 0 && (
                <div className="border-l-2 border-[#6b9080]/50 pl-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-[#6b9080] mb-2 flex items-center gap-1.5">
                    <Target className="h-3.5 w-3.5" />
                    KPIs
                  </h4>
                  <ul className="space-y-1.5">
                    {goal.kpis.map((k: string, i: number) => (
                      <li
                        key={i}
                        className="text-xs text-gray-300 flex items-start gap-2"
                      >
                        <span className="mt-0.5 shrink-0 text-[#6b9080]">
                          •
                        </span>
                        <span className="leading-snug">{k}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {goal.risks?.length > 0 && (
                <div className="border-l-2 border-rose-500/50 pl-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-rose-500 mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Risks
                  </h4>
                  <ul className="space-y-1.5">
                    {goal.risks.map((r: string, i: number) => (
                      <li
                        key={i}
                        className="text-xs text-gray-300 flex items-start gap-2"
                      >
                        <span className="text-rose-500 mt-0.5 shrink-0">•</span>
                        <span className="leading-snug">{r}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Target Dates & Milestones */}
          <Card className="border-[#2f3e46] bg-[#1a252f]/40">
            <CardHeader className="pb-3 border-b border-[#2f3e46]">
              <CardTitle className="text-sm font-semibold uppercase tracking-wider text-muted-foreground flex justify-between items-center">
                <span>Timeline</span>
                <Calendar className="h-4 w-4" />
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Target Date</span>
                <span className="font-medium text-white">
                  {goal.targetDate
                    ? format(new Date(goal.targetDate), "MMM d, yyyy")
                    : "None set"}
                </span>
              </div>

              {goal.milestones?.length > 0 && (
                <div className="pt-2 border-t border-[#2f3e46]">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-3 flex items-center gap-1.5">
                    <MilestoneIcon className="h-3.5 w-3.5" />
                    Milestones
                  </h4>
                  <ul className="space-y-2">
                    {goal.milestones.map((m: any) => (
                      <li
                        key={m.id}
                        className="flex items-center gap-2 text-sm bg-black/20 rounded p-2 border border-[#2f3e46]"
                      >
                        <button
                          onClick={() =>
                            updateMilestone.mutate({
                              id: m.id,
                              completed: !m.completedAt,
                            })
                          }
                        >
                          {m.completedAt ? (
                            <CheckCircle2 className="h-4 w-4 text-[#6b9080] shrink-0" />
                          ) : (
                            <Circle className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                        </button>
                        <div className="flex flex-col flex-1">
                          <span
                            className={cn(
                              "text-xs font-medium",
                              m.completedAt &&
                                "line-through text-muted-foreground",
                            )}
                          >
                            {m.title}
                          </span>
                          {m.targetDate && (
                            <span className="text-[10px] text-gray-500">
                              {format(new Date(m.targetDate), "MMM d, yyyy")}
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
