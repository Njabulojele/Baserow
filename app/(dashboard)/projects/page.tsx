import { prefetch } from "@/lib/trpc/server";
import { ProjectsClient } from "./projects-client";

export default async function ProjectsPage() {
  // Server-side prefetch — fall back gracefully if auth is not available during SSR
  let projects: Awaited<ReturnType<typeof prefetch.projects>>;
  try {
    projects = await prefetch.projects({ status: "active" });
  } catch {
    projects = [];
  }

  return <ProjectsClient initialProjects={projects} />;
}
