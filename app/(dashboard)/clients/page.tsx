"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  Plus,
  Search,
  Building2,
  Mail,
  Phone,
  MoreHorizontal,
  Pencil,
  Trash2,
  ExternalLink,
  Briefcase,
  Heart,
  TrendingUp,
  AlertTriangle,
  Clock,
  Zap,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ClientForm } from "@/components/clients/ClientForm";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);

  const {
    data: clients,
    isLoading,
    refetch,
  } = trpc.clients.getClients.useQuery({
    search,
  });

  const utils = trpc.useUtils();

  const deleteMutation = trpc.clients.deleteClient.useMutation({
    onSuccess: () => {
      toast.success("Client deleted");
      utils.clients.getClients.invalidate();
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete ${name}?`)) {
      deleteMutation.mutate({ id });
    }
  };

  const getHealthColor = (score: number) => {
    if (score >= 70) return "bg-green-500";
    if (score >= 40) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="space-y-4 p-4 md:p-8 pt-6 overflow-hidden">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">
            Manage your client relationships and health
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" /> Add Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Client</DialogTitle>
              </DialogHeader>
              <ClientForm onSuccess={() => setIsCreateOpen(false)} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 md:max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search clients..."
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[120px] w-full" />
          ))}
        </div>
      ) : clients?.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg bg-card/50 min-h-[400px]">
          <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-4">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No clients found</h3>
          <p className="text-muted-foreground mb-4 max-w-sm">
            {search
              ? "No clients match your search terms."
              : "Get started by adding your first client."}
          </p>
          {!search && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add Client
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4">
          {clients?.map((client) => {
            const healthScore = client.healthScore;
            const overallScore = healthScore?.overallScore ?? 50;
            const daysSinceContact =
              healthScore?.daysSinceLastContact ??
              Math.floor(
                (Date.now() - new Date(client.updatedAt).getTime()) /
                  (1000 * 60 * 60 * 24),
              );
            const isAtRisk =
              overallScore < 40 || (healthScore?.churnRisk ?? 0) > 0.5;
            const highPotential = (healthScore?.expansionPotential ?? 0) > 0.6;

            return (
              <Card
                key={client.id}
                className={`group relative transition-all hover:shadow-md ${isAtRisk ? "border-l-4 border-l-red-500" : ""}`}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row gap-6">
                    {/* Left: Identity */}
                    <div className="flex items-start gap-4 md:w-1/4 min-w-[250px]">
                      <Avatar className="h-12 w-12 border">
                        <AvatarImage
                          src={`https://avatar.vercel.sh/${client.name}.png`}
                        />
                        <AvatarFallback>
                          {client.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <div className="font-semibold text-lg leading-none">
                          <Link
                            href={`/clients/${client.id}`}
                            className="hover:underline"
                          >
                            {client.name}
                          </Link>
                        </div>
                        {client.companyName && (
                          <div className="flex items-center text-sm text-muted-foreground">
                            <Building2 className="mr-1 h-3 w-3" />
                            {client.companyName}
                          </div>
                        )}
                        {client.industry && (
                          <div className="text-xs text-muted-foreground mt-1">
                            {client.industry}
                          </div>
                        )}
                        {/* Badges */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {isAtRisk && (
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1.5 py-0 h-5"
                            >
                              High Churn Risk
                            </Badge>
                          )}
                          {highPotential && (
                            <Badge
                              variant="default"
                              className="text-[10px] px-1.5 py-0 h-5 bg-blue-600 hover:bg-blue-700"
                            >
                              High Expansion Potential
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Middle: Health Metrics */}
                    <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-4 border-l pl-0 md:pl-6 border-transparent md:border-border">
                      {/* Overall Health */}
                      <div className="col-span-2 md:col-span-1">
                        <div className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                          Health
                        </div>
                        <div className="flex items-end gap-2 mb-1">
                          <span className="text-2xl font-bold">
                            {overallScore}
                          </span>
                          <span className="text-sm text-muted-foreground mb-1">
                            /100
                          </span>
                        </div>
                        <Progress
                          value={overallScore}
                          className="h-2"
                          indicatorClassName={getHealthColor(overallScore)}
                        />
                      </div>

                      {/* Sub Metrics (Hidden on sm, visible on md) */}
                      <div className="hidden md:block">
                        <div className="text-xs text-muted-foreground mb-1">
                          Engagement
                        </div>
                        <div className="text-sm font-semibold">
                          {Math.round(healthScore?.engagementScore ?? 0)}/100
                        </div>
                        <Progress
                          value={healthScore?.engagementScore ?? 0}
                          className="h-1 mt-1"
                        />
                      </div>
                      <div className="hidden md:block">
                        <div className="text-xs text-muted-foreground mb-1">
                          Relationship
                        </div>
                        <div className="text-sm font-semibold">
                          {Math.round(healthScore?.relationshipScore ?? 0)}/100
                        </div>
                        <Progress
                          value={healthScore?.relationshipScore ?? 0}
                          className="h-1 mt-1"
                        />
                      </div>

                      {/* Last Contact */}
                      <div className="col-span-1">
                        <div className="text-xs text-muted-foreground mb-1">
                          Last Contact
                        </div>
                        <div className="text-sm font-medium flex items-center gap-1">
                          <Clock className="h-3 w-3 text-muted-foreground" />
                          {daysSinceContact}d ago
                        </div>
                        <div
                          className={`text-xs mt-1 ${daysSinceContact > 14 ? "text-red-500" : "text-green-600"}`}
                        >
                          {daysSinceContact > 14 ? "Silent" : "Active"}
                        </div>
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex flex-col justify-center items-end gap-2 md:w-auto w-full border-t md:border-t-0 pt-4 md:pt-0 mt-2 md:mt-0">
                      <Link href={`/clients/${client.id}`}>
                        <Button variant="outline" size="sm" className="w-full">
                          Details
                        </Button>
                      </Link>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="w-full text-muted-foreground"
                          >
                            More
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => setEditingClient(client)}
                          >
                            <Pencil className="mr-2 h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => handleDelete(client.id, client.name)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Edit Dialog */}
      <Dialog
        open={!!editingClient}
        onOpenChange={(open) => !open && setEditingClient(null)}
      >
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Client</DialogTitle>
          </DialogHeader>
          <ClientForm
            initialData={editingClient}
            onSuccess={() => setEditingClient(null)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Users(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
