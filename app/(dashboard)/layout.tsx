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
import { Heart, Bell } from "lucide-react";
import { NotificationBell } from "@/components/navigation/NotificationBell";
import { GlobalTimerIndicator } from "@/components/navigation/GlobalTimerIndicator";
import { CommandPalette } from "@/components/ui/CommandPalette";
import { AIMiniChat } from "@/components/ai/AIMiniChat";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { FloatingGoalTimer } from "@/components/goals/FloatingGoalTimer";

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
      const displayName =
        `${user.firstName || ""} ${user.lastName || ""}`.trim() ||
        email.split("@")[0];
      const existingById = await prisma.user.findUnique({
        where: { id: user.id },
      });
      if (existingById) {
        await prisma.user.update({
          where: { id: user.id },
          data: { email, name: displayName, avatar: user.imageUrl },
        });
      } else {
        const existingByEmail = await prisma.user.findUnique({
          where: { email },
        });
        if (existingByEmail) {
          await prisma.user.update({
            where: { email },
            data: { id: user.id, name: displayName, avatar: user.imageUrl },
          });
        } else {
          await prisma.user.create({
            data: {
              id: user.id,
              email,
              name: displayName,
              avatar: user.imageUrl,
              timezone: "Africa/Johannesburg",
            },
          });
        }
      }
    }
  } catch (error) {
    console.error("Failed to sync user:", error);
    // Don't block the UI if sync fails, but log it
  }

  return (
    <ErrorBoundary>
      <SidebarProvider>
        <AppSidebar />
        <SidebarInset className="bg-background min-h-screen border-none">
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between px-6 bg-background/80 backdrop-blur-md border-none">
            <div className="flex items-center gap-3 lg:hidden">
              <SidebarTrigger className="h-8 w-8 text-muted-foreground hover:text-foreground" />
              <span className="text-sm font-bold tracking-tight">BASEROW</span>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-4">
              <GlobalTimerIndicator />
              <ErrorBoundary
                fallback={
                  <div className="p-2 text-muted-foreground opacity-40">
                    <Bell className="w-5 h-5" />
                  </div>
                }
              >
                <NotificationBell />
              </ErrorBoundary>
            </div>
          </header>
          <DashboardShell>
            <div className="flex-1 overflow-x-hidden overflow-y-auto w-full max-w-[1600px] mx-auto min-w-0 flex flex-col px-4 lg:px-8 py-2">
              <main className="flex-1 w-full min-h-0 pb-8">
                <ErrorBoundary title="View rendering error">
                  {children}
                </ErrorBoundary>
              </main>
              <footer className="py-4 text-center shrink-0">
                <p className="text-[11px] font-medium text-muted-foreground/50 tracking-wide">
                  Command Center
                </p>
              </footer>
            </div>
          </DashboardShell>
        </SidebarInset>
        <CommandPalette />
        <AIMiniChat />
        <FloatingGoalTimer />
      </SidebarProvider>
    </ErrorBoundary>
  );
}
