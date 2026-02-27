"use client";

import { useTeamPresence } from "@/lib/hooks/use-team-presence";
import { User, Shield, Crown, Globe } from "lucide-react";

interface TeamMemberProps {
  member: {
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string;
      email: string;
      avatar: string | null;
    };
  };
  orgId: string;
}

export function TeamMemberCard({ member, orgId }: TeamMemberProps) {
  const { onlineUsers } = useTeamPresence(orgId);
  const isOnline = onlineUsers.has(member.user.id);
  const userPresence = onlineUsers.get(member.user.id);

  const roleConfig = {
    OWNER: {
      icon: Crown,
      color: "text-[#a9927d]",
      bg: "bg-[#1a252f] border border-[#2f3e46]",
    },
    ADMIN: {
      icon: Shield,
      color: "text-white",
      bg: "bg-[#1a252f] border border-[#2f3e46]",
    },
    MEMBER: {
      icon: User,
      color: "text-gray-400",
      bg: "bg-[#1a252f] border border-[#2f3e46]",
    },
    VIEWER: {
      icon: Globe,
      color: "text-gray-500",
      bg: "bg-[#1a252f] border border-[#2f3e46]",
    },
  }[member.role] || {
    icon: User,
    color: "text-gray-400",
    bg: "bg-[#1a252f] border border-[#2f3e46]",
  };

  const RoleIcon = roleConfig.icon;

  return (
    <div className="bg-[#0a0c10] border border-[#2f3e46] rounded-xl p-4 flex items-center gap-4 transition-all hover:bg-[#1a252f]">
      <div className="relative">
        {member.user.avatar ? (
          <img
            src={member.user.avatar}
            alt={member.user.name || member.user.email}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-[#1a252f] border border-[#2f3e46] flex items-center justify-center text-lg font-bold text-[#a9927d]">
            {(member.user.name || member.user.email).charAt(0).toUpperCase()}
          </div>
        )}

        {/* Online Status Indicator */}
        <div
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#0a0c10] ${isOnline ? "bg-emerald-500" : "bg-gray-600"}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-medium text-white text-xs truncate">
            {member.user.name || "Unnamed"}
          </h3>
          <div
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 shrink-0 ${roleConfig.bg} ${roleConfig.color}`}
          >
            <RoleIcon className="w-3 h-3" />
            {member.role}
          </div>
        </div>
        <p className="text-[10px] font-mono tracking-widest uppercase text-gray-500 truncate mb-1">
          {member.user.email}
        </p>

        {/* Current Page Presence */}
        {isOnline && userPresence?.page && (
          <p className="text-[#a9927d] text-[10px] font-mono tracking-widest uppercase truncate flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Viewing {userPresence.page}
          </p>
        )}
        {!isOnline && (
          <p className="text-gray-600 font-mono tracking-widest uppercase text-[9px]">
            Joined {new Date(member.joinedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
