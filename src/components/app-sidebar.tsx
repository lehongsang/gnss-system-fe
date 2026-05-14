import * as React from "react";
import {
  LayoutDashboard,
  Cpu,
  MapPinned,
  Activity,
  Pentagon,
  Bell,
  Film,
  Settings2,
  Users,
  BarChart4,
  Globe,
  Database,
} from "lucide-react";
import { Link } from "react-router-dom";

import logo from "@/assets/logo.png";
import { authClient } from "@/utils/auth-client";
import { NavMain } from "@/components/nav-main";
import { NavUser } from "@/components/nav-user";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// Navigation data — GNSS Vision System
const userNavMain = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Devices",
    url: "#",
    icon: Cpu,
    items: [
      { title: "My Devices", url: "/my-devices" },
      { title: "Device Groups", url: "/device-groups" },
    ],
  },
  {
    title: "Live Tracking",
    url: "#",
    icon: MapPinned,
    items: [
      { title: "Real-time Map", url: "/real-time-map" },
      { title: "Track History", url: "/track-history" },
    ],
  },
  {
    title: "Telemetry",
    url: "#",
    icon: Activity,
    items: [
      { title: "Data Explorer", url: "/telemetry" },
      { title: "Charts", url: "#" },
      { title: "Export", url: "#" },
    ],
  },
  {
    title: "Geofences",
    url: "#",
    icon: Pentagon,
    items: [
      { title: "My Geofences", url: "/my-geofences" },
      { title: "Zone Alerts", url: "#" },
    ],
  },
  {
    title: "Alerts & Media",
    url: "#",
    icon: Bell,
    items: [
      { title: "My Alerts & Media", url: "/my-alerts" },
      { title: "Alert Rules", url: "#" },
    ],
  },
  {
    title: "Media Logs",
    url: "#",
    icon: Film,
    items: [
      { title: "Vision Feed", url: "#" },
      { title: "Media Logs", url: "/media-logs" },
      { title: "Storage", url: "/storage" },
    ],
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings2,
    items: [
      { title: "General", url: "#" },
      { title: "Integrations", url: "#" },
      { title: "Team", url: "#" },
    ],
  },
];

const adminNavMain = [
  {
    title: "Global Monitoring",
    url: "/admin/monitoring",
    icon: Globe,
    isActive: true,
  },
  {
    title: "User Management",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Resources",
    url: "/admin/resources",
    icon: Database,
  },
  {
    title: "System Statistics",
    url: "/admin/statistics",
    icon: BarChart4,
  },
];

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { useSession } = authClient;
  const { data: session } = useSession();

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: "",
  };

  const isAdmin = session?.user?.role === "admin";
  const navItems = isAdmin ? adminNavMain : userNavMain;

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg">
                  <img src={logo} alt="GNSS Vision" className="size-6" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">GNSS Vision</span>
                  <span className="truncate text-xs text-muted-foreground">
                    Monitoring System
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <ScrollArea className="flex-1">
          <NavMain items={navItems} />
        </ScrollArea>
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
