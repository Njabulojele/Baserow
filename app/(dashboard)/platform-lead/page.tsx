import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createServerCaller } from "@/lib/trpc/server";
import { ProspectingClient } from "./client";

export const metadata = {
  title: "Platform Leads | Open Infinity",
  description: "Automated Lead Prospecting Engine",
};

export default async function PlatformLeadPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  // Pre-fetch the data using the server caller
  const caller = await createServerCaller();

  const [initialAgents, initialLeads] = await Promise.all([
    caller.prospecting.getAgents(),
    caller.prospecting.getLeads({ limit: 50 }),
  ]);

  return (
    <ProspectingClient
      initialAgents={initialAgents}
      initialLeads={initialLeads}
    />
  );
}
