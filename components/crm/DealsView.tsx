"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Calendar,
  DollarSign,
  User,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface DealsViewProps {
  onAddDeal: () => void;
}

export default function DealsView({ onAddDeal }: DealsViewProps) {
  const [search, setSearch] = useState("");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>("");

  const { data: pipelines, isLoading: pipelinesLoading } =
    trpc.pipeline.list.useQuery();

  // Auto-select first pipeline
  const activePipelineId = selectedPipelineId || pipelines?.[0]?.id || "";

  const {
    data: stages,
    isLoading: stagesLoading,
    refetch,
  } = trpc.deal.getByStage.useQuery(
    { pipelineId: activePipelineId },
    { enabled: !!activePipelineId },
  );

  const utils = trpc.useUtils();

  const moveStageMutation = trpc.deal.moveStage.useMutation({
    onSuccess: () => {
      toast.success("Deal moved");
      utils.deal.getByStage.invalidate();
      utils.deal.getStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const closeDealMutation = trpc.deal.close.useMutation({
    onSuccess: (data) => {
      toast.success(data.status === "WON" ? "Deal won! 🎉" : "Deal closed");
      utils.deal.getByStage.invalidate();
      utils.deal.getStats.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleMoveStage = (dealId: string, newStageId: string) => {
    moveStageMutation.mutate({ id: dealId, pipelineStageId: newStageId });
  };

  const handleClose = (dealId: string, won: boolean) => {
    closeDealMutation.mutate({ id: dealId, won });
  };

  const filterDeals = (deals: any[]) => {
    if (!search) return deals;
    const searchLower = search.toLowerCase();
    return deals.filter(
      (deal) =>
        deal.name.toLowerCase().includes(searchLower) ||
        deal.lead?.firstName?.toLowerCase().includes(searchLower) ||
        deal.lead?.companyName?.toLowerCase().includes(searchLower) ||
        deal.client?.name?.toLowerCase().includes(searchLower),
    );
  };

  const isLoading = pipelinesLoading || stagesLoading;

  if (isLoading && !stages) {
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

  if (!pipelines?.length) {
    return (
      <Card className="flex flex-col items-center justify-center p-8 text-center min-h-[400px]">
        <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
          <Plus className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold">No pipelines found</h3>
        <p className="text-muted-foreground mb-4 max-w-sm">
          Create your first pipeline to start managing deals.
        </p>
      </Card>
    );
  }

  const openStages = stages?.filter((s) => !s.isClosed) || [];

  return (
    <div className="space-y-4 w-full min-w-0">
      {/* Filters */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search deals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select value={activePipelineId} onValueChange={setSelectedPipelineId}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select pipeline" />
          </SelectTrigger>
          <SelectContent>
            {pipelines?.map((pipeline) => (
              <SelectItem key={pipeline.id} value={pipeline.id}>
                {pipeline.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Pipeline Kanban */}
      <div className="flex gap-4 overflow-x-auto pb-4 w-full min-w-0">
        {openStages.map((stage) => {
          const deals = filterDeals(stage.deals || []);
          const totalValue = deals.reduce((sum, d) => sum + d.value, 0);

          return (
            <div key={stage.id} className="min-w-[300px] shrink-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm">{stage.name}</h3>
                  <Badge variant="secondary" className="text-xs">
                    {deals.length}
                  </Badge>
                </div>
                <span className="text-xs text-muted-foreground">
                  ${totalValue.toLocaleString()}
                </span>
              </div>

              {/* Probability indicator */}
              <div className="h-1 bg-muted rounded-full mb-3 overflow-hidden">
                <div
                  className="h-full bg-primary transition-all"
                  style={{ width: `${stage.probability * 100}%` }}
                />
              </div>

              <div className="space-y-3 min-h-[400px] bg-muted/30 rounded-lg p-3">
                {deals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-32 text-center">
                    <p className="text-sm text-muted-foreground">
                      No deals in this stage
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-2"
                      onClick={onAddDeal}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add deal
                    </Button>
                  </div>
                ) : (
                  deals.map((deal: any) => (
                    <Card
                      key={deal.id}
                      className="cursor-pointer hover:shadow-md transition-shadow"
                    >
                      <CardHeader className="p-3 pb-2">
                        <div className="flex items-start justify-between">
                          <CardTitle className="text-sm font-medium line-clamp-1">
                            {deal.name}
                          </CardTitle>
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
                              {openStages
                                .filter((s) => s.id !== stage.id)
                                .map((s) => (
                                  <DropdownMenuItem
                                    key={s.id}
                                    onClick={() =>
                                      handleMoveStage(deal.id, s.id)
                                    }
                                  >
                                    <ArrowRight className="h-4 w-4 mr-2" />
                                    Move to {s.name}
                                  </DropdownMenuItem>
                                ))}
                              <DropdownMenuItem
                                onClick={() => handleClose(deal.id, true)}
                                className="text-green-600"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Mark as Won
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleClose(deal.id, false)}
                                className="text-red-600"
                              >
                                <XCircle className="h-4 w-4 mr-2" />
                                Mark as Lost
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardHeader>
                      <CardContent className="p-3 pt-0">
                        <div className="space-y-2">
                          {/* Contact */}
                          {(deal.lead || deal.client) && (
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span className="truncate">
                                {deal.lead
                                  ? `${deal.lead.firstName} ${deal.lead.lastName}`
                                  : deal.client?.name}
                              </span>
                            </div>
                          )}

                          {/* Value and close date */}
                          <div className="flex items-center justify-between pt-2 border-t">
                            <div className="flex items-center gap-1">
                              <DollarSign className="h-3 w-3 text-green-600" />
                              <span className="text-sm font-semibold">
                                ${deal.value.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Calendar className="h-3 w-3" />
                              {format(
                                new Date(deal.expectedCloseDate),
                                "MMM d",
                              )}
                            </div>
                          </div>

                          {/* Next step */}
                          {deal.nextStep && (
                            <div className="text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                              Next: {deal.nextStep}
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
    </div>
  );
}
