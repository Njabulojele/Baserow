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
import { Heart } from "lucide-react";
import { NotificationBell } from "@/components/navigation/NotificationBell";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { AIMiniChat } from "@/components/ai/AIMiniChat";

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
        <header className="sticky top-0 z-30 flex h-12 shrink-0 items-center gap-2 border-b border-border/30 px-4 bg-background">
          <SidebarTrigger className="-ml-1 h-8 w-8 lg:hidden text-muted-foreground/40" />
          <div className="w-px h-4 bg-border/20 mx-2" />
          <div className="flex items-center gap-2 lg:hidden">
            <Image
              src="/logo.png"
              alt="Logo"
              width={20}
              height={20}
              className="rounded"
            />
            <span className="font-mono text-xs font-bold tracking-wide text-alabaster">
              BaseRow
            </span>
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>
        <DashboardShell>
          <div className="flex-1 overflow-x-hidden overflow-y-auto w-full max-w-[1600px] mx-auto min-w-0 flex flex-col">
            <main className="flex-1 w-full min-h-0">{children}</main>
            <footer className="py-4 text-center shrink-0">
              <p className="text-[10px] font-mono text-muted-foreground/30 uppercase tracking-widest">
                Made with{" "}
                <Heart className="w-3 h-3 text-red-500/40 fill-red-500/40 inline mx-0.5" />{" "}
                by{" "}
                <a
                  href="https://pinltdco.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-alabaster transition-colors"
                >
                  OpenInfinity Pty Ltd
                </a>
              </p>
            </footer>
          </div>
        </DashboardShell>
      </SidebarInset>
      <CommandPalette />
      <AIMiniChat />
    </SidebarProvider>
  );
}
