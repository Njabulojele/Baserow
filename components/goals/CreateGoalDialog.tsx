"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useGoalStore, DayOfWeek, GoalFrequency, GoalMode, Goal } from "@/lib/goalStore";
import { trpc } from "@/lib/trpc/client";
import { Target, Clock, Calendar, Sparkles, Check, Edit3 } from "lucide-react";
import { toast } from "sonner";

interface CreateGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editGoal?: Goal | null;
}

const ALL_DAYS: { key: DayOfWeek; label: string }[] = [
  { key: "mon", label: "M" },
  { key: "tue", label: "T" },
  { key: "wed", label: "W" },
  { key: "thu", label: "T" },
  { key: "fri", label: "F" },
  { key: "sat", label: "S" },
  { key: "sun", label: "S" },
];

const PILLARS = [
  "Deep Work",
  "Revenue & Sales",
  "Health & Energy",
  "Learning & Growth",
  "System Operations",
];

export function CreateGoalDialog({ open, onOpenChange, editGoal }: CreateGoalDialogProps) {
  const utils = trpc.useUtils();
  const addGoalLocal = useGoalStore((s) => s.addGoal);
  const updateGoalLocal = useGoalStore((s) => s.updateGoal);

  const createGoalMutation = trpc.goals.create.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
    },
  });

  const updateGoalMutation = trpc.goals.update.useMutation({
    onSuccess: () => {
      utils.goals.list.invalidate();
    },
  });

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [pillar, setPillar] = useState("Deep Work");
  const [frequency, setFrequency] = useState<GoalFrequency>("daily");
  const [scheduledDays, setScheduledDays] = useState<DayOfWeek[]>([
    "mon", "tue", "wed", "thu", "fri", "sat", "sun",
  ]);
  const [targetMinutes, setTargetMinutes] = useState(60);
  const [mode, setMode] = useState<GoalMode>("standard");
  const [pomodoroWorkMinutes, setPomodoroWorkMinutes] = useState(25);
  const [pomodoroBreakMinutes, setPomodoroBreakMinutes] = useState(5);
  const [autoStartBreaks, setAutoStartBreaks] = useState(true);

  useEffect(() => {
    if (editGoal) {
      setTitle(editGoal.title || "");
      setDescription(editGoal.description || "");
      setPillar(editGoal.pillar || "Deep Work");
      setFrequency(editGoal.frequency || "daily");
      setScheduledDays(
        Array.isArray(editGoal.scheduledDays) && editGoal.scheduledDays.length > 0
          ? editGoal.scheduledDays
          : ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
      );
      setTargetMinutes(editGoal.targetMinutes || 60);
      setMode(editGoal.mode || "standard");
      setPomodoroWorkMinutes(editGoal.pomodoroWorkMinutes || 25);
      setPomodoroBreakMinutes(editGoal.pomodoroBreakMinutes || 5);
      setAutoStartBreaks(editGoal.autoStartBreaks ?? true);
    } else {
      setTitle("");
      setDescription("");
      setPillar("Deep Work");
      setFrequency("daily");
      setScheduledDays(["mon", "tue", "wed", "thu", "fri", "sat", "sun"]);
      setTargetMinutes(60);
      setMode("standard");
      setPomodoroWorkMinutes(25);
      setPomodoroBreakMinutes(5);
      setAutoStartBreaks(true);
    }
  }, [editGoal, open]);

  const toggleDay = (dayKey: DayOfWeek) => {
    if (scheduledDays.includes(dayKey)) {
      if (scheduledDays.length > 1) {
        setScheduledDays(scheduledDays.filter((d) => d !== dayKey));
      }
    } else {
      setScheduledDays([...scheduledDays, dayKey]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Please enter a goal title");
      return;
    }

    const payload = {
      title: title.trim(),
      description: description.trim(),
      pillar,
      frequency,
      scheduledDays: frequency === "daily" ? ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] : scheduledDays,
      targetMinutes: Number(targetMinutes) || 60,
      mode,
      pomodoroWorkMinutes: Number(pomodoroWorkMinutes) || 25,
      pomodoroBreakMinutes: Number(pomodoroBreakMinutes) || 5,
      autoStartBreaks,
    };

    if (editGoal) {
      updateGoalLocal(editGoal.id, payload as any);
      updateGoalMutation.mutate({ id: editGoal.id, ...payload } as any);
      toast.success("Goal updated & synced to database ⚡");
    } else {
      addGoalLocal(payload);
      createGoalMutation.mutate(payload as any);
      toast.success("New goal created & synced to database!");
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-background border-white/10 p-6 space-y-5">
        <DialogHeader>
          <DialogTitle className="text-xl font-extrabold flex items-center gap-2">
            {editGoal ? (
              <>
                <Edit3 className="w-5 h-5 text-amber-500" />
                Edit Goal Configuration
              </>
            ) : (
              <>
                <Target className="w-5 h-5 text-amber-500" />
                Create New Goal
              </>
            )}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            {editGoal
              ? `Update settings and execution parameters for "${editGoal.title}".`
              : "Configure goal schedules, target duration, execution timers, and streak targets."}
          </DialogDescription>
        </DialogHeader>

        {editGoal && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold font-mono text-amber-400 uppercase tracking-wider">
                Active Goal Options
              </span>
              <span className="text-xs font-mono font-bold text-amber-400">
                Current Streak: {editGoal.streak || 0} Days 🔥
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
              <span className="px-2.5 py-0.5 rounded-full bg-secondary text-foreground font-bold">
                {pillar}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {frequency === "daily" ? "Daily Recurring" : `${scheduledDays.length} Days/Wk`}
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary text-muted-foreground">
                {targetMinutes} mins
              </span>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300">
                {mode === "pomodoro" ? `Pomodoro (${pomodoroWorkMinutes}m)` : "Standard Timer"}
              </span>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* TITLE & PILLAR */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Goal Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Code Core Features, 10 Client Emails, Workout"
              className="bg-secondary/50 border-white/10 text-sm"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Description (Optional)</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Why this goal matters and what success looks like"
              className="bg-secondary/50 border-white/10 text-xs"
            />
          </div>

          {/* PILLAR SELECTION */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Category / Pillar</Label>
            <div className="flex flex-wrap gap-1.5">
              {PILLARS.map((p) => (
                <button
                  type="button"
                  key={p}
                  onClick={() => setPillar(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-mono transition-all ${
                    pillar === p
                      ? "bg-amber-500 text-black font-bold shadow-md shadow-amber-500/20"
                      : "bg-secondary text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* FREQUENCY & SCHEDULED DAYS */}
          <div className="space-y-2 border-t border-white/10 pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-amber-400" />
                Frequency & Schedule
              </Label>
              <div className="flex gap-1 bg-secondary/80 p-0.5 rounded-lg text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setFrequency("daily")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    frequency === "daily" ? "bg-amber-500 text-black font-bold" : "text-muted-foreground"
                  }`}
                >
                  Daily
                </button>
                <button
                  type="button"
                  onClick={() => setFrequency("specific_days")}
                  className={`px-2.5 py-1 rounded-md transition-all ${
                    frequency === "specific_days" ? "bg-amber-500 text-black font-bold" : "text-muted-foreground"
                  }`}
                >
                  Custom Days
                </button>
              </div>
            </div>

            {frequency === "specific_days" && (
              <div className="flex items-center justify-between gap-1 pt-1">
                {ALL_DAYS.map((d) => {
                  const isSelected = scheduledDays.includes(d.key);
                  return (
                    <button
                      type="button"
                      key={d.key}
                      onClick={() => toggleDay(d.key)}
                      className={`w-9 h-9 rounded-xl font-mono text-xs font-bold transition-all flex items-center justify-center border ${
                        isSelected
                          ? "bg-amber-500 border-amber-400 text-black shadow-lg shadow-amber-500/20"
                          : "bg-secondary/40 border-white/5 text-muted-foreground hover:border-white/20"
                      }`}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* TIMER EXECUTION MODE */}
          <div className="space-y-2 border-t border-white/10 pt-3">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Execution Mode & Duration
            </Label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMode("standard")}
                className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                  mode === "standard"
                    ? "bg-emerald-500/10 border-emerald-500 text-emerald-400 font-bold"
                    : "bg-secondary/30 border-white/5 text-muted-foreground"
                }`}
              >
                <div className="text-xs font-bold">Standard Countdown</div>
                <div className="text-[10px] text-muted-foreground font-mono">Continuous timer</div>
              </button>

              <button
                type="button"
                onClick={() => setMode("pomodoro")}
                className={`p-3 rounded-xl border text-left transition-all space-y-1 ${
                  mode === "pomodoro"
                    ? "bg-amber-500/10 border-amber-500 text-amber-400 font-bold"
                    : "bg-secondary/30 border-white/5 text-muted-foreground"
                }`}
              >
                <div className="text-xs font-bold">Pomodoro Sprint</div>
                <div className="text-[10px] text-muted-foreground font-mono">Work & Break cycles</div>
              </button>
            </div>

            <div className="pt-2 grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px] text-muted-foreground">Target Session (mins)</Label>
                <Input
                  type="number"
                  min={1}
                  max={480}
                  value={targetMinutes}
                  onChange={(e) => setTargetMinutes(Number(e.target.value))}
                  className="bg-secondary/50 border-white/10 text-xs font-mono"
                />
              </div>

              {mode === "pomodoro" && (
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Sprint Work (mins)</Label>
                  <Input
                    type="number"
                    min={1}
                    max={120}
                    value={pomodoroWorkMinutes}
                    onChange={(e) => setPomodoroWorkMinutes(Number(e.target.value))}
                    className="bg-secondary/50 border-white/10 text-xs font-mono"
                  />
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs font-mono"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-400 text-black font-bold text-xs font-mono px-6 gap-1.5 shadow-lg shadow-amber-500/20"
            >
              {editGoal ? <Check className="w-3.5 h-3.5" /> : <Sparkles className="w-3.5 h-3.5" />}
              {editGoal ? "Update Goal Configuration" : "Create Goal"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
