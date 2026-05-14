import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { DeviceStatsCard } from "@/pages/my-devices/components/device-stats-card";
import {
  Users, Cpu, Pentagon, ShieldAlert, Activity, Image as ImageIcon, RefreshCw,
} from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell, Legend
} from "recharts";
import { Button } from "@/components/ui/button";
import { useQueryClient } from "@tanstack/react-query";
import {
  useStatisticsOverview,
  useStatisticsTelemetry,
  useStatisticsAlertTypes,
  useStatisticsMedia,
  statisticsKeys,
} from "@/hooks/use-statistics";

/** Color palette for alert-type pie chart slices */
const ALERT_COLORS: Record<string, string> = {
  speeding: "#f59e0b",
  geofence_exit: "#ef4444",
  geofence_enter: "#3b82f6",
  signal_loss: "#64748b",
  signal_lost: "#64748b",
  dangerous_obstacle: "#f43f5e",
  trajectory_deviation: "#8b5cf6",
  low_battery: "#f97316",
};
const FALLBACK_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16"];

function ChartSkeleton() {
  return (
    <div className="flex flex-col gap-3 h-full justify-center items-center opacity-60">
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-[220px] w-full rounded-lg" />
    </div>
  );
}

export default function AdminStatisticsPage() {
  const queryClient = useQueryClient();

  // ---- API hooks ----
  const { data: overview, isLoading: loadingOverview } = useStatisticsOverview();
  const { data: telemetryStats, isLoading: loadingTelemetry } = useStatisticsTelemetry();
  const { data: alertTypeStats, isLoading: loadingAlerts } = useStatisticsAlertTypes();
  const { data: mediaStats, isLoading: loadingMedia } = useStatisticsMedia();

  // ---- Derived data ----
  const systemOverview = overview ?? {
    totalUsers: 0,
    activeUsers: 0,
    totalDevices: 0,
    onlineDevices: 0,
    totalGeofences: 0,
    totalAlerts: 0,
  };

  const pieData = (alertTypeStats ?? []).map((item, idx) => ({
    ...item,
    color: ALERT_COLORS[item.name] ?? FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
  }));

  const stats = [
    { title: "Tổng người dùng", value: systemOverview.totalUsers, subtitle: `${systemOverview.activeUsers} active`, icon: Users, iconColor: "text-blue-500", iconBg: "bg-blue-500/10" },
    { title: "Tổng thiết bị", value: systemOverview.totalDevices, subtitle: `${systemOverview.onlineDevices} online`, icon: Cpu, iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10" },
    { title: "Tổng Geofences", value: systemOverview.totalGeofences, subtitle: "Đang hoạt động", icon: Pentagon, iconColor: "text-violet-500", iconBg: "bg-violet-500/10" },
    { title: "Tổng Cảnh báo", value: systemOverview.totalAlerts, subtitle: "Toàn thời gian", icon: ShieldAlert, iconColor: "text-red-400", iconBg: "bg-red-500/10" },
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: statisticsKeys.all });
  };

  return (
    <>
      <AppHeader title="System Statistics" breadcrumbs={[{ label: "Admin", href: "/" }, { label: "System Statistics" }]} />
      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Thống kê hệ thống</h1>
            <p className="text-sm text-muted-foreground mt-1">Biểu đồ giám sát lưu lượng và trạng thái tổng quan (Admin Role).</p>
          </div>
          <Button
            id="refresh-statistics-btn"
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="gap-2 text-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        </div>

        {/* Overview stat cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {loadingOverview
            ? Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm">
                  <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-7 w-16" />
                    <Skeleton className="h-3 w-28" />
                  </CardContent>
                </Card>
              ))
            : stats.map((s) => <DeviceStatsCard key={s.title} {...s} />)}
        </div>

        <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
          {/* Telemetry Chart */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm flex flex-col">
            <CardHeader className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Activity className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Lưu lượng Telemetry (7 ngày)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 flex-1 min-h-[300px]">
              {loadingTelemetry ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={telemetryStats ?? []} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(v) => `${v / 1000}k`} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      itemStyle={{ color: "#e2e8f0" }}
                    />
                    <Area type="monotone" dataKey="points" name="Data Points" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorPoints)" />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Alert Distribution Pie Chart */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm flex flex-col">
            <CardHeader className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                  <ShieldAlert className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Tỷ lệ Cảnh báo</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 flex-1 min-h-[300px] flex items-center justify-center">
              {loadingAlerts ? (
                <ChartSkeleton />
              ) : pieData.length === 0 ? (
                <p className="text-sm text-muted-foreground">Chưa có dữ liệu cảnh báo.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%" cy="50%"
                      innerRadius={60} outerRadius={90}
                      paddingAngle={5}
                      dataKey="count"
                      stroke="none"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", fontSize: "12px" }}
                      itemStyle={{ color: "#e2e8f0" }}
                    />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", paddingTop: "20px" }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Media Logs Bar Chart */}
          <Card className="border-border/50 bg-card/80 backdrop-blur-sm flex flex-col lg:col-span-2">
            <CardHeader className="px-5 pt-4 pb-2">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-pink-500/10 text-pink-500">
                  <ImageIcon className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">Media Logs phát sinh (7 ngày)</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="px-5 pb-5 h-[300px]">
              {loadingMedia ? (
                <ChartSkeleton />
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mediaStats ?? []} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                    <RechartsTooltip
                      contentStyle={{ backgroundColor: "#1e293b", borderColor: "#334155", borderRadius: "8px", fontSize: "12px", color: "#e2e8f0" }}
                      cursor={{ fill: "#334155", opacity: 0.4 }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }} />
                    <Bar dataKey="images" name="Ảnh Snapshots" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="videos" name="Video Clips" fill="#ec4899" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
