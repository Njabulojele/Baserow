"use client";

import {
  Users,
  Target,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  Activity,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  BarChart3,
  Briefcase,
  Mail,
  Phone,
  Heart,
  CheckCircle2,
  ChevronRight,
  Zap,
  Calendar,
  PieChart,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { trpc } from "@/lib/trpc/client";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

/* ──────────────────────────────────────────────
   METRIC CARD — Compact, uniform height
   ────────────────────────────────────────────── */
function MetricCard({
  label,
  value,
  subtext,
  icon: Icon,
  accent = "text-[#a9927d]",
  bgAccent = "bg-[#a9927d]/10",
  loading,
  href,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  icon: React.ElementType;
  accent?: string;
  bgAccent?: string;
  loading?: boolean;
  href?: string;
}) {
  const inner = (
    <div className="group flex flex-col justify-between h-[120px] rounded-xl bg-[#1a252f] border border-[#2f3e46] hover:border-[#a9927d]/30 transition-all duration-300 p-4 cursor-pointer">
      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-3 w-20" />
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-gray-500">
              {label}
            </span>
            <div className={`p-1.5 rounded-lg ${bgAccent}`}>
              <Icon className={`h-3.5 w-3.5 ${accent}`} />
            </div>
          </div>
          <div>
            <p className="text-2xl font-light text-white leading-none">
              {value}
            </p>
            {subtext && (
              <p className="text-[10px] text-gray-500 mt-1 font-mono uppercase tracking-wider">
                {subtext}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (href) {
    return <Link href={href}>{inner}</Link>;
  }
  return inner;
}

/* ──────────────────────────────────────────────
   PIPELINE FUNNEL — Visual stage breakdown
   ────────────────────────────────────────────── */
function PipelineFunnel({ loading }: { loading?: boolean }) {
  const { data: leadStats } = trpc.crmLead.getStats.useQuery();

  const stages = [
    { label: "New", count: leadStats?.byStatus?.NEW ?? 0, color: "#818cf8" },
    {
      label: "Contacted",
      count: leadStats?.byStatus?.CONTACTED ?? 0,
      color: "#a78bfa",
    },
    {
      label: "Qualified",
      count: leadStats?.byStatus?.QUALIFIED ?? 0,
      color: "#a9927d",
    },
    {
      label: "Proposal",
      count: leadStats?.byStatus?.PROPOSAL_SENT ?? 0,
      color: "#fbbf24",
    },
    {
      label: "Negotiation",
      count: leadStats?.byStatus?.NEGOTIATION ?? 0,
      color: "#f97316",
    },
    { label: "Won", count: leadStats?.byStatus?.WON ?? 0, color: "#34d399" },
  ];

  const maxCount = Math.max(...stages.map((s) => s.count), 1);

  return (
    <div className="rounded-xl bg-[#1a252f] border border-[#2f3e46] p-5 h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#a9927d] flex items-center gap-2">
          <PieChart className="h-3.5 w-3.5" />
          Lead Pipeline
        </h3>
        <Link
          href="/crm/leads"
          className="text-[9px] font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-1"
        >
          View
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-7 w-full" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {stages.map((stage) => (
            <div key={stage.label} className="flex items-center gap-3">
              <span className="text-[9px] font-mono uppercase tracking-widest text-gray-500 w-20 text-right shrink-0">
                {stage.label}
              </span>
              <div className="flex-1 h-7 rounded-lg bg-[#0a0c10] overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out flex items-center px-2"
                  style={{
                    width: `${Math.max((stage.count / maxCount) * 100, 8)}%`,
                    backgroundColor: `${stage.color}30`,
                    borderRight: `2px solid ${stage.color}`,
                  }}
                >
                  <span
                    className="text-[10px] font-mono font-medium"
                    style={{ color: stage.color }}
                  >
                    {stage.count}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   CONVERSION INSIGHTS — Key ratios
   ────────────────────────────────────────────── */
function ConversionInsights() {
  const { data: leadStats, isLoading } = trpc.crmLead.getStats.useQuery();
  const { data: dealStats } = trpc.deal.getStats.useQuery({});

  const totalLeads = leadStats?.total ?? 0;
  const wonDeals = dealStats?.wonDeals ?? 0;
  const conversionRate =
    totalLeads > 0 ? ((wonDeals / totalLeads) * 100).toFixed(1) : "0";
  const avgDealSize =
    wonDeals > 0 ? Math.round((dealStats?.wonValue ?? 0) / wonDeals) : 0;

  const formatZAR = (amount: number) =>
    `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;

  const insights = [
    {
      label: "Conversion Rate",
      value: `${conversionRate}%`,
      icon: Target,
      accent: "text-emerald-400",
      bgAccent: "bg-emerald-500/10",
    },
    {
      label: "Avg Deal Size",
      value: formatZAR(avgDealSize),
      icon: DollarSign,
      accent: "text-amber-400",
      bgAccent: "bg-amber-500/10",
    },
    {
      label: "Open Deals",
      value: dealStats?.openDeals ?? 0,
      icon: Briefcase,
      accent: "text-blue-400",
      bgAccent: "bg-blue-500/10",
    },
    {
      label: "Win Rate",
      value: `${((wonDeals / Math.max(wonDeals + (dealStats?.lostDeals ?? 0), 1)) * 100).toFixed(0)}%`,
      icon: TrendingUp,
      accent: "text-indigo-400",
      bgAccent: "bg-indigo-500/10",
    },
  ];

  return (
    <div className="rounded-xl bg-[#1a252f] border border-[#2f3e46] p-5 h-full">
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#a9927d] flex items-center gap-2 mb-4">
        <BarChart3 className="h-3.5 w-3.5" />
        Conversion Insights
      </h3>
      {isLoading ? (
        <div className="grid grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {insights.map((ins) => (
            <div
              key={ins.label}
              className="rounded-lg bg-[#0a0c10] border border-[#2f3e46]/50 p-3 flex flex-col gap-1.5"
            >
              <div className="flex items-center gap-1.5">
                <div className={`p-1 rounded ${ins.bgAccent}`}>
                  <ins.icon className={`h-3 w-3 ${ins.accent}`} />
                </div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-gray-600">
                  {ins.label}
                </span>
              </div>
              <p className="text-xl font-light text-white">{ins.value}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   AT-RISK & HEALTH — Right panel
   ────────────────────────────────────────────── */
function HealthPanel() {
  const { data: healthSummary, isLoading: healthLoading } =
    trpc.clientHealth.getSummary.useQuery();
  const { data: atRiskClients } = trpc.clientHealth.listAtRisk.useQuery();
  const { data: inactivityData } =
    trpc.analytics.getInactivityAlerts.useQuery();

  return (
    <div className="rounded-xl bg-[#1a252f] border border-[#2f3e46] p-5 h-full flex flex-col">
      <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-red-400 flex items-center gap-2 mb-4">
        <Heart className="h-3.5 w-3.5" />
        Client Health
        {(healthSummary?.atRiskCount ?? 0) > 0 && (
          <Badge
            variant="outline"
            className="text-[9px] h-5 border-red-500/20 bg-red-500/5 text-red-400 ml-auto"
          >
            {healthSummary?.atRiskCount} at risk
          </Badge>
        )}
      </h3>

      {healthLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <div className="flex-1 space-y-3 overflow-y-auto custom-scrollbar">
          {/* Health Score Summary */}
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-2.5 text-center">
              <p className="text-lg font-light text-emerald-400">
                {healthSummary?.healthyCount ?? 0}
              </p>
              <p className="text-[8px] font-mono uppercase tracking-widest text-emerald-400/60">
                Healthy
              </p>
            </div>
            <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-center">
              <p className="text-lg font-light text-amber-400">
                {healthSummary?.warningCount ?? 0}
              </p>
              <p className="text-[8px] font-mono uppercase tracking-widest text-amber-400/60">
                Warning
              </p>
            </div>
            <div className="rounded-lg bg-red-500/10 border border-red-500/20 p-2.5 text-center">
              <p className="text-lg font-light text-red-400">
                {healthSummary?.atRiskCount ?? 0}
              </p>
              <p className="text-[8px] font-mono uppercase tracking-widest text-red-400/60">
                At Risk
              </p>
            </div>
          </div>

          {/* At-Risk Client List */}
          {atRiskClients && atRiskClients.length > 0 ? (
            atRiskClients.slice(0, 4).map((score) => (
              <Link
                key={score.id}
                href="/clients"
                className="flex items-center gap-3 p-2.5 rounded-lg bg-red-500/5 border border-red-500/10 hover:border-red-500/30 transition-colors group"
              >
                <div className="p-1.5 rounded bg-red-500/10 shrink-0">
                  <AlertTriangle className="h-3 w-3 text-red-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-white truncate group-hover:text-red-400 transition-colors">
                    {score.client.name}
                  </p>
                  <p className="text-[9px] text-gray-500">
                    Score: {score.overallScore}/100
                  </p>
                </div>
                <ArrowRight className="h-3 w-3 text-gray-600 group-hover:text-red-400 transition-colors" />
              </Link>
            ))
          ) : (
            <>
              {/* If no scored at-risk, show stale clients from inactivity */}
              {inactivityData && inactivityData.staleClients.length > 0 ? (
                inactivityData.staleClients.slice(0, 4).map((client) => (
                  <Link
                    key={client.id}
                    href={`/clients/${client.id}`}
                    className="flex items-center gap-3 p-2.5 rounded-lg bg-amber-500/5 border border-amber-500/10 hover:border-amber-500/30 transition-colors group"
                  >
                    <div className="p-1.5 rounded bg-amber-500/10 shrink-0">
                      <Clock className="h-3 w-3 text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-white truncate group-hover:text-amber-400 transition-colors">
                        {client.name}
                      </p>
                      <p className="text-[9px] text-gray-500">
                        {client.daysSince !== null
                          ? `${client.daysSince}d since contact`
                          : "Never contacted"}
                      </p>
                    </div>
                    <ArrowRight className="h-3 w-3 text-gray-600 group-hover:text-amber-400 transition-colors" />
                  </Link>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                  <div className="p-2.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  </div>
                  <p className="text-xs text-emerald-400">
                    All clients healthy
                  </p>
                  <p className="text-[9px] text-gray-500 mt-0.5">
                    No churn risks detected
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   ACTIVITY TIMELINE — Modern, compact
   ────────────────────────────────────────────── */
function ActivityTimeline() {
  const { data: recentActivities, isLoading } = trpc.crmActivity.list.useQuery({
    limit: 8,
  });

  const typeIcons: Record<string, React.ElementType> = {
    call: Phone,
    email: Mail,
    meeting: Calendar,
    note: Activity,
  };

  const typeColors: Record<string, string> = {
    call: "#34d399",
    email: "#818cf8",
    meeting: "#fbbf24",
    note: "#a9927d",
  };

  return (
    <div className="rounded-xl bg-[#1a252f] border border-[#2f3e46] p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-[#a9927d] flex items-center gap-2">
          <Activity className="h-3.5 w-3.5" />
          Recent Activity
        </h3>
        <Link
          href="/crm/activities"
          className="text-[9px] font-mono uppercase tracking-widest text-gray-500 hover:text-white transition-colors flex items-center gap-1"
        >
          All
          <ChevronRight className="h-3 w-3" />
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : recentActivities && recentActivities.length > 0 ? (
        <div className="space-y-2">
          {recentActivities.slice(0, 6).map((activity, i) => {
            const Icon = typeIcons[activity.type?.toLowerCase()] || Activity;
            const color = typeColors[activity.type?.toLowerCase()] || "#a9927d";

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-2.5 rounded-lg hover:bg-[#0a0c10] transition-colors group"
              >
                {/* Timeline dot + line */}
                <div className="flex flex-col items-center shrink-0">
                  <div
                    className="p-1.5 rounded-lg border"
                    style={{
                      backgroundColor: `${color}15`,
                      borderColor: `${color}30`,
                    }}
                  >
                    <Icon className="h-3 w-3" style={{ color }} />
                  </div>
                  {i < Math.min(recentActivities.length, 6) - 1 && (
                    <div className="w-px h-4 bg-[#2f3e46] mt-1" />
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-medium text-white truncate group-hover:text-[#a9927d] transition-colors">
                      {activity.subject}
                    </h4>
                    <span
                      className="text-[8px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded-full border shrink-0"
                      style={{
                        color,
                        borderColor: `${color}30`,
                        backgroundColor: `${color}10`,
                      }}
                    >
                      {activity.type}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-[10px] text-gray-500 mt-0.5 truncate">
                      {activity.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] text-gray-600 font-mono">
                      {formatDistanceToNow(new Date(activity.completedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {activity.lead && (
                      <span className="text-[9px] text-gray-500 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {activity.lead.firstName} {activity.lead.lastName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-8 text-center">
          <Activity className="h-8 w-8 text-gray-800 mb-2" />
          <p className="text-xs text-gray-500">No activities yet</p>
          <p className="text-[10px] text-gray-600 mt-0.5">
            Log a call, email, or meeting to get started
          </p>
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────
   QUICK ACTIONS — CRM shortcuts
   ────────────────────────────────────────────── */
const crmShortcuts = [
  {
    label: "Leads",
    href: "/crm/leads",
    icon: Users,
    accent: "text-indigo-400",
  },
  {
    label: "Pipeline",
    href: "/crm/pipeline",
    icon: TrendingUp,
    accent: "text-amber-400",
  },
  {
    label: "Activities",
    href: "/crm/activities",
    icon: Activity,
    accent: "text-emerald-400",
  },
  { label: "Clients", href: "/clients", icon: Heart, accent: "text-rose-400" },
];

/* ──────────────────────────────────────────────
   MAIN CRM PAGE
   ────────────────────────────────────────────── */
export default function CRMPage() {
  const { data: leadStats, isLoading: leadsLoading } =
    trpc.crmLead.getStats.useQuery();
  const { data: dealStats, isLoading: dealsLoading } =
    trpc.deal.getStats.useQuery({});
  const { data: healthSummary, isLoading: healthLoading } =
    trpc.clientHealth.getSummary.useQuery();
  const { data: timeData } = trpc.analytics.getTimeBreakdown.useQuery();

  const isLoading = leadsLoading || dealsLoading || healthLoading;

  const formatZAR = (amount: number) =>
    `R${amount.toLocaleString("en-ZA", { minimumFractionDigits: 0 })}`;

  return (
    <div className="w-full max-w-full overflow-x-hidden p-4 sm:p-6 lg:p-8 bg-transparent min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-light tracking-tight text-white">
            CRM Overview
          </h1>
          <p className="text-[10px] font-mono text-[#a9927d] uppercase tracking-[0.2em] mt-1">
            Pipeline · Clients · Performance
          </p>
        </div>
        <div className="flex items-center gap-2">
          {crmShortcuts.map((s) => (
            <Link key={s.href} href={s.href}>
              <div className="group flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#1a252f] border border-[#2f3e46] hover:border-[#a9927d]/30 transition-all cursor-pointer">
                <s.icon className={`h-3.5 w-3.5 ${s.accent}`} />
                <span className="text-[9px] font-mono uppercase tracking-widest text-gray-400 group-hover:text-white transition-colors hidden sm:inline">
                  {s.label}
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
        <MetricCard
          label="Active Leads"
          value={leadStats?.total ?? 0}
          subtext="In pipeline"
          icon={Users}
          accent="text-indigo-400"
          bgAccent="bg-indigo-500/10"
          loading={isLoading}
          href="/crm/leads"
        />
        <MetricCard
          label="Revenue"
          value={formatZAR(dealStats?.wonValue ?? 0)}
          subtext={`${dealStats?.wonDeals ?? 0} closed`}
          icon={DollarSign}
          accent="text-emerald-400"
          bgAccent="bg-emerald-500/10"
          loading={isLoading}
        />
        <MetricCard
          label="Pipeline"
          value={formatZAR(dealStats?.pipelineValue ?? 0)}
          subtext={`${dealStats?.openDeals ?? 0} open`}
          icon={TrendingUp}
          accent="text-amber-400"
          bgAccent="bg-amber-500/10"
          loading={isLoading}
          href="/crm/pipeline"
        />
        <MetricCard
          label="Churn Risk"
          value={healthSummary?.atRiskCount ?? 0}
          subtext="Needs attention"
          icon={AlertTriangle}
          accent="text-red-400"
          bgAccent="bg-red-500/10"
          loading={isLoading}
          href="/clients"
        />
        <MetricCard
          label="Hours Logged"
          value={`${timeData?.totalHours ?? 0}h`}
          subtext={`${timeData?.billableHours ?? 0}h billable`}
          icon={Clock}
          accent="text-indigo-400"
          bgAccent="bg-indigo-500/10"
          loading={isLoading}
        />
      </div>

      {/* Main Grid: 3 columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Left: Pipeline Funnel */}
        <PipelineFunnel loading={isLoading} />
        {/* Center: Conversion Insights */}
        <ConversionInsights />
        {/* Right: Client Health */}
        <HealthPanel />
      </div>

      {/* Activity Timeline — Full width */}
      <ActivityTimeline />
    </div>
  );
}
