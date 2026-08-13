"use client";

import { useState } from "react";
import {
  Settings,
  Mail,
  Timer,
  Target,
  Laptop,
  Check,
  Send,
  Save,
  Bell,
  Volume2,
  Lock,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<"smtp" | "timer" | "goals" | "apps">("smtp");
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [smtpProvider, setSmtpProvider] = useState("gmail");
  const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
  const [smtpPort, setSmtpPort] = useState("587");
  const [smtpUser, setSmtpUser] = useState("clement@openinfinity.co.za");
  const [smtpPass, setSmtpPass] = useState("••••••••••••••••");

  // Timer & Pomodoro State
  const [workDuration, setWorkDuration] = useState(60);
  const [shortBreakDuration, setShortBreakDuration] = useState(10);
  const [longBreakDuration, setLongBreakDuration] = useState(30);
  const [autoContinue, setAutoContinue] = useState(false);
  const [overrunAlert, setOverrunAlert] = useState(true);

  // Goal & Nudge State
  const [defaultNeglectDays, setDefaultNeglectDays] = useState(3);
  const [emailAlertsEnabled, setEmailAlertsEnabled] = useState(true);

  const handleSaveSettings = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      toast.success("Settings saved successfully!");
    }, 600);
  };

  const handleTestSmtp = () => {
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1200)),
      {
        loading: "Sending test email via SMTP...",
        success: "Test email dispatched to " + smtpUser,
        error: "SMTP connection failed",
      },
    );
  };

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ──────────────────────────────────────────────
         HEADER
         ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Settings className="w-7 h-7 text-primary" />
            Anchor Settings & Configuration
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Configure SMTP email delivery, timer parameters, goal neglect thresholds, and app tracking rules
          </p>
        </div>

        <button
          onClick={handleSaveSettings}
          disabled={isSaving}
          className="toota-pill-active flex items-center gap-2 text-xs py-2.5 px-6"
        >
          <Save className="w-4 h-4" />
          <span>{isSaving ? "Saving..." : "Save Settings"}</span>
        </button>
      </div>

      {/* ──────────────────────────────────────────────
         TAB NAVIGATION PILLS
         ────────────────────────────────────────────── */}
      <div className="bg-secondary p-1 rounded-full flex items-center w-fit shadow-inner">
        <button
          onClick={() => setActiveTab("smtp")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200",
            activeTab === "smtp"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Mail className="w-3.5 h-3.5" /> Email & SMTP
        </button>

        <button
          onClick={() => setActiveTab("timer")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200",
            activeTab === "timer"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Timer className="w-3.5 h-3.5" /> Timer & Pomodoro
        </button>

        <button
          onClick={() => setActiveTab("goals")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200",
            activeTab === "goals"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Target className="w-3.5 h-3.5" /> Goals & Nudges
        </button>

        <button
          onClick={() => setActiveTab("apps")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-full text-xs font-semibold transition-all duration-200",
            activeTab === "apps"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground",
          )}
        >
          <Laptop className="w-3.5 h-3.5" /> App Rules
        </button>
      </div>

      {/* ──────────────────────────────────────────────
         TAB CONTENT SECTIONS
         ────────────────────────────────────────────── */}
      {/* 1. SMTP TAB */}
      {activeTab === "smtp" && (
        <div className="toota-card space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-foreground">SMTP Email Dispatch Settings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Supports free mail providers (Gmail, Outlook.com, Yahoo) via app-passwords for goal nudges and client portal invites.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Provider</label>
              <select
                value={smtpProvider}
                onChange={(e) => setSmtpProvider(e.target.value)}
                className="w-full bg-secondary text-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none"
              >
                <option value="gmail">Gmail (App Password)</option>
                <option value="outlook">Outlook / Microsoft 365</option>
                <option value="yahoo">Yahoo Mail</option>
                <option value="custom">Custom SMTP Server</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">SMTP Host</label>
                <input
                  type="text"
                  value={smtpHost}
                  onChange={(e) => setSmtpHost(e.target.value)}
                  className="w-full bg-secondary text-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">SMTP Port</label>
                <input
                  type="text"
                  value={smtpPort}
                  onChange={(e) => setSmtpPort(e.target.value)}
                  className="w-full bg-secondary text-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Username / Email Address</label>
              <input
                type="email"
                value={smtpUser}
                onChange={(e) => setSmtpUser(e.target.value)}
                className="w-full bg-secondary text-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">App Password / Secret</label>
              <input
                type="password"
                value={smtpPass}
                onChange={(e) => setSmtpPass(e.target.value)}
                className="w-full bg-secondary text-foreground text-xs rounded-xl px-4 py-2.5 focus:outline-none"
              />
            </div>

            <div className="pt-2">
              <button
                onClick={handleTestSmtp}
                className="toota-pill text-xs flex items-center gap-2 hover:bg-secondary/80"
              >
                <Send className="w-3.5 h-3.5" /> Send Test Email
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. TIMER & POMODORO TAB */}
      {activeTab === "timer" && (
        <div className="toota-card space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-foreground">Timer & Pomodoro Configuration</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Customize focus durations, break lengths, auto-continue behavior, and overrun sound alerts.
            </p>
          </div>

          <div className="space-y-5">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Work Session (min)</label>
                <input
                  type="number"
                  value={workDuration}
                  onChange={(e) => setWorkDuration(Number(e.target.value))}
                  className="w-full bg-secondary text-foreground font-mono text-xs rounded-xl px-4 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Short Break (min)</label>
                <input
                  type="number"
                  value={shortBreakDuration}
                  onChange={(e) => setShortBreakDuration(Number(e.target.value))}
                  className="w-full bg-secondary text-foreground font-mono text-xs rounded-xl px-4 py-2.5 focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Long Break (min)</label>
                <input
                  type="number"
                  value={longBreakDuration}
                  onChange={(e) => setLongBreakDuration(Number(e.target.value))}
                  className="w-full bg-secondary text-foreground font-mono text-xs rounded-xl px-4 py-2.5 focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2 border-t border-secondary/50">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">Pomodoro Auto-Continue</p>
                  <p className="text-[11px] text-muted-foreground">Automatically start break/work session without manual click</p>
                </div>
                <button
                  onClick={() => setAutoContinue(!autoContinue)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors p-1 flex items-center",
                    autoContinue ? "bg-emerald-500 justify-end" : "bg-secondary justify-start",
                  )}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-foreground">10-Minute Overrun Alert Sound</p>
                  <p className="text-[11px] text-muted-foreground">Play native OS alert sound if session runs 10 minutes past target duration</p>
                </div>
                <button
                  onClick={() => setOverrunAlert(!overrunAlert)}
                  className={cn(
                    "w-11 h-6 rounded-full transition-colors p-1 flex items-center",
                    overrunAlert ? "bg-emerald-500 justify-end" : "bg-secondary justify-start",
                  )}
                >
                  <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. GOALS & NUDGES TAB */}
      {activeTab === "goals" && (
        <div className="toota-card space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-foreground">Consistency & Nudge Engine Settings</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Set default goal neglect thresholds and automated notification rules.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Default Neglect Threshold (Days)</label>
              <input
                type="number"
                value={defaultNeglectDays}
                onChange={(e) => setDefaultNeglectDays(Number(e.target.value))}
                className="w-full bg-secondary text-foreground font-mono text-xs rounded-xl px-4 py-2.5 focus:outline-none"
              />
              <p className="text-[11px] text-muted-foreground">Trigger neglect alerts if a goal is unlogged for this number of days</p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-secondary/50">
              <div>
                <p className="text-xs font-bold text-foreground">Email Notifications for Neglected Goals</p>
                <p className="text-[11px] text-muted-foreground">Send email reminder via SMTP when threshold is crossed</p>
              </div>
              <button
                onClick={() => setEmailAlertsEnabled(!emailAlertsEnabled)}
                className={cn(
                  "w-11 h-6 rounded-full transition-colors p-1 flex items-center",
                  emailAlertsEnabled ? "bg-emerald-500 justify-end" : "bg-secondary justify-start",
                )}
              >
                <div className="w-4 h-4 rounded-full bg-white shadow-sm" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. APP RULES TAB */}
      {activeTab === "apps" && (
        <div className="toota-card space-y-6 max-w-2xl">
          <div>
            <h2 className="text-lg font-bold text-foreground">Desktop App Productivity Classifications</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Classify active window titles captured by the Electron tracking wrapper into Productive, Focused, or Unproductive categories.
            </p>
          </div>

          <div className="space-y-3">
            {[
              { app: "VS Code / Cursor", category: "Productive", badge: "bg-emerald-500/15 text-emerald-500" },
              { app: "Antigravity AI", category: "Focused", badge: "bg-blue-500/15 text-blue-500" },
              { app: "Figma", category: "Productive", badge: "bg-emerald-500/15 text-emerald-500" },
              { app: "YouTube / Social", category: "Unproductive", badge: "bg-amber-500/15 text-amber-500" },
            ].map((rule, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/50">
                <span className="text-xs font-semibold text-foreground">{rule.app}</span>
                <span className={cn("text-xs font-bold px-3 py-1 rounded-full", rule.badge)}>
                  {rule.category}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
