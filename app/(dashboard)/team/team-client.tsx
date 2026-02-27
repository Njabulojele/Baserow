"use client";

import React, { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Plus, Users, LayoutTemplate, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { TeamMemberCard } from "@/components/team/TeamMemberCard";
import { ActivityFeed } from "@/components/team/ActivityFeed";
import { TeamStats } from "@/components/team/TeamStats";
import { InviteMemberModal } from "@/components/team/InviteMemberModal";

export function TeamClient() {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isCreateOrgModalOpen, setIsCreateOrgModalOpen] = useState(false);

  const {
    data: org,
    isLoading,
    refetch,
  } = trpc.team.getOrganization.useQuery();

  if (isLoading) {
    return <TeamSkeleton />;
  }

  // --- Empty State: User has no organization ---
  if (!org) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-16 h-16 rounded-full bg-[#1a252f] border border-[#2f3e46] flex items-center justify-center">
          <Users className="w-8 h-8 text-[#a9927d]" />
        </div>
        <div className="space-y-2 max-w-md">
          <h2 className="text-sm font-mono tracking-widest uppercase mb-2 text-[#a9927d]">
            Create a Team Hub
          </h2>
          <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest leading-relaxed">
            Collaborate in real-time, share resources, and see what your team is
            working on right now.
          </p>
        </div>
        <Button onClick={() => setIsCreateOrgModalOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Create Organization
        </Button>

        {/* Temporary Create Modal built-in for simplicity during testing */}
        {isCreateOrgModalOpen && (
          <CreateOrgModal
            onClose={() => setIsCreateOrgModalOpen(false)}
            onSuccess={refetch}
          />
        )}
      </div>
    );
  }

  // --- Main Team Hub ---
  return (
    <div className="space-y-8 pb-8 p-4">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div className="flex gap-4 items-center">
          <div className="w-16 h-16 rounded-xl bg-[#1a252f] shadow-xl border border-[#2f3e46] flex items-center justify-center font-bold text-2xl text-[#a9927d]">
            {org.logo ? (
              <img
                src={org.logo}
                alt={org.name}
                className="w-full h-full rounded-xl object-cover"
              />
            ) : (
              org.name.charAt(0).toUpperCase()
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-mono font-bold uppercase tracking-widest text-[#a9927d]">
                {org.name}
              </h1>
              <span className="px-2 py-0.5 rounded-full bg-[#1a252f] text-[10px] border border-[#2f3e46] font-mono tracking-widest text-gray-400">
                {org.plan.toUpperCase()}
              </span>
            </div>
            <p className="text-gray-500 font-mono text-[10px] uppercase tracking-widest mt-1">
              Team Hub • {org.members.length} member
              {org.members.length !== 1 && "s"}
            </p>
          </div>
        </div>

        <Button
          onClick={() => setIsInviteModalOpen(true)}
          className="gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          Invite Member
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Stats & Members */}
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-[10px] font-mono tracking-widest uppercase flex items-center gap-2 mb-4 text-[#a9927d]">
              <LayoutTemplate className="w-4 h-4 text-[#a9927d]" />
              Team Performance
            </h2>
            <TeamStats orgId={org.id} />
          </section>

          <section>
            <h2 className="text-[10px] font-mono tracking-widest uppercase flex items-center gap-2 mb-4 text-[#a9927d]">
              <Users className="w-4 h-4 text-[#a9927d]" />
              Members
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {org.members.map((member: any) => (
                <TeamMemberCard
                  key={member.id}
                  member={member}
                  orgId={org.id}
                />
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Live Activity Feed */}
        <div className="space-y-6">
          <h2 className="text-[10px] font-mono tracking-widest uppercase flex items-center gap-2 mb-4 text-[#a9927d]">
            <Activity className="w-4 h-4 text-[#a9927d]" />
            Live Activity
          </h2>
          <div className="bg-[#0a0c10] border border-[#2f3e46] rounded-xl h-[600px] overflow-hidden flex flex-col shadow-xl">
            <ActivityFeed orgId={org.id} />
          </div>
        </div>
      </div>

      {isInviteModalOpen && (
        <InviteMemberModal
          orgId={org.id}
          onClose={() => setIsInviteModalOpen(false)}
        />
      )}
    </div>
  );
}

// Temporary inline component for rapid testing
function CreateOrgModal({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [name, setName] = useState("");
  const createMutation = trpc.team.createOrganization.useMutation({
    onSuccess: () => {
      onSuccess();
      onClose();
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div className="bg-[#0a0c10] border border-[#2f3e46] rounded-xl p-6 w-[400px] space-y-4 shadow-2xl">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d]">
          Create Organization
        </h3>
        <div>
          <label className="text-[10px] font-mono tracking-widest uppercase text-gray-500 mb-1 block">
            Organization Name
          </label>
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Corp"
            className="w-full bg-[#1a252f] border border-[#2f3e46] rounded-lg px-3 py-2 text-[10px] font-mono tracking-widest uppercase text-white outline-none focus:border-[#a9927d]/50"
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() =>
              createMutation.mutate({
                name,
                slug: name.toLowerCase().replace(/[^a-z0-9]/g, "-"),
              })
            }
            disabled={!name || createMutation.isPending}
            className="border border-[#a9927d]/50 bg-[#0a0c10] text-[#a9927d] hover:bg-[#a9927d] hover:text-[#0a0c10] text-[10px] font-mono tracking-widest uppercase"
          >
            {createMutation.isPending ? "Creating..." : "Create"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-8 animate-pulse p-4">
      <div className="flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <Skeleton className="w-16 h-16 rounded-xl bg-[#1a252f]" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48 bg-[#1a252f]" />
            <Skeleton className="h-3 w-32 bg-[#1a252f]" />
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-[100px] w-full rounded-xl bg-[#0a0c10]" />
          <Skeleton className="h-[400px] w-full rounded-xl bg-[#0a0c10]" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[600px] w-full rounded-xl bg-[#0a0c10]" />
        </div>
      </div>
    </div>
  );
}
