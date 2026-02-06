"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Trash2, GripVertical, Check, Settings } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PipelineSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PipelineSetupDialog({
  open,
  onOpenChange,
}: PipelineSetupDialogProps) {
  const [newPipelineName, setNewPipelineName] = useState("");
  const [selectedPipelineId, setSelectedPipelineId] = useState<string | null>(
    null,
  );

  const utils = trpc.useUtils();

  const { data: pipelines, isLoading } = trpc.pipeline.list.useQuery();

  const createPipelineMutation = trpc.pipeline.create.useMutation({
    onSuccess: (data) => {
      toast.success("Pipeline created");
      utils.pipeline.list.invalidate();
      setNewPipelineName("");
      setSelectedPipelineId(data.id);
    },
    onError: (err) => toast.error(err.message),
  });

  const deletePipelineMutation = trpc.pipeline.delete.useMutation({
    onSuccess: () => {
      toast.success("Pipeline deleted");
      utils.pipeline.list.invalidate();
      setSelectedPipelineId(null);
    },
    onError: (err) => toast.error(err.message),
  });

  const updateStageMutation = trpc.pipeline.updateStage.useMutation({
    onSuccess: () => {
      utils.pipeline.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const createStageMutation = trpc.pipeline.createStage.useMutation({
    onSuccess: () => {
      toast.success("Stage added");
      utils.pipeline.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteStageMutation = trpc.pipeline.deleteStage.useMutation({
    onSuccess: () => {
      toast.success("Stage deleted");
      utils.pipeline.list.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const getOrCreateDefaultMutation =
    trpc.pipeline.getOrCreateDefault.useMutation({
      onSuccess: (data) => {
        toast.success("Default pipeline ready");
        utils.pipeline.list.invalidate();
        setSelectedPipelineId(data.id);
      },
      onError: (err) => toast.error(err.message),
    });

  const handleCreatePipeline = () => {
    if (!newPipelineName.trim()) return;
    createPipelineMutation.mutate({
      name: newPipelineName,
      isDefault: pipelines?.length === 0,
    });
  };

  const handleDeletePipeline = (id: string) => {
    if (confirm("Are you sure you want to delete this pipeline?")) {
      deletePipelineMutation.mutate({ id });
    }
  };

  const handleAddStage = (pipelineId: string, order: number) => {
    createStageMutation.mutate({
      pipelineId,
      name: "New Stage",
      order,
    });
  };

  const handleDeleteStage = (stageId: string) => {
    if (confirm("Are you sure you want to delete this stage?")) {
      deleteStageMutation.mutate({ id: stageId });
    }
  };

  const selectedPipeline = pipelines?.find((p) => p.id === selectedPipelineId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Pipeline Settings
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Pipeline list */}
            <div className="space-y-3">
              <h3 className="text-sm font-medium">Your Pipelines</h3>

              {pipelines?.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground border rounded-lg">
                  <p>No pipelines yet</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => getOrCreateDefaultMutation.mutate()}
                    disabled={getOrCreateDefaultMutation.isPending}
                  >
                    Create Default Pipeline
                  </Button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {pipelines?.map((pipeline) => (
                    <Button
                      key={pipeline.id}
                      variant={
                        selectedPipelineId === pipeline.id
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setSelectedPipelineId(pipeline.id)}
                      className="gap-2"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: pipeline.color }}
                      />
                      {pipeline.name}
                      {pipeline.isDefault && (
                        <Check className="h-3 w-3 text-green-500" />
                      )}
                      <Badge variant="secondary" className="text-xs ml-1">
                        {pipeline.stages?.length || 0} stages
                      </Badge>
                    </Button>
                  ))}
                </div>
              )}
            </div>

            {/* Create new pipeline */}
            <div className="flex gap-2">
              <Input
                placeholder="New pipeline name..."
                value={newPipelineName}
                onChange={(e) => setNewPipelineName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleCreatePipeline()}
              />
              <Button
                onClick={handleCreatePipeline}
                disabled={
                  !newPipelineName.trim() || createPipelineMutation.isPending
                }
              >
                <Plus className="h-4 w-4 mr-1" />
                Add
              </Button>
            </div>

            {/* Selected pipeline stages */}
            {selectedPipeline && (
              <div className="space-y-3 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium">
                    Stages for &quot;{selectedPipeline.name}&quot;
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeletePipeline(selectedPipeline.id)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Delete Pipeline
                  </Button>
                </div>

                <div className="space-y-2">
                  {selectedPipeline.stages
                    ?.sort((a, b) => a.order - b.order)
                    .map((stage, index) => (
                      <div
                        key={stage.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border",
                          stage.isClosed &&
                            stage.isWon &&
                            "bg-green-900 border-green-600",
                          stage.isClosed &&
                            !stage.isWon &&
                            "bg-gray-900 border-gray-600",
                        )}
                      >
                        <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />

                        <Input
                          className="max-w-[200px]"
                          defaultValue={stage.name}
                          onBlur={(e) => {
                            if (e.target.value !== stage.name) {
                              updateStageMutation.mutate({
                                id: stage.id,
                                name: e.target.value,
                              });
                            }
                          }}
                        />

                        <div className="flex-1 flex items-center gap-3 text-xs text-muted-foreground">
                          <span>
                            {Math.round(stage.probability * 100)}% prob
                          </span>
                          {stage.isClosed && (
                            <Badge
                              variant={stage.isWon ? "default" : "secondary"}
                            >
                              {stage.isWon ? "Won" : "Lost"}
                            </Badge>
                          )}
                        </div>

                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => handleDeleteStage(stage.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() =>
                      handleAddStage(
                        selectedPipeline.id,
                        (selectedPipeline.stages?.length ?? 0) + 1,
                      )
                    }
                    disabled={createStageMutation.isPending}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Stage
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
