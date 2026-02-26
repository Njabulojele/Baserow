"use client";

import { trpc } from "@/lib/trpc/client";
import { FolderKanban, CheckSquare, Users, Handshake } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function TeamStats({ orgId }: { orgId: string }) {
  const { data: stats, isLoading } = trpc.team.getTeamStats.useQuery({ orgId });

  if (isLoading || !stats) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-24 w-full bg-[#1a1a1e] rounded-xl" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Active Projects",
      value: stats.activeProjects,
      icon: FolderKanban,
      color: "text-blue-400",
      bg: "bg-blue-500/10",
    },
    {
      label: "Tasks IP",
      value: stats.activeTasks,
      icon: CheckSquare,
      color: "text-emerald-400",
      bg: "bg-emerald-500/10",
    },
    {
      label: "Active Clients",
      value: stats.activeClients,
      icon: Handshake,
      color: "text-amber-400",
      bg: "bg-amber-500/10",
    },
    {
      label: "Total Members",
      value: stats.totalMembers,
      icon: Users,
      color: "text-purple-400",
      bg: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-[#1a1a1e] border border-white/5 rounded-xl p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-white/50 text-xs font-medium uppercase tracking-wider">
              {item.label}
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg}`}
            >
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
          </div>
          <div className="text-3xl font-bold tracking-tight">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
