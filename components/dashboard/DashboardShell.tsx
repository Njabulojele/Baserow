"use client";

import { CommandBar } from "@/components/CommandBar";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandBar />
    </>
  );
}
