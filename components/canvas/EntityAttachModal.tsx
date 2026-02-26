"use client";

import React, { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc/client";
import {
  X,
  Search,
  FolderOpen,
  CheckSquare,
  Users,
  Target,
  TrendingUp,
  UserPlus,
  CalendarDays,
  Sparkles,
} from "lucide-react";

interface EntityAttachModalProps {
  onClose: () => void;
  onAttach: (
    entityType: string,
    entityId: string,
    entityData: Record<string, unknown>,
  ) => void;
}

type TabType =
  | "project"
  | "task"
  | "client"
  | "goal"
  | "deal"
  | "lead"
  | "research"
  | "meeting";

const TABS: {
  key: TabType;
  label: string;
  icon: React.ReactNode;
  color: string;
}[] = [
  {
    key: "project",
    label: "Projects",
    icon: <FolderOpen className="w-3.5 h-3.5" />,
    color: "#3B82F6",
  },
  {
    key: "task",
    label: "Tasks",
    icon: <CheckSquare className="w-3.5 h-3.5" />,
    color: "#10B981",
  },
  {
    key: "client",
    label: "Clients",
    icon: <Users className="w-3.5 h-3.5" />,
    color: "#8B5CF6",
  },
  {
    key: "goal",
    label: "Goals",
    icon: <Target className="w-3.5 h-3.5" />,
    color: "#F59E0B",
  },
  {
    key: "deal",
    label: "Deals",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    color: "#EC4899",
  },
  {
    key: "lead",
    label: "Leads",
    icon: <UserPlus className="w-3.5 h-3.5" />,
    color: "#06B6D4",
  },
  {
    key: "research",
    label: "Research",
    icon: <Sparkles className="w-3.5 h-3.5" />,
    color: "#6366F1",
  },
  {
    key: "meeting",
    label: "Meetings",
    icon: <CalendarDays className="w-3.5 h-3.5" />,
    color: "#F97316",
  },
];

export function EntityAttachModal({
  onClose,
  onAttach,
}: EntityAttachModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>("project");
  const [search, setSearch] = useState("");

  const { data: entities, isLoading } =
    trpc.canvas.getLinkedEntities.useQuery();

  const items = useMemo(() => {
    if (!entities) return [];

    const getItems = (): {
      id: string;
      name: string;
      meta: string;
      data: Record<string, unknown>;
    }[] => {
      switch (activeTab) {
        case "project":
          return (entities.projects || []).map((p) => ({
            id: p.id,
            name: p.name,
            meta: `${p.type} · ${p.status} · ${Math.round(p.completionPercentage || 0)}%`,
            data: p as unknown as Record<string, unknown>,
          }));
        case "task":
          return (entities.tasks || []).map((t) => ({
            id: t.id,
            name: t.title,
            meta: `${t.priority} · ${t.status}${t.project ? ` · ${t.project.name}` : ""}`,
            data: { ...t, name: t.title } as unknown as Record<string, unknown>,
          }));
        case "client":
          return (entities.clients || []).map((c) => ({
            id: c.id,
            name: c.name,
            meta: `${c.companyName || "Individual"} · ${c.industry || ""}`,
            data: c as unknown as Record<string, unknown>,
          }));
        case "goal":
          return (entities.goals || []).map((g) => ({
            id: g.id,
            name: g.title,
            meta: `${g.category} · ${g.status} · ${Math.round(g.progress * 100)}%`,
            data: { ...g, name: g.title } as unknown as Record<string, unknown>,
          }));
        case "deal":
          return (entities.deals || []).map((d) => ({
            id: d.id,
            name: d.name,
            meta: `R${d.value.toLocaleString()} · ${d.pipelineStage?.name || d.status}`,
            data: d as unknown as Record<string, unknown>,
          }));
        case "lead":
          return (entities.leads || []).map((l) => ({
            id: l.id,
            name: `${l.firstName} ${l.lastName}`,
            meta: `${l.companyName} · ${l.status} · Score: ${l.score}`,
            data: l as unknown as Record<string, unknown>,
          }));
        case "research":
          return (entities.research || []).map((r) => ({
            id: r.id,
            name: r.title,
            meta: `${r.scope.replace(/_/g, " ")} · ${r.status}`,
            data: { ...r, name: r.title } as unknown as Record<string, unknown>,
          }));
        case "meeting":
          return (entities.meetings || []).map((m) => ({
            id: m.id,
            name: m.title,
            meta: `${m.type} · ${new Date(m.scheduledAt).toLocaleDateString()}`,
            data: { ...m, name: m.title } as unknown as Record<string, unknown>,
          }));
        default:
          return [];
      }
    };

    const all = getItems();
    if (!search) return all;
    return all.filter(
      (item) =>
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.meta.toLowerCase().includes(search.toLowerCase()),
    );
  }, [entities, activeTab, search]);

  const activeTabInfo = TABS.find((t) => t.key === activeTab)!;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-[#1a1a1e] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 shrink-0">
          <h3 className="text-sm font-semibold text-white">
            Attach Entity to Canvas
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/10 text-white/40"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 px-5 pb-3 overflow-x-auto shrink-0">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setSearch("");
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium shrink-0 transition-all ${
                activeTab === tab.key
                  ? "text-white"
                  : "text-white/40 hover:text-white/60 hover:bg-white/5"
              }`}
              style={
                activeTab === tab.key
                  ? { backgroundColor: `${tab.color}20`, color: tab.color }
                  : {}
              }
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="px-5 pb-3 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${activeTabInfo.label.toLowerCase()}...`}
              className="w-full pl-9 pr-3 py-2 bg-white/5 border border-white/10 rounded-lg text-xs text-white placeholder:text-white/30 outline-none focus:border-emerald-500/50"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-5 pb-5 min-h-0">
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-14 bg-white/5 rounded-lg animate-pulse"
                />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center text-white/30 text-xs">
              {search
                ? `No ${activeTabInfo.label.toLowerCase()} match "${search}"`
                : `No ${activeTabInfo.label.toLowerCase()} found`}
            </div>
          ) : (
            <div className="space-y-1">
              {items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => onAttach(activeTab, item.id, item.data)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors text-left group"
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                    style={{ backgroundColor: `${activeTabInfo.color}20` }}
                  >
                    {React.cloneElement(
                      activeTabInfo.icon as React.ReactElement,
                      {
                        style: { color: activeTabInfo.color },
                      },
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-medium text-white truncate">
                      {item.name}
                    </div>
                    <div className="text-[10px] text-white/40 truncate">
                      {item.meta}
                    </div>
                  </div>
                  <span className="text-[10px] text-white/20 opacity-0 group-hover:opacity-100 transition-opacity">
                    Click to add
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
