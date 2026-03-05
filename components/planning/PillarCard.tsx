"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  Check,
  Linkedin,
  Mail,
  Facebook,
  Youtube,
  Globe,
  Share2,
  BarChart3,
  FileText,
  MessageSquare,
  Users,
  Code,
  PenTool,
  Target,
  Zap,
  StickyNote,
  ListChecks,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Habit {
  id: string;
  title: string;
  platform: string | null;
  estimatedMinutes: number;
  completed: boolean;
  logId: string | null;
}

interface PillarData {
  id: string;
  name: string;
  icon: string;
  color: string;
  dailyMinutes: number;
  habits: Habit[];
  totalHabits: number;
  completedHabits: number;
  completionRate: number;
}

const PLATFORM_ICONS: Record<string, React.ReactNode> = {
  linkedin: <Linkedin className="w-3.5 h-3.5" />,
  gmail: <Mail className="w-3.5 h-3.5" />,
  facebook: <Facebook className="w-3.5 h-3.5" />,
  youtube: <Youtube className="w-3.5 h-3.5" />,
  blog: <Globe className="w-3.5 h-3.5" />,
  share: <Share2 className="w-3.5 h-3.5" />,
  analytics: <BarChart3 className="w-3.5 h-3.5" />,
  crm: <Zap className="w-3.5 h-3.5" />,
  projects: <ListChecks className="w-3.5 h-3.5" />,
  whatsapp: <MessageSquare className="w-3.5 h-3.5" />,
  code: <Code className="w-3.5 h-3.5" />,
  notes: <StickyNote className="w-3.5 h-3.5" />,
  tasks: <FileText className="w-3.5 h-3.5" />,
  email: <Mail className="w-3.5 h-3.5" />,
};

const PILLAR_ICONS: Record<string, React.ReactNode> = {
  target: <Target className="w-4 h-4" />,
  users: <Users className="w-4 h-4" />,
  code: <Code className="w-4 h-4" />,
  "pen-tool": <PenTool className="w-4 h-4" />,
  "bar-chart-3": <BarChart3 className="w-4 h-4" />,
};

const PLATFORM_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "gmail", label: "Gmail" },
  { value: "facebook", label: "Facebook" },
  { value: "youtube", label: "YouTube" },
  { value: "blog", label: "Blog" },
  { value: "crm", label: "CRM" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "code", label: "Code" },
  { value: "analytics", label: "Analytics" },
  { value: "tasks", label: "Tasks" },
  { value: "notes", label: "Notes" },
  { value: "share", label: "Share" },
];

export function PillarCard({
  pillar,
  date,
}: {
  pillar: PillarData;
  date: Date;
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPlatform, setNewPlatform] = useState("linkedin");
  const [newMinutes, setNewMinutes] = useState("10");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const utils = trpc.useUtils();

  const toggleMutation = trpc.habit.toggleHabit.useMutation({
    onSuccess: () => {
      utils.habit.getDailyChecklist.invalidate();
      utils.habit.getWeeklyStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createMutation = trpc.habit.createHabit.useMutation({
    onSuccess: () => {
      toast.success("Habit added!");
      setNewTitle("");
      setNewPlatform("linkedin");
      setNewMinutes("10");
      setIsAdding(false);
      utils.habit.getDailyChecklist.invalidate();
      utils.habit.getWeeklyStats.invalidate();
      utils.habit.getPillars.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.habit.deleteHabit.useMutation({
    onSuccess: () => {
      toast.success("Habit removed");
      setConfirmDeleteId(null);
      utils.habit.getDailyChecklist.invalidate();
      utils.habit.getWeeklyStats.invalidate();
      utils.habit.getPillars.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleToggle = (habitId: string) => {
    toggleMutation.mutate({ habitTemplateId: habitId, date });
  };

  const handleAddHabit = () => {
    if (!newTitle.trim()) return;
    createMutation.mutate({
      pillarId: pillar.id,
      title: newTitle.trim(),
      platform: newPlatform,
      estimatedMinutes: parseInt(newMinutes) || 10,
      order: pillar.habits.length,
    });
  };

  const handleDelete = (habitId: string) => {
    deleteMutation.mutate({ id: habitId });
  };

  const progressWidth = `${pillar.completionRate}%`;

  return (
    <div
      className="rounded-xl border overflow-hidden transition-all duration-300"
      style={{
        borderColor: `${pillar.color}30`,
        background: `linear-gradient(135deg, ${pillar.color}08, transparent)`,
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-3 flex-1 hover:opacity-80 transition-opacity"
        >
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${pillar.color}20` }}
          >
            <span style={{ color: pillar.color }}>
              {PILLAR_ICONS[pillar.icon] || <Target className="w-4 h-4" />}
            </span>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-medium text-white">{pillar.name}</h3>
            <div className="flex items-center gap-2 mt-0.5">
              <Clock className="w-3 h-3 text-gray-500" />
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                {pillar.dailyMinutes} min
              </span>
            </div>
          </div>
        </button>

        <div className="flex items-center gap-2">
          {/* Add habit button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsAdding(!isAdding);
              setIsExpanded(true);
            }}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/[0.06] transition-colors"
            title="Add habit"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>

          {/* Completion badge */}
          <div
            className="text-[10px] font-mono font-bold px-2 py-1 rounded-full"
            style={{
              color: pillar.completionRate === 100 ? "#0a0c10" : pillar.color,
              backgroundColor:
                pillar.completionRate === 100
                  ? pillar.color
                  : `${pillar.color}20`,
            }}
          >
            {pillar.completedHabits}/{pillar.totalHabits}
          </div>
          <button onClick={() => setIsExpanded(!isExpanded)}>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-0.5 bg-[#1a252f]">
        <div
          className="h-full transition-all duration-500 ease-out rounded-full"
          style={{
            width: progressWidth,
            backgroundColor: pillar.color,
          }}
        />
      </div>

      {/* Habits list */}
      {isExpanded && (
        <div className="px-2 py-1.5 space-y-0.5">
          {pillar.habits.map((habit) => (
            <div key={habit.id} className="relative group">
              {/* Confirm delete overlay */}
              {confirmDeleteId === habit.id ? (
                <div
                  className="flex items-center gap-2 px-3 py-2.5 rounded-lg border animate-in fade-in duration-200"
                  style={{
                    borderColor: "#ef444440",
                    backgroundColor: "#ef444410",
                  }}
                >
                  <span className="text-xs text-red-400 flex-1">
                    Delete "{habit.title}"?
                  </span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-6 px-2 text-[10px] text-gray-400 hover:text-white"
                    onClick={() => setConfirmDeleteId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-6 px-2 text-[10px] bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white border border-red-500/30"
                    onClick={() => handleDelete(habit.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3 mr-1" />
                    Delete
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-left",
                    habit.completed
                      ? "bg-white/[0.03] opacity-60"
                      : "hover:bg-white/[0.04]",
                  )}
                >
                  {/* Checkbox */}
                  <button
                    onClick={() => handleToggle(habit.id)}
                    disabled={toggleMutation.isPending}
                    className="shrink-0"
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200",
                        habit.completed
                          ? "border-transparent"
                          : "border-gray-600 hover:border-gray-400",
                      )}
                      style={{
                        backgroundColor: habit.completed
                          ? pillar.color
                          : "transparent",
                        borderColor: habit.completed ? pillar.color : undefined,
                      }}
                    >
                      {habit.completed && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>
                  </button>

                  {/* Platform icon */}
                  <span
                    className={cn(
                      "shrink-0 transition-colors",
                      habit.completed ? "text-gray-600" : "text-gray-400",
                    )}
                    style={{
                      color: habit.completed ? undefined : `${pillar.color}90`,
                    }}
                  >
                    {PLATFORM_ICONS[habit.platform || ""] || (
                      <Target className="w-3.5 h-3.5" />
                    )}
                  </span>

                  {/* Title */}
                  <span
                    className={cn(
                      "text-sm flex-1 transition-all cursor-pointer",
                      habit.completed
                        ? "line-through text-gray-600"
                        : "text-gray-300",
                    )}
                    onClick={() => handleToggle(habit.id)}
                  >
                    {habit.title}
                  </span>

                  {/* Time */}
                  <span className="text-[10px] font-mono text-gray-600 shrink-0">
                    {habit.estimatedMinutes}m
                  </span>

                  {/* Delete button - visible on hover */}
                  <button
                    onClick={() => setConfirmDeleteId(habit.id)}
                    className="p-1 rounded text-gray-700 hover:text-red-400 hover:bg-red-400/10 transition-all opacity-0 group-hover:opacity-100 shrink-0"
                    title="Delete habit"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          ))}

          {/* Add habit inline form */}
          {isAdding && (
            <div
              className="mt-1 px-3 py-3 rounded-lg border space-y-2 animate-in slide-in-from-top-2 duration-200"
              style={{
                borderColor: `${pillar.color}30`,
                backgroundColor: `${pillar.color}08`,
              }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">
                  New Habit
                </span>
                <div className="flex-1" />
                <button
                  onClick={() => setIsAdding(false)}
                  className="p-1 rounded text-gray-500 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <Input
                placeholder="What should you do daily?"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="h-8 bg-[#0a0c10] border-[#2f3e46] text-white text-xs placeholder:text-gray-600"
                onKeyDown={(e) => e.key === "Enter" && handleAddHabit()}
                autoFocus
              />

              <div className="flex items-center gap-2">
                {/* Platform selector */}
                <div className="flex items-center gap-0.5 flex-wrap">
                  {PLATFORM_OPTIONS.slice(0, 8).map((p) => (
                    <button
                      key={p.value}
                      onClick={() => setNewPlatform(p.value)}
                      className={cn(
                        "p-1.5 rounded-md transition-colors",
                        newPlatform === p.value
                          ? "bg-[#0a0c10]"
                          : "hover:bg-[#0a0c10]/50 opacity-50",
                      )}
                      style={{
                        color:
                          newPlatform === p.value ? pillar.color : "#6b7280",
                      }}
                      title={p.label}
                    >
                      {PLATFORM_ICONS[p.value] || (
                        <Target className="w-3 h-3" />
                      )}
                    </button>
                  ))}
                </div>

                <div className="flex-1" />

                {/* Minutes input */}
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value)}
                    className="h-7 w-14 bg-[#0a0c10] border-[#2f3e46] text-white text-[10px] font-mono text-center"
                    min={1}
                    max={120}
                  />
                  <span className="text-[9px] font-mono text-gray-500">
                    min
                  </span>
                </div>

                <Button
                  size="sm"
                  onClick={handleAddHabit}
                  disabled={createMutation.isPending || !newTitle.trim()}
                  className="h-7 text-[10px] font-mono"
                  style={{
                    backgroundColor: pillar.color,
                    color: "#0a0c10",
                  }}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
