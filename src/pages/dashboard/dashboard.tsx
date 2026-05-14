import { AppHeader } from "@/components/app-header";
import {
  Cpu,
  ShieldAlert,
  BarChart3,
  HardDrive,
} from "lucide-react";
import { StatsCard } from "./components/stats-card";
import { MapView } from "./components/map-view";
import { DeviceList } from "./components/device-list";
import { AlertTable } from "./components/alert-table";
import { MediaLogs } from "./components/media-logs";
import {
  type DashboardDevice,
  type DashboardAlert,
  type DashboardMediaLog,
  type DashboardGeofence,
} from "@/types";

const mockDevices: DashboardDevice[] = [];
const mockAlerts: DashboardAlert[] = [];
const mockMediaLogs: DashboardMediaLog[] = [];
const mockGeofences: DashboardGeofence[] = [];
const dashboardStats = {
  totalDevices: 0,
  onlineDevices: 0,
  offlineDevices: 0,
  alerts24h: 0,
  criticalAlerts: 0,
  warningAlerts: 0,
  telemetryPoints: 0,
  telemetryRate: "0/min",
  mediaUsed: "0 GB",
  mediaTotal: "0 GB",
  mediaPercent: 0,
};

import { authClient } from "@/utils/auth-client";
import { Navigate } from "react-router-dom";

export default function DashboardPage() {
  const { useSession } = authClient;
  const { data: session } = useSession();

  if (session?.user?.role === "admin") {
    return <Navigate to="/admin/monitoring" replace />;
  }

  const stats = [
    {
      title: "Total Devices",
      value: dashboardStats.totalDevices,
      subtitle: `${dashboardStats.onlineDevices} online · ${dashboardStats.offlineDevices} offline`,
      icon: Cpu,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      trend: { value: `${Math.round((dashboardStats.onlineDevices / dashboardStats.totalDevices) * 100)}% uptime`, positive: true },
    },
    {
      title: "Alerts (24h)",
      value: dashboardStats.alerts24h,
      subtitle: `${dashboardStats.criticalAlerts} critical · ${dashboardStats.warningAlerts} warning`,
      icon: ShieldAlert,
      iconColor: "text-red-400",
      iconBg: "bg-red-500/10",
      trend: { value: `${dashboardStats.criticalAlerts} critical`, positive: false },
    },
    {
      title: "Telemetry Points",
      value: dashboardStats.telemetryPoints.toLocaleString(),
      subtitle: `Rate: ${dashboardStats.telemetryRate}`,
      icon: BarChart3,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      trend: { value: "↑ 12.3%", positive: true },
    },
    {
      title: "Media Storage",
      value: dashboardStats.mediaUsed,
      subtitle: `of ${dashboardStats.mediaTotal} total (${dashboardStats.mediaPercent}%)`,
      icon: HardDrive,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
  ];

  return (
    <>
      <AppHeader
        title="Overview"
        breadcrumbs={[
          { label: "Dashboard", href: "/" },
          { label: "Overview" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        {/* Row 1: Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Row 2: Map + Device Status */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-10">
          <div className="lg:col-span-7">
            <MapView devices={mockDevices} geofences={mockGeofences} />
          </div>
          <div className="lg:col-span-3">
            <DeviceList devices={mockDevices} />
          </div>
        </div>

        {/* Row 3: Alerts + Media Logs */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-10">
          <div className="lg:col-span-6">
            <AlertTable alerts={mockAlerts} />
          </div>
          <div className="lg:col-span-4">
            <MediaLogs logs={mockMediaLogs} />
          </div>
        </div>
      </div>
    </>
  );
}
