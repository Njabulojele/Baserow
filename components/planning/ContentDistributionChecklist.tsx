"use client";

import { Linkedin, Facebook, Globe, Mail, MapPin, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

interface ContentDistributionChecklistProps {
  date: Date;
}

const DISTRIBUTION_ITEMS = [
  {
    id: "dist-linkedin-post",
    title: "Post to LinkedIn with a hook in the first line",
    icon: <Linkedin className="w-4 h-4" />,
    color: "#0077b5",
    platform: "linkedin",
  },
  {
    id: "dist-facebook-groups",
    title: "Share in 2–3 relevant SA Facebook Groups",
    icon: <Facebook className="w-4 h-4" />,
    color: "#1877f2",
    platform: "facebook",
  },
  {
    id: "dist-cross-post",
    title: "Cross-post to your article platform",
    icon: <Globe className="w-4 h-4" />,
    color: "#10b981",
    platform: "blog",
  },
  {
    id: "dist-newsletter",
    title: "Add to your weekly email newsletter",
    icon: <Mail className="w-4 h-4" />,
    color: "#f59e0b",
    platform: "email",
  },
  {
    id: "dist-micro-posts",
    title: "Repurpose as 3 LinkedIn micro-posts",
    icon: <Linkedin className="w-4 h-4" />,
    color: "#0077b5",
    platform: "linkedin",
  },
  {
    id: "dist-gmb",
    title: "Update Google My Business with post link",
    icon: <MapPin className="w-4 h-4" />,
    color: "#ea4335",
    platform: "gmb",
  },
];

export function ContentDistributionChecklist({
  date,
}: ContentDistributionChecklistProps) {
  // We reuse the habit system under "Content Engine" pillar for distribution tracking
  // But for simplicity, use local state with toast feedback
  const { data: checklist } = trpc.habit.getDailyChecklist.useQuery({ date });
  const utils = trpc.useUtils();
  const toggleMutation = trpc.habit.toggleHabit.useMutation({
    onSuccess: () => {
      utils.habit.getDailyChecklist.invalidate();
    },
  });

  // Find content pillar habits that match distribution items
  const contentPillar = checklist?.pillars.find((p) =>
    p.name.toLowerCase().includes("content"),
  );

  return (
    <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2f3e46]/50">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d]">
          Content Distribution
        </h3>
        <p className="text-[9px] font-mono text-gray-600 mt-0.5">
          After you publish — check these off
        </p>
      </div>

      <div className="p-2 space-y-0.5">
        {DISTRIBUTION_ITEMS.map((item) => {
          // This is a UI-only checklist for now since distribution items
          // aren't stored as separate habits
          return (
            <div
              key={item.id}
              className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer group"
            >
              <span style={{ color: item.color }}>{item.icon}</span>
              <span className="text-xs text-gray-300 flex-1">{item.title}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
