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
    title: "Bảng điều khiển",
    url: "/",
    icon: LayoutDashboard,
    isActive: true,
  },
  {
    title: "Thiết bị",
    url: "#",
    icon: Cpu,
    items: [
      { title: "Thiết bị của tôi", url: "/my-devices" },
      { title: "Nhóm thiết bị", url: "/device-groups" },
    ],
  },
  {
    title: "Theo dõi trực tiếp",
    url: "#",
    icon: MapPinned,
    items: [
      { title: "Bản đồ thời gian thực", url: "/real-time-map" },
      { title: "Lịch sử di chuyển", url: "/track-history" },
    ],
  },
  {
    title: "Viễn trắc",
    url: "#",
    icon: Activity,
    items: [
      { title: "Khám phá dữ liệu", url: "/telemetry" },
      { title: "Biểu đồ", url: "/telemetry-charts" },
    ],
  },
  {
    title: "Vùng địa lý",
    url: "/my-geofences",
    icon: Pentagon,
  },
  {
    title: "Cảnh báo & Media",
    url: "#",
    icon: Bell,
    items: [
      { title: "Cảnh báo & Media của tôi", url: "/my-alerts" },
      { title: "Quy tắc cảnh báo", url: "#" },
    ],
  },
  {
    title: "Nhật ký Media",
    url: "#",
    icon: Film,
    items: [
      { title: "Live Stream", url: "/live-stream" },
      { title: "Luồng Video", url: "/vision-feed" },
      { title: "Nhật ký Media", url: "/media-logs" },
      { title: "Lưu trữ", url: "/storage" },
    ],
  },
  {
    title: "Cài đặt",
    url: "#",
    icon: Settings2,
    items: [
      { title: "Chung", url: "#" },
      { title: "Tích hợp", url: "#" },
      { title: "Đội nhóm", url: "#" },
    ],
  },
];

const adminNavMain = [
  {
    title: "Giám sát toàn cầu",
    url: "/admin/monitoring",
    icon: Globe,
    isActive: true,
  },
  {
    title: "Quản lý người dùng",
    url: "/admin/users",
    icon: Users,
  },
  {
    title: "Tài nguyên",
    url: "/admin/resources",
    icon: Database,
  },
  {
    title: "Thống kê hệ thống",
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
