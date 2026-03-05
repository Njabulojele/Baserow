"use client";

import { trpc } from "@/lib/trpc/client";

interface PillarProgressChartProps {
  date: Date;
}

export function PillarProgressChart({ date }: PillarProgressChartProps) {
  const { data: weeklyStats } = trpc.habit.getWeeklyStats.useQuery({ date });
  const { data: streaks } = trpc.habit.getStreaks.useQuery();

  if (!weeklyStats) return null;

  return (
    <div className="space-y-4">
      {/* Pillar completion rings */}
      <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] p-4">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d] mb-3">
          Pillar Completion
        </h3>
        <div className="flex items-center justify-around">
          {weeklyStats.pillarStats.map((p) => (
            <div key={p.id} className="flex flex-col items-center gap-1.5">
              <div className="relative w-12 h-12">
                <svg className="w-12 h-12" viewBox="0 0 48 48">
                  <circle
                    cx="24"
                    cy="24"
                    r="18"
                    fill="none"
                    stroke="#2f3e46"
                    strokeWidth="4"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="18"
                    fill="none"
                    stroke={p.color}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(p.rate / 100) * 113} 113`}
                    transform="rotate(-90 24 24)"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-mono font-bold text-white">
                  {p.rate}%
                </span>
              </div>
              <span className="text-[9px] font-mono text-gray-500 uppercase tracking-wider text-center max-w-[60px] truncate">
                {p.name.split(" ")[0]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* 7-day trend bar chart */}
      <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] p-4">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d] mb-3">
          7-Day Trend
        </h3>
        <div className="flex items-end justify-between gap-1 h-20">
          {weeklyStats.dailyStats.map((d, i) => {
            const isToday = d.date === new Date().toISOString().split("T")[0];
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full relative" style={{ height: "60px" }}>
                  <div
                    className="absolute bottom-0 w-full rounded-t-sm transition-all duration-500 ease-out"
                    style={{
                      height: `${Math.max(d.rate * 0.6, 2)}px`,
                      backgroundColor: isToday ? "#a9927d" : "#2f3e46",
                    }}
                  />
                </div>
                <span
                  className={`text-[9px] font-mono ${isToday ? "text-[#a9927d] font-bold" : "text-gray-600"}`}
                >
                  {d.dayLabel}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Streak counter */}
      {streaks && (
        <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] p-4 flex items-center justify-between">
          <div>
            <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d]">
              Current Streak
            </h3>
            <p className="text-xs text-gray-500 mt-0.5 font-mono">
              {streaks.totalDaysTracked} days tracked
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-3xl font-bold text-white">
              {streaks.currentStreak}
            </span>
            <span className="text-lg">🔥</span>
          </div>
        </div>
      )}
    </div>
  );
}
