// import React, { useState } from "react";
// import {
//   ArrowRight,
//   ShieldCheck,
//   Zap,
//   Activity,
//   BarChart3,
//   Target,
//   Users,
//   ChevronRight,
//   Monitor,
//   Sparkles,
//   ArrowUpRight,
//   Cpu,
//   Lock,
//   Globe,
// } from "lucide-react";
// import { CustomAuthPage } from "@/src/components/auth/CustomAuthPage";

// export function LandingPage() {
//   const [authView, setAuthView] = useState<"landing" | "sign-in" | "sign-up">(
//     "landing",
//   );

//   // If user clicked Sign In or Sign Up, show our custom modern split auth page!
//   if (authView !== "landing") {
//     return (
//       <CustomAuthPage
//         initialMode={authView}
//         onBackToLanding={() => setAuthView("landing")}
//       />
//     );
//   }

//   return (
//     <div className="min-h-screen bg-[#070809] text-white font-sans selection:bg-white/20 selection:text-white relative overflow-x-hidden p-4 sm:p-6 lg:p-8">
//       {/* ── Top Navigation Bar ────────────────────────────────────────── */}
//       <header className="max-w-[1440px] mx-auto flex items-center justify-between py-4 mb-8 z-30 relative">
//         <div className="flex items-center gap-3">
//           <img
//             src="/logo.png"
//             alt="Baserow Logo"
//             className="w-8 h-8 rounded-xl object-contain"
//           />
//           <span className="font-extrabold tracking-wider text-base text-white font-mono">
//             Baserow
//           </span>
//         </div>

//         <div className="flex items-center gap-4">
//           <button
//             onClick={() => setAuthView("sign-in")}
//             className="text-xs font-semibold text-gray-400 hover:text-white transition-colors px-3 py-2"
//           >
//             Sign In
//           </button>
//           <button
//             onClick={() => setAuthView("sign-up")}
//             className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 transition-all"
//           >
//             <span>Try for free</span>
//             <ArrowUpRight className="w-3.5 h-3.5" />
//           </button>
//         </div>
//       </header>

//       {/* ── Main Hero Section (Nexor AI Inspired Layout) ─────────────── */}
//       <main className="max-w-[1440px] mx-auto relative min-h-[780px] lg:min-h-[840px] flex items-center justify-center">
//         {/* Giant Background Typography (Layered Behind 3D Capsule) */}
//         <div className="absolute inset-0 flex items-center justify-between pointer-events-none select-none overflow-hidden z-0">
//           <span className="text-[10rem] sm:text-[14rem] lg:text-[18rem] font-black text-white/[0.03] tracking-tighter uppercase leading-none -ml-12">
//             Futur
//           </span>
//           <span className="text-[10rem] sm:text-[14rem] lg:text-[18rem] font-black text-white/[0.03] tracking-tighter uppercase leading-none -mr-12">
//             Agent
//           </span>
//         </div>

//         {/* ── CENTER PIECE: 3D Glass Pill Capsule Hub ────────────────── */}
//         <div className="relative z-10 flex flex-col items-center justify-center my-auto">
//           <div
//             className="relative group cursor-pointer"
//             onClick={() => setAuthView("sign-up")}
//           >
//             {/* Main Capsule Render */}
//             <img
//               src="/baserow_capsule.png"
//               alt="Baserow 3D Capsule Hub"
//               className="w-[280px] sm:w-[340px] md:w-[380px] lg:w-[420px] object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.9)] hover:scale-[1.02] transition-transform duration-500"
//             />

//             {/* Floating Launch OS Badge (Positioned over Capsule) */}
//             <div className="absolute top-1/2 right-[-20px] sm:right-[-40px] -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#18191f]/90 border border-white/20 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center text-center p-2 group-hover:scale-110 transition-transform duration-300">
//               <ArrowUpRight className="w-5 h-5 text-white mb-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
//               <span className="text-[10px] font-bold tracking-tight text-white uppercase leading-none">
//                 Launch OS
//               </span>
//             </div>
//           </div>
//         </div>

//         {/* ── LEFT ANNOTATIONS (Aceternity Floating Glass Cards) ──────── */}
//         <div className="absolute left-4 lg:left-8 top-1/4 max-w-sm z-20 space-y-6 hidden md:block">
//           <div className="p-5 rounded-2xl bg-[#0f1117]/80 border border-white/10 backdrop-blur-xl shadow-2xl hover:border-white/20 transition-all">
//             <div className="flex items-center gap-2 mb-2">
//               <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
//                 <Monitor className="w-4 h-4" />
//               </div>
//               <span className="text-xs font-bold text-white uppercase tracking-wider">
//                 Electron Focus Daemon
//               </span>
//             </div>
//             <p className="text-xs text-gray-400 leading-relaxed">
//               Automated active window telemetry logging productive hours with
//               runaway duration caps.
//             </p>
//           </div>

//           <div className="p-5 rounded-2xl bg-[#0f1117]/80 border border-white/10 backdrop-blur-xl shadow-2xl hover:border-white/20 transition-all">
//             <div className="flex items-center gap-2 mb-2">
//               <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
//                 <Cpu className="w-4 h-4" />
//               </div>
//               <span className="text-xs font-bold text-white uppercase tracking-wider">
//                 Sub-50ms Go Architecture
//               </span>
//             </div>
//             <p className="text-xs text-gray-400 leading-relaxed">
//               Chi router written in Go backed by Neon PostgreSQL connection
//               pooler and tRPC batching.
//             </p>
//           </div>
//         </div>

//         {/* ── RIGHT ANNOTATIONS & ORBITAL WIDGET ──────────────────────── */}
//         <div className="absolute right-4 lg:left-auto lg:right-8 top-1/4 max-w-sm z-20 space-y-8 hidden md:block text-left">
//           <div className="p-6 rounded-2xl bg-[#0f1117]/80 border border-white/10 backdrop-blur-xl shadow-2xl hover:border-white/20 transition-all">
//             <div className="flex items-center gap-2 mb-2">
//               <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
//                 <Zap className="w-4 h-4" />
//               </div>
//               <span className="text-xs font-bold text-white uppercase tracking-wider">
//                 Autonomous Intelligence
//               </span>
//             </div>
//             <p className="text-xs text-gray-400 leading-relaxed">
//               One unified platform where focus telemetry, CRM deal stages, and
//               strategy roadmaps align seamlessly.
//             </p>
//           </div>

//           {/* Venn Diagram / Orbital Telemetry Widget */}
//           <div className="relative w-48 h-48 mx-auto flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
//             <div className="absolute w-28 h-28 rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md top-2 left-4 flex items-center justify-center text-[10px] font-mono text-gray-400">
//               Focus
//             </div>
//             <div className="absolute w-28 h-28 rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md bottom-2 left-2 flex items-center justify-center text-[10px] font-mono text-gray-400">
//               CRM
//             </div>
//             <div className="absolute w-28 h-28 rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md top-6 right-2 flex items-center justify-center text-[10px] font-mono text-gray-400">
//               Execution
//             </div>
//             <div className="z-10 w-12 h-12 rounded-full bg-white/10 border border-white/30 backdrop-blur-xl flex items-center justify-center text-[9px] font-bold text-white uppercase">
//               OS
//             </div>
//           </div>
//         </div>
//       </main>

//       {/* ── Footer ────────────────────────────────────────────────── */}
//       <footer className="max-w-[1440px] mx-auto pt-8 pb-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 z-30 relative">
//         <div>© {new Date().getFullYear()} Baserow. All rights reserved.</div>
//         <div className="flex items-center gap-6 text-gray-400">
//           <a href="#" className="hover:text-white transition-colors">
//             Terms of Service
//           </a>
//           <a href="#" className="hover:text-white transition-colors">
//             Privacy
//           </a>
//           <a href="#" className="hover:text-white transition-colors">
//             Cookies
//           </a>
//         </div>
//       </footer>
//     </div>
//   );
// }

import React, { useState } from "react";
import {
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  BarChart3,
  Target,
  Users,
  ChevronRight,
  Monitor,
  Sparkles,
  ArrowUpRight,
  Cpu,
  Lock,
  Globe,
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
    <div className="min-h-screen bg-[#070809] text-white font-sans selection:bg-white/20 selection:text-white relative overflow-x-hidden p-4 sm:p-6 lg:p-8">
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <header className="max-w-[1440px] mx-auto flex items-center justify-between py-4 mb-8 z-30 relative">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Baserow Logo"
            className="w-8 h-8 rounded-xl object-contain"
          />
          <span className="font-extrabold tracking-wider text-base text-white font-mono">
            Baserow
          </span>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={() => setAuthView("sign-in")}
            className="text-xs font-semibold text-gray-400 hover:text-white transition-colors px-3 py-2"
          >
            Sign In
          </button>
          <button
            onClick={() => setAuthView("sign-up")}
            className="px-5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 transition-all"
          >
            <span>Try for free</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </header>

      {/* ── Main Hero Section ────────────────────────────────────────── */}
      <main className="max-w-[1440px] mx-auto relative min-h-[820px] lg:min-h-[880px] flex items-center justify-center">
        {/* Giant Background Typography, cropped past the viewport edge like the reference */}
        <div className="absolute inset-0 flex items-center justify-between pointer-events-none select-none overflow-hidden z-0">
          <span className="text-[11rem] sm:text-[15rem] lg:text-[19rem] font-black text-white/[0.035] tracking-tighter uppercase leading-none -ml-16">
            Focus
          </span>
          <span className="text-[11rem] sm:text-[15rem] lg:text-[19rem] font-black text-white/[0.035] tracking-tighter uppercase leading-none -mr-16">
            State
          </span>
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
              className="w-[360px] sm:w-[460px] md:w-[540px] lg:w-[620px] xl:w-[680px] object-contain drop-shadow-[0_25px_60px_rgba(0,0,0,0.95)] hover:scale-[1.02] transition-transform duration-500 rounded-3xl"
            />

            <div className="absolute top-1/2 right-[-20px] sm:right-[-40px] -translate-y-1/2 w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#18191f]/90 border border-white/20 shadow-2xl backdrop-blur-xl flex flex-col items-center justify-center text-center p-2 group-hover:scale-110 transition-transform duration-300">
              <ArrowUpRight className="w-5 h-5 text-white mb-1 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              <span className="text-[10px] font-bold tracking-tight text-white uppercase leading-none">
                Launch OS
              </span>
            </div>
          </div>
        </div>

        {/* ── LEFT COLUMN: intro line + floating annotation cards ─────── */}
        <div className="absolute left-4 lg:left-8 top-[30%] max-w-sm z-20 space-y-7 hidden md:block">
          {/* Intro line, the piece the reference has that this file was missing */}
          <div className="flex items-start gap-3 pr-4">
            <ArrowRight className="w-4 h-4 text-gray-500 mt-1 shrink-0" />
            <p className="text-sm text-gray-400 leading-relaxed">
              Every task, goal, and focused hour lands in one ledger.{" "}
              <span className="text-gray-200">
                No manual logging, nothing to remember to track.
              </span>
            </p>
          </div>

          <div className="relative p-5 rounded-2xl bg-[#0f1117]/80 border border-white/10 backdrop-blur-xl shadow-2xl hover:border-white/20 transition-all">
            <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-[#18191f] border border-white/15 flex items-center justify-center">
              <Monitor className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
              Electron Focus Daemon
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">
              Active window telemetry logs productive hours in real time, with
              runaway duration caps so a crash never inflates the log.
            </p>
          </div>

          <div className="relative p-5 rounded-2xl bg-[#0f1117]/80 border border-white/10 backdrop-blur-xl shadow-2xl hover:border-white/20 transition-all">
            <div className="absolute -top-3 -right-3 w-7 h-7 rounded-full bg-[#18191f] border border-white/15 flex items-center justify-center">
              <Cpu className="w-3.5 h-3.5 text-gray-300" />
            </div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block mb-2">
              Sub-50ms Go Architecture
            </span>
            <p className="text-xs text-gray-400 leading-relaxed">
              A Go backend on Neon Postgres, scoped and ownership-checked on
              every query, not just the ones that happened to get tested.
            </p>
          </div>
        </div>

        {/* ── RIGHT COLUMN: annotation card + orbital telemetry widget ── */}
        <div className="absolute right-4 lg:left-auto lg:right-8 top-[28%] max-w-sm z-20 space-y-10 hidden md:block text-left">
          <div className="p-6 rounded-2xl bg-[#0f1117]/80 border border-white/10 backdrop-blur-xl shadow-2xl hover:border-white/20 transition-all">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-white">
                <Zap className="w-4 h-4" />
              </div>
              <span className="text-xs font-bold text-white uppercase tracking-wider">
                One system of record
              </span>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Focus telemetry, deal stages, and task completion all write to the
              same ledger, so the dashboard never shows two different answers to
              the same question.
            </p>
          </div>

          {/* Orbital widget: three overlapping circles reading as a real Venn, not a scatter */}
          <div className="relative w-52 h-52 mx-auto opacity-85 hover:opacity-100 transition-opacity">
            <div className="absolute w-28 h-28 rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md top-0 left-10 flex items-center justify-center text-[10px] font-mono text-gray-400">
              Focus
            </div>
            <div className="absolute w-28 h-28 rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md bottom-0 left-0 flex items-center justify-center text-[10px] font-mono text-gray-400">
              CRM
            </div>
            <div className="absolute w-28 h-28 rounded-full border border-white/20 bg-white/[0.02] backdrop-blur-md bottom-2 right-0 flex items-center justify-center text-[10px] font-mono text-gray-400">
              Execution
            </div>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-white/10 border border-white/30 backdrop-blur-xl shadow-[0_0_30px_rgba(255,255,255,0.08)] flex items-center justify-center text-[9px] font-bold text-white uppercase">
              OS
            </div>
          </div>
        </div>
      </main>

      {/* ── Footer ────────────────────────────────────────────────── */}
      <footer className="max-w-[1440px] mx-auto pt-6 pb-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-gray-500 z-30 relative">
        <div>© {new Date().getFullYear()} Baserow. All rights reserved.</div>
        <div className="flex items-center gap-6 text-gray-400">
          <a href="#" className="hover:text-white transition-colors">
            Terms of Service
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Privacy
          </a>
          <a href="#" className="hover:text-white transition-colors">
            Cookies
          </a>
        </div>
      </footer>
    </div>
  );
}
