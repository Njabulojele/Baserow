"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResearchCreationModal } from "@/components/research/ResearchCreationModal";
import { formatDistanceToNow } from "date-fns";
import { Search, Plus, Loader2, Trash2, Star } from "lucide-react";
import { ResearchStatus } from "@prisma/client";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

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

export default function ResearchPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [researchToDelete, setResearchToDelete] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<
    ResearchStatus | undefined
  >();
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);

  const utils = trpc.useUtils();
  const deleteMutation = trpc.research.delete.useMutation();

  const { data: researches, isLoading } = trpc.research.list.useQuery({
    status: statusFilter,
    isFavorited: showFavoritesOnly || undefined,
  });

  const toggleFavorite = trpc.research.toggleFavorite.useMutation({
    onMutate: async ({ id }) => {
      await utils.research.list.cancel();
      const previousResearches = utils.research.list.getData({
        status: statusFilter,
        isFavorited: showFavoritesOnly || undefined,
      });

      utils.research.list.setData(
        { status: statusFilter, isFavorited: showFavoritesOnly || undefined },
        (old) => {
          if (!old) return old;
          return old.map((r) =>
            r.id === id ? { ...r, isFavorited: !r.isFavorited } : r,
          );
        },
      );
      return { previousResearches };
    },
    onError: (_, __, context) => {
      utils.research.list.setData(
        { status: statusFilter, isFavorited: showFavoritesOnly || undefined },
        context?.previousResearches,
      );
      toast.error("Failed to toggle favorite");
    },
    onSettled: () => {
      utils.research.list.invalidate();
    },
  });

  const handleDeleteClick = (id: string) => setResearchToDelete(id);

  const confirmDelete = async () => {
    if (!researchToDelete) return;
    try {
      await deleteMutation.mutateAsync({ id: researchToDelete });
      toast.success("Research deleted");
      setResearchToDelete(null);
      utils.research.list.invalidate();
    } catch {
      toast.error("Failed to delete research");
    }
  };

  const getStatusBadge = (status: ResearchStatus) => {
    switch (status) {
      case "COMPLETED":
        return "bg-blu/15 text-blu border-blu/20";
      case "IN_PROGRESS":
        return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "FAILED":
        return "bg-red-500/10 text-red-400 border-red-500/20";
      case "CANCELLED":
        return "bg-muted text-muted-foreground border-muted";
      default:
        return "bg-muted text-muted-foreground border-muted";
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8 md:mb-10">
        <div>
          <h1 className="text-2xl font-mono font-light tracking-tight text-white">
            Research
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            AI-powered deep research and lead generation
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-blu hover:bg-blu/90 text-white font-mono text-xs h-9 px-5"
        >
          <Plus className="w-3.5 h-3.5 mr-2" /> New Research
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        {[
          {
            label: "All",
            filter: undefined as ResearchStatus | undefined,
            fav: false,
          },
          {
            label: "In Progress",
            filter: "IN_PROGRESS" as ResearchStatus,
            fav: false,
          },
          {
            label: "Completed",
            filter: "COMPLETED" as ResearchStatus,
            fav: false,
          },
        ].map(({ label, filter, fav }) => (
          <Button
            key={label}
            variant="outline"
            size="sm"
            onClick={() => {
              setStatusFilter(filter);
              setShowFavoritesOnly(false);
            }}
            className={cn(
              "font-mono text-xs h-8 border-border",
              statusFilter === filter && !showFavoritesOnly
                ? "bg-charcoal text-eggshell border-charcoal"
                : "text-muted-foreground hover:text-alabaster hover:border-charcoal",
            )}
          >
            {label}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setShowFavoritesOnly(!showFavoritesOnly);
            setStatusFilter(undefined);
          }}
          className={cn(
            "font-mono text-xs h-8 border-border",
            showFavoritesOnly
              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
              : "text-muted-foreground hover:text-alabaster hover:border-charcoal",
          )}
        >
          <Star
            className={cn(
              "w-3.5 h-3.5 mr-1.5",
              showFavoritesOnly && "fill-amber-400",
            )}
          />
          Favorites
        </Button>
      </div>

      {/* Research Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="w-6 h-6 text-blu animate-spin mb-4" />
          <p className="text-sm text-muted-foreground font-mono">Loading...</p>
        </div>
      ) : researches && researches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {researches.map((research) => (
            <Link key={research.id} href={`/research/${research.id}`}>
              <Card className="bg-card border-border p-5 hover:border-charcoal transition-all cursor-pointer h-full flex flex-col group">
                {/* Header */}
                <div className="flex items-center justify-between mb-4 gap-2">
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-[10px] font-mono h-5 px-2 border",
                      getStatusBadge(research.status),
                    )}
                  >
                    {research.status.replace(/_/g, " ")}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "h-7 w-7 rounded-full",
                        research.isFavorited
                          ? "text-amber-400"
                          : "text-muted-foreground hover:text-amber-400",
                      )}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleFavorite.mutate({ id: research.id });
                      }}
                    >
                      <Star
                        className={cn(
                          "w-3.5 h-3.5",
                          research.isFavorited && "fill-amber-400",
                        )}
                      />
                    </Button>
                  </div>
                </div>

                {/* Title */}
                <h3 className="text-base font-medium text-white mb-1 group-hover:text-eggshell transition-colors leading-tight">
                  {research.title}
                </h3>
                <p className="text-[11px] text-muted-foreground mb-5 font-mono uppercase tracking-wider">
                  {research.scope.replace(/_/g, " ")}
                  {research.goal && (
                    <span className="text-blu/60 ml-2">
                      · {research.goal.title.substring(0, 20)}
                    </span>
                  )}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-auto">
                  {[
                    { label: "Sources", value: research._count.sources },
                    { label: "Insights", value: research._count.insights },
                    { label: "Actions", value: research._count.actionItems },
                  ].map(({ label, value }) => (
                    <div
                      key={label}
                      className="text-center p-2 bg-background/50 rounded-md border border-border/50"
                    >
                      <p className="text-[9px] text-muted-foreground font-mono uppercase tracking-wider">
                        {label}
                      </p>
                      <p className="text-sm font-mono font-medium text-alabaster tabular-nums">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="mt-5 pt-4 border-t border-border/50 flex justify-between items-end">
                  <div className="flex-1">
                    {research.status === "IN_PROGRESS" ? (
                      <div>
                        <div className="w-full bg-border/50 rounded-full h-[2px] mb-2">
                          <div
                            className="bg-blu h-[2px] rounded-full transition-all duration-700"
                            style={{ width: `${research.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                          <span>{research.progress}%</span>
                          <span>
                            {formatDistanceToNow(new Date(research.createdAt))}{" "}
                            ago
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {research.completedAt
                          ? `${formatDistanceToNow(new Date(research.completedAt))} ago`
                          : `Started ${formatDistanceToNow(new Date(research.createdAt))} ago`}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2 text-muted-foreground hover:text-destructive hover:bg-transparent"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteClick(research.id);
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-card rounded-lg border border-border border-dashed">
          <Search className="w-8 h-8 mx-auto text-muted-foreground/40 mb-4" />
          <h3 className="text-base font-medium text-alabaster mb-2">
            No research found
          </h3>
          <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
            Start your first research to uncover deep insights and generate
            leads.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-blu hover:bg-blu/90 text-white font-mono text-xs h-9 px-5"
          >
            <Plus className="w-3.5 h-3.5 mr-2" /> New Research
          </Button>
        </div>
      )}

      <ResearchCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Delete Dialog */}
      <AlertDialog
        open={!!researchToDelete}
        onOpenChange={(open) => !open && setResearchToDelete(null)}
      >
        <AlertDialogContent className="bg-card border-border text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle className="font-mono text-sm">
              DELETE RESEARCH
            </AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-xs">
              This permanently deletes the research and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-border text-alabaster hover:bg-charcoal hover:text-white font-mono text-xs">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90 text-white border-0 font-mono text-xs"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1.5" />
              ) : (
                <Trash2 className="w-3 h-3 mr-1.5" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
