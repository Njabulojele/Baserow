import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import {
  SidebarProvider,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await currentUser();

  if (!user) {
    redirect("/login");
  }

  // Sync user to database
  try {
    const email = user.emailAddresses[0]?.emailAddress;
    if (email) {
      await prisma.user.upsert({
        where: { email: email },
        create: {
          id: user.id,
          email: email,
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          avatar: user.imageUrl,
          timezone: "Africa/Johannesburg", // Default as per requirement
        },
        update: {
          name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
          avatar: user.imageUrl,
        },
      });
    }
  } catch (error) {
    console.error("Failed to sync user:", error);
    // Don't block the UI if sync fails, but log it
  }

  return (
    <SidebarProvider>
      <AppSidebar />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4 bg-background">
          <SidebarTrigger className="-ml-1" />
          <div className="w-px h-4 bg-border mx-2" />
          {/* Add breadcrumbs here if needed later */}
        </header>
        <div className="flex-1 space-y-4 p-4">{children}</div>
      </SidebarInset>
    </SidebarProvider>
  );
}
