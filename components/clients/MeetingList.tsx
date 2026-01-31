"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Plus, Calendar, Clock, FileText, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

interface MeetingListProps {
  clientId?: string;
  projectId?: string;
  onSelectMeeting: (meetingId: string) => void;
  onCreateMeeting: () => void;
}

export function MeetingList({
  clientId,
  projectId,
  onSelectMeeting,
  onCreateMeeting,
}: MeetingListProps) {
  const { data: meetings, isLoading } = trpc.meeting.getMeetings.useQuery({
    clientId,
    projectId,
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
          Meeting History
        </h3>
        <Button
          onClick={onCreateMeeting}
          size="sm"
          variant="outline"
          className="h-8 gap-1"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Meeting
        </Button>
      </div>

      {meetings?.length === 0 ? (
        <div className="text-center py-12 border border-dashed rounded-lg bg-muted/20">
          <Calendar className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">
            No meetings recorded yet.
          </p>
          <Button
            variant="link"
            onClick={onCreateMeeting}
            className="text-indigo-600"
          >
            Log your first meeting
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {meetings?.map((meeting) => (
            <Card
              key={meeting.id}
              className="hover:bg-muted/40 transition-colors cursor-pointer group border-l-4 border-l-transparent hover:border-l-indigo-500"
              onClick={() => onSelectMeeting(meeting.id)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{meeting.title}</span>
                    {meeting.tasks.length > 0 && (
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {meeting.tasks.length} Action Items
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5" />
                      {format(new Date(meeting.scheduledAt), "MMM d, yyyy")}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {meeting.duration} min
                    </span>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
