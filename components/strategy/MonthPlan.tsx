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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const monthPlanSchema = z.object({
  theme: z.string().optional(),
  objectives: z.string().min(1, "At least one objective required"),
});

export function MonthPlan() {
  const today = new Date();
  // Allow switching months
  const [selectedMonth, setSelectedMonth] = useState(today.getMonth());
  const currentYear = today.getFullYear();
  const currentQuarter = Math.floor(selectedMonth / 3) + 1;
  const monthName = format(new Date(currentYear, selectedMonth), "MMMM");

  const [isFocusDialogOpen, setIsFocusDialogOpen] = useState(false);

  const utils = trpc.useUtils();

  const { data: monthPlan, isLoading: isLoadingMonth } =
    trpc.strategy.getMonthPlan.useQuery({
      year: currentYear,
      month: selectedMonth,
    });

  const { data: quarterPlan } = trpc.strategy.getQuarterPlan.useQuery({
    year: currentYear,
    quarter: currentQuarter,
  });

  const { data: quarterFocuses } = trpc.strategy.getQuarterFocuses.useQuery(
    { quarterPlanId: quarterPlan?.id || "" },
    { enabled: !!quarterPlan },
  );

  const { data: monthFocuses, isLoading: isLoadingFocuses } =
    trpc.strategy.getMonthFocuses.useQuery(
      { monthPlanId: monthPlan?.id || "" },
      { enabled: !!monthPlan },
    );

  const upsertPlan = trpc.strategy.upsertMonthPlan.useMutation({
    onSuccess: () => {
      toast.success("Month plan updated");
      utils.strategy.getMonthPlan.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const linkFocus = trpc.strategy.linkFocusToMonth.useMutation({
    onSuccess: () => {
      toast.success("Focus linked to month");
      setIsFocusDialogOpen(false);
      utils.strategy.getMonthFocuses.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateProgress = trpc.strategy.updateFocusProgress.useMutation({
    onSuccess: () => {
      toast.success("Progress updated");
      utils.strategy.getMonthFocuses.invalidate();
    },
  });

  const form = useForm<z.infer<typeof monthPlanSchema>>({
    resolver: zodResolver(monthPlanSchema),
    defaultValues: { theme: "", objectives: "" },
    values: monthPlan
      ? {
          theme: monthPlan.theme || "",
          objectives: monthPlan.objectives.join(", "),
        }
      : undefined,
  });

  function onSubmit(values: z.infer<typeof monthPlanSchema>) {
    if (!quarterPlan) {
      toast.error("Please set up your Quarterly Plan first!");
      return;
    }

    upsertPlan.mutate({
      quarterPlanId: quarterPlan.id,
      month: selectedMonth,
      year: currentYear,
      theme: values.theme,
      objectives: values.objectives
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    });
  }

  function onLinkFocus(quarterFocusId: string) {
    if (!monthPlan) {
      toast.error("Please save the month theme first");
      return;
    }
    linkFocus.mutate({
      monthPlanId: monthPlan.id,
      quarterFocusId,
      priority: 1,
    });
  }

  // Filter available focuses (not already linked)
  const availableFocuses = quarterFocuses?.filter(
    (qf) => !monthFocuses?.some((mf) => mf.quarterFocusId === qf.id),
  );

  return (
    <div className="space-y-6">
      {/* Month Selector */}
      <div className="flex bg-muted rounded-lg p-1 w-full overflow-x-auto">
        {Array.from({ length: 12 }).map((_, i) => (
          <button
            key={i}
            onClick={() => setSelectedMonth(i)}
            className={`flex-1 min-w-[60px] px-2 py-2 text-xs font-medium rounded-md transition-all ${
              selectedMonth === i
                ? "bg-background shadow-sm text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {format(new Date(currentYear, i), "MMM")}
          </button>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-12">
        {/* Theme & Objectives Card */}
        <Card className="md:col-span-12 lg:col-span-4 border-sky-500/20 bg-sky-500/5">
          <CardHeader>
            <CardTitle className="text-sky-600">{monthName} Theme</CardTitle>
            <CardDescription>Sprint focus for {monthName}</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingMonth ? (
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
                        <FormLabel>Monthly Theme</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g. Health Sprint"
                            className="bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="objectives"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Key Outcomes (Simple List)</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Launch v1, Run 50km..."
                            className="bg-background"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription className="text-xs">
                          Quick ad-hoc goals for the month.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button
                    type="submit"
                    disabled={upsertPlan.isPending}
                    className="w-full bg-sky-600 hover:bg-sky-700 text-white"
                  >
                    {upsertPlan.isPending && (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    )}
                    Save {monthName} Plan
                  </Button>
                </form>
              </Form>
            )}
          </CardContent>
        </Card>

        {/* Focus Inheritance Area */}
        <Card className="md:col-span-12 lg:col-span-8">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div>
              <CardTitle>Monthly Priorities</CardTitle>
              <CardDescription>
                Aligned with Q{currentQuarter} Strategy
              </CardDescription>
            </div>

            <Dialog
              open={isFocusDialogOpen}
              onOpenChange={setIsFocusDialogOpen}
            >
              <DialogTrigger asChild>
                <Button
                  size="sm"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white"
                >
                  <Loader2
                    className={`mr-2 h-4 w-4 animate-spin ${!quarterPlan ? "block" : "hidden"}`}
                  />
                  Link Quarter Focus
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Select Q{currentQuarter} Focus</DialogTitle>
                </DialogHeader>
                <div className="space-y-2 mt-4">
                  {availableFocuses?.length === 0 ? (
                    <div className="text-center py-4 text-muted-foreground">
                      No available quarter focuses found.
                      <br />
                      <span className="text-xs">
                        Make sure you have added focuses to your Quarter Plan.
                      </span>
                    </div>
                  ) : (
                    availableFocuses?.map((qf) => (
                      <div
                        key={qf.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => onLinkFocus(qf.id)}
                      >
                        <div>
                          <p className="font-medium">{qf.goal.title}</p>
                          <div className="flex gap-2 text-xs text-muted-foreground">
                            <span>Priority: {qf.priority}</span>
                            <span>Progress: {qf.progress}%</span>
                          </div>
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
            {isLoadingFocuses ? (
              <div className="space-y-2">
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </div>
            ) : (
              <div className="space-y-4 pt-4">
                {monthFocuses?.length === 0 ? (
                  <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
                    <p className="text-muted-foreground mb-2">
                      No priorities linked for {monthName}.
                    </p>
                    <Button
                      variant="link"
                      onClick={() => setIsFocusDialogOpen(true)}
                    >
                      Link a Quarter Focus to get started
                    </Button>
                  </div>
                ) : (
                  monthFocuses?.map((mf) => (
                    <div
                      key={mf.id}
                      className="p-4 border rounded-xl bg-card shadow-sm space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="secondary"
                              className="text-[10px] uppercase"
                            >
                              From Q{currentQuarter}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              {mf.quarterFocus.goal.title}
                            </span>
                          </div>
                          {/* We don't have a separate title for MonthFocus yet, it just links. Use parent goal title for now or allow custom notes?
                                    Currently schema has 'notes'. Let's use the parent goal title as the main header.
                                */}
                          <h4 className="font-bold text-base">
                            {mf.quarterFocus.goal.title}
                          </h4>
                        </div>
                      </div>
                      {/* Visual Progress */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-muted-foreground">
                            Monthly Progress
                          </span>
                          <span className="font-bold text-sky-600">
                            {mf.progress}%
                          </span>
                        </div>
                        <div
                          className="h-2 w-full bg-secondary rounded-full overflow-hidden relative cursor-pointer group"
                          onClick={(e) => {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const x = e.clientX - rect.left;
                            const pct = Math.round((x / rect.width) * 100);
                            updateProgress.mutate({
                              type: "month",
                              focusId: mf.id,
                              progress: pct,
                            });
                          }}
                        >
                          <div
                            className="h-full bg-sky-500 transition-all duration-300"
                            style={{ width: `${mf.progress}%` }}
                          />
                          <div className="absolute inset-0 bg-transparent group-hover:bg-white/10 transition-colors" />
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
