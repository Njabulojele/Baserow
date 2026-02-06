"use client";

import { useState } from "react";
import {
  Activity,
  Plus,
  Phone,
  Mail,
  Video,
  FileText,
  Users,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call", icon: Phone },
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "MEETING", label: "Meeting", icon: Video },
  { value: "NOTE", label: "Note", icon: FileText },
  { value: "OTHER", label: "Other", icon: Activity },
];

export default function ActivitiesPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<string>("CALL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState<string>("");
  const [selectedClientId, setSelectedClientId] = useState<string>("");

  const utils = trpc.useUtils();

  const { data: activities, isLoading } = trpc.crmActivity.list.useQuery({
    limit: 50,
  });

  const { data: leadsData } = trpc.crmLead.list.useQuery({});
  const leads = leadsData?.leads;
  const { data: clients } = trpc.clients.getClients.useQuery({});

  const createActivity = trpc.crmActivity.create.useMutation({
    onSuccess: () => {
      toast.success("Activity logged!");
      utils.crmActivity.list.invalidate();
      setIsOpen(false);
      resetForm();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const resetForm = () => {
    setSubject("");
    setDescription("");
    setType("CALL");
    setSelectedLeadId("");
    setSelectedClientId("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim()) {
      toast.error("Subject is required");
      return;
    }

    createActivity.mutate({
      type: type as any,
      subject,
      description,
      leadId:
        selectedLeadId && selectedLeadId !== "__none__"
          ? selectedLeadId
          : undefined,
      clientId:
        selectedClientId && selectedClientId !== "__none__"
          ? selectedClientId
          : undefined,
    });
  };

  const getActivityIcon = (activityType: string) => {
    const found = ACTIVITY_TYPES.find((t) => t.value === activityType);
    const Icon = found?.icon || Activity;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="p-4 md:p-8 pt-6 overflow-hidden w-full min-w-0 flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-500" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight">
              Recent Activities
            </h2>
            <p className="text-muted-foreground">Log of all interactions</p>
          </div>
        </div>

        {/* Log Activity Button */}
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Log Activity
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Log New Activity</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-4">
              {/* Activity Type */}
              <div className="space-y-2">
                <Label>Activity Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        <div className="flex items-center gap-2">
                          <t.icon className="h-4 w-4" />
                          {t.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Follow-up call about proposal"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about this activity..."
                  className="min-h-[80px]"
                />
              </div>

              {/* Link to Lead (Optional) */}
              <div className="space-y-2">
                <Label>Link to Lead (Optional)</Label>
                <Select
                  value={selectedLeadId}
                  onValueChange={setSelectedLeadId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {leads?.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName}
                        {lead.company && ` - ${lead.company}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Link to Client (Optional) */}
              <div className="space-y-2">
                <Label>Link to Client (Optional)</Label>
                <Select
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {clients?.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                        {client.companyName && ` - ${client.companyName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={createActivity.isPending}>
                  {createActivity.isPending ? "Saving..." : "Log Activity"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-4 bg-muted/20 p-4 rounded-lg">
        {isLoading && (
          <div className="text-center p-4">Loading activities...</div>
        )}

        {activities?.map((activity) => (
          <div
            key={activity.id}
            className="flex items-start gap-4 p-4 bg-card border rounded-lg shadow-sm"
          >
            <div className="p-2 bg-blue-100 rounded-full text-blue-600">
              {getActivityIcon(activity.type)}
            </div>
            <div className="flex-1">
              <div className="flex justify-between">
                <h4 className="font-semibold">{activity.subject}</h4>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(activity.completedAt), {
                    addSuffix: true,
                  })}
                </span>
              </div>
              {activity.description && (
                <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                  {activity.description}
                </p>
              )}
              <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                <span className="bg-white text-black px-2 py-0.5 rounded">
                  {activity.type}
                </span>
                {activity.lead && (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {activity.lead.firstName} {activity.lead.lastName}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}
        {activities?.length === 0 && (
          <div className="text-center py-10 text-muted-foreground">
            No recent activities found. Click "Log Activity" to create one!
          </div>
        )}
      </div>
    </div>
  );
}
