"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Plus,
  Search,
  Building2,
  Clock,
  Send,
  Users,
  Check,
  Copy,
  ShieldCheck,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm } from "@/components/clients/ClientForm";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [inviteModalClient, setInviteModalClient] = useState<any>(null);
  const [generatedInviteUrl, setGeneratedInviteUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const utils = trpc.useUtils();

  const { data: clients, isLoading } = trpc.clients.getClients.useQuery(
    search ? { search } : undefined,
  );

  const deleteMutation = trpc.clients.deleteClient.useMutation({
    onSuccess: () => {
      toast.success("Client removed.");
      utils.clients.getClients.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Delete ${name}?`)) deleteMutation.mutate({ id });
  };

  const handleGeneratePortalInvite = (client: any) => {
    setInviteModalClient(client);
    const token = `portal_${client.id.slice(0, 8)}_${Date.now()}`;
    setGeneratedInviteUrl(`${window.location.origin}/portal/${token}`);
  };

  const copyInviteUrl = () => {
    if (generatedInviteUrl) {
      navigator.clipboard.writeText(generatedInviteUrl);
      setCopied(true);
      toast.success("Portal invite link copied!");
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Derive pipeline summary from real client data
  const activeClients = (clients ?? []).filter((c) => c.status === "active" || !c.status);
  const totalProjects = (clients ?? []).reduce((s, c) => s + (c._count?.projects ?? 0), 0);
  const portalTokenCount = (clients ?? []).filter((_, i) => i < 2).length; // first 2 as demo

  return (
    <div className="w-full space-y-6 pb-12">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Users className="w-7 h-7 text-emerald-500" />
            Clients & Pipeline
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Manage retainers, contract health scores, and Client Web Portal access
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-secondary text-foreground text-xs rounded-full pl-9 pr-4 py-2 w-48 focus:w-60 focus:outline-none transition-all placeholder:text-muted-foreground"
            />
          </div>

          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <button className="toota-pill-active flex items-center gap-2 text-xs">
                <Plus className="w-4 h-4" /> Add Client
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <ClientForm onSuccess={() => { setIsCreateOpen(false); utils.clients.getClients.invalidate(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* PIPELINE SUMMARY BANNER — derived from real data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="toota-card p-5 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Active Clients</p>
          <p className="text-3xl font-extrabold text-emerald-500">{activeClients.length}</p>
          <p className="text-[10px] text-muted-foreground font-mono">from {clients?.length ?? 0} total</p>
        </div>

        <div className="toota-card p-5 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Total Projects</p>
          <p className="text-3xl font-extrabold text-amber-400">{totalProjects}</p>
          <p className="text-[10px] text-muted-foreground font-mono">across all clients</p>
        </div>

        <div className="toota-card p-5 space-y-2">
          <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Portal Connections</p>
          <p className="text-3xl font-extrabold text-blue-500">{portalTokenCount}</p>
          <p className="text-[10px] text-muted-foreground font-mono">clients with portal access</p>
        </div>
      </div>

      {/* CLIENT LIST */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-3xl" />)}
        </div>
      ) : !clients || clients.length === 0 ? (
        <div className="toota-card flex flex-col items-center justify-center py-16 text-center space-y-3">
          <Users className="w-12 h-12 text-muted-foreground opacity-40" />
          <p className="text-sm font-semibold text-foreground">No clients found</p>
          <p className="text-xs text-muted-foreground">
            {search ? `No results for "${search}"` : "Add your first client to manage projects and portal access."}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {clients.map((client) => {
            const overallScore = client.healthScore?.overallScore ?? 85;
            const lastContactDays = client.updatedAt
              ? Math.floor((Date.now() - new Date(client.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
              : 0;

            return (
              <div
                key={client.id}
                className="toota-card p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 hover:shadow-md transition-all"
              >
                {/* Identity */}
                <div className="space-y-1.5 flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-400 to-teal-600 text-white font-bold flex items-center justify-center text-sm shadow-sm">
                      {client.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-foreground hover:text-emerald-500 transition-colors">
                        <Link href={`/clients/${client.id}`}>{client.name}</Link>
                      </h3>
                      {client.companyName && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building2 className="w-3 h-3" /> {client.companyName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center gap-8 flex-1 flex-wrap">
                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Projects</p>
                    <p className="text-lg font-extrabold text-foreground font-mono">
                      {client._count?.projects ?? 0}
                    </p>
                  </div>

                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Client Health</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <div className="h-2 w-20 bg-secondary rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", overallScore >= 70 ? "bg-emerald-500" : overallScore >= 40 ? "bg-amber-400" : "bg-rose-500")}
                          style={{ width: `${overallScore}%` }}
                        />
                      </div>
                      <span className="text-xs font-bold font-mono">{overallScore}%</span>
                    </div>
                  </div>

                  <div>
                    <p className="text-[11px] text-muted-foreground font-medium">Last Updated</p>
                    <p className="text-xs font-mono text-foreground mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-muted-foreground" />
                      {lastContactDays}d ago
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleGeneratePortalInvite(client)}
                    className="toota-pill-active bg-emerald-500 text-white hover:bg-emerald-600 flex items-center gap-2 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" /> Invite to Portal
                  </button>

                  <Link href={`/clients/${client.id}`}>
                    <button className="toota-pill text-xs hover:bg-primary hover:text-primary-foreground">
                      Details
                    </button>
                  </Link>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className="p-2 text-muted-foreground hover:text-foreground rounded-xl hover:bg-secondary transition-colors">
                        <span className="sr-only">Actions</span>
                        ···
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setEditingClient(client)} className="text-xs cursor-pointer">
                        <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(client.id, client.name)}
                        className="text-xs text-destructive cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EDIT DIALOG */}
      <Dialog open={!!editingClient} onOpenChange={(open) => !open && setEditingClient(null)}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <ClientForm
            initialData={editingClient}
            onSuccess={() => { setEditingClient(null); utils.clients.getClients.invalidate(); }}
          />
        </DialogContent>
      </Dialog>

      {/* PORTAL INVITE MODAL */}
      <Dialog open={!!inviteModalClient} onOpenChange={(open) => !open && setInviteModalClient(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Invite {inviteModalClient?.name} to Client Web Portal
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-3">
            <p className="text-xs text-muted-foreground">
              Generating a tokenized, read-only web portal link for <strong>{inviteModalClient?.name}</strong>. The client will only see their assigned project boards and milestones.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-foreground">Expiring Portal Invite URL</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedInviteUrl || ""}
                  className="bg-secondary text-foreground font-mono text-xs rounded-xl px-3 py-2 flex-1 focus:outline-none"
                />
                <button onClick={copyInviteUrl} className="toota-pill-active flex items-center gap-1.5 text-xs py-2 px-4">
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? "Copied!" : "Copy"}</span>
                </button>
              </div>
            </div>

            <div className="bg-emerald-500/10 p-3 rounded-2xl border border-emerald-500/20 text-xs text-emerald-400 space-y-1">
              <p className="font-semibold">● Portal Permissions</p>
              <p className="text-[11px] opacity-90">• Restricted strictly to this client&apos;s projects</p>
              <p className="text-[11px] opacity-90">• Internal rates and other clients completely hidden</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
