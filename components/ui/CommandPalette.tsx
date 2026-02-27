"use client";

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
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useOrganization } from "@clerk/nextjs";

export function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const { organization } = useOrganization();

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

  // Group results by type
  const groupedResults = results.reduce(
    (acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    },
    {} as Record<string, typeof results>,
  );

  const handleSelect = (url: string) => {
    setOpen(false);
    router.push(url);
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
      className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh] bg-black/50 backdrop-blur-xs transition-opacity"
      onClick={() => setOpen(false)}
    >
      <Command
        className="w-full max-w-[640px] border border-white/10 bg-gray-950 rounded-xl overflow-hidden shadow-2xl flex flex-col"
        shouldFilter={false} // We do filtering on the server
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
      >
        <div className="flex items-center border-b border-white/10 px-3">
          <Search className="h-5 w-5 text-gray-400 shrink-0" />
          <Command.Input
            value={query}
            onValueChange={setQuery}
            className="flex-1 bg-transparent px-3 py-4 text-white outline-none placeholder:text-gray-500"
            placeholder="Search projects, tasks, clients..."
            autoFocus
          />
        </div>

        <Command.List className="max-h-[300px] overflow-y-auto p-2 scrollbar-thin scrollbar-thumb-white/10">
          {query.length > 0 && isLoading && (
            <div className="p-4 text-sm text-center text-gray-400">
              Searching...
            </div>
          )}

          {query.length > 0 && !isLoading && results.length === 0 && (
            <div className="p-4 text-sm text-center text-gray-400">
              No results found.
            </div>
          )}

          {Object.entries(groupedResults).map(([type, items]) => (
            <Command.Group
              key={type}
              heading={
                <div className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider mt-2 mb-1">
                  {type}s
                </div>
              }
            >
              {items.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.id}
                  onSelect={() => handleSelect(item.url)}
                  className="flex items-center gap-3 px-3 py-2 text-sm text-gray-200 rounded-md cursor-pointer hover:bg-white/10 aria-selected:bg-white/10 data-[selected=true]:bg-white/10"
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
          <span className="text-xs text-gray-500">
            Search anything across the organization.
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
