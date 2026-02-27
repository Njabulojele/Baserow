"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { Card, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  Webhook,
  Plus,
  Key,
  Link as LinkIcon,
  Trash2,
  Activity,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  ShieldCheck,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import Link from "next/link";
import { User, Globe } from "lucide-react";

const AVAILABLE_EVENTS = [
  "task.created",
  "task.updated",
  "task.deleted",
  "project.created",
  "project.updated",
  "project.deleted",
];

function DeliveryLogsList({ endpointId }: { endpointId: string }) {
  const { data: logs, isLoading } = trpc.webhook.getDeliveries.useQuery({
    endpointId,
  });

  if (isLoading)
    return (
      <div className="text-gray-500 py-4 text-center">Loading logs...</div>
    );
  if (!logs || logs.length === 0)
    return (
      <div className="text-gray-500 py-4 text-center">
        No deliveries yet. Trigger an event in your workspace to test the
        webhook.
      </div>
    );

  return (
    <div className="space-y-2">
      {logs.map((log) => (
        <div
          key={log.id}
          className="bg-black/20 p-3 rounded-lg border border-[#2f3e46] flex flex-col gap-2"
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              {log.successful ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500" />
              )}
              <span className="text-sm font-mono text-gray-200">
                {log.event}
              </span>
            </div>
            <span className="text-xs text-gray-500">
              {new Date(log.createdAt).toLocaleString()}
            </span>
          </div>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-gray-400">
              Status:{" "}
              <span
                className={
                  log.successful
                    ? "text-emerald-400 font-bold font-mono"
                    : "text-red-400 font-bold font-mono"
                }
              >
                {log.status}
              </span>
            </span>
            <span className="text-gray-400">
              Duration:{" "}
              <span className="text-gray-300 font-mono">{log.duration}ms</span>
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function WebhooksPage() {
  const utils = trpc.useUtils();
  const { data: webhooks, isLoading } = trpc.webhook.list.useQuery();

  const createMutation = trpc.webhook.create.useMutation({
    onSuccess: () => {
      toast.success("Webhook endpoint created.");
      utils.webhook.list.invalidate();
      setShowCreateForm(false);
      setNewUrl("");
      setSelectedEvents([]);
    },
    onError: (err) => {
      toast.error("Failed to create webhook", { description: err.message });
    },
  });

  const deleteMutation = trpc.webhook.delete.useMutation({
    onSuccess: () => {
      toast.success("Webhook endpoint deleted.");
      utils.webhook.list.invalidate();
    },
  });

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [visibleSecrets, setVisibleSecrets] = useState<Record<string, boolean>>(
    {},
  );
  const [visibleLogsWebhookId, setVisibleLogsWebhookId] = useState<
    string | null
  >(null);

  const handleToggleEvent = (eventName: string) => {
    setSelectedEvents((prev) =>
      prev.includes(eventName)
        ? prev.filter((e) => e !== eventName)
        : [...prev, eventName],
    );
  };

  const handleCreate = () => {
    if (!newUrl) return toast.error("URL is required");
    if (!newUrl.startsWith("https://") && !newUrl.startsWith("http://")) {
      return toast.error("URL must start with http:// or https://");
    }
    if (selectedEvents.length === 0)
      return toast.error("Select at least one event");

    createMutation.mutate({
      url: newUrl,
      events: selectedEvents,
    });
  };

  const toggleSecretVisibility = (id: string) => {
    setVisibleSecrets((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (isLoading) {
    return (
      <div className="p-8 text-center text-gray-500 flex justify-center items-center h-[50vh]">
        <Activity className="w-6 h-6 animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-3 bg-[#a9927d]/20 rounded-xl border border-[#a9927d]/30">
          <Webhook className="w-8 h-8 text-[#a9927d]" />
        </div>
        <div>
          <h1 className="text-sm font-mono font-bold uppercase tracking-widest text-alabaster">
            Public Webhooks
          </h1>
          <p className="text-gray-400 mt-1">
            Build serverless integrations by subscribing to workspace events in
            real-time.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Navigation Sidebar */}
        <div className="space-y-2">
          <Link href="/settings" className="block">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a252f]/50"
            >
              <Key className="w-4 h-4 mr-2" /> Integrations
            </Button>
          </Link>
          <Link href="/settings/webhooks" className="block">
            <Button
              variant="ghost"
              className="w-full justify-start bg-[#1a252f] text-white hover:bg-[#2f3e46]"
            >
              <Webhook className="w-4 h-4 mr-2" /> Webhooks
            </Button>
          </Link>
          <Link href="/settings/sso" className="block">
            <Button
              variant="ghost"
              className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a252f]/50"
            >
              <ShieldCheck className="w-4 h-4 mr-2" /> Security & SSO
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a252f]/50"
            disabled
          >
            <User className="w-4 h-4 mr-2" /> Account
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start text-gray-400 hover:text-white hover:bg-[#1a252f]/50"
            disabled
          >
            <Globe className="w-4 h-4 mr-2" /> Preferences
          </Button>
        </div>

        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center pb-2 border-b border-[#2f3e46]">
            <h2 className="text-lg font-semibold text-white">
              Registered Endpoints
            </h2>
            {!showCreateForm && (
              <Button
                onClick={() => setShowCreateForm(true)}
                className="bg-[#a9927d] hover:bg-[#8f7a68] text-white"
              >
                <Plus className="w-4 h-4 mr-2" /> Add Endpoint
              </Button>
            )}
          </div>

          {showCreateForm && (
            <Card className="bg-[#1a252f]/80 border-[#2f3e46] p-6 border-dashed backdrop-blur-sm shadow-xl">
              <CardTitle className="text-lg text-white mb-4 flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#a9927d]" /> New Webhook Endpoint
              </CardTitle>
              <div className="space-y-6">
                <div className="space-y-3">
                  <Label className="text-gray-300 font-medium">
                    Payload URL
                  </Label>
                  <Input
                    placeholder="https://your-domain.com/webhooks"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    className="bg-black/40 border-[#2f3e46] focus:border-[#a9927d] font-mono text-sm shadow-inner"
                  />
                  <p className="text-xs text-gray-500">
                    We will send a POST request with a JSON payload to this URL
                    when events trigger.
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-gray-300 font-medium">
                    Events to send
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
                    {AVAILABLE_EVENTS.map((event) => (
                      <label
                        key={event}
                        className="flex items-center gap-3 p-3 rounded-lg border border-[#2f3e46] hover:bg-[#2f3e46]/70 cursor-pointer transition-colors bg-black/20 group"
                      >
                        <input
                          type="checkbox"
                          checked={selectedEvents.includes(event)}
                          onChange={() => handleToggleEvent(event)}
                          className="w-4 h-4 rounded border-gray-600 text-[#a9927d] focus:ring-[#a9927d] focus:ring-offset-0 bg-transparent cursor-pointer"
                        />
                        <span className="text-sm font-mono text-gray-300 group-hover:text-white transition-colors">
                          {event}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t border-[#2f3e46]">
                  <Button
                    variant="ghost"
                    onClick={() => setShowCreateForm(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreate}
                    disabled={createMutation.isPending}
                    className="bg-gradient-to-r from-[#a9927d] to-[#8f7a68] text-white border-0"
                  >
                    {createMutation.isPending
                      ? "Creating..."
                      : "Create Webhook"}
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {webhooks?.length === 0 && !showCreateForm ? (
            <div className="text-center py-16 bg-[#1a252f] rounded-xl border border-[#2f3e46] shadow-inner">
              <Webhook className="w-16 h-16 text-[#a9927d]/30 mx-auto mb-6 opacity-80" />
              <h3 className="text-lg font-medium text-white">
                No active webhooks
              </h3>
              <p className="text-sm text-gray-400 mt-2 max-w-sm mx-auto leading-relaxed">
                Connect your external tools to ProductiveYou. Get notified
                instantly when tasks are updated or projects are created.
              </p>
              <Button
                onClick={() => setShowCreateForm(true)}
                className="mt-6 bg-[#2f3e46] hover:bg-[#3f505a] text-white"
              >
                Register first endpoint
              </Button>
            </div>
          ) : (
            <div className="space-y-5">
              {webhooks?.map((webhook) => (
                <Card
                  key={webhook.id}
                  className="bg-[#1a252f] border-[#2f3e46] overflow-hidden hover:border-[#384a54] transition-colors shadow-lg"
                >
                  <div className="p-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-3 w-3 relative`}>
                            {webhook.isActive && (
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            )}
                            <span
                              className={`relative inline-flex rounded-full h-3 w-3 ${webhook.isActive ? "bg-emerald-500" : "bg-gray-500"}`}
                            ></span>
                          </span>
                          <h3 className="font-medium text-white flex items-center gap-2 text-base">
                            <LinkIcon className="w-4 h-4 text-emerald-500" />
                            {webhook.url}
                          </h3>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                          {webhook.events.map((e: string) => (
                            <span
                              key={e}
                              className="px-2.5 py-1 rounded-md bg-black/30 border border-[#2f3e46] text-[11px] font-mono text-gray-300"
                            >
                              {e}
                            </span>
                          ))}
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (
                            confirm(
                              "Are you sure you want to permanently delete this webhook? Delivery history will be lost.",
                            )
                          ) {
                            deleteMutation.mutate({ id: webhook.id });
                          }
                        }}
                        className="text-red-400/70 hover:text-red-400 hover:bg-red-400/10 -mt-1 -mr-2"
                        title="Delete Webhook"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <Separator className="bg-[#2f3e46] my-5" />

                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-black/10 p-3 rounded-lg border border-[#2f3e46]">
                      <div className="space-y-1.5 flex-1">
                        <Label className="text-xs text-gray-500 font-medium uppercase tracking-wider">
                          HMAC Signing Secret
                        </Label>
                        <div className="flex items-center gap-3">
                          <code className="text-xs font-mono bg-black/50 px-3 py-1.5 rounded-md text-emerald-400 border border-emerald-500/20 shadow-inner flex-1 max-w-[300px] overflow-hidden text-ellipsis">
                            {visibleSecrets[webhook.id]
                              ? webhook.secret
                              : "••••••••••••••••••••••••••••••••••••••••••••••••"}
                          </code>
                          <button
                            onClick={() => toggleSecretVisibility(webhook.id)}
                            className="p-1.5 bg-[#2f3e46] rounded text-gray-300 hover:text-white transition-colors"
                            title={
                              visibleSecrets[webhook.id]
                                ? "Hide Secret"
                                : "Reveal Secret"
                            }
                          >
                            {visibleSecrets[webhook.id] ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setVisibleLogsWebhookId(webhook.id)}
                        className="bg-[#2f3e46] hover:bg-[#3f505a] text-gray-200 border border-[#405461] whitespace-nowrap"
                      >
                        <Activity className="w-4 h-4 mr-2 text-[#a9927d]" />{" "}
                        View Logs
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delivery Logs Modal */}
      {visibleLogsWebhookId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-[#2f3e46] flex justify-between items-center bg-black/20 rounded-t-xl">
              <h3 className="text-white font-medium flex items-center gap-2">
                <Activity className="w-5 h-5 text-[#a9927d]" />
                Delivery History
              </h3>
              <button
                onClick={() => setVisibleLogsWebhookId(null)}
                className="text-gray-400 hover:text-white bg-[#2f3e46] p-1.5 rounded-full transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto flex-1 bg-[#1a252f]">
              <DeliveryLogsList endpointId={visibleLogsWebhookId} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
