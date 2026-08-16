import React, { useState } from "react";
import {
  ArrowRight,
  Zap,
  Monitor,
  ArrowUpRight,
  Cpu,
  CheckCircle2,
} from "lucide-react";
import { CustomAuthPage } from "@/src/components/auth/CustomAuthPage";

export function LandingPage() {
  const [authView, setAuthView] = useState<"landing" | "sign-in" | "sign-up">(
    "landing",
  );

  // If user clicked Sign In or Sign Up, show our custom modern split auth page!
  if (authView !== "landing") {
    return (
      <CustomAuthPage
        initialMode={authView}
        onBackToLanding={() => setAuthView("landing")}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#070809] text-white font-sans selection:bg-white/20 selection:text-white relative overflow-x-hidden pt-20 sm:pt-24 pb-12 px-4 sm:px-6 lg:px-8">
      {/* ── Fixed Top Navigation Bar (Always in View) ─────────────────── */}
      <header className="fixed top-0 left-0 right-0 z-50 backdrop-blur-2xl bg-[#070809]/85 border-b border-white/10 px-4 sm:px-8 py-3.5 shadow-2xl">
        <div className="max-w-[1440px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="Baserow Logo"
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-contain"
            />
            <span className="font-extrabold tracking-wider text-sm sm:text-base text-white font-mono">
              Baserow
            </span>
          </div>

          <div className="flex items-center gap-3 sm:gap-4">
            <button
              onClick={() => setAuthView("sign-in")}
              className="text-xs font-semibold text-gray-400 hover:text-white transition-colors px-2.5 py-1.5"
            >
              Sign In
            </button>
            <button
              onClick={() => setAuthView("sign-up")}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 transition-all active:scale-95"
            >
              <span>Try for free</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Hero Section ────────────────────────────────────────── */}
      <main className="max-w-[1440px] mx-auto relative min-h-[700px] lg:min-h-[820px] flex flex-col items-center justify-center pt-4 sm:pt-8">
        {/* Giant Background Typography (Layered Behind 3D Capsule) */}
        <div className="absolute inset-0 flex items-center justify-between pointer-events-none select-none overflow-hidden z-0">
          <span className="text-[7rem] sm:text-[12rem] lg:text-[18rem] font-black text-white/[0.03] tracking-tighter uppercase leading-none -ml-8 sm:-ml-16">
            Futur
          </span>
          <span className="text-[7rem] sm:text-[12rem] lg:text-[18rem] font-black text-white/[0.03] tracking-tighter uppercase leading-none -mr-8 sm:-mr-16">
            Agent
          </span>
        </div>

        {/* Hero Header Title (Visible on All Screens) */}
        <div className="z-10 text-center max-w-2xl mx-auto mb-6 sm:mb-8 space-y-3">
          {/* <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11px] font-mono text-gray-300 backdrop-blur-md">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Autonomous Founder OS</span>
          </div> */}
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black uppercase tracking-tight text-white leading-tight">
            THE HIGH-PERFORMANCE <br />
            <span className="text-gray-400">SOLO FOUNDER TERMINAL</span>
          </h1>
          <p className="text-xs sm:text-sm lg:text-base text-gray-400 max-w-lg mx-auto leading-relaxed">
            Sub-50ms Go backend engine, automated active window focus telemetry,
            and real-time revenue CRM.
          </p>
        </div>

        {/* ── CENTER PIECE: 3D Glass Pill Capsule Hub ────────────────── */}
        <div className="relative z-10 flex flex-col items-center justify-center my-auto">
          <div
            className="relative group cursor-pointer"
            onClick={() => setAuthView("sign-up")}
          >
            <img
              src="/baserow_capsule.png"
              alt="Baserow 3D Capsule Hub"
              className="w-[280px] sm:w-[380px] md:w-[480px] lg:w-[580px] xl:w-[640px] object-contain drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)] hover:scale-[1.02] transition-transform duration-500 rounded-3xl"
            />

            {/* Floating Launch OS Badge */}
            <div className="absolute top-1/2 right-[-10px] sm:right-[-30px] -translate-y-1/2 w-20 h-20 sm:w-28 sm:h-28 rounded-full bg-[#18191f]/90 border border-white/20 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center text-center p-2 group-hover:scale-110 transition-transform duration-300">
              <ArrowUpRight className="w-4 h-4 sm:w-5 sm:h-5 text-white mb-0.5 sm:mb-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[9px] sm:text-[10px] font-bold tracking-tight text-white uppercase leading-none">
                Launch OS
              </span>
            </div>
          </div>
        </div>

        {/* ── DESKTOP & MOBILE RESPONSIVE FEATURE CARDS ──────────────── */}

        {/* Left Features (Desktop Floating / Mobile Grid Card) */}
        <div className="w-full lg:w-auto lg:absolute lg:left-8 lg:top-[44%] max-w-sm z-20 space-y-4 sm:space-y-6 mt-8 lg:mt-0">
          <div className="hidden lg:flex items-start gap-3 pr-4">
            <ArrowRight className="w-4 h-4 text-gray-500 mt-1 shrink-0" />
            <p className="text-sm text-gray-400 leading-relaxed">
              Every task, goal, and focused hour lands in one ledger.{" "}
              <span className="text-gray-200">No manual logging required.</span>
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#0f1117]/90 border border-white/10 backdrop-blur-xl shadow-2xl hover:border-white/20 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
                <Monitor className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Electron Focus Daemon
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Active window telemetry logs productive hours in real time with
              runaway duration caps.
            </p>
          </div>

          <div className="p-4 sm:p-5 rounded-2xl bg-[#0f1117]/90 border border-white/10 backdrop-blur-xl shadow-2xl hover:border-white/20 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
                <Cpu className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Sub-50ms Go Engine
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Chi router written in Go backed by Neon PostgreSQL connection
              pooler and tRPC batching.
            </p>
          </div>
        </div>

        {/* Right Features (Desktop Floating / Mobile Grid Card) */}
        <div className="w-full lg:w-auto lg:absolute lg:right-8 lg:top-[44%] max-w-sm z-20 space-y-6 mt-4 lg:mt-0 text-left">
          <div className="p-4 sm:p-6 rounded-2xl bg-[#0f1117]/90 border border-white/10 backdrop-blur-xl shadow-2xl hover:border-white/20 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                Autonomous System
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Focus telemetry, deal stages, and task completion all write to one
              single ledger.
            </p>
          </div>

          {/* Orbital Telemetry Widget */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 mx-auto opacity-90 hover:opacity-100 transition-opacity">
            <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md top-0 left-8 sm:left-10 flex items-center justify-center text-[10px] font-mono text-gray-400">
              Focus
            </div>
            <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md bottom-0 left-2 sm:left-4 flex items-center justify-center text-[10px] font-mono text-gray-400">
              CRM
            </div>
            <div className="absolute w-24 h-24 sm:w-28 sm:h-28 rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md top-6 right-2 flex items-center justify-center text-[10px] font-mono text-gray-400">
              Execution
            </div>
            <div className="z-10 absolute inset-0 m-auto w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-white/10 border border-white/30 backdrop-blur-xl flex items-center justify-center text-[9px] font-bold text-white uppercase">
              OS
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="max-w-[1440px] mx-auto pt-8 pb-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 z-30 relative mt-12">
        <div className="flex items-center gap-2">
          <img
            src="/logo.png"
            alt="Baserow Logo"
            className="w-5 h-5 rounded-lg object-contain"
          />
          <span>
            © {new Date().getFullYear()} Baserow. All rights reserved.
          </span>
        </div>
        {/* <div className="flex items-center gap-6 text-gray-400">
          <a href="#" className="hover:text-white transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Cookies
          </a>
        </div> */}
      </footer>
    </div>
  );
}
