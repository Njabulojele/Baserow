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
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-[#0a0c10]">
        <ActivityIcon className="w-12 h-12 text-[#2f3e46] mb-4" />
        <h3 className="text-[#a9927d] text-[10px] font-mono tracking-widest uppercase mb-2">
          No activity yet
        </h3>
        <p className="text-gray-500 text-[10px] font-mono tracking-widest uppercase">
          When team members create projects or tasks, they'll appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#0a0c10]">
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
  let actionColor = "text-[#a9927d]";
  let bgClass = "bg-[#1a252f] border border-[#2f3e46]";

  if (isCreated) {
    ActionIcon = Plus;
    actionColor = "text-[#a9927d]";
    bgClass = "bg-[#1a252f] border border-[#2f3e46]";
  } else if (isCompleted) {
    ActionIcon = CheckCircle;
    actionColor = "text-[#a9927d]";
    bgClass = "bg-[#1a252f] border border-[#2f3e46]";
  } else if (isDeleted) {
    ActionIcon = Trash;
    actionColor = "text-red-400";
    bgClass = "bg-[#1a252f] border border-red-400/30";
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
    <div className="flex gap-4 p-3 rounded-lg hover:bg-[#1a252f] transition-colors border border-transparent hover:border-[#2f3e46]">
      <div className="relative shrink-0 mt-1">
        {activity.user.avatar ? (
          <img
            src={activity.user.avatar}
            alt="Avatar"
            className="w-8 h-8 rounded-full border border-[#2f3e46]"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#1a252f] text-[#a9927d] border border-[#2f3e46] flex items-center justify-center text-xs font-medium">
            {(activity.user.name || "U").charAt(0)}
          </div>
        )}
        <div
          className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full ${bgClass} ${actionColor} flex items-center justify-center ring-2 ring-[#0a0c10]`}
        >
          <ActionIcon className="w-2.5 h-2.5" />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 leading-snug font-mono uppercase tracking-widest">
          <span className="font-medium text-white">
            {activity.user.name || activity.user.email}
          </span>{" "}
          <span className="text-gray-500">{activity.action.toLowerCase()}</span>{" "}
          {activity.entityType.toLowerCase()}{" "}
          <span className="font-medium text-[#a9927d]">
            {activity.entityName}
          </span>
        </p>
        <div className="flex items-center gap-2 mt-2">
          <div className="flex items-center gap-1 text-[9px] text-gray-500 uppercase tracking-widest font-mono bg-[#1a252f] border border-[#2f3e46] px-1.5 py-0.5 rounded">
            <EntityIcon className="w-3 h-3" />
            {activity.entityType}
          </div>
          <span className="text-[9px] font-mono tracking-widest uppercase text-gray-600">
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
