"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  CheckSquare,
  Calendar,
  FolderOpen,
  Users,
  LineChart,
  Heart,
  Target,
  Settings,
  PlusCircle,
  LogOut,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import Image from "next/image";

const routes = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    color: "text-sky-500",
  },
  {
    label: "Tasks",
    icon: CheckSquare,
    href: "/tasks",
    color: "text-violet-500",
  },
  {
    label: "Projects",
    icon: FolderOpen,
    href: "/projects",
    color: "text-pink-700",
  },
  {
    label: "Strategy",
    icon: Target,
    href: "/strategy",
    color: "text-indigo-500",
  },
  {
    label: "Calendar",
    icon: Calendar,
    href: "/calendar",
    color: "text-orange-700",
  },
  {
    label: "Clients",
    icon: Users,
    href: "/clients",
    color: "text-emerald-500",
  },
  {
    label: "Analytics",
    icon: LineChart,
    href: "/analytics",
    color: "text-green-700",
  },
  {
    label: "Well-being",
    icon: Heart,
    href: "/well-being",
    color: "text-red-500",
  },
  {
    label: "Settings",
    icon: Settings,
    href: "/settings",
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="space-y-4 py-4 flex flex-col h-full bg-sidebar border-r border-sidebar-border text-sidebar-foreground">
      <div className="px-3 py-2 flex-1">
        <Link href="/dashboard" className="flex items-center pl-3 mb-14">
          <Image src="/logo.png" alt="Baserow" width={32} height={32} />
          <h1 className="text-2xl font-bold">Baserow</h1>
        </Link>
        <div className="space-y-1">
          {routes.map((route) => (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer hover:text-primary hover:bg-primary/10 rounded-lg transition",
                pathname === route.href
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground",
              )}
            >
              <div className="flex items-center flex-1">
                <route.icon className={cn("h-5 w-5 mr-3", route.color)} />
                {route.label}
              </div>
            </Link>
          ))}
        </div>
      </div>
      <div className="px-3 py-2">
        <div className="flex items-center p-3 w-full justify-start font-medium text-sm">
          <UserButton showName />
        </div>
      </div>
    </div>
  );
}
