"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ResearchCreationModal } from "@/components/research/ResearchCreationModal";
import { formatDistanceToNow } from "date-fns";
import { Search, Plus, Loader2, Trash2 } from "lucide-react";
import { ResearchStatus } from "@prisma/client";
import Link from "next/link";
import { toast } from "sonner";

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

  const utils = trpc.useUtils();
  const deleteMutation = trpc.research.delete.useMutation();

  const { data: researches, isLoading } = trpc.research.list.useQuery({
    status: statusFilter,
  });

  const handleDeleteClick = (id: string) => {
    setResearchToDelete(id);
  };

  const confirmDelete = async () => {
    if (!researchToDelete) return;

    try {
      await deleteMutation.mutateAsync({ id: researchToDelete });
      toast.success("Research deleted");
      setResearchToDelete(null);
      utils.research.list.invalidate();
    } catch (error) {
      toast.error("Failed to delete research");
    }
  };

  const getStatusColor = (status: ResearchStatus) => {
    switch (status) {
      case "COMPLETED":
        return "bg-[#a9927d] text-white";
      case "IN_PROGRESS":
        return "bg-[#6b9080] text-white";
      case "FAILED":
        return "bg-red-500 text-white";
      case "CANCELLED":
        return "bg-gray-500 text-white";
      default:
        return "bg-gray-500 text-white";
    }
  };

  const getStatusIcon = (status: ResearchStatus) => {
    switch (status) {
      case "COMPLETED":
        return "✅";
      case "IN_PROGRESS":
        return "⏳";
      case "FAILED":
        return "❌";
      case "CANCELLED":
        return "🚫";
      default:
        return "⏸️";
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Research Agent</h1>
          <p className="text-muted-foreground mt-1">
            AI-powered deep research and lead generation
          </p>
        </div>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="bg-[#a9927d] hover:bg-[#8f7a68] text-white"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Research
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2 mb-8">
        <Button
          variant={statusFilter === undefined ? "default" : "outline"}
          onClick={() => setStatusFilter(undefined)}
          size="sm"
          className={statusFilter === undefined ? "bg-[#2f3e46]" : ""}
        >
          All
        </Button>
        <Button
          variant={statusFilter === "IN_PROGRESS" ? "default" : "outline"}
          onClick={() => setStatusFilter("IN_PROGRESS")}
          size="sm"
          className={statusFilter === "IN_PROGRESS" ? "bg-[#6b9080]" : ""}
        >
          In Progress
        </Button>
        <Button
          variant={statusFilter === "COMPLETED" ? "default" : "outline"}
          onClick={() => setStatusFilter("COMPLETED")}
          size="sm"
          className={statusFilter === "COMPLETED" ? "bg-[#a9927d]" : ""}
        >
          Completed
        </Button>
      </div>

      {/* Research Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="w-12 h-12 text-[#a9927d] animate-spin mb-4" />
          <p className="text-muted-foreground">Loading your research labs...</p>
        </div>
      ) : researches && researches.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {researches.map((research) => (
            <Link key={research.id} href={`/research/${research.id}`}>
              <Card className="bg-[#1a252f] border-[#2f3e46] p-6 hover:border-[#a9927d] transition-all cursor-pointer h-full flex flex-col group">
                {/* Status & Goal */}
                <div className="flex items-center justify-between mb-4">
                  <Badge className={getStatusColor(research.status)}>
                    {getStatusIcon(research.status)}{" "}
                    <span className="ml-1">{research.status}</span>
                  </Badge>
                  {research.goal && (
                    <span className="text-xs text-[#a9927d] font-medium flex items-center">
                      🎯 {research.goal.title.substring(0, 15)}...
                    </span>
                  )}
                </div>

                {/* Title & Scope */}
                <h3 className="text-xl font-semibold text-white mb-2 group-hover:text-[#a9927d] transition-colors">
                  {research.title}
                </h3>
                <p className="text-sm text-[#6b9080] mb-6 font-medium">
                  {research.scope.replace(/_/g, " ")}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mt-auto">
                  <div className="text-center p-2 bg-black/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">Sources</p>
                    <p className="text-sm font-bold text-white">
                      {research._count.sources}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-black/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">Insights</p>
                    <p className="text-sm font-bold text-white">
                      {research._count.insights}
                    </p>
                  </div>
                  <div className="text-center p-2 bg-black/20 rounded-lg">
                    <p className="text-xs text-muted-foreground">Actions</p>
                    <p className="text-sm font-bold text-white">
                      {research._count.actionItems}
                    </p>
                  </div>
                </div>

                {/* Date & Progress */}
                <div className="mt-6 pt-4 border-t border-[#2f3e46] flex justify-between items-end">
                  <div className="flex-1">
                    {research.status === "IN_PROGRESS" ? (
                      <div>
                        <div className="w-full bg-black/40 rounded-full h-1.5 mb-2">
                          <div
                            className="bg-[#6b9080] h-1.5 rounded-full transition-all duration-500"
                            style={{ width: `${research.progress}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                          <span>{research.progress}% complete</span>
                          <span>
                            Started{" "}
                            {formatDistanceToNow(new Date(research.createdAt))}{" "}
                            ago
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-[10px] text-muted-foreground">
                        {research.completedAt
                          ? `Finished ${formatDistanceToNow(new Date(research.completedAt))} ago`
                          : `Started ${formatDistanceToNow(new Date(research.createdAt))} ago`}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 ml-2 text-gray-500 hover:text-red-500 hover:bg-transparent"
                    onClick={(e) => {
                      e.preventDefault();
                      handleDeleteClick(research.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-[#1a252f] rounded-2xl border-2 border-dashed border-[#2f3e46]">
          <Search className="w-16 h-16 mx-auto text-[#2f3e46] mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">
            No research found
          </h3>
          <p className="text-muted-foreground mb-8 max-w-sm mx-auto">
            Ignite your first research mission to uncover deep insights and
            generate leads.
          </p>
          <Button
            onClick={() => setShowCreateModal(true)}
            className="bg-[#a9927d] hover:bg-[#8f7a68] text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            Launch First Research
          </Button>
        </div>
      )}

      {/* Creation Modal */}
      <ResearchCreationModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!researchToDelete}
        onOpenChange={(open) => !open && setResearchToDelete(null)}
      >
        <AlertDialogContent className="bg-[#1a252f] border-[#2f3e46] text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This action cannot be undone. This will permanently delete the
              research project and remove its data from our servers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="bg-transparent border-[#2f3e46] text-white hover:bg-[#2f3e46] hover:text-white">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white border-0"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              Delete Research
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
