import * as React from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  FileText,
  Folder,
  Building2,
  LayoutDashboard,
  Target,
  Activity,
  Zap,
  CheckCircle2,
  Play,
  Flame,
  DollarSign,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@clerk/react";
import { useGoalStore } from "@/lib/goalStore";
import { toast } from "sonner";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const { organization } = useOrganization();

  const goals = useGoalStore((s) => s.goals);
  const startGoalSession = useGoalStore((s) => s.startGoalSession);
  const toggleGoalCompletion = useGoalStore((s) => s.toggleGoalCompletion);

  // Toggle the menu when ⌘K is pressed
  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const { data: results = [], isLoading } = trpc.search.searchAll.useQuery(
    { query, organizationId: organization?.id || "" },
    {
      enabled: open && query.length > 0,
      staleTime: 1000 * 60, // Cache for 1 minute
    },
  );

  const handleSelect = (url: string) => {
    setOpen(false);
    router.push(url);
  };

  const dismissSession = useGoalStore((s) => s.dismissSession);

  const handleQuickFocus = () => {
    setOpen(false);
    const topGoal = goals[0];
    if (topGoal) {
      startGoalSession(topGoal);
      toast("Focus Sprint Initialized", {
        description: `Timer running for "${topGoal.title}" (${topGoal.targetMinutes || 45}m)`,
        action: {
          label: "Undo",
          onClick: () => {
            dismissSession();
            toast.info("Focus Sprint cancelled.");
          },
        },
        duration: 6000,
      });
    } else {
      router.push("/goals");
    }
  };

  const handleQuickToggleGoal = () => {
    setOpen(false);
    const topGoal = goals[0];
    if (topGoal) {
      toggleGoalCompletion(topGoal.id);
      toast("Goal Completion Updated", {
        description: `Marked "${topGoal.title}" complete for today`,
        action: {
          label: "Undo",
          onClick: () => {
            toggleGoalCompletion(topGoal.id);
            toast.info("Goal status restored.");
          },
        },
        duration: 6000,
      });
    } else {
      toast.info("No active goals found.");
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "Project":
        return <Folder className="h-4 w-4 text-blue-500" />;
      case "Task":
        return <FileText className="h-4 w-4 text-green-500" />;
      case "Client":
        return <Building2 className="h-4 w-4 text-purple-500" />;
      case "CanvasBoard":
        return <LayoutDashboard className="h-4 w-4 text-orange-500" />;
      case "CRMLead":
        return <Target className="h-4 w-4 text-rose-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm transition-opacity"
      onClick={() => setOpen(false)}
    >
      <Command
        className="w-full max-w-[640px] border border-white/10 bg-gray-950 rounded-2xl overflow-hidden shadow-2xl flex flex-col"
        shouldFilter={false}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center border-b border-white/10 px-4 py-1">
          <Search className="h-5 w-5 text-gray-400 shrink-0 mr-2" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            className="flex-1 bg-transparent py-4 text-white outline-none placeholder:text-gray-500 text-sm"
            placeholder="Type a command or search (e.g. 'start timer', 'revenue', 'task')..."
            autoFocus
          />
        </div>

        <Command.List className="max-h-[360px] overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-white/10 space-y-2">
          {/* QUICK COMMAND ACTIONS */}
          {query.length === 0 && (
            <Command.Group
              heading={
                <div className="px-2 py-1 text-[11px] font-extrabold text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5" /> Quick Actions (1-Tap Execution)
                </div>
              }
            >
              <Command.Item
                onSelect={handleQuickFocus}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 rounded-xl cursor-pointer hover:bg-amber-500/10 hover:text-amber-300 transition-colors"
              >
                <Play className="h-4 w-4 text-amber-400 fill-current" />
                <span className="font-semibold">Start Immediate Focus Sprint</span>
                <span className="ml-auto text-xs font-mono text-gray-400">Launch Floating Timer</span>
              </Command.Item>

              <Command.Item
                onSelect={handleQuickToggleGoal}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 rounded-xl cursor-pointer hover:bg-emerald-500/10 hover:text-emerald-300 transition-colors"
              >
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold">Mark Primary Goal Done Today</span>
                <span className="ml-auto text-xs font-mono text-gray-400">Boost Streak</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect("/dashboard")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
              >
                <LayoutDashboard className="h-4 w-4 text-blue-400" />
                <span className="font-semibold">Go to Daily Command Center</span>
                <span className="ml-auto text-xs font-mono text-gray-400">Dashboard</span>
              </Command.Item>

              <Command.Item
                onSelect={() => handleSelect("/crm")}
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-200 rounded-xl cursor-pointer hover:bg-white/10 transition-colors"
              >
                <DollarSign className="h-4 w-4 text-emerald-400" />
                <span className="font-semibold">View Revenue & Client Pipeline</span>
                <span className="ml-auto text-xs font-mono text-gray-400">CRM</span>
              </Command.Item>
            </Command.Group>
          )}

          {query.length > 0 && isLoading && (
            <div className="p-4 text-sm text-center text-gray-400">Searching system...</div>
          )}

          {query.length > 0 && !isLoading && results.length === 0 && (
            <div className="p-4 text-sm text-center text-gray-400">No matching items found.</div>
          )}

          {results.length > 0 &&
            Object.entries(
              results.reduce((acc, result) => {
                if (!acc[result.type]) acc[result.type] = [];
                acc[result.type].push(result);
                return acc;
              }, {} as Record<string, typeof results>)
            ).map(([type, items]) => (
              <Command.Group
                key={type}
                heading={
                  <div className="px-2 py-1 text-[11px] font-bold text-gray-500 uppercase tracking-wider mt-2">
                    {type}s
                  </div>
                }
              >
                {items.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.id}
                    onSelect={() => handleSelect(item.url)}
                    className="flex items-center gap-3 px-3 py-2 text-sm text-gray-200 rounded-lg cursor-pointer hover:bg-white/10"
                  >
                    {getIcon(item.type)}
                    <span className="truncate">{item.title}</span>
                    {item.subtitle && (
                      <span className="ml-auto text-xs text-gray-500 truncate max-w-[200px]">
                        {item.subtitle}
                      </span>
                    )}
                  </Command.Item>
                ))}
              </Command.Group>
            ))}
        </Command.List>

        <div className="px-4 py-3 border-t border-white/10 bg-gray-900/50 flex items-center justify-between">
          <span className="text-xs text-gray-400 font-mono">
            Press <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-white font-bold">⌘K</kbd> anytime for instant zero-click commands.
          </span>
          <div className="flex items-center gap-2">
            <kbd className="px-2 py-0.5 text-[10px] font-medium text-gray-400 bg-white/10 rounded">
              ESC
            </kbd>
            <span className="text-xs text-gray-500">to close</span>
          </div>
        </div>
      </Command>
    </div>
  );
}
