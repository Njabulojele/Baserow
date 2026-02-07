import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { AppSidebar } from "@/components/dashboard/AppSidebar";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import Image from "next/image";
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
        <header className="sticky top-0 z-30 flex h-14 sm:h-16 shrink-0 items-center gap-2 border-b px-4 bg-background/80 backdrop-blur-md">
          <div className="w-px h-4 bg-border mx-2" />
          <div className="flex items-center gap-2 lg:hidden">
            <Image
              src="/logo.png"
              alt="Logo"
              width={24}
              height={24}
              className="rounded"
            />
            <span className="font-bold text-sm tracking-tight text-white-smoke">
              BaseRow
            </span>
          </div>
          {/* Add breadcrumbs here if needed later */}
        </header>
        <DashboardShell>
          <div className="flex-1 overflow-x-hidden overflow-y-auto w-6xl min-w-0">
            {children}
          </div>
        </DashboardShell>
      </SidebarInset>
    </SidebarProvider>
  );
}
