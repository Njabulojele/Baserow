"use client";

import { useMemo } from "react";
import { format, formatDistanceToNow } from "date-fns";
import {
  Mail,
  Phone,
  Video,
  MessageSquare,
  StickyNote,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Clock,
  MoreHorizontal,
  Pencil,
  Trash2,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Communication {
  id: string;
  type: string; // email, call, meeting, message, note
  direction: string; // inbound, outbound
  subject: string;
  content: string;
  summary?: string | null;
  createdAt: Date | string;
  meetingDate?: Date | string | null;
  sentiment?: string | null;
  from?: string | null;
  to?: string[] | null;
  createdBy?: {
    name: string | null;
    image: string | null;
  };
}

interface CommunicationTimelineProps {
  communications: Communication[];
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  isLoading?: boolean;
}

export function CommunicationTimeline({
  communications,
  onEdit,
  onDelete,
  isLoading,
}: CommunicationTimelineProps) {
  const groupedCommunications = useMemo(() => {
    const groups: Record<string, Communication[]> = {};

    communications.forEach((comm) => {
      const date = new Date(comm.createdAt);
      const dateKey = format(date, "yyyy-MM-dd");
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(comm);
    });

    return groups;
  }, [communications]);

  const sortedDates = Object.keys(groupedCommunications).sort(
    (a, b) => new Date(b).getTime() - new Date(a).getTime(),
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-4">
            <div className="flex flex-col items-center">
              <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
              <div className="w-px h-full bg-muted mt-2" />
            </div>
            <div className="flex-1 space-y-2 pb-8">
              <div className="h-4 w-1/4 bg-muted animate-pulse rounded" />
              <div className="h-24 w-full bg-muted animate-pulse rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (communications.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-20" />
        <p>No communications recorded yet.</p>
        <p className="text-sm">
          Log your first interaction to start tracking history.
        </p>
      </div>
    );
  }

  return (
    <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-0 before:h-full before:w-px before:bg-border">
      {sortedDates.map((date) => (
        <div key={date} className="relative">
          <Badge variant="outline" className="mb-4 bg-background z-10 relative">
            {format(new Date(date), "MMMM d, yyyy")}
          </Badge>

          <div className="space-y-6">
            {groupedCommunications[date].map((comm) => (
              <TimelineItem
                key={comm.id}
                communication={comm}
                onEdit={onEdit}
                onDelete={onDelete}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function TimelineItem({
  communication,
  onEdit,
  onDelete,
}: {
  communication: Communication;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}) {
  const Icon = getIcon(communication.type);
  const isOutbound = communication.direction === "outbound";

  return (
    <div className="relative group">
      {/* Icon Node */}
      <div
        className={cn(
          "absolute -left-[35px] top-4 flex h-8 w-8 items-center justify-center rounded-full border-2 bg-background z-10",
          isOutbound
            ? "border-sky-500/20 text-sky-500"
            : "border-emerald-500/20 text-emerald-500",
          communication.type === "note" && "border-amber-500/20 text-amber-500",
        )}
      >
        <Icon className="h-4 w-4" />
      </div>

      <Card className="ml-2 hover:shadow-md transition-shadow">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span
                  className={cn(
                    "text-xs font-medium uppercase tracking-wider px-1.5 py-0.5 rounded",
                    isOutbound
                      ? "bg-sky-100 dark:bg-sky-900/30 text-sky-700 dark:text-sky-300"
                      : "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300",
                    communication.type === "note" &&
                      "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300",
                  )}
                >
                  {communication.type}
                </span>
                <span className="text-xs text-muted-foreground flex items-center">
                  {format(new Date(communication.createdAt), "h:mm a")}
                  <span className="mx-1">•</span>
                  {formatDistanceToNow(new Date(communication.createdAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>

              <h4 className="font-semibold text-base leading-tight">
                {communication.subject}
              </h4>

              {communication.type === "meeting" &&
                communication.meetingDate && (
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2 bg-muted/30 p-2 rounded-md">
                    <div className="flex items-center">
                      <Calendar className="mr-1.5 h-3.5 w-3.5" />
                      {format(new Date(communication.meetingDate), "PP")}
                    </div>
                    <div className="flex items-center">
                      <Clock className="mr-1.5 h-3.5 w-3.5" />
                      {format(new Date(communication.meetingDate), "p")}
                    </div>
                  </div>
                )}

              <div className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">
                {communication.content}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {onEdit && (
                  <DropdownMenuItem onClick={() => onEdit(communication.id)}>
                    <Pencil className="mr-2 h-4 w-4" /> Edit
                  </DropdownMenuItem>
                )}
                {onDelete && (
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onClick={() => onDelete(communication.id)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function getIcon(type: string) {
  switch (type) {
    case "email":
      return Mail;
    case "call":
      return Phone;
    case "meeting":
      return Video;
    case "message":
      return MessageSquare;
    case "note":
      return StickyNote;
    default:
      return MessageSquare;
  }
}
