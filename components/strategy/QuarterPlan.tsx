"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { startOfQuarter, endOfQuarter, setQuarter, format } from "date-fns";

const quarterPlanSchema = z.object({
  theme: z.string().min(1, "Theme is required"),
});

const objectiveSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
});

export function QuarterPlan() {
  const currentYear = new Date().getFullYear();
  const today = new Date();
  const currentQuarterNum = Math.floor(today.getMonth() / 3) + 1;

  const [selectedQuarter, setSelectedQuarter] = useState(currentQuarterNum);
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  // Fetch Quarter Plan & Focuses
  const { data: quarterPlan, isLoading } =
    trpc.strategy.getQuarterPlan.useQuery({
      year: currentYear,
      quarter: selectedQuarter,
    });

  // Fetch Year Plan (for Goals)
  const { data: yearPlan } = trpc.strategy.getYearPlan.useQuery({
    year: currentYear,
  });

  const upsertPlan = trpc.strategy.upsertQuarterPlan.useMutation({
    onSuccess: () => {
      toast.success("Quarterly plan updated");
      utils.strategy.getQuarterPlan.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const linkGoal = trpc.strategy.linkGoalToQuarter.useMutation({
    onSuccess: () => {
      toast.success("Goal linked to quarter");
      setIsGoalDialogOpen(false);
      utils.strategy.getQuarterPlan.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const unlinkGoal = trpc.strategy.unlinkGoalFromQuarter.useMutation({
    onSuccess: () => {
      toast.success("Goal removed from quarter");
      utils.strategy.getQuarterPlan.invalidate();
    },
  });

  const updateProgress = trpc.strategy.updateFocusProgress.useMutation({
    onSuccess: () => {
      toast.success("Progress updated");
      utils.strategy.getQuarterPlan.invalidate();
    },
  });

  const form = useForm<z.infer<typeof quarterPlanSchema>>({
    resolver: zodResolver(quarterPlanSchema),
    defaultValues: { theme: "" },
    values: quarterPlan ? { theme: quarterPlan.theme } : undefined,
  });

  function onSubmit(values: z.infer<typeof quarterPlanSchema>) {
    if (!yearPlan) {
      toast.error("Please create a Year Plan first!");
      return;
    }

    const quarterDate = setQuarter(
      new Date(currentYear, 0, 1),
      selectedQuarter,
    );

    upsertPlan.mutate({
      yearPlanId: yearPlan.id,
      quarter: selectedQuarter,
      theme: values.theme,
      startDate: startOfQuarter(quarterDate),
      endDate: endOfQuarter(quarterDate),
    });
  }

  function onLinkGoal(goalId: string) {
    if (!quarterPlan) {
      toast.error("Please save the quarter theme first");
      return;
    }
    linkGoal.mutate({
      quarterPlanId: quarterPlan.id,
      goalId,
      priority: 1,
    });
  }

  // Filter available goals (not already linked)
  const availableGoals = yearPlan?.goals.filter(
    (g) => !quarterPlan?.quarterFocuses?.some((qf) => qf.goalId === g.id),
  );

  return (
    <div className="space-y-6">
      {/* Quarter Selector */}
      <div className="flex items-center justify-between">
        <div className="flex bg-muted rounded-lg p-1">
          {[1, 2, 3, 4].map((q) => (
            <button
              key={q}
              onClick={() => setSelectedQuarter(q)}
              className={`px-6 py-2 text-sm font-medium rounded-md transition-all ${selectedQuarter === q ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              Q{q}
            </button>
          ))}
        </div>
      </div>

      {!yearPlan ? (
        <Card className="border-destructive/50 bg-destructive/10">
          <CardContent className="pt-6">
            <p className="text-center font-medium text-destructive">
              Please set up your Annual Plan first.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-12">
          {/* Theme Card */}
          <Card className="md:col-span-12 lg:col-span-4 border-indigo-500/20 bg-indigo-500/5">
            <CardHeader>
              <CardTitle className="text-indigo-600">
                Q{selectedQuarter} Theme
              </CardTitle>
              <CardDescription>
                Focus for{" "}
                {format(
                  startOfQuarter(
                    setQuarter(new Date(currentYear, 0, 1), selectedQuarter),
                  ),
                  "MMM",
                )}{" "}
                -{" "}
                {format(
                  endOfQuarter(
                    setQuarter(new Date(currentYear, 0, 1), selectedQuarter),
                  ),
                  "MMM",
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-32 w-full" />
              ) : (
                <Form {...form}>
                  <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="space-y-4"
                  >
                    <FormField
                      control={form.control}
                      name="theme"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quarterly Theme</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. Operation Scale"
                              className="bg-background"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={upsertPlan.isPending}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                      {upsertPlan.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Q{selectedQuarter} Strategy
                    </Button>
                  </form>
                </Form>
              )}
            </CardContent>
          </Card>

          {/* Goals / Focuses */}
          <Card className="md:col-span-12 lg:col-span-8">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle>Quarterly Objectives</CardTitle>
                <CardDescription>
                  Select annual goals to focus on this quarter
                </CardDescription>
              </div>
              <Dialog
                open={isGoalDialogOpen}
                onOpenChange={setIsGoalDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button
                    size="sm"
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <Plus className="mr-2 h-4 w-4" /> Pick Annual Goal
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>
                      Select Annual Goal for Q{selectedQuarter}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2 mt-4">
                    {availableGoals?.length === 0 ? (
                      <div className="text-center py-4 text-muted-foreground">
                        No available annual goals found.
                      </div>
                    ) : (
                      availableGoals?.map((goal) => (
                        <div
                          key={goal.id}
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => onLinkGoal(goal.id)}
                        >
                          <div>
                            <p className="font-medium">{goal.title}</p>
                            <span className="text-xs text-muted-foreground capitalize">
                              {goal.category} • {goal.priority}
                            </span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="opacity-0 group-hover:opacity-100"
                          >
                            Select
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-24 w-full" />
                  <Skeleton className="h-24 w-full" />
                </div>
              ) : (
                <div className="space-y-4 pt-4">
                  {quarterPlan?.quarterFocuses?.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                      <p className="text-muted-foreground mb-2">
                        No goals selected for Q{selectedQuarter}.
                      </p>
                      <Button
                        variant="link"
                        onClick={() => setIsGoalDialogOpen(true)}
                      >
                        Select a goal to get started
                      </Button>
                    </div>
                  ) : (
                    quarterPlan?.quarterFocuses?.map((focus) => (
                      <div
                        key={focus.id}
                        className="p-4 border rounded-xl bg-card shadow-sm space-y-4"
                      >
                        {/* Header: Goal Info & Actions */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="text-[10px] uppercase tracking-wider"
                              >
                                {focus.goal.category}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                Annual Goal
                              </span>
                            </div>
                            <h4 className="font-bold text-lg">
                              {focus.goal.title}
                            </h4>
                          </div>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                            onClick={() =>
                              unlinkGoal.mutate({ quarterFocusId: focus.id })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Visual Progress */}
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-muted-foreground">
                              Quarterly Progress
                            </span>
                            <span className="font-bold">{focus.progress}%</span>
                          </div>
                          {/* Simple slider or progress bar - creating a custom interactive one here */}
                          <div
                            className="h-2 w-full bg-secondary rounded-full overflow-hidden relative cursor-pointer group"
                            onClick={(e) => {
                              // Simple click to set progress logic could go here, for now simpler UI
                              const rect =
                                e.currentTarget.getBoundingClientRect();
                              const x = e.clientX - rect.left;
                              const pct = Math.round((x / rect.width) * 100);
                              updateProgress.mutate({
                                type: "quarter",
                                focusId: focus.id,
                                progress: pct,
                              });
                            }}
                          >
                            <div
                              className="h-full bg-emerald-500 transition-all duration-300"
                              style={{ width: `${focus.progress}%` }}
                            />
                            <div className="absolute inset-0 bg-transparent group-hover:bg-white/10 transition-colors" />
                          </div>
                        </div>

                        {/* Milestones Preview */}
                        {focus.goal.milestones?.length > 0 && (
                          <div className="pt-2 border-t mt-2">
                            <p className="text-xs font-semibold text-muted-foreground mb-2">
                              KEY MILESTONES
                            </p>
                            <div className="space-y-1">
                              {focus.goal.milestones.slice(0, 3).map((m) => (
                                <div
                                  key={m.id}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <div
                                    className={`h-1.5 w-1.5 rounded-full ${m.completed ? "bg-emerald-500" : "bg-muted-foreground/30"}`}
                                  />
                                  <span
                                    className={
                                      m.completed
                                        ? "text-muted-foreground line-through"
                                        : ""
                                    }
                                  >
                                    {m.title}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
