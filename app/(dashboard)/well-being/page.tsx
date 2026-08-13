"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Activity, Moon, Sun, Dumbbell, Sparkles } from "lucide-react";
import { toast } from "sonner";

export default function WellbeingPage() {
  const utils = trpc.useUtils();
  const { data: dailyLog } = trpc.wellbeing.getDailyLog.useQuery({});
  const { data: stats } = trpc.wellbeing.getStats.useQuery();

  const [energy, setEnergy] = useState<number>(dailyLog?.energy ?? 8);
  const [mood, setMood] = useState<number>(dailyLog?.mood ?? 8);
  const [stress, setStress] = useState<number>(dailyLog?.stress ?? 3);

  const saveLog = trpc.wellbeing.saveLog.useMutation({
    onSuccess: () => {
      toast.success("Well-being log saved!");
      utils.wellbeing.getDailyLog.invalidate();
      utils.wellbeing.getStats.invalidate();
    },
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
          <Heart className="w-6 h-6 text-rose-500" /> Well-being & Energy Tracker
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Monitor your daily physical energy, mood, and stress levels to prevent burnout.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Energy Level</span>
            <Sun className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{energy}/10</p>
        </Card>
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Mood Score</span>
            <Sparkles className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{mood}/10</p>
        </Card>
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Stress Level</span>
            <Activity className="w-4 h-4 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">{stress}/10</p>
        </Card>
        <Card className="p-5 space-y-2">
          <div className="flex items-center justify-between text-muted-foreground">
            <span className="text-xs font-semibold uppercase">Sleep Quality</span>
            <Moon className="w-4 h-4 text-indigo-500" />
          </div>
          <p className="text-2xl font-bold text-foreground">7.5 hrs</p>
        </Card>
      </div>

      <Card className="p-6 space-y-6">
        <h2 className="text-lg font-semibold text-foreground">Daily Check-in</h2>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Energy: {energy}/10</label>
            <input
              type="range"
              min="1"
              max="10"
              value={energy}
              onChange={(e) => setEnergy(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-amber-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Mood: {mood}/10</label>
            <input
              type="range"
              min="1"
              max="10"
              value={mood}
              onChange={(e) => setMood(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-emerald-500"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground block mb-2">Stress: {stress}/10</label>
            <input
              type="range"
              min="1"
              max="10"
              value={stress}
              onChange={(e) => setStress(Number(e.target.value))}
              className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-rose-500"
            />
          </div>
        </div>

        <Button
          onClick={() => saveLog.mutate({ energy, mood, stress })}
          className="bg-rose-500 hover:bg-rose-600 text-white font-medium px-6"
        >
          Save Daily Check-in
        </Button>
      </Card>
    </div>
  );
}
