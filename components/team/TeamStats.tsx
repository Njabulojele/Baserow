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
          <Skeleton key={i} className="h-24 w-full bg-[#1a252f] rounded-xl" />
        ))}
      </div>
    );
  }

  const items = [
    {
      label: "Active Projects",
      value: stats.activeProjects,
      icon: FolderKanban,
      color: "text-[#a9927d]",
      bg: "bg-[#1a252f]",
    },
    {
      label: "Tasks IP",
      value: stats.activeTasks,
      icon: CheckSquare,
      color: "text-[#a9927d]",
      bg: "bg-[#1a252f]",
    },
    {
      label: "Active Clients",
      value: stats.activeClients,
      icon: Handshake,
      color: "text-[#a9927d]",
      bg: "bg-[#1a252f]",
    },
    {
      label: "Total Members",
      value: stats.totalMembers,
      icon: Users,
      color: "text-[#a9927d]",
      bg: "bg-[#1a252f]",
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {items.map((item, idx) => (
        <div
          key={idx}
          className="bg-[#0a0c10] border border-[#2f3e46] rounded-xl p-4 flex flex-col justify-between"
        >
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-500 text-[10px] uppercase font-mono tracking-widest">
              {item.label}
            </span>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${item.bg} border border-[#2f3e46]`}
            >
              <item.icon className={`w-3 h-3 ${item.color}`} />
            </div>
          </div>
          <div className="text-3xl font-light font-mono text-white tracking-tight">
            {item.value}
          </div>
        </div>
      ))}
    </div>
  );
}
