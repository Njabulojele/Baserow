"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { trpc } from "@/lib/trpc/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowRight, Zap, Mail, Tag, Bell } from "lucide-react";
import { toast } from "sonner";
import { WorkflowTriggerType, WorkflowActionType } from "@prisma/client";

const workflowSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
});

type WorkflowFormValues = z.infer<typeof workflowSchema>;

interface WorkflowBuilderProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workflowId?: string;
}

const TRIGGER_OPTIONS = [
  { value: "LEAD_CREATED", label: "Lead Created", icon: "➕" },
  { value: "LEAD_STATUS_CHANGED", label: "Lead Status Changed", icon: "🔄" },
  { value: "DEAL_CREATED", label: "Deal Created", icon: "💰" },
  { value: "DEAL_STAGE_CHANGED", label: "Deal Stage Changed", icon: "📊" },
  { value: "DEAL_CLOSED_WON", label: "Deal Closed (Won)", icon: "🎉" },
  { value: "DEAL_CLOSED_LOST", label: "Deal Closed (Lost)", icon: "😞" },
  { value: "INACTIVITY_ALERT", label: "Inactivity Alert", icon: "⏰" },
  { value: "MANUAL", label: "Manual Trigger", icon: "▶️" },
];

const ACTION_OPTIONS = [
  { value: "SEND_EMAIL", label: "Send Email", icon: Mail },
  { value: "CREATE_TASK", label: "Create Task", icon: Plus },
  { value: "ADD_TAG", label: "Add Tag", icon: Tag },
  { value: "NOTIFY_USER", label: "Notify User", icon: Bell },
  { value: "MOVE_TO_STAGE", label: "Move to Stage", icon: ArrowRight },
];

export function WorkflowBuilder({
  open,
  onOpenChange,
  workflowId,
}: WorkflowBuilderProps) {
  /* eslint-disable @typescript-eslint/no-explicit-any */
  interface ActionItem {
    type: WorkflowActionType;
    config: Record<string, any>;
  }

  const [triggers, setTriggers] = useState<WorkflowTriggerType[]>([]);
  const [actions, setActions] = useState<ActionItem[]>([]);

  const utils = trpc.useUtils();

  const form = useForm<WorkflowFormValues>({
    resolver: zodResolver(workflowSchema),
    defaultValues: { name: "", description: "" },
  });

  const createMutation = trpc.crmAutomation.createWorkflow.useMutation({
    onSuccess: () => {
      toast.success("Workflow created");
      utils.crmAutomation.listWorkflows.invalidate();
      onOpenChange(false);
      form.reset();
      setTriggers([]);
      setActions([]);
    },
    onError: (err) => toast.error(err.message),
  });

  const addTrigger = (type: WorkflowTriggerType) => {
    if (!triggers.includes(type)) {
      setTriggers([...triggers, type]);
    }
  };

  const removeTrigger = (type: WorkflowTriggerType) => {
    setTriggers(triggers.filter((t) => t !== type));
  };

  const addAction = (type: WorkflowActionType) => {
    setActions([...actions, { type, config: {} }]);
  };

  const updateActionConfig = (index: number, key: string, value: any) => {
    const newActions = [...actions];
    newActions[index].config = { ...newActions[index].config, [key]: value };
    setActions(newActions);
  };

  const removeAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index));
  };

  const onSubmit = (values: WorkflowFormValues) => {
    createMutation.mutate({
      name: values.name,
      description: values.description,

      triggers: triggers.map((t) => ({ type: t })),
      actions: actions.map((a, i) => ({
        type: a.type,
        order: i,
        config: a.config,
      })),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            {workflowId ? "Edit Workflow" : "Create Workflow"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Workflow Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Follow up on new leads"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="What does this workflow do?"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Triggers */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">When this happens...</h3>
                <Select
                  onValueChange={(v) => addTrigger(v as WorkflowTriggerType)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add trigger" />
                  </SelectTrigger>
                  <SelectContent>
                    {TRIGGER_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.icon} {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {triggers.length === 0 ? (
                <Card className="p-4 text-center text-muted-foreground">
                  No triggers added. Add a trigger to define when this workflow
                  runs.
                </Card>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {triggers.map((trigger) => {
                    const opt = TRIGGER_OPTIONS.find(
                      (o) => o.value === trigger,
                    );
                    return (
                      <Badge
                        key={trigger}
                        variant="secondary"
                        className="gap-2 py-1 px-3"
                      >
                        {opt?.icon} {opt?.label}
                        <button
                          type="button"
                          onClick={() => removeTrigger(trigger)}
                          className="hover:text-destructive"
                        >
                          ×
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Do this...</h3>
                <Select
                  onValueChange={(v) => addAction(v as WorkflowActionType)}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Add action" />
                  </SelectTrigger>
                  <SelectContent>
                    {ACTION_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {actions.length === 0 ? (
                <Card className="p-4 text-center text-muted-foreground">
                  No actions added. Add actions to define what happens when
                  triggered.
                </Card>
              ) : (
                <div className="space-y-2">
                  {actions.map((actionItem, index) => {
                    const opt = ACTION_OPTIONS.find(
                      (o) => o.value === actionItem.type,
                    );
                    const Icon = opt?.icon || Zap;
                    return (
                      <Card key={index} className="p-4 space-y-3">
                        <div className="flex items-center gap-3">
                          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-xs shrink-0">
                            {index + 1}
                          </div>
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1 font-medium">
                            {opt?.label}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive"
                            onClick={() => removeAction(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>

                        {/* Configuration Fields */}
                        <div className="pl-9 space-y-3">
                          {actionItem.type === "CREATE_TASK" && (
                            <>
                              <div className="space-y-1">
                                <label className="text-xs font-medium">
                                  Task Title
                                </label>
                                <Input
                                  placeholder="e.g. Call lead {{firstName}}"
                                  value={actionItem.config.title || ""}
                                  onChange={(e) =>
                                    updateActionConfig(
                                      index,
                                      "title",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8"
                                />
                                <p className="text-[10px] text-muted-foreground">
                                  Use {"{{firstName}}"} etc.
                                </p>
                              </div>
                              <div className="flex gap-3">
                                <div className="space-y-1 flex-1">
                                  <label className="text-xs font-medium">
                                    Priority
                                  </label>
                                  <Select
                                    value={
                                      actionItem.config.priority || "medium"
                                    }
                                    onValueChange={(v) =>
                                      updateActionConfig(index, "priority", v)
                                    }
                                  >
                                    <SelectTrigger className="h-8">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="low">Low</SelectItem>
                                      <SelectItem value="medium">
                                        Medium
                                      </SelectItem>
                                      <SelectItem value="high">High</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                                <div className="space-y-1 flex-1">
                                  <label className="text-xs font-medium">
                                    Due in (days)
                                  </label>
                                  <Input
                                    type="number"
                                    placeholder="0"
                                    value={actionItem.config.dueDays || ""}
                                    onChange={(e) =>
                                      updateActionConfig(
                                        index,
                                        "dueDays",
                                        parseInt(e.target.value),
                                      )
                                    }
                                    className="h-8"
                                  />
                                </div>
                              </div>
                            </>
                          )}

                          {actionItem.type === "SEND_EMAIL" && (
                            <>
                              <div className="space-y-1">
                                <label className="text-xs font-medium">
                                  Subject
                                </label>
                                <Input
                                  placeholder="Email subject"
                                  value={actionItem.config.subject || ""}
                                  onChange={(e) =>
                                    updateActionConfig(
                                      index,
                                      "subject",
                                      e.target.value,
                                    )
                                  }
                                  className="h-8"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-xs font-medium">
                                  Body
                                </label>
                                <Textarea
                                  placeholder="Email body..."
                                  value={actionItem.config.body || ""}
                                  onChange={(e) =>
                                    updateActionConfig(
                                      index,
                                      "body",
                                      e.target.value,
                                    )
                                  }
                                  className="h-20"
                                />
                              </div>
                            </>
                          )}

                          {actionItem.type === "NOTIFY_USER" && (
                            <div className="space-y-1">
                              <label className="text-xs font-medium">
                                Message
                              </label>
                              <Input
                                placeholder="Notification message"
                                value={actionItem.config.message || ""}
                                onChange={(e) =>
                                  updateActionConfig(
                                    index,
                                    "message",
                                    e.target.value,
                                  )
                                }
                                className="h-8"
                              />
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  triggers.length === 0 ||
                  actions.length === 0 ||
                  createMutation.isPending
                }
              >
                {createMutation.isPending ? "Creating..." : "Create Workflow"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
