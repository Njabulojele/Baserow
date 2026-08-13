"use client";

import { useState, useEffect, useRef } from "react";
import {
  Activity,
  Clock,
  Coffee,
  Laptop,
  Play,
  Pause,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

interface TracklogData {
  working_hours_total: string;
  target_hours: number;
  productive_hours: string;
  focused_hours: string;
  unproductive_time: string;
  apps: Array<{ name: string; duration: string; percent: number; color: string }>;
  events: Array<{ time: string; app: string; title: string; duration: string; status: string }>;
}

export function TracklogView() {
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month">("day");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isTracking, setIsTracking] = useState(true);
  const [breakTimerActive, setBreakTimerActive] = useState(false);
  const [breakSeconds, setBreakSeconds] = useState(0);
  const [data, setData] = useState<TracklogData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const breakIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch from Go backend /api/v1/tracklog
  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    fetch("/api/v1/tracklog")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [timeframe, currentDate]);

  // Break Timer countdown
  useEffect(() => {
    if (breakTimerActive) {
      breakIntervalRef.current = setInterval(() => {
        setBreakSeconds((s) => s + 1);
      }, 1000);
    } else {
      if (breakIntervalRef.current) {
        clearInterval(breakIntervalRef.current);
        breakIntervalRef.current = null;
      }
    }
    return () => {
      if (breakIntervalRef.current) clearInterval(breakIntervalRef.current);
    };
  }, [breakTimerActive]);

  const formatBreakTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  };

  const navigateDate = (dir: number) => {
    if (timeframe === "day") setCurrentDate((d) => addDays(d, dir));
    else if (timeframe === "week") setCurrentDate((d) => addDays(d, dir * 7));
    else setCurrentDate((d) => addDays(d, dir * 30));
  };

  const dateLabel =
    timeframe === "day"
      ? format(currentDate, "EEEE, MMM d")
      : timeframe === "week"
      ? `Week of ${format(currentDate, "MMM d")}`
      : format(currentDate, "MMMM yyyy");

  const apps = data?.apps ?? [];
  const events = data?.events ?? [];

  return (
    <div className="w-full space-y-6 pb-12">
      {/* ──────────────────────────────────────────────
         TOP HEADER & TIMEFRAME TOGGLE
         ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-foreground flex items-center gap-3">
            <Activity className="w-7 h-7 text-emerald-500" />
            Tracklog & Desktop Analytics
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-medium">
            Real-time activity tracking, app window monitoring, and break timers
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Day / Week / Month Pills */}
          <div className="bg-secondary p-1 rounded-full flex items-center shadow-inner">
            {(["day", "week", "month"] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={cn(
                  "px-4 py-2 rounded-full text-xs font-semibold capitalize transition-all duration-200",
                  timeframe === tf
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {tf}
              </button>
            ))}
          </div>

          {/* Date Navigator Pill */}
          <div className="bg-secondary px-4 py-2 rounded-full text-xs font-medium text-foreground flex items-center gap-2">
            <button onClick={() => navigateDate(-1)} className="hover:text-primary transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span>{dateLabel}</span>
            <button onClick={() => navigateDate(1)} className="hover:text-primary transition-colors">
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
         ROW 1: Working Hours & Timeline
         ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Working Hours Heatmap Card */}
        <div className="toota-card space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground">Working Hours</h2>
            <span className="text-xs font-mono font-bold text-emerald-500">
              {isLoading ? "—" : data?.working_hours_total} Total
            </span>
          </div>

          <div className="grid grid-cols-12 gap-1.5 py-3">
            {Array.from({ length: 96 }).map((_, i) => {
              const intensity = (i * 11 + 7) % 4;
              return (
                <div
                  key={i}
                  className={cn(
                    "aspect-square rounded-sm transition-all hover:scale-125",
                    intensity === 0 && "bg-secondary",
                    intensity === 1 && "bg-blue-400/40",
                    intensity === 2 && "bg-emerald-400/70",
                    intensity === 3 && "bg-emerald-500",
                  )}
                />
              );
            })}
          </div>

          <div className="space-y-3 pt-1 border-t border-secondary/50">
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Workday Target</span>
              <span className="font-mono font-bold text-foreground">
                {data?.target_hours ?? 8} Hours
              </span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-muted-foreground">Active Range</span>
              <span className="font-mono text-foreground">08:00 AM – 06:15 PM</span>
            </div>
            <button
              onClick={() => setIsTracking(!isTracking)}
              className={cn(
                "toota-pill-active w-full py-2.5 flex items-center justify-center gap-2 text-xs",
                isTracking ? "bg-emerald-500 text-white" : "bg-primary text-primary-foreground",
              )}
            >
              {isTracking ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
              <span>{isTracking ? "Desktop Tracking Active" : "Resume Desktop Tracking"}</span>
            </button>
          </div>
        </div>

        {/* Timeline Hourly Stacked Bar Chart */}
        <div className="lg:col-span-2 toota-card space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-emerald-500" />
              <h2 className="text-base font-bold text-foreground">Timeline Breakdown</h2>
            </div>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Productive</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Focused</span>
              <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /> Unproductive</span>
            </div>
          </div>

          <div className="h-44 flex items-end justify-between gap-2 pt-6">
            {[
              { prod: 30, focus: 40, unprod: 10 },
              { prod: 50, focus: 45, unprod: 5 },
              { prod: 20, focus: 75, unprod: 0 },
              { prod: 60, focus: 30, unprod: 10 },
              { prod: 15, focus: 15, unprod: 45 },
              { prod: 40, focus: 55, unprod: 5 },
              { prod: 70, focus: 25, unprod: 0 },
              { prod: 35, focus: 60, unprod: 5 },
              { prod: 85, focus: 10, unprod: 0 },
              { prod: 50, focus: 40, unprod: 10 },
            ].map((slot, idx) => (
              <div key={idx} className="flex-1 flex flex-col justify-end h-full gap-0.5 group relative">
                <div className="w-full bg-amber-400/80 rounded-t-sm" style={{ height: `${slot.unprod}%` }} />
                <div className="w-full bg-emerald-500/80" style={{ height: `${slot.focus}%` }} />
                <div className="w-full bg-blue-500/80 rounded-b-sm" style={{ height: `${slot.prod}%` }} />
              </div>
            ))}
          </div>

          <div className="flex justify-between text-xs font-mono text-muted-foreground pt-2">
            <span>08 AM</span>
            <span>11 AM</span>
            <span>02 PM</span>
            <span>05 PM</span>
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
         ROW 2: Time Breakdown, Apps Used, Break Timer
         ────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Time Breakdown */}
        <div className="toota-card space-y-4">
          <h3 className="text-sm font-bold text-foreground">Time Breakdown</h3>
          <div className="space-y-4 pt-1">
            {(() => {
              const parseDurationToMinutes = (dur: string): number => {
                if (!dur || dur === "—") return 0;
                let total = 0;
                const hMatch = dur.match(/(\d+)h/);
                const mMatch = dur.match(/(\d+)m/);
                if (hMatch) total += parseInt(hMatch[1]) * 60;
                if (mMatch) total += parseInt(mMatch[1]);
                return total;
              };
              const prodMins = parseDurationToMinutes(data?.productive_hours ?? "");
              const focMins = parseDurationToMinutes(data?.focused_hours ?? "");
              const unprodMins = parseDurationToMinutes(data?.unproductive_time ?? "");
              const totMins = prodMins + focMins + unprodMins;
              const prodPct = totMins > 0 ? Math.round((prodMins / totMins) * 100) : 0;
              const focPct = totMins > 0 ? Math.round((focMins / totMins) * 100) : 0;
              const unprodPct = totMins > 0 ? Math.round((unprodMins / totMins) * 100) : 0;

              return [
                { label: "Productive Hours", value: data?.productive_hours ?? "—", icon: Laptop, color: "border-blue-500 text-blue-500", bar: "bg-blue-500", width: `${prodPct}%` },
                { label: "Focused Time", value: data?.focused_hours ?? "—", icon: Zap, color: "border-emerald-500 text-emerald-500", bar: "bg-emerald-500", width: `${focPct}%` },
                { label: "Unproductive", value: data?.unproductive_time ?? "—", icon: Coffee, color: "border-amber-400 text-amber-400", bar: "bg-amber-400", width: `${unprodPct}%` },
              ].map((item) => (
                <div key={item.label} className="flex items-center gap-3">
                  <div className={cn("w-10 h-10 rounded-full border-4 flex items-center justify-center shrink-0", item.color)}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between text-xs font-medium">
                      <span className="text-foreground">{item.label}</span>
                      <span className="font-mono font-bold">{isLoading ? "—" : item.value}</span>
                    </div>
                    <div className="h-2 w-full bg-secondary rounded-full mt-1.5 overflow-hidden">
                      <div className={cn("h-full rounded-full transition-all duration-300", item.bar)} style={{ width: item.width }} />
                    </div>
                  </div>
                </div>
              ));
            })()}
          </div>
        </div>

        {/* Apps Used Breakdown — from Go backend */}
        <div className="toota-card space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground">Desktop Apps Tracked</h3>
            <span className="text-xs font-mono text-muted-foreground">Electron Engine</span>
          </div>
          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 bg-secondary animate-pulse rounded-xl" />
                ))}
              </div>
            ) : apps.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-6">No app data yet. Start a tracking session.</p>
            ) : (
              apps.map((app, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-foreground truncate max-w-[160px]">{app.name}</span>
                    <span className="font-mono text-muted-foreground">{app.duration}</span>
                  </div>
                  <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full transition-all duration-300", app.color)}
                      style={{ width: `${app.percent}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Break Timer — live countdown */}
        <div className="toota-card space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Coffee className="w-4 h-4 text-amber-500" />
              Break Timer
            </h3>
            <span className="text-xs font-mono text-muted-foreground">5-min rest</span>
          </div>

          <div className="flex items-center justify-around py-2">
            <div
              className={cn(
                "w-24 h-24 rounded-full border-4 flex items-center justify-center shadow-lg transition-colors",
                breakTimerActive ? "border-emerald-500" : "border-amber-400",
              )}
            >
              <span className="text-xl font-extrabold font-mono text-foreground">
                {formatBreakTime(breakSeconds)}
              </span>
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <p className="text-muted-foreground">Break Count Today</p>
                <p className="font-bold text-foreground font-mono">3 breaks</p>
              </div>
              <div>
                <p className="text-muted-foreground">Audio Alerts</p>
                <span className="bg-emerald-500/15 text-emerald-500 text-[10px] font-bold px-2 py-0.5 rounded-full">ENABLED</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => {
                setBreakTimerActive(!breakTimerActive);
                if (!breakTimerActive) setBreakSeconds(0);
              }}
              className="toota-pill-active flex-1 py-2.5 text-xs text-center"
            >
              {breakTimerActive ? "Pause Break" : "Start 5 Min Break"}
            </button>
            {breakSeconds > 0 && (
              <button
                onClick={() => { setBreakTimerActive(false); setBreakSeconds(0); }}
                className="toota-pill text-xs py-2 px-3"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ──────────────────────────────────────────────
         ROW 3: Activity Event Feed — from Go backend
         ────────────────────────────────────────────── */}
      <div className="toota-card space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-foreground">Active Window Activity Feed</h3>
          <span className="text-xs font-mono text-muted-foreground">Auto-synced via Electron PowerMonitor</span>
        </div>

        <div className="space-y-2">
          {isLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-secondary/40 animate-pulse rounded-2xl" />
            ))
          ) : events.length === 0 ? (
            <div className="text-center py-10 text-xs text-muted-foreground">
              No activity events recorded yet for this period.
            </div>
          ) : (
            events.map((evt, idx) => (
              <div key={idx} className="flex items-center justify-between p-3 rounded-2xl bg-secondary/40 hover:bg-secondary/70 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-muted-foreground w-16">{evt.time}</span>
                  <span className="text-xs font-bold text-foreground w-28 truncate">{evt.app}</span>
                  <span className="text-xs text-muted-foreground truncate max-w-[400px]">{evt.title}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono font-semibold">{evt.duration}</span>
                  <span
                    className={cn(
                      "text-[10px] font-bold px-2.5 py-0.5 rounded-full",
                      evt.status === "Focused"
                        ? "bg-blue-500/15 text-blue-500"
                        : "bg-emerald-500/15 text-emerald-500",
                    )}
                  >
                    {evt.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
