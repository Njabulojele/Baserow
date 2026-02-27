"use client";

import * as React from "react";
import {
  Calendar,
  CheckSquare,
  FolderOpen,
  LayoutDashboard,
  LineChart,
  Search,
  Settings,
  Target,
  Users,
  UserPlus,
  TrendingUp,
  Activity,
  Zap,
  PenTool,
  User,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";

const mainRoutes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/dashboard" },
  { label: "Day Navigation", icon: Calendar, href: "/planning/day" },
  { label: "Strategy", icon: Target, href: "/strategy" },
  { label: "Tasks", icon: CheckSquare, href: "/tasks" },
  { label: "Projects", icon: FolderOpen, href: "/projects" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Canvas", icon: PenTool, href: "/canvas" },
  { label: "Team", icon: Users, href: "/team" },
];

const crmRoutes = [
  { label: "Overview", icon: LayoutDashboard, href: "/crm" },
  { label: "Leads", icon: UserPlus, href: "/crm/leads" },
  { label: "Pipeline", icon: TrendingUp, href: "/crm/pipeline" },
  { label: "Clients", icon: Users, href: "/clients" },
  { label: "Activities", icon: Activity, href: "/crm/activities" },
  { label: "Workflows", icon: Zap, href: "/crm/workflows" },
];

const otherRoutes = [
  { label: "Analytics", icon: LineChart, href: "/analytics" },
  { label: "Settings", icon: Settings, href: "/settings" },
  { label: "Research Agent", icon: Search, href: "/research" },
  { label: "Profile", icon: User, href: "/user-profile" },
];

function NavGroup({
  label,
  routes,
  pathname,
  onNavigate,
}: {
  label: string;
  routes: typeof mainRoutes;
  pathname: string;
  onNavigate: () => void;
}) {
  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-[9px] font-mono uppercase tracking-[0.2em] text-muted-foreground/40 px-3">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {routes.map((item) => {
            const isActive =
              pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  onClick={onNavigate}
                  className={cn(
                    "font-mono text-xs tracking-wide h-8 rounded-md transition-all",
                    isActive
                      ? "bg-card text-alabaster font-medium"
                      : "text-muted-foreground hover:text-alabaster hover:bg-card/50",
                  )}
                >
                  <Link href={item.href}>
                    <item.icon className="w-3.5 h-3.5" />
                    <span>{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="border-r border-border/30"
    >
      <SidebarHeader className="flex justify-between flex-row">
        <div className="flex items-center p-2">
          <Image
            src="/logo.png"
            alt="Baserow"
            width={28}
            height={28}
            className="rounded"
          />
          <div className="ml-2 flex flex-col gap-0 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-mono text-xs font-bold text-alabaster tracking-wide">
              BaseRow
            </span>
            <span className="font-mono text-[9px] text-muted-foreground/40">
              v1.0
            </span>
          </div>
        </div>
        <SidebarTrigger className="-ml-1 h-9 w-9 text-muted-foreground/40 hover:text-alabaster" />
      </SidebarHeader>
      <SidebarContent className="px-1">
        <NavGroup
          label="General"
          routes={mainRoutes}
          pathname={pathname}
          onNavigate={handleLinkClick}
        />
        <NavGroup
          label="CRM"
          routes={crmRoutes}
          pathname={pathname}
          onNavigate={handleLinkClick}
        />
        <NavGroup
          label="Tools"
          routes={otherRoutes}
          pathname={pathname}
          onNavigate={handleLinkClick}
        />
      </SidebarContent>
      <SidebarFooter className="border-t border-border/20">
        <div className="p-2 flex items-center gap-2">
          <UserButton showName={false} />
          <div className="flex flex-col text-xs group-data-[collapsible=icon]:hidden">
            <span className="font-mono text-[10px] text-muted-foreground/60">
              Account
            </span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
