import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { TeamClient } from "./team-client";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export const dynamic = "force-dynamic";

export default function TeamPage() {
  return (
    <DashboardShell>
      <Suspense fallback={<TeamSkeleton />}>
        <TeamClient />
      </Suspense>
    </DashboardShell>
  );
}

function TeamSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="flex gap-4 items-center">
          <Skeleton className="w-16 h-16 rounded-xl bg-[#2a2a30]" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-48 bg-[#2a2a30]" />
            <Skeleton className="h-4 w-32 bg-[#2a2a30]" />
          </div>
        </div>
      </div>

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <Skeleton className="h-[200px] w-full rounded-xl bg-[#1a1a1e]" />
          <Skeleton className="h-[400px] w-full rounded-xl bg-[#1a1a1e]" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-[600px] w-full rounded-xl bg-[#1a1a1e]" />
        </div>
      </div>
    </div>
  );
}
