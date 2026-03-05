"use client";

import {
  Linkedin,
  Target,
  TrendingUp,
  Users,
  MapPin,
  Facebook,
} from "lucide-react";

const LEAD_CHANNELS = [
  {
    rank: 1,
    channel: "LinkedIn Outreach",
    icon: <Linkedin className="w-4 h-4" />,
    color: "#0077b5",
    why: "SA decision-makers are active. High B2B conversion.",
  },
  {
    rank: 2,
    channel: "Content Marketing",
    icon: <TrendingUp className="w-4 h-4" />,
    color: "#10b981",
    why: "Articles + blog builds long-term SEO authority.",
  },
  {
    rank: 3,
    channel: "Cold Email",
    icon: <Target className="w-4 h-4" />,
    color: "#f59e0b",
    why: "Scalable. Target SMEs needing web/digital services.",
  },
  {
    rank: 4,
    channel: "Referrals",
    icon: <Users className="w-4 h-4" />,
    color: "#8b5cf6",
    why: "Ask every client. Offer 10% referral incentive.",
  },
  {
    rank: 5,
    channel: "Google My Business",
    icon: <MapPin className="w-4 h-4" />,
    color: "#ea4335",
    why: "Crucial for local SA searches.",
  },
  {
    rank: 6,
    channel: "Facebook Groups",
    icon: <Facebook className="w-4 h-4" />,
    color: "#1877f2",
    why: "Join SA business groups. Add value, don't spam.",
  },
];

export function LeadChannelsList() {
  return (
    <div className="bg-[#1a252f] rounded-xl border border-[#2f3e46] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#2f3e46]/50">
        <h3 className="text-[10px] font-mono uppercase tracking-widest text-[#a9927d]">
          Lead Gen Channels
        </h3>
        <p className="text-[9px] font-mono text-gray-600 mt-0.5">
          Priority order for Open Infinity
        </p>
      </div>
      <div className="p-2 space-y-0.5">
        {LEAD_CHANNELS.map((ch) => (
          <div
            key={ch.rank}
            className="flex items-start gap-3 px-3 py-2.5 rounded-lg hover:bg-white/[0.03] transition-colors"
          >
            <span
              className="text-[10px] font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center shrink-0"
              style={{
                backgroundColor: `${ch.color}20`,
                color: ch.color,
              }}
            >
              {ch.rank}
            </span>
            <span className="shrink-0 mt-0.5" style={{ color: ch.color }}>
              {ch.icon}
            </span>
            <div className="min-w-0">
              <span className="text-xs font-medium text-white block">
                {ch.channel}
              </span>
              <span className="text-[10px] text-gray-500 block mt-0.5">
                {ch.why}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
