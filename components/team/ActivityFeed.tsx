"use client";

import { useActivityFeed } from "@/lib/hooks/use-activity-feed";
import { formatDistanceToNow } from "date-fns";
import {
  Plus,
  Edit,
  Trash,
  FileText,
  CheckCircle,
  Users,
  Briefcase,
  Target,
  BrainCircuit,
  Activity as ActivityIcon,
} from "lucide-react";

export function ActivityFeed({ orgId }: { orgId: string }) {
  const { activities } = useActivityFeed(orgId);

  if (activities.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#1a1a1e]">
        <ActivityIcon className="w-12 h-12 text-white/10 mb-4" />
        <h3 className="text-white/50 font-medium">No activity yet</h3>
        <p className="text-white/30 text-sm mt-1">
          When team members create projects or tasks, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#141417]">
      {activities.map((activity) => (
        <ActivityItem key={activity.id} activity={activity} />
      ))}
    </div>
  );
}

function ActivityItem({ activity }: { activity: any }) {
  const isCreated = activity.action === "CREATED";
  const isCompleted = activity.action === "COMPLETED";
  const isDeleted = activity.action === "DELETED";

  let ActionIcon = Edit;
  let actionColor = "text-blue-400";
  let bgClass = "bg-blue-400/10";

  if (isCreated) {
    ActionIcon = Plus;
    actionColor = "text-emerald-400";
    bgClass = "bg-emerald-400/10";
  } else if (isCompleted) {
    ActionIcon = CheckCircle;
    actionColor = "text-purple-400";
    bgClass = "bg-purple-400/10";
  } else if (isDeleted) {
    ActionIcon = Trash;
    actionColor = "text-red-400";
    bgClass = "bg-red-400/10";
  }

  // Map entity type to icon
  const getEntityIcon = () => {
    switch (activity.entityType) {
      case "PROJECT":
        return Briefcase;
      case "TASK":
        return CheckSquare;
      case "CLIENT":
        return Users;
      case "GOAL":
        return Target;
      case "RESEARCH":
        return BrainCircuit;
      case "CANVAS":
        return FileText;
      default:
        return FileText;
    }
  };
  const EntityIcon = getEntityIcon();

  return (
    <div className="flex gap-4 p-3 rounded-lg hover:bg-white/[0.02] transition-colors border border-transparent hover:border-white/5">
      <div className="relative shrink-0 mt-1">
        {activity.user.avatar ? (
          <img
            src={activity.user.avatar}
            alt="Avatar"
            className="w-8 h-8 rounded-full"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-medium">
            {(activity.user.name || "U").charAt(0)}
          </div>
        )}
        <div
          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${bgClass} ${actionColor} flex items-center justify-center ring-2 ring-[#141417]`}
        >
          <ActionIcon className="w-2.5 h-2.5" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 leading-snug">
          <span className="font-semibold text-white">
            {activity.user.name || activity.user.email}
          </span>{" "}
          <span className="text-white/50">{activity.action.toLowerCase()}</span>{" "}
          {activity.entityType.toLowerCase()}{" "}
          <span className="font-medium text-white/90">
            {activity.entityName}
          </span>
        </p>
        <div className="flex items-center gap-2 mt-1">
          <div className="flex items-center gap-1 text-[10px] text-white/40 uppercase tracking-wider font-mono bg-white/5 px-1.5 py-0.5 rounded">
            <EntityIcon className="w-3 h-3" />
            {activity.entityType}
          </div>
          <span className="text-xs text-white/30">
            {formatDistanceToNow(new Date(activity.createdAt), {
              addSuffix: true,
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// Temporary inline import for missing icon
import { CheckSquare } from "lucide-react";
