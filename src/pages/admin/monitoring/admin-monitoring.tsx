import { useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Cpu, Wifi, WifiOff, Wrench } from "lucide-react";
import { DeviceStatsCard } from "@/pages/my-devices/components/device-stats-card";
import { GlobalMap } from "./components/global-map";
import { type GlobalDevice } from "@/types";
import { useDevicesControllerFindAll } from "@/services/apis/gen/queries";
import { useAllDeviceStatuses, useAllLatestTelemetry } from "@/hooks/use-device-batch";

export default function AdminMonitoringPage() {
  const { data: devicesRes, isLoading: loadingDevices } = useDevicesControllerFindAll({ limit: 100 });
  const { data: statusesRes, isLoading: loadingStatuses } = useAllDeviceStatuses();
  const { data: telemetryRes, isLoading: loadingTelemetry } = useAllLatestTelemetry();

  const isLoading = loadingDevices || loadingStatuses || loadingTelemetry;

  const devices: GlobalDevice[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawDevices = ((devicesRes as any)?.data ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statuses = ((statusesRes as any)?.data ?? statusesRes ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const telemetry = ((telemetryRes as any)?.data ?? telemetryRes ?? []) as any[];

    // Build lookup maps by deviceId
    const statusMap = new Map<string, { status: string; batteryLevel: number; updatedAt: string }>();
    for (const s of statuses) {
      statusMap.set(s.deviceId ?? s.device_id, s);
    }

    const telemetryMap = new Map<string, { lat: number; lng: number; speed: number }>();
    for (const t of telemetry) {
      telemetryMap.set(t.deviceId ?? t.device_id, t);
    }

    return rawDevices.map((d) => {
      const st = statusMap.get(d.id);
      const tm = telemetryMap.get(d.id);
      return {
        id: d.id,
        name: d.name ?? "",
        ownerEmail: d.owner?.email ?? "—",
        ownerId: d.ownerId ?? d.owner?.id ?? "",
        status: (st?.status ?? "offline") as "online" | "offline" | "maintenance",
        lat: tm?.lat ?? 0,
        lng: tm?.lng ?? 0,
        battery: st?.batteryLevel ?? 0,
        speed: tm?.speed ?? 0,
        lastSeen: st?.updatedAt ?? d.updatedAt ?? d.createdAt ?? "",
      };
    });
  }, [devicesRes, statusesRes, telemetryRes]);

  const online = devices.filter((d) => d.status === "online").length;
  const offline = devices.filter((d) => d.status === "offline").length;
  const maintenance = devices.filter((d) => d.status === "maintenance").length;
  const owners = new Set(devices.map((d) => d.ownerId)).size;

  const stats = [
    { title: "Tổng thiết bị", value: devices.length, subtitle: `Của ${owners} chủ sở hữu`, icon: Cpu, iconColor: "text-blue-500", iconBg: "bg-blue-500/10" },
    { title: "Online", value: online, subtitle: `${devices.length > 0 ? Math.round((online / devices.length) * 100) : 0}% đang hoạt động`, icon: Wifi, iconColor: "text-emerald-500", iconBg: "bg-emerald-500/10" },
    { title: "Offline", value: offline, subtitle: "Cần kiểm tra", icon: WifiOff, iconColor: "text-red-400", iconBg: "bg-red-500/10" },
    { title: "Bảo trì", value: maintenance, subtitle: "Đang bảo dưỡng", icon: Wrench, iconColor: "text-amber-500", iconBg: "bg-amber-500/10" },
  ];

  return (
    <>
      <AppHeader title="Global Monitoring" breadcrumbs={[{ label: "Admin", href: "/" }, { label: "Global Monitoring" }]} />
      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Giám sát tổng thể</h1>
          <p className="text-sm text-muted-foreground mt-1">Xem tất cả thiết bị của mọi người dùng trên bản đồ và tìm kiếm lân cận.</p>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Card key={i} className="border-border/50 bg-card/80 backdrop-blur-sm">
                <CardContent className="p-5 space-y-3">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-3 w-28" />
                </CardContent>
              </Card>
            ))
          ) : (
            stats.map((s) => <DeviceStatsCard key={s.title} {...s} />)
          )}
        </div>
        <GlobalMap devices={devices} />
      </div>
    </>
  );
}
