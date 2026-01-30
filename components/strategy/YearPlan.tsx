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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Loader2,
  Plus,
  Target,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Circle,
  Flag,
  Milestone as MilestoneIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

const yearPlanSchema = z.object({
  theme: z.string().min(1, "Theme is required"),
  vision: z.string().min(1, "Vision is required"),
  focusAreas: z.string().min(1, "Focus areas required"),
});

const goalSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  priority: z.enum(["critical", "high", "medium", "low"]),
  targetDate: z.string().optional(),
  strategies: z.string().optional(),
  kpis: z.string().optional(),
  risks: z.string().optional(),
  milestones: z.string().optional(),
});

const priorityColors = {
  critical: "bg-red-500/10 text-red-600 border-red-500/20",
  high: "bg-orange-500/10 text-orange-600 border-orange-500/20",
  medium: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  low: "bg-blue-500/10 text-blue-600 border-blue-500/20",
};

const statusColors = {
  not_started: "text-muted-foreground",
  in_progress: "text-blue-500",
  completed: "text-green-500",
  cancelled: "text-red-500",
};

export function YearPlan() {
  const currentYear = new Date().getFullYear();
  const [isGoalDialogOpen, setIsGoalDialogOpen] = useState(false);
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());

  const utils = trpc.useUtils();

  const { data: yearPlan, isLoading } = trpc.strategy.getYearPlan.useQuery({
    year: currentYear,
  });

  const upsertPlan = trpc.strategy.upsertYearPlan.useMutation({
    onSuccess: () => {
      toast.success("Annual plan updated");
      utils.strategy.getYearPlan.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const addGoal = trpc.strategy.createGoal.useMutation({
    onSuccess: () => {
      toast.success("Goal added with milestones");
      setIsGoalDialogOpen(false);
      goalForm.reset();
      utils.strategy.getYearPlan.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateGoal = trpc.strategy.updateGoal.useMutation({
    onSuccess: () => {
      toast.success("Goal updated");
      utils.strategy.getYearPlan.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteGoal = trpc.strategy.deleteGoal.useMutation({
    onSuccess: () => {
      toast.success("Goal deleted");
      utils.strategy.getYearPlan.invalidate();
    },
  });

  const updateMilestone = trpc.strategy.updateMilestone.useMutation({
    onSuccess: () => {
      utils.strategy.getYearPlan.invalidate();
    },
  });

  const form = useForm<z.infer<typeof yearPlanSchema>>({
    resolver: zodResolver(yearPlanSchema),
    defaultValues: {
      theme: "",
      vision: "",
      focusAreas: "",
    },
    values: yearPlan
      ? {
          theme: yearPlan.theme,
          vision: yearPlan.vision,
          focusAreas: yearPlan.focusAreas.join(", "),
        }
      : undefined,
  });

  const goalForm = useForm<z.infer<typeof goalSchema>>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "career",
      priority: "medium",
      targetDate: "",
      strategies: "",
      kpis: "",
      risks: "",
      milestones: "",
    },
  });

  function onSubmit(values: z.infer<typeof yearPlanSchema>) {
    upsertPlan.mutate({
      year: currentYear,
      theme: values.theme,
      vision: values.vision,
      focusAreas: values.focusAreas
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  function onGoalSubmit(values: z.infer<typeof goalSchema>) {
    if (!yearPlan) {
      toast.error("Please save the year plan first");
      return;
    }

    const milestones = values.milestones
      ?.split("\n")
      .map((m) => m.trim())
      .filter(Boolean)
      .map((title) => ({ title }));

    addGoal.mutate({
      yearPlanId: yearPlan.id,
      title: values.title,
      description: values.description,
      category: values.category,
      priority: values.priority,
      targetDate: values.targetDate ? new Date(values.targetDate) : undefined,
      strategies: values.strategies
        ?.split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
      kpis: values.kpis
        ?.split("\n")
        .map((k) => k.trim())
        .filter(Boolean),
      risks: values.risks
        ?.split("\n")
        .map((r) => r.trim())
        .filter(Boolean),
      milestones,
    });
  }

  function toggleGoalExpanded(goalId: string) {
    setExpandedGoals((prev) => {
      const next = new Set(prev);
      if (next.has(goalId)) {
        next.delete(goalId);
      } else {
        next.add(goalId);
      }
      return next;
    });
  }

  function handleProgressChange(goalId: string, newProgress: number) {
    updateGoal.mutate({
      id: goalId,
      data: {
        progress: newProgress,
        status:
          newProgress >= 100
            ? "completed"
            : newProgress > 0
              ? "in_progress"
              : "not_started",
      },
    });
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Vision & Theme Card */}
        <Card>
          <CardHeader>
            <CardTitle>Vision & Theme</CardTitle>
            <CardDescription>
              Define your guiding star for {currentYear}
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      <FormLabel>The "Theme" of the Year</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. The Year of Implementation"
                          {...field}
                        />
                      </FormControl>
                      <FormDescription>
                        A short phrase to summarize your intent.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="vision"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Vision Statement</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe what a successful year looks like in detail..."
                          className="min-h-[120px]"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="focusAreas"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Focus Areas</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Health, Business Growth, Family (comma separated)"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={upsertPlan.isPending}>
                  {upsertPlan.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Plan
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Quick Stats */}
        {yearPlan && (
          <div className="grid gap-4 md:grid-cols-2">
            <Card className="bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-full">
                    <Target className="h-6 w-6 text-indigo-700 dark:text-indigo-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-indigo-900 dark:text-indigo-100">
                      {yearPlan.goals.length}
                    </p>
                    <p className="text-sm font-medium text-indigo-600 dark:text-indigo-300">
                      Total Goals
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50/50 dark:bg-green-950/20 border-green-100 dark:border-green-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-full">
                    <CheckCircle2 className="h-6 w-6 text-green-700 dark:text-green-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-900 dark:text-green-100">
                      {
                        yearPlan.goals.filter(
                          (g: any) => g.status === "completed",
                        ).length
                      }
                    </p>
                    <p className="text-sm font-medium text-green-600 dark:text-green-300">
                      Completed
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50/50 dark:bg-amber-950/20 border-amber-100 dark:border-amber-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-amber-100 dark:bg-amber-900/50 rounded-full">
                    <TrendingUp className="h-6 w-6 text-amber-700 dark:text-amber-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-amber-900 dark:text-amber-100">
                      {
                        yearPlan.goals.filter(
                          (g: any) => g.status === "in_progress",
                        ).length
                      }
                    </p>
                    <p className="text-sm font-medium text-amber-600 dark:text-amber-300">
                      In Progress
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-red-50/50 dark:bg-red-950/20 border-red-100 dark:border-red-900">
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-100 dark:bg-red-900/50 rounded-full">
                    <Flag className="h-6 w-6 text-red-700 dark:text-red-300" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-red-900 dark:text-red-100">
                      {
                        yearPlan.goals.filter(
                          (g: any) => g.priority === "critical",
                        ).length
                      }
                    </p>
                    <p className="text-sm font-medium text-red-600 dark:text-red-300">
                      Critical Priority
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Goals Section */}
      {yearPlan && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Annual Goals</CardTitle>
              <CardDescription>
                Major objectives to achieve your vision • Click to expand
              </CardDescription>
            </div>
            <Dialog open={isGoalDialogOpen} onOpenChange={setIsGoalDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" /> Add Goal
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add Annual Goal</DialogTitle>
                </DialogHeader>
                <Form {...goalForm}>
                  <form
                    onSubmit={goalForm.handleSubmit(onGoalSubmit)}
                    className="space-y-4"
                  >
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={goalForm.control}
                        name="title"
                        render={({ field }) => (
                          <FormItem className="md:col-span-2">
                            <FormLabel>Goal Title</FormLabel>
                            <FormControl>
                              <Input placeholder="Launch MVP" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={goalForm.control}
                        name="category"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select category" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="career">
                                  Career & Business
                                </SelectItem>
                                <SelectItem value="health">
                                  Health & Fitness
                                </SelectItem>
                                <SelectItem value="wealth">
                                  Wealth & Finance
                                </SelectItem>
                                <SelectItem value="relationships">
                                  Relationships
                                </SelectItem>
                                <SelectItem value="growth">
                                  Personal Growth
                                </SelectItem>
                                <SelectItem value="client">
                                  Client Project
                                </SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={goalForm.control}
                        name="priority"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Priority</FormLabel>
                            <Select
                              onValueChange={field.onChange}
                              defaultValue={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select priority" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="critical">
                                  🔴 Critical
                                </SelectItem>
                                <SelectItem value="high">🟠 High</SelectItem>
                                <SelectItem value="medium">
                                  🟡 Medium
                                </SelectItem>
                                <SelectItem value="low">🔵 Low</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={goalForm.control}
                        name="targetDate"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Target Date</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={goalForm.control}
                      name="description"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe your goal in detail..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={goalForm.control}
                      name="strategies"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strategies (one per line)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Research competitors&#10;Build MVP in Q1&#10;Launch marketing campaign"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            How will you achieve this goal?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={goalForm.control}
                      name="kpis"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>KPIs (one per line)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="1000 signups&#10;$50k revenue&#10;90% retention"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            How will you measure success?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={goalForm.control}
                      name="risks"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Risks (one per line)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Limited budget&#10;Technical complexity&#10;Market uncertainty"
                              className="min-h-[60px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            What could go wrong?
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={goalForm.control}
                      name="milestones"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Milestones (one per line)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Complete market research&#10;Finish prototype&#10;Beta launch"
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Key checkpoints along the way
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button
                      type="submit"
                      disabled={addGoal.isPending}
                      className="w-full"
                    >
                      {addGoal.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Add Goal
                    </Button>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {yearPlan.goals.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Target className="mx-auto h-8 w-8 text-muted-foreground opacity-50 mb-2" />
                  <p className="text-muted-foreground">No goals defined yet.</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add your first goal to get started!
                  </p>
                </div>
              ) : (
                yearPlan.goals.map((goal: any) => (
                  <Collapsible
                    key={goal.id}
                    open={expandedGoals.has(goal.id)}
                    onOpenChange={() => toggleGoalExpanded(goal.id)}
                  >
                    <div className="border rounded-lg overflow-hidden">
                      <CollapsibleTrigger asChild>
                        <div className="flex items-start justify-between p-4 cursor-pointer hover:bg-muted/50 transition-colors">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-semibold">
                                {goal.title}
                              </span>
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-[10px]",
                                  priorityColors[
                                    goal.priority as keyof typeof priorityColors
                                  ],
                                )}
                              >
                                {goal.priority}
                              </Badge>
                              <Badge
                                variant="secondary"
                                className="text-[10px]"
                              >
                                {goal.category}
                              </Badge>
                              {goal.quarterFocuses?.length > 0 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] bg-green-50 text-green-700 border-green-200"
                                >
                                  Q
                                  {goal.quarterFocuses[0]?.quarterPlan?.quarter}{" "}
                                  Focus
                                </Badge>
                              )}
                            </div>
                            <div className="flex items-center gap-4">
                              <div className="flex-1 max-w-[200px]">
                                <Progress
                                  value={goal.progress || 0}
                                  className="h-2"
                                />
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {goal.progress || 0}%
                              </span>
                              {goal.targetDate && (
                                <span className="text-xs text-muted-foreground flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(
                                    goal.targetDate,
                                  ).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive opacity-50 hover:opacity-100"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteGoal.mutate({ id: goal.id });
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            {expandedGoals.has(goal.id) ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <div className="p-4 pt-0 border-t bg-muted/20 space-y-4">
                          {goal.description && (
                            <div>
                              <h4 className="text-sm font-medium mb-1">
                                Description
                              </h4>
                              <p className="text-sm text-muted-foreground">
                                {goal.description}
                              </p>
                            </div>
                          )}

                          {/* Progress Slider */}
                          <div>
                            <h4 className="text-sm font-medium mb-2">
                              Progress
                            </h4>
                            <div className="flex items-center gap-4">
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={goal.progress || 0}
                                onChange={(e) =>
                                  handleProgressChange(
                                    goal.id,
                                    parseInt(e.target.value),
                                  )
                                }
                                className="flex-1 accent-primary"
                              />
                              <span className="text-sm font-medium w-12">
                                {goal.progress || 0}%
                              </span>
                            </div>
                          </div>

                          {/* Strategies */}
                          {goal.strategies?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <TrendingUp className="h-4 w-4 text-blue-500" />
                                Strategies
                              </h4>
                              <ul className="space-y-1">
                                {goal.strategies.map((s: string, i: number) => (
                                  <li
                                    key={i}
                                    className="text-sm text-muted-foreground pl-4 border-l-2 border-blue-500/30"
                                  >
                                    {s}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* KPIs */}
                          {goal.kpis?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <Target className="h-4 w-4 text-green-500" />
                                Key Performance Indicators
                              </h4>
                              <ul className="space-y-1">
                                {goal.kpis.map((k: string, i: number) => (
                                  <li
                                    key={i}
                                    className="text-sm text-muted-foreground pl-4 border-l-2 border-green-500/30"
                                  >
                                    {k}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Risks */}
                          {goal.risks?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <AlertTriangle className="h-4 w-4 text-amber-500" />
                                Risks
                              </h4>
                              <ul className="space-y-1">
                                {goal.risks.map((r: string, i: number) => (
                                  <li
                                    key={i}
                                    className="text-sm text-muted-foreground pl-4 border-l-2 border-amber-500/30"
                                  >
                                    {r}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Milestones */}
                          {goal.milestones?.length > 0 && (
                            <div>
                              <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                                <MilestoneIcon className="h-4 w-4 text-purple-500" />
                                Milestones
                              </h4>
                              <ul className="space-y-2">
                                {goal.milestones.map((m: any) => (
                                  <li
                                    key={m.id}
                                    className="flex items-center gap-2 text-sm cursor-pointer"
                                    onClick={() =>
                                      updateMilestone.mutate({
                                        id: m.id,
                                        completed: !m.completed,
                                      })
                                    }
                                  >
                                    {m.completed ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-muted-foreground" />
                                    )}
                                    <span
                                      className={cn(
                                        m.completed &&
                                          "line-through text-muted-foreground",
                                      )}
                                    >
                                      {m.title}
                                    </span>
                                    {m.targetDate && (
                                      <span className="text-xs text-muted-foreground ml-auto">
                                        {new Date(
                                          m.targetDate,
                                        ).toLocaleDateString()}
                                      </span>
                                    )}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!yearPlan && (
        <Card className="bg-muted/20 border-dashed flex items-center justify-center p-8">
          <div className="text-center text-muted-foreground">
            <Target className="mx-auto h-12 w-12 opacity-50 mb-4" />
            <p className="font-medium">No Year Plan Yet</p>
            <p className="text-sm mt-1">
              Save your vision above to start adding goals.
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}
