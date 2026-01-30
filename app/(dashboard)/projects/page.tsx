import { prefetch } from "@/lib/trpc/server";
import { ProjectsClient } from "./projects-client";

export default async function ProjectsPage() {
  // Server-side prefetch for instant load
  const projects = await prefetch.projects({ status: "active" });

  return <ProjectsClient initialProjects={projects} />;
}
