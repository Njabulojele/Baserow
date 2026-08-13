import * as React from "react";
import {
  Calendar,
  CheckSquare,
  FolderOpen,
  LayoutDashboard,
  LineChart,
  PenTool,
  Settings,
  Target,
  Users,
  UserPlus,
  Timer,
  Activity,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { UserButton } from "@clerk/react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

const sidebarRoutes = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/" },
  { label: "Clients & Pipeline", icon: Users, href: "/clients" },
  { label: "Leads Kanban", icon: UserPlus, href: "/crm/leads" },
  { label: "Projects", icon: FolderOpen, href: "/projects" },
  { label: "Tasks", icon: CheckSquare, href: "/tasks" },
  { label: "Goals", icon: Target, href: "/goals" },
  { label: "Calendar", icon: Calendar, href: "/calendar" },
  { label: "Canvas", icon: PenTool, href: "/canvas" },
  { label: "Timer / Focus Mode", icon: Timer, href: "/timer" },
  { label: "Tracklog", icon: Activity, href: "/tracklog" },
  { label: "Reports & Analytics", icon: LineChart, href: "/analytics" },
  { label: "Settings", icon: Settings, href: "/settings" },
];

export function ViteAppSidebar({
  ...props
}: React.ComponentProps<typeof Sidebar>) {
  const location = useLocation();
  const pathname = location.pathname;
  const { setOpenMobile, isMobile } = useSidebar();
  const [theme, setTheme] = React.useState<"light" | "dark">("dark");

  const handleLinkClick = () => {
    if (isMobile) setOpenMobile(false);
  };

  const toggleTheme = (newTheme: "light" | "dark") => {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  return (
    <Sidebar
      collapsible="icon"
      {...props}
      className="border-none bg-[#121316] text-[#e4e5e9] shadow-none"
    >
      <SidebarHeader className="flex justify-between flex-row items-center p-4">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Baserow"
            className="w-8 h-8 rounded-xl object-contain shrink-0"
          />
          <div className="flex flex-col gap-0 leading-none group-data-[collapsible=icon]:hidden">
            <span className="text-sm font-extrabold tracking-tight text-white">
              BASEROW
            </span>
            <span className="text-[10px] text-gray-400 font-medium">
              Productivity OS
            </span>
          </div>
        </div>
        <SidebarTrigger className="h-8 w-8 text-gray-400 hover:text-white hover:bg-[#202228] rounded-lg transition-all" />
      </SidebarHeader>

      <SidebarContent className="px-3 py-2">
        <SidebarMenu className="gap-1.5">
          {sidebarRoutes.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  tooltip={item.label}
                  onClick={handleLinkClick}
                  className={cn(
                    "h-10 px-3.5 rounded-2xl text-xs font-medium transition-all duration-200",
                    isActive
                      ? "bg-white text-black dark:bg-[#22242B] dark:text-white shadow-sm font-semibold"
                      : "text-gray-400 hover:text-white hover:bg-[#1E2026]",
                  )}
                >
                  <Link to={item.href} className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        "w-4 h-4 transition-colors",
                        isActive
                          ? "text-black dark:text-white"
                          : "text-gray-400",
                      )}
                    />
                    <span className="tracking-normal">{item.label}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3 gap-3 border-none">
        <div className="bg-[#1E2026] p-1 rounded-full flex items-center justify-between group-data-[collapsible=icon]:hidden shadow-inner">
          <button
            onClick={() => toggleTheme("light")}
            className={cn(
              "flex items-center justify-center gap-2 flex-1 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
              theme === "light"
                ? "bg-white text-black shadow-sm font-bold"
                : "text-gray-400 hover:text-white",
            )}
          >
            <Sun className="w-3.5 h-3.5" />
            <span>Light</span>
          </button>
          <button
            onClick={() => toggleTheme("dark")}
            className={cn(
              "flex items-center justify-center gap-2 flex-1 py-1.5 rounded-full text-xs font-medium transition-all duration-200",
              theme === "dark"
                ? "bg-[#2A2D37] text-white shadow-sm font-bold"
                : "text-gray-400 hover:text-white",
            )}
          >
            <Moon className="w-3.5 h-3.5" />
            <span>Dark</span>
          </button>
        </div>

        <div className="p-2 flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2">
            <UserButton showName={false} />
            <div className="flex flex-col text-xs group-data-[collapsible=icon]:hidden">
              <span className="text-xs font-semibold text-white">Clement</span>
              <span className="text-[10px] text-gray-400">Solo Founder</span>
            </div>
          </div>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
