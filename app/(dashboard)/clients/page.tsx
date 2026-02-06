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

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
          <p className="text-muted-foreground">
            Manage your client relationships and business contacts
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-[200px] w-full" />
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
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {clients?.map((client) => (
            <Card
              key={client.id}
              className="group relative transition-all hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 border">
                      <AvatarImage
                        src={`https://avatar.vercel.sh/${client.name}.png`}
                      />
                      <AvatarFallback>
                        {client.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <CardTitle className="text-base font-semibold leading-none">
                        <Link
                          href={`/clients/${client.id}`}
                          className="hover:underline decoration-primary/50 underline-offset-4"
                        >
                          {client.name}
                        </Link>
                      </CardTitle>
                      {client.companyName && (
                        <div className="flex items-center text-sm text-muted-foreground">
                          <Building2 className="mr-1 h-3 w-3" />
                          <span className="truncate max-w-[150px]">
                            {client.companyName}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingClient(client)}
                      >
                        <Pencil className="mr-2 h-4 w-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(client.id, client.name)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="pb-3 text-sm">
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={
                        client.status === "active"
                          ? "default"
                          : client.status === "lead"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {client.status}
                    </Badge>
                    {client.industry && (
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {client.industry}
                      </span>
                    )}
                  </div>

                  {(client.email || client.phone) && (
                    <div className="space-y-1 pt-2">
                      {client.email && (
                        <div className="flex items-center text-muted-foreground">
                          <Mail className="mr-2 h-3.5 w-3.5" />
                          <span className="truncate">{client.email}</span>
                        </div>
                      )}
                      {client.phone && (
                        <div className="flex items-center text-muted-foreground">
                          <Phone className="mr-2 h-3.5 w-3.5" />
                          <span>{client.phone}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {client.website && (
                    <a
                      href={
                        client.website.startsWith("http")
                          ? client.website
                          : `https://${client.website}`
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center text-muted-foreground hover:text-primary transition-colors pt-1"
                    >
                      <ExternalLink className="mr-2 h-3.5 w-3.5" />
                      <span className="truncate">
                        {client.website.replace(/^https?:\/\//, "")}
                      </span>
                    </a>
                  )}
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-3 flex items-center justify-between text-xs text-muted-foreground">
                <div className="flex items-center gap-3">
                  <div className="flex items-center" title="Projects">
                    <Briefcase className="mr-1.5 h-3.5 w-3.5" />
                    {client._count?.projects || 0}
                  </div>
                  <div className="flex items-center" title="Communications">
                    <Mail className="mr-1.5 h-3.5 w-3.5" />
                    {client._count?.communications || 0}
                  </div>
                </div>
                <div>
                  Updated{" "}
                  {formatDistanceToNow(new Date(client.updatedAt), {
                    addSuffix: true,
                  })}
                </div>
              </CardFooter>
            </Card>
          ))}
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
