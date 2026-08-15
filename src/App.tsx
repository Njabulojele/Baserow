/**
 * Clerk + React (Vite) Quickstart Integration:
 * https://clerk.com/docs/react/getting-started/quickstart
 */

import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { Show } from "@clerk/react";

import { TRPCProvider } from "@/src/lib/trpc";
import { ViteDashboardLayout } from "@/src/components/layout/ViteDashboardLayout";
import { LandingPage } from "@/src/components/landing/LandingPage";

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
          <LandingPage />
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
