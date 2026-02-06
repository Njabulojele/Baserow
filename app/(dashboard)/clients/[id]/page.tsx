"use client";

import { use, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { format } from "date-fns";
import {
  Building2,
  Mail,
  Phone,
  MapPin,
  Globe,
  Calendar as CalendarIcon,
  Pencil,
  Trash2,
  MoreVertical,
  Plus,
  Briefcase,
  History,
  LayoutDashboard,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ClientForm } from "@/components/clients/ClientForm";
import { CommunicationTimeline } from "@/components/clients/CommunicationTimeline";
import { CommunicationForm } from "@/components/clients/CommunicationForm";
import { MeetingList } from "@/components/clients/MeetingList";
import { MeetingEditor } from "@/components/clients/MeetingEditor";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { ProjectCard } from "@/components/projects/ProjectCard";

export default function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isLogCommOpen, setIsLogCommOpen] = useState(false);
  const [isMeetingOpen, setIsMeetingOpen] = useState(false);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(
    null,
  );

  const handleOpenMeeting = (id?: string) => {
    setSelectedMeetingId(id || null);
    setIsMeetingOpen(true);
  };

  const {
    data: client,
    isLoading,
    refetch,
  } = trpc.clients.getClient.useQuery({ id });
  const { data: communications, isLoading: commsLoading } =
    trpc.communication.getCommunications.useQuery({
      clientId: id,
      limit: 50,
    });

  const utils = trpc.useUtils();

  const deleteCommunication =
    trpc.communication.deleteCommunication.useMutation({
      onSuccess: () => {
        toast.success("Interaction deleted");
        refetch();
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });

  const deleteMutation = trpc.clients.deleteClient.useMutation({
    onSuccess: () => {
      toast.success("Client deleted successfully");
      router.push("/clients");
    },
    onError: (err) => {
      toast.error(err.message);
    },
  });

  if (isLoading) {
    return (
      <div className="p-8 space-y-8">
        <div className="flex items-center space-x-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </div>
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">Client not found</h2>
        <Button onClick={() => router.push("/clients")} className="mt-4">
          Back to Clients
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20 border-2 border-background shadow-sm">
            <AvatarImage src={`https://avatar.vercel.sh/${client.name}.png`} />
            <AvatarFallback className="text-xl">
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <h2 className="text-3xl font-bold tracking-tight">{client.name}</h2>
            <div className="flex items-center gap-2 text-muted-foreground">
              {client.companyName && (
                <div className="flex items-center">
                  <Building2 className="mr-1.5 h-4 w-4" />
                  {client.companyName}
                </div>
              )}
              {client.industry && (
                <>
                  <span>•</span>
                  <span>{client.industry}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Badge
                variant={
                  client.status === "active"
                    ? "default"
                    : client.status === "lead"
                      ? "secondary"
                      : "outline"
                }
              >
                {client.status.toUpperCase()}
              </Badge>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Dialog open={isLogCommOpen} onOpenChange={setIsLogCommOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Log Interaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Log Communication</DialogTitle>
              </DialogHeader>
              <CommunicationForm
                clientId={client.id}
                onSuccess={() => setIsLogCommOpen(false)}
                onCancel={() => setIsLogCommOpen(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" /> Edit Profile
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px]">
              <DialogHeader>
                <DialogTitle>Edit Client</DialogTitle>
              </DialogHeader>
              <ClientForm
                initialData={{
                  ...client,
                  companyName: client.companyName ?? undefined,
                  email: client.email ?? undefined,
                  phone: client.phone ?? undefined,
                  notes: client.notes ?? undefined,
                  industry: client.industry ?? undefined,
                  website: client.website ?? undefined,
                }}
                onSuccess={() => {
                  setIsEditOpen(false);
                  refetch();
                }}
              />
            </DialogContent>
          </Dialog>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={() => {
                  if (
                    confirm(
                      "Are you sure? This will delete the client and all history.",
                    )
                  ) {
                    deleteMutation.mutate({ id: client.id });
                  }
                }}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete Client
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <Dialog open={isMeetingOpen} onOpenChange={setIsMeetingOpen}>
          <DialogContent className="sm:max-w-[700px]">
            <MeetingEditor
              clientId={client.id}
              meetingId={selectedMeetingId}
              onClose={() => setIsMeetingOpen(false)}
              onSave={() => {
                refetch(); // Refetch client to update counts if needed? well meetings are separate
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Separator />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="communications">
            Communications
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {client._count?.communications || 0}
            </Badge>
          </TabsTrigger>
          <TabsTrigger value="meetings">
            Meetings
            {/* We could fetch meeting count if we wanted, or just leave it blank for now */}
          </TabsTrigger>
          <TabsTrigger value="projects">
            Projects
            <Badge variant="secondary" className="ml-2 h-5 px-1.5 text-xs">
              {client._count?.projects || 0}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Contact Info Card */}
            <Card className="md:col-span-1">
              <CardHeader>
                <CardTitle>Contact Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Email</div>
                    <div
                      className="text-sm text-muted-foreground truncate max-w-[200px]"
                      title={client.email || ""}
                    >
                      {client.email || "-"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Phone</div>
                    <div className="text-sm text-muted-foreground">
                      {client.phone || "-"}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-md bg-muted flex items-center justify-center text-muted-foreground">
                    <Globe className="h-4 w-4" />
                  </div>
                  <div className="space-y-0.5">
                    <div className="text-sm font-medium">Website</div>
                    {client.website ? (
                      <a
                        href={
                          client.website.startsWith("http")
                            ? client.website
                            : `https://${client.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-sm text-primary hover:underline truncate max-w-[200px] block"
                      >
                        {client.website.replace(/^https?:\/\//, "")}
                      </a>
                    ) : (
                      <div className="text-sm text-muted-foreground">-</div>
                    )}
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 p-3 text-xs text-muted-foreground border-t">
                Created {format(new Date(client.createdAt), "PPP")}
              </CardFooter>
            </Card>

            {/* Notes & Stats */}
            <div className="md:col-span-2 space-y-4">
              {/* Quick Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <Briefcase className="h-5 w-5 text-muted-foreground mb-2 opacity-50" />
                    <div className="text-2xl font-bold">
                      {client._count?.projects || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Active Projects
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <History className="h-5 w-5 text-muted-foreground mb-2 opacity-50" />
                    <div className="text-2xl font-bold">
                      {client._count?.communications || 0}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Interactions
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 flex flex-col items-center justify-center text-center">
                    <CalendarIcon className="h-5 w-5 text-muted-foreground mb-2 opacity-50" />
                    <div className="text-sm font-bold pt-1.5">
                      {client.lastInteractionAt
                        ? format(new Date(client.lastInteractionAt), "MMM d")
                        : "-"}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Last Contact
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Notes Card */}
              <Card className="h-full min-h-[200px]">
                <CardHeader>
                  <CardTitle>Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  {client.notes ? (
                    <p className="text-sm whitespace-pre-wrap text-muted-foreground leading-relaxed">
                      {client.notes}
                    </p>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground italic">
                      No notes added yet.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="communications" className="space-y-4">
          {!isLogCommOpen && (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="p-4 flex items-center justify-center">
                <Button variant="ghost" onClick={() => setIsLogCommOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Log a new interaction
                </Button>
              </CardContent>
            </Card>
          )}

          <CommunicationTimeline
            communications={communications?.items || []}
            isLoading={commsLoading}
            onDelete={(id) => {
              if (confirm("Delete this interaction?")) {
                deleteCommunication.mutate({ id });
              }
            }}
          />
        </TabsContent>

        <TabsContent value="meetings" className="space-y-4">
          <MeetingList
            clientId={client.id}
            onSelectMeeting={(id) => handleOpenMeeting(id)}
            onCreateMeeting={() => handleOpenMeeting()}
          />
        </TabsContent>

        <TabsContent value="projects" className="space-y-4">
          {client.projects && client.projects.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {client.projects.map((project: any) => (
                <Card
                  key={project.id}
                  className="hover:shadow-md transition-shadow"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base font-semibold">
                        <Link
                          href={`/projects/${project.id}`}
                          className="hover:underline"
                        >
                          {project.name}
                        </Link>
                      </CardTitle>
                      <div
                        className="h-3 w-3 rounded-full"
                        style={{ backgroundColor: project.color || "#ccc" }}
                      />
                    </div>
                    <CardDescription>{project.status}</CardDescription>
                  </CardHeader>
                  <CardFooter className="pt-2">
                    <Button
                      asChild
                      size="sm"
                      variant="outline"
                      className="w-full"
                    >
                      <Link href={`/projects/${project.id}`}>View Project</Link>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 border rounded-lg bg-muted/20">
              <Briefcase className="h-10 w-10 mx-auto mb-3 opacity-20" />
              <h3 className="font-semibold mb-1">No projects linked</h3>
              <p className="text-sm text-muted-foreground mb-4">
                This client doesn't have any active projects yet.
              </p>
              <Button asChild>
                <Link href="/projects">Create Project</Link>
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
