"use client";

export default function CRMLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="p-4 md:p-4 pt-6 min-h-full w-full max-w-(--breakpoint-2xl) mx-auto">
      {children}
    </div>
  );
}
