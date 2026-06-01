import { useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import {
  Cpu,
  ShieldAlert,
  BarChart3,
  HardDrive,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
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

import { authClient } from "@/utils/auth-client";
import { Navigate } from "react-router-dom";
import { 
  useDashboardStats, 
  useLatestTelemetry, 
  useDeviceStatusMine 
} from "@/hooks/use-user-dashboard";
import { 
  useDevicesControllerFindMine,
  useAlertsControllerFindMine,
  useGeofencesControllerFindMine,
  useMediaLogsControllerFindMine
} from "@/services/apis/gen/queries";
import { useQueryClient } from "@tanstack/react-query";
import { dashboardKeys } from "@/hooks/use-user-dashboard";

function formatBytes(bytes: number) {
  if (bytes === 0) return "Chưa có dữ liệu";
  const gb = bytes / 1073741824;
  return `${gb.toFixed(2)} GB`;
}

export default function DashboardPage() {
  const { useSession } = authClient;
  const { data: session } = useSession();
  const queryClient = useQueryClient();

  // --- API Hooks ---
  const { data: statsRes } = useDashboardStats();
  const { data: telemetryRes } = useLatestTelemetry();
  const { data: statusRes } = useDeviceStatusMine();

  const { data: devicesRes } = useDevicesControllerFindMine({ limit: 100 });
  const { data: alertsRes } = useAlertsControllerFindMine({ limit: 10, page: 1, sortBy: 'createdAt', sortOrder: 'DESC' });
  const { data: mediaLogsRes } = useMediaLogsControllerFindMine({ limit: 8, page: 1, sortBy: 'startTime', sortOrder: 'DESC' });
  const { data: geofencesRes } = useGeofencesControllerFindMine({ limit: 100 });

  // --- Data Parsing ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawStats = (statsRes as any) ?? {
    totalDevices: 0,
    onlineDevices: 0,
    offlineDevices: 0,
    alerts24h: 0,
    criticalAlerts: 0,
    warningAlerts: 0,
    telemetryPoints: 0,
    telemetryRate: "0/min",
    mediaUsedBytes: 0,
    mediaTotalBytes: 5368709120,
  };

  const mediaPercent = rawStats.mediaTotalBytes > 0 
     ? Math.round((rawStats.mediaUsedBytes / rawStats.mediaTotalBytes) * 100) 
     : 0;

  const uptime = rawStats.totalDevices > 0 
    ? Math.round((rawStats.onlineDevices / rawStats.totalDevices) * 100) 
    : 0;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevices = useMemo(() => ((devicesRes as any)?.data ?? []) as any[], [devicesRes]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawStatuses = useMemo(() => (statusRes as any) ?? [], [statusRes]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawTelemetry = useMemo(() => (telemetryRes as any) ?? [], [telemetryRes]);

  const mappedDevices: DashboardDevice[] = useMemo(() => {
    return rawDevices.map((d) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const status = rawStatuses.find((s: any) => s.deviceId === d.id);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const telemetry = rawTelemetry.find((t: any) => t.device_id === d.id);

      return {
        id: d.id,
        name: d.name ?? "Unknown Device",
        type: "rover", // Default since API doesn't have it
        status: status?.status ?? "offline",
        battery: status?.batteryLevel ?? 0,
        hdop: 0,
        vdop: 0,
        satellites: status?.satellitesTracked ?? 0,
        maxSatellites: 0,
        lat: telemetry?.lat ?? 21.0062,
        lng: telemetry?.lng ?? 105.8431,
        lastSeen: status?.updatedAt ?? d.updatedAt ?? new Date().toISOString(),
      };
    });
  }, [rawDevices, rawStatuses, rawTelemetry]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawGeofences = useMemo(() => ((geofencesRes as any)?.data ?? []) as any[], [geofencesRes]);
  const mappedGeofences: DashboardGeofence[] = useMemo(() => {
    return rawGeofences.map(g => ({
      id: g.id,
      name: g.name,
      paths: g.paths ?? [], 
      color: g.color ?? "#3b82f6",
    }));
  }, [rawGeofences]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAlerts = useMemo(() => ((alertsRes as any)?.data ?? []) as any[], [alertsRes]);
  const mappedAlerts: DashboardAlert[] = useMemo(() => {
    return rawAlerts.map(a => ({
      id: a.id,
      deviceId: a.deviceId,
      deviceName: a.device?.name ?? "Unknown Device",
      severity: (a.alertType === "dangerous_obstacle" || a.alertType === "sos") ? "critical" : "warning",
      message: a.message,
      timestamp: a.createdAt,
      acknowledged: a.isResolved
    }));
  }, [rawAlerts]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawMediaLogs = useMemo(() => ((mediaLogsRes as any)?.data ?? (mediaLogsRes as any)?.data?.data ?? []) as any[], [mediaLogsRes]);
  const mappedMediaLogs: DashboardMediaLog[] = useMemo(() => {
    return rawMediaLogs.map(m => ({
      id: m.id,
      deviceId: m.deviceId,
      deviceName: rawDevices.find(d => d.id === m.deviceId)?.name ?? "Unknown Device",
      thumbnail: m.fileUrl ?? "",
      objectDetected: m.mediaType === "video_chunk" ? "Video recording" : "Image capture",
      confidence: 100, // Mock
      timestamp: m.startTime ?? m.createdAt ?? new Date().toISOString(),
      resolution: "720p" // Mock
    }));
  }, [rawMediaLogs, rawDevices]);

  if (session?.user?.role === "admin") {
    return <Navigate to="/admin/monitoring" replace />;
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: dashboardKeys.stats });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.latestTelemetry });
    queryClient.invalidateQueries({ queryKey: dashboardKeys.deviceStatus });
    queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/media-logs"] });
  };

  const statsCards = [
    {
      title: "Tổng thiết bị",
      value: rawStats.totalDevices,
      subtitle: `${rawStats.onlineDevices} online · ${rawStats.offlineDevices} offline`,
      icon: Cpu,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
      trend: { value: `↑ ${uptime}% uptime`, positive: true },
    },
    {
      title: "Cảnh báo (24h)",
      value: rawStats.alerts24h,
      subtitle: `${rawStats.criticalAlerts} critical · ${rawStats.warningAlerts} warning`,
      icon: ShieldAlert,
      iconColor: "text-red-400",
      iconBg: "bg-red-500/10",
      trend: { value: `↓ 12%`, positive: true },
    },
    {
      title: "Điểm viễn trắc",
      value: rawStats.telemetryPoints.toLocaleString(),
      subtitle: `Rate: ${rawStats.telemetryRate}`,
      icon: BarChart3,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
      trend: { value: `↑ 8.4%`, positive: true },
    },
    {
      title: "Lưu trữ bộ nhớ",
      value: formatBytes(rawStats.mediaUsedBytes),
      subtitle: `of ${formatBytes(rawStats.mediaTotalBytes)} total (${mediaPercent}%)`,
      icon: HardDrive,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
      trend: { value: `↑ ${mediaPercent}%`, positive: mediaPercent < 80 },
    },
  ];

  return (
    <>
      <AppHeader
        title="Bảng điều khiển"
        breadcrumbs={[
          { label: "Bảng điều khiển" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        <div className="flex justify-end mb-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        </div>

        {/* Row 1: Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {statsCards.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Row 2: Map + Device Status */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-10">
          <div className="lg:col-span-7 min-w-0">
            <MapView devices={mappedDevices} geofences={mappedGeofences} />
          </div>
          <div className="lg:col-span-3 min-w-0">
            <DeviceList devices={mappedDevices} />
          </div>
        </div>

        {/* Row 3: Alerts + Media Logs */}
        <div className="grid gap-4 grid-cols-1 lg:grid-cols-10">
          <div className="lg:col-span-6">
            <AlertTable alerts={mappedAlerts} />
          </div>
          <div className="lg:col-span-4">
            <MediaLogs logs={mappedMediaLogs} />
          </div>
        </div>
      </div>
    </>
  );
}
