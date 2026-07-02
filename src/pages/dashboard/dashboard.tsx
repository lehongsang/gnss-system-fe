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

  const hasRealData = mappedDevices.length > 0;

  const mockDevices: DashboardDevice[] = [
    {
      id: "019eb0c5-933e-76c9-ae7d-e41348d5cb3c",
      name: "Device A - Tracker",
      type: "rover",
      status: "offline",
      battery: 98,
      hdop: 0,
      vdop: 0,
      satellites: 10,
      maxSatellites: 0,
      lat: 21.0048,
      lng: 105.8458,
      lastSeen: new Date().toISOString(),
    },
    {
      id: "019eb0c5-9578-77f9-9f4a-2cb56c41b991",
      name: "Device B - Monitor",
      type: "rover",
      status: "offline",
      battery: 67,
      hdop: 0,
      vdop: 0,
      satellites: 0,
      maxSatellites: 0,
      lat: 21.0062,
      lng: 105.8431,
      lastSeen: new Date().toISOString(),
    }
  ];

  const finalDevices = hasRealData ? mappedDevices : mockDevices;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawStats = (hasRealData && statsRes) ? (statsRes as any) : {
    totalDevices: 2,
    onlineDevices: 0,
    offlineDevices: 2,
    alerts24h: 2,
    criticalAlerts: 2,
    warningAlerts: 0,
    telemetryPoints: 1096,
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
  const rawGeofences = useMemo(() => ((geofencesRes as any)?.data ?? []) as any[], [geofencesRes]);
  const mappedGeofences: DashboardGeofence[] = useMemo(() => {
    return rawGeofences.map(g => ({
      id: g.id,
      name: g.name,
      paths: g.paths ?? [], 
      color: g.color ?? "#3b82f6",
    }));
  }, [rawGeofences]);

  const mockGeofences: DashboardGeofence[] = [];
  const finalGeofences = hasRealData ? mappedGeofences : mockGeofences;

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

  const mockAlerts: DashboardAlert[] = [
    {
      id: "alert-1",
      deviceId: "019eb0c5-933e-76c9-ae7d-e41348d5cb3c",
      deviceName: "Device A - Tracker",
      severity: "critical",
      message: "Chướng ngại vật nguy hiểm phía trước",
      timestamp: new Date().toISOString(),
      acknowledged: false
    },
    {
      id: "alert-2",
      deviceId: "019eb0c5-933e-76c9-ae7d-e41348d5cb3c",
      deviceName: "Device A - Tracker",
      severity: "critical",
      message: "Chướng ngại vật nguy hiểm phía trước",
      timestamp: new Date(Date.now() - 60000).toISOString(),
      acknowledged: false
    }
  ];
  const finalAlerts = hasRealData ? mappedAlerts : mockAlerts;

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

  const mockMediaLogs: DashboardMediaLog[] = [
    {
      id: "media-1",
      deviceId: "019eb0c5-933e-76c9-ae7d-e41348d5cb3c",
      deviceName: "Device A - Tracker",
      thumbnail: "https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=100&h=100&fit=crop",
      objectDetected: "Image capture",
      confidence: 100,
      timestamp: new Date().toISOString(),
      resolution: "720p"
    },
    {
      id: "media-2",
      deviceId: "019eb0c5-9578-77f9-9f4a-2cb56c41b991",
      deviceName: "Device B - Monitor",
      thumbnail: "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?w=100&h=100&fit=crop",
      objectDetected: "Video recording",
      confidence: 100,
      timestamp: new Date(Date.now() - 120000).toISOString(),
      resolution: "720p"
    }
  ];
  const finalMediaLogs = hasRealData ? mappedMediaLogs : mockMediaLogs;

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
      trend: { value: `↑ ${uptime}% uptime`, positive: true },
      statClass: "s1",
      iconClass: "ic-blue",
    },
    {
      title: "Cảnh báo (24h)",
      value: rawStats.alerts24h,
      subtitle: `${rawStats.criticalAlerts} critical · ${rawStats.warningAlerts} warning`,
      icon: ShieldAlert,
      trend: { value: `↓ 12%`, positive: true },
      statClass: "s2",
      iconClass: "ic-red",
    },
    {
      title: "Điểm viễn trắc",
      value: rawStats.telemetryPoints.toLocaleString(),
      subtitle: `Rate: ${rawStats.telemetryRate}`,
      icon: BarChart3,
      trend: { value: `↑ 8.4%`, positive: true },
      statClass: "s3",
      iconClass: "ic-green",
    },
    {
      title: "Lưu trữ bộ nhớ",
      value: formatBytes(rawStats.mediaUsedBytes),
      subtitle: `of ${formatBytes(rawStats.mediaTotalBytes)} total (${mediaPercent}%)`,
      icon: HardDrive,
      trend: { value: `↑ ${mediaPercent}%`, positive: mediaPercent < 80 },
      statClass: "s4",
      iconClass: "ic-amber",
    },
  ];

  return (
    <div className="dashboard-page-wrapper flex flex-1 flex-col min-h-full overflow-auto bg-background text-foreground">
      <style dangerouslySetInnerHTML={{ __html: `
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap');

        .dashboard-page-wrapper {
          background:
            radial-gradient(circle at 15% 0%, #1a2740 0%, transparent 45%),
            radial-gradient(circle at 90% 10%, #1c1530 0%, transparent 40%),
            #0a0e16 !important;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .dashboard-page {
          --bg-page: #0a0e16;
          --bg-sidebar: #0a0e16;
          --bg-card: #0f1420;
          --bg-card-2: #0d1119;
          --line: #1c2330;
          --line-soft: #161c28;
          --text-0: #f1f4fa;
          --text-1: #9aa5ba;
          --text-2: #5e6880;
          --cyan: #3ecfd4;
          --green: #3ecf8e;
          --green-dim: #3ecf8e1f;
          --red: #ef5d6f;
          --red-dim: #ef5d6f1f;
          --amber: #f0a93f;
          --amber-dim: #f0a93f1f;
          --blue: #5b8def;
          --blue-dim: #5b8def1f;
          --violet: #9d7bf0;
          --violet-dim: #9d7bf01f;
          --radius: 12px;
        }

        .dashboard-page {
          padding: 24px 28px 50px;
        }

        /* Stat cards */
        .dashboard-page .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 24px; }
        .dashboard-page .stat {
          background: linear-gradient(160deg, var(--bg-card) 0%, var(--bg-card-2) 100%);
          border: 1px solid var(--line); border-radius: var(--radius);
          padding: 18px 20px; position: relative; overflow: hidden;
          transition: border-color .15s ease, transform .15s ease;
        }
        .dashboard-page .stat:hover { border-color: #2c3650; transform: translateY(-1px); }
        .dashboard-page .stat::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; opacity: .9; }
        .dashboard-page .stat.s1::before { background: linear-gradient(90deg, var(--amber), transparent); }
        .dashboard-page .stat.s2::before { background: linear-gradient(90deg, var(--blue), transparent); }
        .dashboard-page .stat.s3::before { background: linear-gradient(90deg, var(--violet), transparent); }
        .dashboard-page .stat.s4::before { background: linear-gradient(90deg, var(--red), transparent); }
        
        .dashboard-page .stat-top { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 14px; }
        .dashboard-page .stat-label { font-size: 11px; letter-spacing: .06em; color: var(--text-2); font-weight: 600; text-transform: uppercase; }
        .dashboard-page .stat-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .dashboard-page .stat-icon svg { width: 16px; height: 16px; }
        .dashboard-page .ic-blue { background: var(--blue-dim); color: var(--blue); }
        .dashboard-page .ic-red { background: var(--red-dim); color: var(--red); }
        .dashboard-page .ic-green { background: var(--green-dim); color: var(--green); }
        .dashboard-page .ic-amber { background: var(--amber-dim); color: var(--amber); }
        .dashboard-page .stat-val { font-size: 22px; font-weight: 700; margin-bottom: 8px; color: var(--text-0); }
        .dashboard-page .stat-sub { display: flex; align-items: center; gap: 8px; font-size: 12px; color: var(--text-2); }
        
        .dashboard-page .pill { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 20px; }
        .dashboard-page .pill.up { background: var(--green-dim); color: var(--green); }
        .dashboard-page .pill.down { background: var(--red-dim); color: var(--red); }
        .dashboard-page .pill.flat { background: #ffffff14; color: var(--text-1); }

        /* Main grid: map + device status */
        .dashboard-page .main-grid { display: grid; grid-template-columns: 1fr 380px; gap: 16px; margin-bottom: 16px; align-items: start; }

        .dashboard-page .panel { background: var(--bg-card); border: 1px solid var(--line); border-radius: var(--radius); overflow: hidden; }
        .dashboard-page .panel-head { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid var(--line-soft); }
        .dashboard-page .panel-head .left { display: flex; align-items: center; gap: 10px; }
        .dashboard-page .panel-head .left svg { width: 17px; height: 17px; color: var(--text-1); }
        .dashboard-page .panel-head h2 { font-size: 14.5px; font-weight: 600; color: var(--text-0); }
        .dashboard-page .panel-head .sub { font-size: 12px; color: var(--text-2); margin-top: 2px; }

        .dashboard-page .live-badge {
          display: flex; align-items: center; gap: 6px; background: var(--green-dim); color: var(--green);
          font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 7px; letter-spacing: .03em;
        }
        .dashboard-page .live-badge::before { content:''; width:6px; height:6px; border-radius:50%; background:var(--green); animation:pulse 1.6s infinite; }
        @keyframes pulse { 0%,100%{opacity:1; box-shadow:0 0 0 0 #3ecf8e66;} 50%{opacity:.7; box-shadow:0 0 0 4px #3ecf8e00;} }

        /* device status list */
        .dashboard-page .device-card {
          padding: 16px 20px; border-bottom: 1px solid var(--line-soft);
          display: flex; align-items: flex-start; gap: 12px; cursor: pointer;
          transition: background .15s ease;
        }
        .dashboard-page .device-card:hover { background: #ffffff05; }
        .dashboard-page .device-card:last-child { border-bottom: none; }
        .dashboard-page .device-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 6px; flex-shrink: 0; }
        .dashboard-page .device-dot.offline { background: var(--red); box-shadow: 0 0 6px var(--red); }
        .dashboard-page .device-dot.online { background: var(--green); box-shadow: 0 0 6px var(--green); }
        .dashboard-page .device-name { font-weight: 600; font-size: 13.5px; margin-bottom: 2px; color: var(--text-0); }
        .dashboard-page .device-meta { display: flex; gap: 24px; }
        .dashboard-page .meta-label { font-size: 10.5px; color: var(--text-2); letter-spacing: .05em; text-transform: uppercase; margin-bottom: 3px; }
        .dashboard-page .meta-val { font-size: 13px; font-weight: 600; color: var(--text-1); }
        .dashboard-page .status-badge {
          margin-left: auto; display: inline-flex; align-items: center; gap: 5px;
          font-size: 11px; font-weight: 600; padding: 4px 9px; border-radius: 6px; flex-shrink: 0;
        }
        .dashboard-page .status-badge.offline { background: var(--red-dim); color: var(--red); }
        .dashboard-page .status-badge.online { background: var(--green-dim); color: var(--green); }
        .dashboard-page .status-badge::before { content: ''; width: 5px; height: 5px; border-radius: 50%; background: currentColor; }

        /* Bottom grid: alerts + media */
        .dashboard-page .bottom-grid { display: grid; grid-template-columns: 1fr 380px; gap: 16px; }

        .dashboard-page .alert-tags { display: flex; gap: 8px; }
        .dashboard-page .tag { font-size: 11px; font-weight: 700; padding: 5px 11px; border-radius: 7px; }
        .dashboard-page .tag.critical-count { background: var(--red-dim); color: var(--red); }
        .dashboard-page .tag.warning-count { background: #ffffff10; color: var(--text-1); }

        .dashboard-page table { width: 100%; border-collapse: collapse; }
        .dashboard-page thead th {
          text-align: left; font-size: 10.5px; letter-spacing: .06em; text-transform: uppercase;
          color: var(--text-2); font-weight: 600; padding: 12px 20px; border-bottom: 1px solid var(--line-soft);
        }
        .dashboard-page tbody td { padding: 14px 20px; border-bottom: 1px solid var(--line-soft); vertical-align: middle; }
        .dashboard-page tbody tr:last-child td { border-bottom: none; }
        .dashboard-page tbody tr { transition: background .15s ease; cursor: pointer; }
        .dashboard-page tbody tr:hover { background: #ffffff05; }

        .dashboard-page .sev-badge { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; padding: 5px 10px; border-radius: 7px; }
        .dashboard-page .sev-badge svg { width: 11px; height: 11px; }
        .dashboard-page .sev-badge.critical { background: var(--red-dim); color: var(--red); }
        .dashboard-page .sev-badge.warning { background: var(--amber-dim); color: var(--amber); }

        .dashboard-page .dev-cell .name { font-weight: 600; font-size: 13px; margin-bottom: 2px; color: var(--text-0); }
        .dashboard-page .dev-cell .id { font-size: 10.5px; color: var(--text-2); font-family: monospace; }
        .dashboard-page .msg-cell { color: var(--text-1); font-size: 13px; }
        .dashboard-page .time-cell { color: var(--text-2); font-size: 12.5px; font-family: monospace; }

        .dashboard-page .open-badge {
          display: inline-flex; align-items: center; gap: 5px; font-size: 11px; font-weight: 700;
          padding: 4px 9px; border-radius: 6px; background: var(--amber-dim); color: var(--amber);
        }
        .dashboard-page .open-badge.resolved {
          background: var(--green-dim); color: var(--green);
        }
        .dashboard-page .open-badge svg { width: 11px; height: 11px; }

        /* media log */
        .dashboard-page .media-tag { background: var(--blue-dim); color: var(--blue); font-size: 11px; font-weight: 700; padding: 5px 11px; border-radius: 7px; }
        .dashboard-page .media-item { display: flex; gap: 12px; padding: 14px 20px; align-items: center; transition: background .15s ease; cursor: pointer; }
        .dashboard-page .media-item:hover { background: #ffffff05; }
        .dashboard-page .media-thumb { width: 56px; height: 56px; border-radius: 8px; object-fit: cover; flex-shrink: 0; border: 1px solid var(--line); }
        .dashboard-page .media-info .title { display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; margin-bottom: 3px; color: var(--text-0); }
        .dashboard-page .media-info .title svg { width: 13px; height: 13px; color: var(--text-2); }
        .dashboard-page .media-info .meta { font-size: 11.5px; color: var(--text-2); }
        .dashboard-page .media-info .meta b { color: var(--green); }

        /* panel tông tím đặc biệt — Media gần đây */
        .dashboard-page .panel.violet {
          background: linear-gradient(165deg, #1a1320 0%, var(--bg-card) 55%);
          border: 1px solid #2a1f33;
        }
        .dashboard-page .panel.violet .panel-head { border-bottom: 1px solid #251b2e; }
        .dashboard-page .panel.violet .media-tag { background: var(--violet-dim); color: var(--violet); }
        .dashboard-page .panel-icon-box {
          width: 36px; height: 36px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .dashboard-page .panel-icon-box svg { width: 18px; height: 18px; }
        .dashboard-page .panel.violet .panel-icon-box { background: var(--violet); box-shadow: 0 0 0 1px #00000040, 0 4px 14px #9d7bf040; }
        .dashboard-page .panel.violet .panel-icon-box svg { color: #16101f; }

        @media (max-width: 1100px) {
          .dashboard-page .stats { grid-template-columns: repeat(2, 1fr); }
          .dashboard-page .main-grid { grid-template-columns: 1fr; }
          .dashboard-page .bottom-grid { grid-template-columns: 1fr; }
        }
      ` }} />

      <AppHeader
        title="Bảng điều khiển"
        breadcrumbs={[
          { label: "Bảng điều khiển" },
        ]}
      />

      <div className="dashboard-page flex-1 flex flex-col gap-6">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 text-sm border-border bg-card hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        </div>

        {/* Row 1: Stats Cards */}
        <div className="stats">
          {statsCards.map((stat) => (
            <StatsCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Row 2: Map + Device Status */}
        <div className="main-grid">
          <div className="min-w-0">
            <MapView devices={finalDevices} geofences={finalGeofences} />
          </div>
          <div className="min-w-0">
            <DeviceList devices={finalDevices} />
          </div>
        </div>

        {/* Row 3: Alerts + Media Logs */}
        <div className="bottom-grid">
          <div>
            <AlertTable alerts={finalAlerts} />
          </div>
          <div>
            <MediaLogs logs={finalMediaLogs} />
          </div>
        </div>
      </div>
    </div>
  );
}
