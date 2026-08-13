"use client";

import { useState } from "react";
import { ProjectCard } from "@/components/projects/ProjectCard";
import { ProjectForm } from "@/components/projects/ProjectForm";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc/client";
import { FolderKanban, Plus, Search, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectsClientProps {
  initialProjects?: any[];
}

export function ProjectsClient({ initialProjects }: ProjectsClientProps = {}) {
  const [status, setStatus] = useState<string>("active");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: projects, isLoading } = trpc.project.getProjects.useQuery(
    status === "all"
      ? undefined
      : { status: status as "active" | "planning" | "completed" | "on_hold" },
    {
      initialData: status === "active" ? initialProjects : undefined,
    },
  );

  const filteredProjects = (projects || []).filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ──────────────────────────────────────────────
         HEADER & CONTROLS
         ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <FolderKanban className="w-7 h-7 text-blue-500" />
            Projects & Workspaces
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Syncboard Kanban Backlog — Revenue & task progress across client/product lines
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter Pills */}
          <div className="bg-secondary p-1 rounded-full flex items-center shadow-inner">
            {["active", "planning", "on_hold", "completed", "all"].map((st) => (
              <button
                key={st}
                onClick={() => setStatus(st)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all duration-200",
                  status === st
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {st.replace("_", " ")}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-secondary text-foreground text-xs rounded-full pl-9 pr-4 py-2 w-44 focus:w-56 focus:outline-none transition-all placeholder:text-muted-foreground"
            />
          </div>

          <ProjectForm />
        </div>
      </div>

      {/* ──────────────────────────────────────────────
         PROJECT CARDS GRID (Toota look)
         ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-[250px] w-full rounded-2xl" />
          ))}
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="toota-card flex flex-col items-center justify-center py-16 text-center space-y-3">
          <FolderKanban className="w-12 h-12 text-muted-foreground opacity-40" />
          <p className="text-sm font-semibold text-foreground">No projects found</p>
          <p className="text-xs text-muted-foreground">Create your first project to get started</p>
        </div>
      ) : (
        <div className="grid gap-6 grid-cols-[repeat(auto-fill,minmax(320px,1fr))]">
          {filteredProjects.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}
