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
    OWNER: { icon: Crown, color: "text-amber-400", bg: "bg-amber-400/10" },
    ADMIN: { icon: Shield, color: "text-blue-400", bg: "bg-blue-400/10" },
    MEMBER: { icon: User, color: "text-white/60", bg: "bg-white/5" },
    VIEWER: { icon: Globe, color: "text-white/40", bg: "bg-white/5" },
  }[member.role] || { icon: User, color: "text-white/60", bg: "bg-white/5" };

  const RoleIcon = roleConfig.icon;

  return (
    <div className="bg-[#1a1a1e] border border-white/5 rounded-xl p-4 flex items-center gap-4 transition-all hover:bg-white/[0.02]">
      <div className="relative">
        {member.user.avatar ? (
          <img
            src={member.user.avatar}
            alt={member.user.name || member.user.email}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center text-lg font-bold">
            {(member.user.name || member.user.email).charAt(0).toUpperCase()}
          </div>
        )}

        {/* Online Status Indicator */}
        <div
          className={`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-[#1a1a1e] ${isOnline ? "bg-green-500" : "bg-white/20"}`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-start mb-1">
          <h3 className="font-semibold text-sm truncate">
            {member.user.name || "Unnamed"}
          </h3>
          <div
            className={`px-2 py-0.5 rounded-md text-[10px] font-mono flex items-center gap-1 shrink-0 ${roleConfig.bg} ${roleConfig.color}`}
          >
            <RoleIcon className="w-3 h-3" />
            {member.role}
          </div>
        </div>
        <p className="text-white/50 text-xs truncate mb-1">
          {member.user.email}
        </p>

        {/* Current Page Presence */}
        {isOnline && userPresence?.page && (
          <p className="text-green-400/80 text-[10px] truncate flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Viewing {userPresence.page}
          </p>
        )}
        {!isOnline && (
          <p className="text-white/30 text-[10px]">
            Joined {new Date(member.joinedAt).toLocaleDateString()}
          </p>
        )}
      </div>
    </div>
  );
}
