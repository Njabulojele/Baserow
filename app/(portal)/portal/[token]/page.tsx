"use client";

import { use } from "react";
import {
  ShieldCheck,
  FolderKanban,
  CheckCircle2,
  Clock,
  Briefcase,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PortalPageProps {
  params: Promise<{ token: string }>;
}

export default function PortalPage({ params }: PortalPageProps) {
  const { token } = use(params);

  // In production, token is validated against GET /api/portal/:token
  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-12 space-y-8">
      {/* ──────────────────────────────────────────────
         PORTAL HEADER (Scoped for Client View)
         ────────────────────────────────────────────── */}
      <div className="toota-card p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border-emerald-500/30">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-emerald-500 font-bold text-xs">
            <ShieldCheck className="w-4 h-4" /> Secure Client Web Portal Access
          </div>
          <h1 className="text-3xl font-extrabold text-foreground">
            OpenInfinity Client Workspace
          </h1>
          <p className="text-xs text-muted-foreground">
            Real-time project roadmap, milestone delivery tracker, and active task progress.
          </p>
        </div>

        <div className="bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-xs font-mono text-emerald-400 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Live Token: {token.slice(0, 16)}...
        </div>
      </div>

      {/* ──────────────────────────────────────────────
         PROJECT ROADMAP & PROGRESS CARDS
         ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="toota-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Divine Essence Platform Redesign</h2>
            <span className="bg-emerald-500/15 text-emerald-500 text-xs font-bold px-3 py-1 rounded-full">
              In Progress
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Overall Completion</span>
              <span className="font-mono text-emerald-500 font-bold">85%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[85%]" />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-secondary/50 text-xs">
            <p className="font-bold text-foreground">Delivered Milestones:</p>
            <div className="space-y-1.5 text-muted-foreground">
              <p className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Dark Luxury Visual UI Migration — Completed
              </p>
              <p className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> PayFast ITN Webhook & Wallet Settlement — Completed
              </p>
              <p className="flex items-center gap-2 text-amber-400">
                <Clock className="w-3.5 h-3.5" /> Mobile Responsive Checkout Polish — In Review
              </p>
            </div>
          </div>
        </div>

        <div className="toota-card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Anchor OS Integration</h2>
            <span className="bg-emerald-500/15 text-emerald-500 text-xs font-bold px-3 py-1 rounded-full">
              Phase 2 Active
            </span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-semibold">
              <span className="text-muted-foreground">Overall Completion</span>
              <span className="font-mono text-emerald-500 font-bold">92%</span>
            </div>
            <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full w-[92%]" />
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-secondary/50 text-xs">
            <p className="font-bold text-foreground">Delivered Milestones:</p>
            <div className="space-y-1.5 text-muted-foreground">
              <p className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Toota Borderless Design System — Completed
              </p>
              <p className="flex items-center gap-2 text-foreground">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" /> Go Engine & Redis Caching Layer — Completed
              </p>
              <p className="flex items-center gap-2 text-emerald-500">
                <CheckCircle2 className="w-3.5 h-3.5" /> Client Portal Token Access — Completed
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
