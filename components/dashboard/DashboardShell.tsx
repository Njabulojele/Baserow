"use client";

import { CommandBar } from "@/components/CommandBar";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { usePathname } from "next/navigation";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isFullBleed =
    pathname?.startsWith("/calendar") || pathname?.startsWith("/canvas");

  if (isFullBleed) {
    return (
      <>
        <div className="flex-1 w-full h-[calc(100vh-3.5rem)] overflow-hidden flex flex-col min-w-0">
          <main className="flex-1 w-full h-full min-h-0 overflow-hidden">
            <ErrorBoundary title="View rendering error">
              {children}
            </ErrorBoundary>
          </main>
        </div>
        <CommandBar />
      </>
    );
  }

  return (
    <>
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
      <CommandBar />
    </>
  );
}
