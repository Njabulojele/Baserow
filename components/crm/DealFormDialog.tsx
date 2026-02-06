"use client";

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
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const formSchema = z.object({
  name: z.string().min(1, "Deal name is required"),
  description: z.string().optional(),
  value: z.string().min(1, "Value is required"),
  pipelineId: z.string().min(1, "Pipeline is required"),
  pipelineStageId: z.string().min(1, "Stage is required"),
  expectedCloseDate: z.string().min(1, "Expected close date is required"),
  leadId: z.string().optional(),
  clientId: z.string().optional(),
  nextStep: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface DealFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData?: any;
  preselectedLeadId?: string;
}

export function DealFormDialog({
  open,
  onOpenChange,
  initialData,
  preselectedLeadId,
}: DealFormDialogProps) {
  const utils = trpc.useUtils();

  const { data: pipelines, isLoading: pipelinesLoading } =
    trpc.pipeline.list.useQuery();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: initialData?.name || "",
      description: initialData?.description || "",
      value: initialData?.value?.toString() || "",
      pipelineId: initialData?.pipelineId || "",
      pipelineStageId: initialData?.pipelineStageId || "",
      expectedCloseDate: initialData?.expectedCloseDate
        ? format(new Date(initialData.expectedCloseDate), "yyyy-MM-dd")
        : format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), "yyyy-MM-dd"),
      leadId: preselectedLeadId || initialData?.leadId || "",
      clientId: initialData?.clientId || "",
      nextStep: initialData?.nextStep || "",
    },
  });

  const selectedPipelineId = form.watch("pipelineId");
  const selectedPipeline = pipelines?.find((p) => p.id === selectedPipelineId);

  const createMutation = trpc.deal.create.useMutation({
    onSuccess: () => {
      toast.success("Deal created successfully");
      utils.deal.getByStage.invalidate();
      utils.deal.getStats.invalidate();
      onOpenChange(false);
      form.reset();
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.deal.update.useMutation({
    onSuccess: () => {
      toast.success("Deal updated successfully");
      utils.deal.getByStage.invalidate();
      onOpenChange(false);
    },
    onError: (err) => toast.error(err.message),
  });

  const onSubmit = (values: FormValues) => {
    const data = {
      name: values.name,
      description: values.description,
      value: parseFloat(values.value),
      pipelineId: values.pipelineId,
      pipelineStageId: values.pipelineStageId,
      expectedCloseDate: new Date(values.expectedCloseDate),
      leadId: values.leadId || undefined,
      clientId: values.clientId || undefined,
      nextStep: values.nextStep || undefined,
    };

    if (initialData?.id) {
      updateMutation.mutate({ id: initialData.id, ...data });
    } else {
      createMutation.mutate(data);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Deal" : "Create New Deal"}
          </DialogTitle>
        </DialogHeader>

        {pipelinesLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        ) : !pipelines?.length ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No pipelines found. Please create a pipeline first.</p>
          </div>
        ) : (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deal Name *</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Website Redesign Project"
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
                        placeholder="Brief description of the deal..."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="value"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Value ($) *</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="10000" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="expectedCloseDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Close Date *</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="pipelineId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Pipeline *</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          form.setValue("pipelineStageId", "");
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select pipeline" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {pipelines?.map((pipeline) => (
                            <SelectItem key={pipeline.id} value={pipeline.id}>
                              {pipeline.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="pipelineStageId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Stage *</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={!selectedPipelineId}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select stage" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {selectedPipeline?.stages
                            ?.filter((s) => !s.isClosed)
                            .map((stage) => (
                              <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="nextStep"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Next Step</FormLabel>
                    <FormControl>
                      <Input placeholder="Schedule discovery call" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading
                    ? "Saving..."
                    : initialData
                      ? "Update Deal"
                      : "Create Deal"}
                </Button>
              </div>
            </form>
          </Form>
        )}
      </DialogContent>
    </Dialog>
  );
}
