"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Activity,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  Users,
  Search,
  Plus,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

const ACTIVITY_TYPES = [
  { value: "CALL", label: "Call", icon: Phone },
  { value: "EMAIL", label: "Email", icon: Mail },
  { value: "MEETING", label: "Meeting", icon: Calendar },
  { value: "NOTE", label: "Note", icon: MessageSquare },
];

export default function ActivitiesPage() {
  const [type, setType] = useState("CALL");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [selectedLeadId, setSelectedLeadId] = useState("");
  const [selectedClientId, setSelectedClientId] = useState("");
  const [search, setSearch] = useState("");

  const utils = trpc.useUtils();
  const { data: activities, isLoading: activitiesLoading } =
    trpc.crmActivity.list.useQuery({});
  const { data: leadsData } = trpc.crmLead.list.useQuery();
  const leads = leadsData?.leads;
  const { data: clients } = trpc.clients.getClients.useQuery();

  const createActivity = trpc.crmActivity.create.useMutation({
    onSuccess: () => {
      toast.success("Activity logged");
      resetForm();
      utils.crmActivity.list.invalidate();
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

  const getActivityIcon = (type: string) => {
    const found = ACTIVITY_TYPES.find((t) => t.value === type);
    const Icon = found?.icon || Activity;
    return <Icon className="h-4 w-4" />;
  };

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="flex items-center justify-between shrink-0 mb-6">
        <div className="flex items-center gap-2">
          <Activity className="h-8 w-8 text-accent" />
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white-smoke">
              Activities
            </h2>
            <p className="text-muted-foreground">Log and track interactions</p>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-12 flex-1 overflow-hidden min-h-0">
        {/* Form (Left) */}
        <Card className="md:col-span-5 h-fit bg-card border-none shadow-sm">
          <CardHeader>
            <CardTitle className="text-white-smoke">Log New Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Type */}
              <div className="space-y-2">
                <Label className="text-white-smoke">Activity Type *</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ACTIVITY_TYPES.map((t) => (
                    <Button
                      key={t.value}
                      type="button"
                      variant={type === t.value ? "default" : "outline"}
                      className={
                        type === t.value
                          ? "bg-accent text-white"
                          : "border-border text-muted-foreground hover:bg-muted/50"
                      }
                      onClick={() => setType(t.value)}
                    >
                      <t.icon className="mr-2 h-4 w-4" />
                      {t.label}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Subject */}
              <div className="space-y-2">
                <Label htmlFor="subject" className="text-white-smoke">
                  Subject *
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Follow-up call about proposal"
                  className="bg-black/20 border-border"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white-smoke">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Details about the interaction..."
                  className="bg-black/20 border-border h-24"
                />
              </div>

              {/* Related To (Lead) */}
              <div className="space-y-2">
                <Label className="text-white-smoke">Lead</Label>
                <Select
                  value={selectedLeadId}
                  onValueChange={setSelectedLeadId}
                >
                  <SelectTrigger className="bg-black/20 border-border">
                    <SelectValue placeholder="Select a lead" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">None</SelectItem>
                    {leadsData?.leads?.map((lead) => (
                      <SelectItem key={lead.id} value={lead.id}>
                        {lead.firstName} {lead.lastName}
                        {lead.companyName && ` - ${lead.companyName}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Related To (Client) */}
              <div className="space-y-2">
                <Label className="text-white-smoke">Client</Label>
                <Select
                  value={selectedClientId}
                  onValueChange={setSelectedClientId}
                >
                  <SelectTrigger className="bg-black/20 border-border">
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

              <Button
                type="submit"
                className="w-full bg-accent hover:bg-accent/90 text-white font-bold"
                disabled={createActivity.isPending}
              >
                {createActivity.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Logging...
                  </>
                ) : (
                  "Log Activity"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* List (Right) */}
        <Card className="md:col-span-7 flex flex-col overflow-hidden bg-card border-none shadow-sm">
          <CardHeader className="shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white-smoke">Activity Log</CardTitle>
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8 h-9 bg-black/20 border-border"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-4">
              {activitiesLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex gap-4">
                      <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                        <div className="h-3 w-48 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                activities?.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex gap-4 p-3 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors bg-black/5"
                  >
                    <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center text-accent ring-2 ring-accent/20 shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-start gap-2">
                        <h4 className="font-semibold text-sm text-white-smoke truncate">
                          {activity.subject}
                        </h4>
                        <span className="text-[10px] text-muted-foreground shrink-0 mt-1">
                          {format(
                            new Date(activity.completedAt),
                            "MMM d, HH:mm",
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2 italic">
                        {activity.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                        {(activity.lead || activity.client) && (
                          <span className="flex items-center gap-1 font-medium text-foreground/70">
                            <Users className="h-3 w-3 text-accent" />
                            {activity.lead
                              ? `${activity.lead.firstName} ${activity.lead.lastName} (Lead)`
                              : `${activity.client?.name} (Client)`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
              {activities?.length === 0 && (
                <div className="text-center py-12 text-muted-foreground">
                  No activities found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
