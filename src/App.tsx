/**
 * Clerk + React (Vite) Quickstart Integration:
 * https://clerk.com/docs/react/getting-started/quickstart
 */

import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Show, SignInButton, SignUpButton } from "@clerk/react";
import { Sparkles, ArrowRight, ShieldCheck } from "lucide-react";

import { TRPCProvider } from "@/src/lib/trpc";
import { ViteDashboardLayout } from "@/src/components/layout/ViteDashboardLayout";

// Dashboard
import { DashboardClient } from "@/app/(dashboard)/dashboard/dashboard-client";

// Projects
import { ProjectsClient } from "@/app/(dashboard)/projects/projects-client";
import ProjectDetailPage from "@/app/(dashboard)/projects/[id]/page";

// Tasks
import { TasksClient } from "@/app/(dashboard)/tasks/tasks-client";

// Calendar
import { CalendarClient } from "@/app/(dashboard)/calendar/CalendarClient";

// Canvas
import { CanvasClient } from "@/app/(dashboard)/canvas/canvas-client";

// Tracklog
import { TracklogView } from "@/components/tracklog/TracklogView";

// Analytics
import AnalyticsPage from "@/app/(dashboard)/analytics/page";

// Goals
import GoalsPage from "@/app/(dashboard)/goals/page";

// Clients
import ClientsPage from "@/app/(dashboard)/clients/page";
import ClientDetailPage from "@/app/(dashboard)/clients/[id]/page";

// CRM
import CRMPage from "@/app/(dashboard)/crm/page";
import LeadsPage from "@/app/(dashboard)/crm/leads/page";

// Timer
import TimerPage from "@/app/(dashboard)/timer/page";

// Settings
import SettingsPage from "@/app/(dashboard)/settings/page";

// Team
import { TeamClient } from "@/app/(dashboard)/team/team-client";

function ProjectDetailPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <ProjectDetailPage params={Promise.resolve({ id: id || "" })} />;
}

function ClientDetailPageWrapper() {
  const { id } = useParams<{ id: string }>();
  return <ClientDetailPage params={Promise.resolve({ id: id || "" })} />;
}

export default function App() {
  return (
    <TRPCProvider>
      <BrowserRouter>
        {/* ── Signed Out ───────────────────────────────────────── */}
        <Show when="signed-out">
          <div className="min-h-screen bg-[#0d0e11] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-emerald-500/10 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-10 right-10 w-[350px] h-[350px] bg-amber-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="max-w-md w-full p-8 text-center space-y-6 relative z-10 bg-[#16181d]/80 border border-white/10 rounded-2xl shadow-2xl backdrop-blur-xl">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 via-lime-400 to-emerald-400 flex items-center justify-center mx-auto shadow-lg">
                <Sparkles className="w-7 h-7 text-black" />
              </div>

              <div className="space-y-2">
                <h1 className="text-2xl font-extrabold tracking-tight text-white">
                  BASEROW
                </h1>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Solo Founder Productivity OS · Vite + React
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <SignInButton mode="modal">
                  <button className="w-full py-3 px-6 bg-gradient-to-r from-emerald-500 to-lime-500 hover:from-emerald-400 hover:to-lime-400 text-black text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all group">
                    <span>Sign In to Terminal</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </button>
                </SignInButton>

                <SignUpButton mode="modal">
                  <button className="w-full py-3 px-6 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-300 hover:text-white text-sm font-semibold rounded-xl transition-all">
                    Create New Account
                  </button>
                </SignUpButton>
              </div>

              <div className="pt-4 border-t border-white/5 flex items-center justify-center gap-2 text-[11px] text-gray-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protected by Clerk Authentication</span>
              </div>
            </div>
          </div>
        </Show>

        {/* ── Signed In ────────────────────────────────────────── */}
        <Show when="signed-in">
          <ViteDashboardLayout>
            <Routes>
              <Route path="/" element={<DashboardClient />} />
              <Route path="/dashboard" element={<Navigate to="/" replace />} />
              <Route path="/projects" element={<ProjectsClient />} />
              <Route path="/projects/:id" element={<ProjectDetailPageWrapper />} />
              <Route path="/tasks" element={<TasksClient />} />
              <Route path="/calendar" element={<CalendarClient />} />
              <Route path="/canvas" element={<CanvasClient />} />
              <Route path="/tracklog" element={<TracklogView />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route path="/goals" element={<GoalsPage />} />
              <Route path="/clients" element={<ClientsPage />} />
              <Route path="/clients/:id" element={<ClientDetailPageWrapper />} />
              <Route path="/crm" element={<CRMPage />} />
              <Route path="/crm/leads" element={<LeadsPage />} />
              <Route path="/timer" element={<TimerPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/team" element={<TeamClient />} />
              {/* fallback — show dashboard but don't hard-redirect so the
                  URL stays in place; avoids redirect loops on unimplemented routes */}
              <Route path="*" element={<DashboardClient />} />
            </Routes>
          </ViteDashboardLayout>
        </Show>
      </BrowserRouter>
    </TRPCProvider>
  );
}
