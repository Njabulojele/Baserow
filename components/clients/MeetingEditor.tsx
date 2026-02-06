"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Calendar as CalendarIcon,
  Clock,
  CheckSquare,
  Loader2,
  Save,
  Trash2,
} from "lucide-react";
import { format } from "date-fns";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { cn } from "@/lib/utils";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";

const meetingSchema = z.object({
  title: z.string().min(1, "Title required"),
  date: z.date(),
  duration: z.coerce.number().min(5),
  notes: z.string().optional(),
});

interface MeetingEditorProps {
  meetingId?: string | null;
  clientId?: string;
  projectId?: string;
  onClose: () => void;
  onSave?: () => void;
}

export function MeetingEditor({
  meetingId,
  clientId,
  projectId,
  onClose,
  onSave,
}: MeetingEditorProps) {
  const [actionItemTitle, setActionItemTitle] = useState("");
  const utils = trpc.useUtils();

  const { data: meeting, isLoading: isMeetingLoading } =
    trpc.meeting.getMeetings.useQuery(
      { clientId, projectId },
      {
        select: (meetings) => meetings.find((m) => m.id === meetingId),
        enabled: !!meetingId,
      },
    );

  const createMeeting = trpc.meeting.createMeeting.useMutation({
    onSuccess: (data) => {
      utils.meeting.getMeetings.invalidate();
      onSave?.();
    },
  });

  const updateMeeting = trpc.meeting.updateMeeting.useMutation({
    onSuccess: () => {
      utils.meeting.getMeetings.invalidate();
    },
  });

  const createActionItem = trpc.meeting.createActionItem.useMutation({
    onSuccess: () => {
      setActionItemTitle("");
      utils.meeting.getMeetings.invalidate();
    },
  });

  const form = useForm<z.infer<typeof meetingSchema>>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      title: "",
      date: new Date(),
      duration: 30,
      notes: "",
    },
    values: meeting
      ? {
          title: meeting.title,
          date: new Date(meeting.scheduledAt),
          duration: meeting.duration,
          notes: meeting.meetingNotes || "",
        }
      : undefined,
  });

  async function onSubmit(values: z.infer<typeof meetingSchema>) {
    if (meetingId) {
      await updateMeeting.mutateAsync({
        id: meetingId,
        ...values,
      });
    } else {
      await createMeeting.mutateAsync({
        ...values,
        clientId,
        projectId,
      });
      onClose(); // Close on create, keep open on update
    }
  }

  const handleCreateActionItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingId || !actionItemTitle.trim()) return;
    createActionItem.mutate({
      meetingId,
      title: actionItemTitle,
    });
  };

  const isLoading = isMeetingLoading || createMeeting.isPending;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h2 className="text-lg font-semibold">
            {meetingId ? "Edit Meeting" : "New Meeting"}
          </h2>
          <p className="text-sm text-muted-foreground">
            {meetingId
              ? "Update details and manage tasks"
              : "Schedule a log a new interaction"}
          </p>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Main Form */}
        <div className="space-y-4">
          <form
            id="meeting-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label>Title</Label>
              <Input {...form.register("title")} placeholder="Weekly Sync..." />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Date</Label>
                <Popover modal={true}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal truncate",
                        !form.getValues("date") && "text-muted-foreground",
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4 shrink-0" />
                      {form.getValues("date") ? (
                        <span className="truncate">
                          {format(form.getValues("date"), "PPP")}
                        </span>
                      ) : (
                        <span>Pick a date</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={form.getValues("date")}
                      onSelect={(date) => date && form.setValue("date", date)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Duration (min)</Label>
                <Input type="number" {...form.register("duration")} />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Notes (Markdown supported)</Label>
              <Textarea
                {...form.register("notes")}
                className="min-h-[200px] font-mono text-sm"
                placeholder="- Point 1\n- Point 2..."
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {meetingId ? "Save Changes" : "Create Meeting"}
            </Button>
          </form>
        </div>

        {/* Action Items Column (Only visible if meeting created) */}
        {meetingId ? (
          <div className="space-y-4 border-l pl-6">
            <div className="flex items-center gap-2 mb-4">
              <CheckSquare className="h-5 w-5 text-indigo-500" />
              <h3 className="font-medium">Action Items</h3>
            </div>

            <form onSubmit={handleCreateActionItem} className="flex gap-2">
              <Input
                placeholder="Add an action item..."
                value={actionItemTitle}
                onChange={(e) => setActionItemTitle(e.target.value)}
              />
              <Button
                size="icon"
                type="submit"
                disabled={createActionItem.isPending}
              >
                <PlusIcon className="h-4 w-4" />
              </Button>
            </form>

            <div className="space-y-2 mt-4">
              {meeting?.tasks.length === 0 && (
                <p className="text-sm text-muted-foreground italic">
                  No action items yet.
                </p>
              )}
              {meeting?.tasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-2 p-2 border rounded-md bg-card"
                >
                  <div
                    className={cn(
                      "w-4 h-4 rounded-sm border mr-2",
                      task.status === "done"
                        ? "bg-primary border-primary"
                        : "border-muted-foreground",
                    )}
                  />
                  <span
                    className={cn(
                      "text-sm",
                      task.status === "done" &&
                        "line-through text-muted-foreground",
                    )}
                  >
                    {task.title}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center border-l bg-muted/10 text-muted-foreground p-8 text-center text-sm">
            Save the meeting first to add action items.
          </div>
        )}
      </div>
    </div>
  );
}

function PlusIcon(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}
