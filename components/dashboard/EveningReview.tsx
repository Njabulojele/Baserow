"use client";

import { trpc } from "@/lib/trpc/client";
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
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, Moon, Sparkles, Target, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export function EveningReview({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [step, setStep] = useState(1);
  const [wins, setWins] = useState("");
  const [improvements, setImprovements] = useState("");
  const [mood, setMood] = useState<number | null>(null);
  const [tomorrowFocus, setTomorrowFocus] = useState(["", "", ""]);

  const utils = trpc.useUtils();
  const today = new Date();

  // Fetch today's completed tasks for context
  const { data: todayStats } = trpc.analytics.getDashboardStats.useQuery();

  const mutation = trpc.strategy.submitEveningReview.useMutation({
    onSuccess: () => {
      toast.success("Good night! Review saved.");
      utils.strategy.getDayFocuses.invalidate(); // If we display this history somewhere
      onOpenChange(false);
      setStep(1);
      setWins("");
      setImprovements("");
      setMood(null);
      setTomorrowFocus(["", "", ""]);
    },
  });

  const handleSubmit = () => {
    mutation.mutate({
      wins: wins ? [wins] : [], // Simple single-line for now or split by newline
      improvements: improvements ? [improvements] : [],
      moodScore: mood || 5, // Default mid
      tomorrowPriorities: tomorrowFocus.filter(Boolean),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-950 text-white border-slate-800">
        <DialogHeader>
          <div className="flex items-center gap-2 text-indigo-400 mb-2">
            <Moon className="size-5" />
            <span className="text-sm font-medium uppercase tracking-wider">
              Evening Review
            </span>
          </div>
          <DialogTitle className="text-2xl font-light">
            {step === 1 && "Prepare for Rest"}
            {step === 2 && "Reflect on Today"}
            {step === 3 && "Plan for Tomorrow"}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {step === 1 &&
              "Take a moment to close your loops and clear your mind."}
            {step === 2 && "Celebrate your wins and learn from the challenges."}
            {step === 3 && "Set your intention for tomorrow to start fast."}
          </DialogDescription>
        </DialogHeader>

        <div className="py-6 min-h-[300px]">
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-slate-400 text-sm mb-1 uppercase tracking-wide">
                    Tasks Completed
                  </h4>
                  <p className="text-4xl font-thin text-white">
                    {todayStats?.completedToday || 0}
                  </p>
                </div>
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-800">
                  <h4 className="text-slate-400 text-sm mb-1 uppercase tracking-wide">
                    Hours Focused
                  </h4>
                  <p className="text-4xl font-thin text-white">
                    {todayStats?.hoursThisWeek || 0}h
                  </p>
                  {/* Note: ideally we show today's hours specifically if available */}
                </div>
              </div>

              <div className="bg-indigo-950/30 p-4 rounded-lg border border-indigo-500/20">
                <div className="flex items-start gap-4">
                  <Sparkles className="size-5 text-indigo-400 shrink-0 mt-1" />
                  <div>
                    <h4 className="font-medium text-indigo-200">
                      Daily Close-out Ritual
                    </h4>
                    <ul className="mt-2 space-y-2 text-sm text-slate-300">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3 text-slate-500" /> Close
                        all tabs and apps
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3 text-slate-500" /> Clear
                        your physical desktop
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-3 text-slate-500" />{" "}
                        Review tomorrow's first meeting
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-2">
                <Label className="text-slate-300">
                  What went well today? (Wins)
                </Label>
                <Textarea
                  placeholder="I finally shipped the..."
                  className="bg-slate-900 border-slate-800 text-slate-200 min-h-[100px] focus-visible:ring-indigo-500"
                  value={wins}
                  onChange={(e) => setWins(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label className="text-slate-300">
                  What could be improved? (Lessons)
                </Label>
                <Textarea
                  placeholder="I got distracted by..."
                  className="bg-slate-900 border-slate-800 text-slate-200 min-h-[80px] focus-visible:ring-indigo-500"
                  value={improvements}
                  onChange={(e) => setImprovements(e.target.value)}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <Label className="text-slate-300">
                  Top 3 Priorities for Tomorrow
                </Label>
                {tomorrowFocus.map((focus, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="size-6 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-400 font-mono">
                      {i + 1}
                    </div>
                    <Input
                      placeholder={
                        i === 0
                          ? "The most important thing..."
                          : "Next priority..."
                      }
                      className={cn(
                        "bg-slate-900 border-slate-800 text-slate-200 focus-visible:ring-indigo-500",
                        i === 0 && "border-indigo-500/50",
                      )}
                      value={focus}
                      onChange={(e) => {
                        const newFocus = [...tomorrowFocus];
                        newFocus[i] = e.target.value;
                        setTomorrowFocus(newFocus);
                      }}
                    />
                  </div>
                ))}
              </div>

              <div className="bg-emerald-950/30 p-4 rounded-lg border border-emerald-500/20 mt-4">
                <p className="text-sm text-emerald-200 flex items-center gap-2">
                  <Target className="size-4" />
                  Defining your priorities now increases changes of success by
                  3x.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between items-center border-t border-slate-800 pt-4">
          <Button
            variant="ghost"
            className="text-slate-400 hover:text-white"
            onClick={() => {
              if (step > 1) setStep(step - 1);
              else onOpenChange(false);
            }}
          >
            {step === 1 ? "Skip" : "Back"}
          </Button>

          <Button
            className="bg-indigo-600 hover:bg-indigo-700 text-white"
            onClick={() => {
              if (step < 3) setStep(step + 1);
              else handleSubmit();
            }}
            disabled={mutation.isPending}
          >
            {step === 3 ? (
              mutation.isPending ? (
                "Saving..."
              ) : (
                "Complete Review"
              )
            ) : (
              <span className="flex items-center gap-2">
                Next <ArrowRight className="size-4" />
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
