"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import {
  ChevronLeft,
  ChevronRight,
  Moon,
  Heart,
  Plus,
  Flame,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { EveningReview } from "@/components/dashboard/EveningReview";
import { NoteEditor } from "@/components/notes/NoteEditor";

// Daily Operating System components
import { PillarCard } from "@/components/planning/PillarCard";
import { MiniCalendar } from "@/components/planning/MiniCalendar";
import { DailyScheduleTimeline } from "@/components/planning/DailyScheduleTimeline";
import { PillarProgressChart } from "@/components/planning/PillarProgressChart";
import { ContentDistributionChecklist } from "@/components/planning/ContentDistributionChecklist";
import { LeadChannelsList } from "@/components/planning/LeadChannelsList";
import { ContentIdeaPanel } from "@/components/planning/ContentIdeaPanel";
import { ProposalTemplateModal } from "@/components/planning/ProposalTemplateModal";

interface DayPlanningClientProps {
  initialData: any;
}

export function DayPlanningClient({ initialData }: DayPlanningClientProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [quickTask, setQuickTask] = useState("");
  const [isReviewOpen, setIsReviewOpen] = useState(false);

  const utils = trpc.useUtils();

  // Seed default pillars on first load
  const seedMutation = trpc.habit.seedDefaults.useMutation({
    onSuccess: (data) => {
      if (data.seeded) {
        utils.habit.getDailyChecklist.invalidate();
        utils.habit.getPillars.invalidate();
      }
    },
  });

  const seededRef = useState({ called: false })[0];
  useEffect(() => {
    if (!seededRef.called) {
      seededRef.called = true;
      seedMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Existing day plan data
  const { data: dayPlan } = trpc.planning.getDayPlan.useQuery(
    { date: currentDate },
    { initialData },
  );

  // Daily checklist (pillars + habits)
  const { data: checklist } = trpc.habit.getDailyChecklist.useQuery({
    date: currentDate,
  });

  // Weekly stats for completion dates on mini calendar
  const { data: weeklyStats } = trpc.habit.getWeeklyStats.useQuery({
    date: currentDate,
  });

  const createTaskMutation = trpc.task.createTask.useMutation({
    onSuccess: () => {
      toast.success("Task added");
      setQuickTask("");
      utils.planning.getDayPlan.invalidate();
    },
    onError: (err: any) => toast.error(err.message),
  });

  const nextDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + 1);
    setCurrentDate(d);
  };
  const prevDay = () => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - 1);
    setCurrentDate(d);
  };

  const handleQuickAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickTask.trim()) return;
    createTaskMutation.mutate({
      title: quickTask.trim(),
      scheduledDate: currentDate,
      priority: "medium",
    });
  };

  const completedDates =
    weeklyStats?.dailyStats.filter((d) => d.completed > 0).map((d) => d.date) ||
    [];

  const isToday =
    format(currentDate, "yyyy-MM-dd") === format(new Date(), "yyyy-MM-dd");

  // Calculate total time from pillar data
  const totalMinutes =
    checklist?.pillars.reduce((s, p) => s + p.dailyMinutes, 0) || 0;

  return (
    <div className="min-h-screen">
      {/* ━━━ Header ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-xl border-b border-[#2f3e46]/50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-sm font-mono font-bold uppercase tracking-widest text-alabaster flex items-center gap-2">
                  <Flame className="w-4 h-4 text-[#a9927d]" />
                  Daily Operating System
                </h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {format(currentDate, "EEEE, MMMM do, yyyy")}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Overall progress badge */}
              {checklist && (
                <div className="flex items-center gap-2 px-3 py-1.5 bg-[#1a252f] rounded-lg border border-[#2f3e46]">
                  <div className="relative w-7 h-7">
                    <svg className="w-7 h-7" viewBox="0 0 28 28">
                      <circle
                        cx="14"
                        cy="14"
                        r="11"
                        fill="none"
                        stroke="#2f3e46"
                        strokeWidth="3"
                      />
                      <circle
                        cx="14"
                        cy="14"
                        r="11"
                        fill="none"
                        stroke="#a9927d"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeDasharray={`${(checklist.overallRate / 100) * 69} 69`}
                        transform="rotate(-90 14 14)"
                        className="transition-all duration-500"
                      />
                    </svg>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-white">
                      {checklist.totalCompleted}/{checklist.totalHabits}
                    </span>
                    <span className="text-[9px] font-mono text-gray-500 block">
                      habits done
                    </span>
                  </div>
                </div>
              )}

              {/* Time allocation badge */}
              <div className="px-3 py-1.5 bg-[#1a252f] rounded-lg border border-[#2f3e46]">
                <span className="text-[10px] font-mono text-[#a9927d]">
                  {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
                </span>
                <span className="text-[9px] font-mono text-gray-500 block">
                  focused work
                </span>
              </div>

              {/* Navigation */}
              <div className="flex items-center gap-1 border border-[#2f3e46] rounded-lg p-1 bg-[#0a0c10]">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={prevDay}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="px-3 text-[10px] font-mono uppercase tracking-widest text-gray-400 hover:text-white"
                  onClick={() => setCurrentDate(new Date())}
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={nextDay}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Action buttons */}
              <Link href="/planning/review">
                <Button
                  size="sm"
                  className="bg-[#1a252f] border border-[#a9927d]/50 text-[#a9927d] hover:bg-[#a9927d] hover:text-[#1a252f] font-mono tracking-widest uppercase text-[10px] h-8"
                >
                  <Heart className="size-3 mr-1.5" />
                  Review
                </Button>
              </Link>

              {isToday && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-[#2f3e46] bg-[#0a0c10] text-gray-300 hover:text-white hover:border-[#a9927d] font-mono tracking-widest uppercase text-[10px] h-8"
                  onClick={() => setIsReviewOpen(true)}
                >
                  <Moon className="size-3 mr-1.5" />
                  Evening
                </Button>
              )}

              <NoteEditor
                dayPlanId={dayPlan?.dayPlan?.id}
                title={format(currentDate, "MMM do")}
              />
            </div>
          </div>

          {/* Quick Add */}
          <form onSubmit={handleQuickAdd} className="flex gap-2 mt-3">
            <div className="relative flex-1">
              <Plus className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Quick add task for today..."
                value={quickTask}
                onChange={(e) => setQuickTask(e.target.value)}
                className="pl-10 h-9 bg-[#0a0c10] border-[#2f3e46] text-white focus-visible:ring-[#a9927d] font-light placeholder:text-gray-600 text-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={createTaskMutation.isPending}
              className="h-9 bg-[#1a252f] border border-[#2f3e46] text-[#a9927d] hover:bg-[#a9927d] hover:text-[#1a252f] font-mono tracking-widest uppercase text-[10px]"
            >
              <Plus className="h-3 w-3 mr-1.5" />
              Add
            </Button>
          </form>
        </div>
      </div>

      <EveningReview open={isReviewOpen} onOpenChange={setIsReviewOpen} />

      {/* ━━━ Main Grid ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* ── LEFT COLUMN: Calendar + Progress + Schedule ─────────────── */}
          <div className="lg:col-span-3 space-y-4">
            <MiniCalendar
              selectedDate={currentDate}
              onSelectDate={setCurrentDate}
              completedDates={completedDates}
            />

            <PillarProgressChart date={currentDate} />

            {/* Pillar time allocation summary */}
            <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] p-3">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d] mb-2">
                Focus Blocks
              </h3>
              <div className="space-y-1.5">
                {checklist?.pillars.map((p) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: p.color }}
                    />
                    <span className="text-[10px] text-gray-400 flex-1 truncate">
                      {p.name}
                    </span>
                    <span className="text-[10px] font-mono text-gray-500">
                      {p.dailyMinutes}m
                    </span>
                    <div className="w-12 h-1 bg-[#0a0c10] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${p.completionRate}%`,
                          backgroundColor: p.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── CENTER COLUMN: The 5-Pillar Operating Card ──────────────── */}
          <div className="lg:col-span-5 space-y-4">
            {/* Section header */}
            <div className="flex items-center gap-2 px-1">
              <Zap className="w-4 h-4 text-[#a9927d]" />
              <h2 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d]">
                Daily Operating Card
              </h2>
              <div className="flex-1 h-px bg-[#2f3e46]/50" />
              {checklist && (
                <span className="text-[10px] font-mono text-gray-500">
                  {checklist.overallRate}% complete
                </span>
              )}
            </div>

            {/* Pillar cards */}
            {checklist?.pillars.map((pillar) => (
              <PillarCard key={pillar.id} pillar={pillar} date={currentDate} />
            ))}

            {/* Content ideas */}
            <ContentIdeaPanel />

            {/* Proposal generator */}
            <ProposalTemplateModal />
          </div>

          {/* ── RIGHT COLUMN: Schedule + Distribution + Channels ────────── */}
          <div className="lg:col-span-4 space-y-4">
            <DailyScheduleTimeline date={currentDate} />

            <ContentDistributionChecklist date={currentDate} />

            <LeadChannelsList />

            {/* Daily win */}
            <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] p-4">
              <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d] mb-2 flex items-center gap-2">
                🏆 Daily Win
              </h3>
              <div className="p-3 rounded-lg bg-[#0a0c10] border border-[#a9927d]/20 italic text-sm text-gray-300 font-serif">
                {dayPlan?.dayPlan?.dailyWin ||
                  "What's your one big win for today?"}
              </div>
            </div>

            {/* Tasks for today */}
            {dayPlan && dayPlan.tasks && dayPlan.tasks.length > 0 && (
              <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2f3e46]/50 flex items-center justify-between">
                  <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d]">
                    Today's Tasks
                  </h3>
                  <Link href="/tasks">
                    <span className="text-[9px] font-mono text-gray-500 hover:text-[#a9927d] transition-colors">
                      View All →
                    </span>
                  </Link>
                </div>
                <div className="p-2 space-y-0.5">
                  {dayPlan.tasks.slice(0, 8).map((task: any) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          task.status === "done"
                            ? "bg-emerald-400"
                            : task.status === "in_progress"
                              ? "bg-amber-400"
                              : "bg-gray-600"
                        }`}
                      />
                      <span
                        className={`text-xs flex-1 truncate ${
                          task.status === "done"
                            ? "line-through text-gray-600"
                            : "text-gray-300"
                        }`}
                      >
                        {task.title}
                      </span>
                      {task.project && (
                        <span
                          className="text-[9px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${task.project.color}20`,
                            color: task.project.color,
                          }}
                        >
                          {task.project.name}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center py-6 border-t border-[#2f3e46]/20 mt-8">
        <p className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-widest">
          openinfinity.co.za · Daily Operating System · 2026 · Built for
          founders who are serious about growth.
        </p>
      </div>
    </div>
  );
}
