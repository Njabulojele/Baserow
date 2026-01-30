"use client";

import { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function DailyReviewForm() {
  const utils = trpc.useUtils();
  const router = useRouter();

  // 1. Fetch existing entry if it exists
  const { data: existingEntry, isLoading } =
    trpc.wellbeing.getTodayEntry.useQuery();

  const [energy, setEnergy] = useState(7);
  const [mood, setMood] = useState(7);
  const [focus, setFocus] = useState(7);
  const [reflection, setReflection] = useState("");
  const [win, setWin] = useState("");

  // 2. Populate form when data arrives
  useEffect(() => {
    if (existingEntry) {
      setEnergy(existingEntry.morningEnergy || 7);
      setMood(existingEntry.mood || 7);
      setFocus(existingEntry.focusQuality || 7);
      setReflection(existingEntry.notes || "");
      setWin(existingEntry.dailyWin || "");
    }
  }, [existingEntry]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    wellbeing.mutate({
      morningEnergy: energy,
      mood: mood,
      focusQuality: focus,
      notes: reflection,
      dailyWin: win,
    });
  };

  const wellbeing = trpc.wellbeing.createEntry.useMutation({
    onSuccess: async () => {
      toast.success("Daily review saved!");

      // Force immediate invalidation of all related queries and wait
      await Promise.all([
        utils.wellbeing.getTodayEntry.invalidate(),
        utils.wellbeing.getEnergyStats.invalidate(),
        utils.planning.getDayPlan.invalidate(),
        utils.analytics.getDashboardStats.invalidate(),
      ]);

      // Move the user to the Day Navigation to see the result
      router.push("/planning/day");
    },
    onError: (err) => {
      toast.error("Failed to save review: " + err.message);
    },
  });

  if (isLoading)
    return (
      <div className="flex items-center justify-center p-12">
        <div className="text-muted-foreground animate-pulse font-medium">
          Loading your daily review...
        </div>
      </div>
    );

  return (
    <Card className="bg-card/40 border-primary/20">
      <CardHeader>
        <CardTitle>Daily Evening Reflection</CardTitle>
        <CardDescription>
          Close the day with intention and awareness.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-4">
              <Label className="flex justify-between">
                <span>Energy Level</span>
                <span className="font-bold text-yellow-500">{energy}</span>
              </Label>
              <Slider
                value={[energy]}
                onValueChange={([val]) => setEnergy(val)}
                max={10}
                step={1}
              />

              <Label className="flex justify-between">
                <span>Mood / Sentiment</span>
                <span className="font-bold text-pink-500">{mood}</span>
              </Label>
              <Slider
                value={[mood]}
                onValueChange={([val]) => setMood(val)}
                max={10}
                step={1}
              />

              <Label className="flex justify-between">
                <span>Focus Quality</span>
                <span className="font-bold text-blue-500">{focus}</span>
              </Label>
              <Slider
                value={[focus]}
                onValueChange={([val]) => setFocus(val)}
                max={10}
                step={1}
              />
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="win">Biggest Win Today</Label>
                <Textarea
                  id="win"
                  placeholder="What are you most proud of today?"
                  className="min-h-[80px] bg-accent/10"
                  value={win}
                  onChange={(e) => setWin(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reflection">Reflections & Lessons</Label>
                <Textarea
                  id="reflection"
                  placeholder="What did you learn? What could go better tomorrow?"
                  className="min-h-[120px] bg-accent/10"
                  value={reflection}
                  onChange={(e) => setReflection(e.target.value)}
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-primary hover:bg-primary/90"
            disabled={wellbeing.isPending}
          >
            {wellbeing.isPending ? "Saving..." : "Complete Review"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
