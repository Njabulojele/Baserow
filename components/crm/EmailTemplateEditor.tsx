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
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Mail, Plus, X } from "lucide-react";
import { toast } from "sonner";

const templateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.string().optional(),
  subject: z.string().min(1, "Subject is required"),
  bodyHtml: z.string().min(1, "Email body is required"),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

interface EmailTemplateEditorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  templateId?: string;
}

const CATEGORIES = [
  { value: "follow-up", label: "Follow-up" },
  { value: "welcome", label: "Welcome" },
  { value: "re-engagement", label: "Re-engagement" },
  { value: "notification", label: "Notification" },
  { value: "proposal", label: "Proposal" },
];

const VARIABLE_SUGGESTIONS = [
  "firstName",
  "lastName",
  "companyName",
  "dealName",
  "dealValue",
  "stageName",
];

export function EmailTemplateEditor({
  open,
  onOpenChange,
  templateId,
}: EmailTemplateEditorProps) {
  const [variables, setVariables] = useState<string[]>([]);

  const utils = trpc.useUtils();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: "",
      category: "",
      subject: "",
      bodyHtml: "",
    },
  });

  const createMutation = trpc.crmAutomation.createTemplate.useMutation({
    onSuccess: () => {
      toast.success("Template created");
      utils.crmAutomation.listTemplates.invalidate();
      onOpenChange(false);
      form.reset();
      setVariables([]);
    },
    onError: (err) => toast.error(err.message),
  });

  const addVariable = (variable: string) => {
    if (!variables.includes(variable)) {
      setVariables([...variables, variable]);
    }
  };

  const removeVariable = (variable: string) => {
    setVariables(variables.filter((v) => v !== variable));
  };

  const insertVariable = (variable: string) => {
    const bodyHtml = form.getValues("bodyHtml");
    form.setValue("bodyHtml", bodyHtml + `{{${variable}}}`);
    addVariable(variable);
  };

  const onSubmit = (values: TemplateFormValues) => {
    createMutation.mutate({
      name: values.name,
      category: values.category || undefined,
      subject: values.subject,
      bodyHtml: values.bodyHtml,
      variables,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            {templateId ? "Edit Email Template" : "Create Email Template"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Template Name *</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Welcome Email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="category"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
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
              name="subject"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Subject Line *</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="e.g., Welcome to {{companyName}}!"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Use {"{{variableName}}"} for dynamic content
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Variable Suggestions */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Insert Variables</label>
              <div className="flex flex-wrap gap-2">
                {VARIABLE_SUGGESTIONS.map((variable) => (
                  <Button
                    key={variable}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => insertVariable(variable)}
                    className="gap-1"
                  >
                    <Plus className="h-3 w-3" />
                    {variable}
                  </Button>
                ))}
              </div>
            </div>

            {/* Used Variables */}
            {variables.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-sm text-muted-foreground">
                  Variables used:
                </span>
                {variables.map((variable) => (
                  <Badge key={variable} variant="secondary" className="gap-1">
                    {variable}
                    <button
                      type="button"
                      onClick={() => removeVariable(variable)}
                      className="hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}

            <FormField
              control={form.control}
              name="bodyHtml"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email Body *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={`Hi {{firstName}},\n\nThank you for your interest in our services.\n\nBest regards,\nThe Team`}
                      className="min-h-[200px] font-mono text-sm"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Template"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
