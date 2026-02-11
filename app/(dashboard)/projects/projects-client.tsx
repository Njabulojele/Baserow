"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  priority: string;
  type: string;
  color: string | null;
  deadline: Date | null;
  completionPercentage: number;
  actualHoursSpent: number;
  _count: { tasks: number };
  client: { id: string; name: string } | null;
}

interface ProjectsClientProps {
  initialProjects: any[];
}

export function ProjectsClient({ initialProjects }: ProjectsClientProps) {
  const [status, setStatus] = useState<string>("active");

  // Use server-prefetched data for 'active', fetch fresh for other views
  const { data: projects, isLoading } = trpc.project.getProjects.useQuery(
    status === "all"
      ? undefined
      : { status: status as "active" | "planning" | "completed" | "on_hold" },
    {
      initialData: status === "active" ? initialProjects : undefined,
    },
  );

  return (
    <div className="container mx-auto py-6 sm:py-8 px-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
            Projects
          </h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1 text-white-smoke/60">
            Organize and track your work
          </p>
        </div>
        <div className="w-full sm:w-auto">
          <ProjectForm />
        </div>
      </div>

      <Tabs value={status} onValueChange={setStatus} className="space-y-6">
        <div className="overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-none">
          <TabsList className="flex w-full min-w-max sm:min-w-0 sm:grid sm:grid-cols-5">
            <TabsTrigger value="active" className="flex-1">
              Active
            </TabsTrigger>
            <TabsTrigger value="planning" className="flex-1">
              Planning
            </TabsTrigger>
            <TabsTrigger value="on_hold" className="flex-1">
              On Hold
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex-1">
              Completed
            </TabsTrigger>
            <TabsTrigger value="all" className="flex-1">
              All
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value={status}>
          {isLoading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-48 w-full rounded-xl" />
              ))}
            </div>
          ) : !projects || projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <p>No {status === "all" ? "" : status} projects found.</p>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <ProjectCard key={project.id} project={project} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
