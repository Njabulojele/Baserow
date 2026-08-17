import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthenticateWithRedirectCallback, useAuth } from "@clerk/react";

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

function SSOCallback() {
  return (
    <div className="min-h-screen bg-[#08090C] flex flex-col items-center justify-center text-white">
      <div className="flex flex-col items-center gap-4 p-8 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-semibold text-gray-300">Completing sign in...</p>
        <AuthenticateWithRedirectCallback
          signInForceRedirectUrl="/"
          signUpForceRedirectUrl="/"
        />
      </div>
    </div>
  );
}

function AppContent() {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[#08090C] flex items-center justify-center text-white">
        <div className="w-8 h-8 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <ViteDashboardLayout>
        <Routes>
          <Route path="/" element={<DashboardClient />} />
          <Route path="/dashboard" element={<Navigate to="/" replace />} />
          <Route path="/sso-callback" element={<Navigate to="/" replace />} />
          <Route path="/sso_callback" element={<Navigate to="/" replace />} />
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
          <Route path="*" element={<DashboardClient />} />
        </Routes>
      </ViteDashboardLayout>
    );
  }

  return (
    <Routes>
      <Route path="/sso-callback" element={<SSOCallback />} />
      <Route path="/sso_callback" element={<SSOCallback />} />
      <Route path="*" element={<LandingPage />} />
    </Routes>
  );
}

export default function App() {
  return (
    <TRPCProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </TRPCProvider>
  );
}
