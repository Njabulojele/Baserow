"use client";

import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search,
  Plus,
  MoreHorizontal,
  ArrowRight,
  Mail,
  Phone,
  Building2,
  Star,
  UserCheck,
  Loader2,
} from "lucide-react";
import { CrmLeadStatus } from "@prisma/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface LeadsKanbanProps {
  onAddLead: () => void;
}

const STATUS_COLUMNS: {
  status: CrmLeadStatus;
  label: string;
  color: string;
}[] = [
  { status: "NEW", label: "New", color: "bg-blue-500" },
  { status: "CONTACTED", label: "Contacted", color: "bg-yellow-500" },
  { status: "QUALIFIED", label: "Qualified", color: "bg-purple-500" },
  { status: "PROPOSAL_SENT", label: "Proposal", color: "bg-orange-500" },
  { status: "NEGOTIATION", label: "Negotiation", color: "bg-pink-500" },
  { status: "WON", label: "Won", color: "bg-green-500" },
  { status: "LOST", label: "Lost", color: "bg-gray-500" },
];

export default function LeadsKanban({ onAddLead }: LeadsKanbanProps) {
  const [search, setSearch] = useState("");
  const [convertLeadId, setConvertLeadId] = useState<string | null>(null);

  const {
    data: leadsByStatus,
    isLoading,
    refetch,
  } = trpc.crmLead.getByStatus.useQuery();
  const utils = trpc.useUtils();

  const updateStatusMutation = trpc.crmLead.update.useMutation({
    onSuccess: () => {
      toast.success("Lead status updated");
      utils.crmLead.getByStatus.invalidate();
      utils.crmLead.getStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const convertToClientMutation = trpc.crmLead.convertToClient.useMutation({
    onSuccess: () => {
      toast.success("Lead converted to client!");
      utils.crmLead.getByStatus.invalidate();
      utils.crmLead.getStats.invalidate();
      utils.analytics.getRevenueOverview.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleStatusChange = (leadId: string, newStatus: CrmLeadStatus) => {
    updateStatusMutation.mutate({ id: leadId, status: newStatus });
  };

  const handleConvert = (leadId: string) => {
    setConvertLeadId(leadId);
  };

  const confirmConvert = () => {
    if (convertLeadId) {
      convertToClientMutation.mutate({ id: convertLeadId });
      setConvertLeadId(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-500";
    if (score >= 40) return "text-yellow-500";
    return "text-red-500";
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="space-y-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ))}
      </div>
    );
  }

  // Filter leads before display
  const filterLeads = (leads: any[]) => {
    if (!search) return leads;
    const searchLower = search.toLowerCase();
    return leads.filter(
      (lead) =>
        lead.firstName.toLowerCase().includes(searchLower) ||
        lead.lastName.toLowerCase().includes(searchLower) ||
        lead.companyName.toLowerCase().includes(searchLower) ||
        lead.email.toLowerCase().includes(searchLower),
    );
  };

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Search and filters */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search leads..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
      </div>

      {/* Kanban columns - show only active statuses for cleaner UI */}
      <div className="flex gap-4 overflow-x-auto pb-4 items-start h-full w-full min-w-0">
        {STATUS_COLUMNS.filter(
          (col) => col.status !== "WON" && col.status !== "LOST",
        ).map((column) => {
          const leads = filterLeads(leadsByStatus?.[column.status] || []);

          return (
            <div key={column.status} className="min-w-[280px] shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className={cn("w-2 h-2 rounded-full", column.color)} />
                  <h3 className="font-semibold text-sm">{column.label}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {leads.length}
                  </Badge>
                </div>
              </div>

              <div className="space-y-3 min-h-[400px] max-h-[600px] overflow-y-auto bg-muted/30 rounded-lg p-3 scrollbar-hide!important ">
                {leads.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <p className="text-sm text-muted-foreground">
                      No leads in this stage
                    </p>
                    {column.status === "NEW" && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="mt-2"
                        onClick={onAddLead}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add lead
                      </Button>
                    )}
                  </div>
                ) : (
                  leads.map((lead: any) => (
                    <Card
                      key={lead.id}
                      className="cursor-pointer hover:shadow-md transition-shadow "
                    >
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <CardTitle className="text-sm font-medium">
                              {lead.firstName} {lead.lastName}
                            </CardTitle>
                            <div className="flex items-center text-xs text-muted-foreground">
                              <Building2 className="h-3 w-3 mr-1" />
                              {lead.companyName}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {STATUS_COLUMNS.filter(
                                (s) => s.status !== column.status,
                              ).map((s) => (
                                <DropdownMenuItem
                                  key={s.status}
                                  onClick={() =>
                                    handleStatusChange(lead.id, s.status)
                                  }
                                  disabled={updateStatusMutation.isPending}
                                >
                                  {updateStatusMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  ) : (
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                  )}
                                  Move to {s.label}
                                </DropdownMenuItem>
                              ))}
                              <DropdownMenuItem
                                onClick={() => handleConvert(lead.id)}
                                className="text-green-600"
                                disabled={convertToClientMutation.isPending}
                              >
                                {convertToClientMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                  <UserCheck className="h-4 w-4 mr-2" />
                                )}
                                Convert to Client
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="space-y-2">
                          {/* Contact info */}
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            <span className="truncate">{lead.email}</span>
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Phone className="h-3 w-3" />
                              <span>{lead.phone}</span>
                            </div>
                          )}

                          {/* Score and value */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-1">
                              <Star
                                className={cn(
                                  "h-3 w-3",
                                  getScoreColor(lead.score),
                                )}
                              />
                              <span
                                className={cn(
                                  "text-xs font-medium",
                                  getScoreColor(lead.score),
                                )}
                              >
                                {Math.round(lead.score)}
                              </span>
                            </div>
                            {lead.estimatedValue && (
                              <span className="text-xs font-medium">
                                ${lead.estimatedValue.toLocaleString()}
                              </span>
                            )}
                          </div>

                          {/* Tags */}
                          {lead.tags && lead.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {lead.tags.slice(0, 2).map((tag: string) => (
                                <Badge
                                  key={tag}
                                  variant="outline"
                                  className="text-[10px] px-1.5"
                                >
                                  {tag}
                                </Badge>
                              ))}
                              {lead.tags.length > 2 && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] px-1.5"
                                >
                                  +{lead.tags.length - 2}
                                </Badge>
                              )}
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Convert to Client Confirmation Dialog */}
      <AlertDialog
        open={!!convertLeadId}
        onOpenChange={(open) => {
          if (!open) setConvertLeadId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Convert Lead to Client</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to convert this lead to a client? This will
              mark the lead as won and create a new client record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmConvert}
              className="bg-green-600 hover:bg-green-700"
            >
              {convertToClientMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />{" "}
                  Converting...
                </>
              ) : (
                <>
                  <UserCheck className="h-4 w-4 mr-2" /> Convert to Client
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
