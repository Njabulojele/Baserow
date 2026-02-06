"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format } from "date-fns";
import { CalendarIcon, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";
import { useState } from "react";

const communicationSchema = z.object({
  type: z.enum(["email", "call", "meeting", "message", "note"]),
  direction: z.enum(["inbound", "outbound"]),
  subject: z.string().min(1, "Subject is required"),
  content: z.string().min(1, "Content is required"),
  date: z.date().optional(), // Used for meetingDate
  sentiment: z.enum(["positive", "neutral", "negative"]).optional(),
});

type CommunicationFormValues = z.infer<typeof communicationSchema>;

interface CommunicationFormProps {
  clientId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function CommunicationForm({
  clientId,
  onSuccess,
  onCancel,
}: CommunicationFormProps) {
  const utils = trpc.useUtils();
  const [dateOpen, setDateOpen] = useState(false);

  // Use 'any' to bypass strict RHF types if needed, but try standard first
  const form = useForm<CommunicationFormValues>({
    resolver: zodResolver(communicationSchema),
    defaultValues: {
      type: "email",
      direction: "outbound",
      subject: "",
      content: "",
      sentiment: "neutral",
    },
  });

  const createMutation = trpc.communication.createCommunication.useMutation({
    onSuccess: () => {
      toast.success("Communication logged");
      utils.communication.getCommunications.invalidate({ clientId });
      utils.clients.getClient.invalidate({ id: clientId }); // Refresh last interaction
      form.reset();
      onSuccess?.();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  function onSubmit(data: CommunicationFormValues) {
    createMutation.mutate({
      clientId,
      type: data.type,
      direction: data.direction,
      subject: data.subject,
      content: data.content,
      sentiment: data.sentiment,
      meetingDate: data.type === "meeting" ? data.date : undefined,
    });
  }

  const type = form.watch("type");

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="email">Email</SelectItem>
                    <SelectItem value="call">Call</SelectItem>
                    <SelectItem value="meeting">Meeting</SelectItem>
                    <SelectItem value="message">Message</SelectItem>
                    <SelectItem value="note">Note</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="direction"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Direction</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Direction" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="outbound">Outbound (Sent)</SelectItem>
                    <SelectItem value="inbound">Inbound (Received)</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="subject"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Subject</FormLabel>
              <FormControl>
                <Input placeholder="Re: Project Proposal..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        {type === "meeting" && (
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Meeting Date</FormLabel>
                <Popover open={dateOpen} onOpenChange={setDateOpen}>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground",
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={(date) => {
                        field.onChange(date);
                        setDateOpen(false);
                      }}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <FormField
          control={form.control}
          name="content"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Content / Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Details about the conversation..."
                  className="min-h-[120px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          {onCancel && (
            <Button type="button" variant="ghost" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button type="submit" disabled={createMutation.isPending}>
            {createMutation.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Log Communication
          </Button>
        </div>
      </form>
    </Form>
  );
}
