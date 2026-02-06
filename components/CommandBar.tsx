"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  Search,
  Plus,
  ListTodo,
  FolderKanban,
  Users,
  Calendar,
  LayoutDashboard,
  Target,
  BarChart3,
  Settings,
} from "lucide-react";
import { trpc } from "@/lib/trpc/client";
import { useUIStore } from "@/lib/stores/ui-store";
import { cn } from "@/lib/utils";

interface CommandItem {
  id: string;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  action: () => void;
  category: "navigation" | "tasks" | "projects" | "clients" | "actions";
}

export function CommandBar() {
  const router = useRouter();
  const { commandBarOpen, closeCommandBar, openCommandBar } = useUIStore();
  const [search, setSearch] = useState("");

  // Fetch data for search
  const { data: tasks } = trpc.task.getTasks.useQuery(undefined, {
    enabled: commandBarOpen,
  });
  const { data: projects } = trpc.project.getProjects.useQuery(undefined, {
    enabled: commandBarOpen,
  });
  const { data: clients } = trpc.clients.getClients.useQuery(undefined, {
    enabled: commandBarOpen,
  });

  // Keyboard shortcut handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (commandBarOpen) {
          closeCommandBar();
        } else {
          openCommandBar();
        }
      }
      if (e.key === "Escape" && commandBarOpen) {
        closeCommandBar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [commandBarOpen, closeCommandBar, openCommandBar]);

  // Navigation items
  const navigationItems: CommandItem[] = [
    {
      id: "nav-dashboard",
      title: "Dashboard",
      icon: <LayoutDashboard className="size-4" />,
      action: () => {
        router.push("/dashboard");
        closeCommandBar();
      },
      category: "navigation",
    },
    {
      id: "nav-tasks",
      title: "Tasks",
      icon: <ListTodo className="size-4" />,
      action: () => {
        router.push("/tasks");
        closeCommandBar();
      },
      category: "navigation",
    },
    {
      id: "nav-projects",
      title: "Projects",
      icon: <FolderKanban className="size-4" />,
      action: () => {
        router.push("/projects");
        closeCommandBar();
      },
      category: "navigation",
    },
    {
      id: "nav-clients",
      title: "Clients",
      icon: <Users className="size-4" />,
      action: () => {
        router.push("/clients");
        closeCommandBar();
      },
      category: "navigation",
    },
    {
      id: "nav-calendar",
      title: "Calendar",
      icon: <Calendar className="size-4" />,
      action: () => {
        router.push("/calendar");
        closeCommandBar();
      },
      category: "navigation",
    },
    {
      id: "nav-strategy",
      title: "Strategy",
      icon: <Target className="size-4" />,
      action: () => {
        router.push("/strategy");
        closeCommandBar();
      },
      category: "navigation",
    },
    {
      id: "nav-analytics",
      title: "Analytics",
      icon: <BarChart3 className="size-4" />,
      action: () => {
        router.push("/analytics");
        closeCommandBar();
      },
      category: "navigation",
    },
  ];

  // Task items
  const taskItems: CommandItem[] =
    tasks?.slice(0, 5).map((task) => ({
      id: `task-${task.id}`,
      title: task.title,
      subtitle: task.project?.name || "No project",
      icon: <ListTodo className="size-4" />,
      action: () => {
        router.push(`/tasks?task=${task.id}`);
        closeCommandBar();
      },
      category: "tasks" as const,
    })) || [];

  // Project items
  const projectItems: CommandItem[] =
    projects?.slice(0, 5).map((project) => ({
      id: `project-${project.id}`,
      title: project.name,
      subtitle: `${project._count?.tasks || 0} tasks`,
      icon: <FolderKanban className="size-4" />,
      action: () => {
        router.push(`/projects/${project.id}`);
        closeCommandBar();
      },
      category: "projects" as const,
    })) || [];

  // Client items
  const clientItems: CommandItem[] =
    clients?.slice(0, 5).map((client: any) => ({
      id: `client-${client.id}`,
      title: client.name,
      subtitle: client.company || "No company",
      icon: <Users className="size-4" />,
      action: () => {
        router.push(`/clients/${client.id}`);
        closeCommandBar();
      },
      category: "clients" as const,
    })) || [];

  // Quick actions
  const actionItems: CommandItem[] = [
    {
      id: "action-new-task",
      title: "Create new task",
      icon: <Plus className="size-4" />,
      action: () => {
        router.push("/tasks?new=true");
        closeCommandBar();
      },
      category: "actions",
    },
    {
      id: "action-new-project",
      title: "Create new project",
      icon: <Plus className="size-4" />,
      action: () => {
        router.push("/projects?new=true");
        closeCommandBar();
      },
      category: "actions",
    },
  ];

  if (!commandBarOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        onClick={closeCommandBar}
      />

      {/* Command Dialog */}
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
        <Command
          className="w-full max-w-lg rounded-xl border bg-popover shadow-2xl overflow-hidden"
          shouldFilter={true}
        >
          {/* Search Input */}
          <div className="flex items-center border-b px-3">
            <Search className="size-4 text-muted-foreground shrink-0" />
            <Command.Input
              placeholder="Type a command or search..."
              value={search}
              onValueChange={setSearch}
              className="flex h-12 w-full bg-transparent py-3 px-2 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50"
              autoFocus
            />
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <Command.List className="max-h-[300px] overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </Command.Empty>

            {/* Quick Actions */}
            <Command.Group heading="Quick Actions" className="mb-2">
              {actionItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.title}
                  onSelect={item.action}
                  className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-accent aria-selected:bg-accent"
                >
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="text-sm">{item.title}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Navigation */}
            <Command.Group heading="Navigation" className="mb-2">
              {navigationItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={item.title}
                  onSelect={item.action}
                  className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-accent aria-selected:bg-accent"
                >
                  <span className="text-muted-foreground">{item.icon}</span>
                  <span className="text-sm">{item.title}</span>
                </Command.Item>
              ))}
            </Command.Group>

            {/* Tasks */}
            {taskItems.length > 0 && (
              <Command.Group heading="Tasks" className="mb-2">
                {taskItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.title}
                    onSelect={item.action}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-accent aria-selected:bg-accent"
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm block truncate">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Projects */}
            {projectItems.length > 0 && (
              <Command.Group heading="Projects" className="mb-2">
                {projectItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.title}
                    onSelect={item.action}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-accent aria-selected:bg-accent"
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm block truncate">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {/* Clients */}
            {clientItems.length > 0 && (
              <Command.Group heading="Clients" className="mb-2">
                {clientItems.map((item) => (
                  <Command.Item
                    key={item.id}
                    value={item.title}
                    onSelect={item.action}
                    className="flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer hover:bg-accent aria-selected:bg-accent"
                  >
                    <span className="text-muted-foreground">{item.icon}</span>
                    <div className="flex-1 min-w-0">
                      <span className="text-sm block truncate">
                        {item.title}
                      </span>
                      {item.subtitle && (
                        <span className="text-xs text-muted-foreground">
                          {item.subtitle}
                        </span>
                      )}
                    </div>
                  </Command.Item>
                ))}
              </Command.Group>
            )}
          </Command.List>

          {/* Footer */}
          <div className="flex items-center justify-between border-t px-3 py-2 text-xs text-muted-foreground">
            <span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">
                ↑↓
              </kbd>{" "}
              to navigate
            </span>
            <span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">
                ↵
              </kbd>{" "}
              to select
            </span>
            <span>
              <kbd className="rounded border bg-muted px-1 py-0.5 font-mono">
                esc
              </kbd>{" "}
              to close
            </span>
          </div>
        </Command>
      </div>
    </>
  );
}
