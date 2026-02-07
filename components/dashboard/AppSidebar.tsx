"use client";

import * as React from "react";
import {
  Calendar,
  CheckSquare,
  FolderOpen,
  Heart,
  LayoutDashboard,
  LineChart,
  Search,
  Settings,
  Target,
  Users,
  UserPlus,
  TrendingUp,
  Activity,
  Briefcase,
  Zap,
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

const mainRoutes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    label: "Day Navigation",
    icon: Calendar,
    href: "/planning/day",
  },
  {
    label: "Strategy",
    icon: Target,
    href: "/strategy",
  },
  {
    label: "Tasks",
    icon: CheckSquare,
    href: "/tasks",
  },
  {
    label: "Projects",
    icon: FolderOpen,
    href: "/projects",
  },
  {
    label: "Calendar",
    icon: Calendar,
    href: "/calendar",
  },
];

const crmRoutes = [
  {
    label: "Overview",
    icon: LayoutDashboard,
    href: "/crm",
  },
  {
    label: "Leads",
    icon: UserPlus,
    href: "/crm/leads",
  },
  {
    label: "Pipeline",
    icon: TrendingUp,
    href: "/crm/pipeline",
  },
  {
    label: "Clients",
    icon: Users,
    href: "/clients", // Keeping existing path for now
  },
  {
    label: "Activities",
    icon: Activity,
    href: "/crm/activities",
  },
  {
    label: "Workflows",
    icon: Zap,
    href: "/crm/workflows",
  },
];

const otherRoutes = [
  {
    label: "Analytics",
    icon: LineChart,
    href: "/analytics",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
  {
    label: "Research Agent",
    icon: Search,
    href: "/research",
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const pathname = usePathname();
  const { setOpenMobile, isMobile } = useSidebar();

  const handleLinkClick = () => {
    if (isMobile) {
      setOpenMobile(false);
    }
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader className="flex justify-between flex-row">
        <div className="flex items-center p-2">
          <Image
            src="/logo.png"
            alt="Baserow"
            width={32}
            height={32}
            className="rounded-md"
          />
          <div className="ml-2 flex flex-col gap-0.5 leading-none group-data-[collapsible=icon]:hidden">
            <span className="font-bold">Baserow</span>
            <span className="text-xs">v1.0</span>
          </div>
        </div>
        <SidebarTrigger className="-ml-1 h-9 w-9" />
      </SidebarHeader>
      <SidebarContent>
        {/* Main Routes */}
        <SidebarGroup>
          <SidebarGroupLabel>General</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainRoutes.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    onClick={handleLinkClick}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* CRM Routes */}
        <SidebarGroup>
          <SidebarGroupLabel>CRM</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {crmRoutes.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    onClick={handleLinkClick}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Other Routes */}
        <SidebarGroup>
          <SidebarGroupLabel>Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {otherRoutes.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.label}
                    onClick={handleLinkClick}
                  >
                    <Link href={item.href}>
                      <item.icon />
                      <span>{item.label}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <div className="p-2 flex items-center gap-2">
          <UserButton showName={false} />
          <div className="flex flex-col text-sm group-data-[collapsible=icon]:hidden">
            <span className="font-medium">Account</span>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
