import { useState, useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Cpu, Pentagon, ShieldAlert, User, Wifi, WifiOff, Wrench,
  CheckCircle2, AlertTriangle, ChevronLeft, ChevronRight, Image as ImageIcon, RefreshCw,
} from "lucide-react";
import { DeviceStatsCard } from "@/pages/my-devices/components/device-stats-card";
import {
  type AdminDevice, type AdminGeofence, type AdminAlert,
  ALERT_TYPE_CONFIG,
} from "@/types";
import {
  useDevicesControllerFindAll,
  useAlertsControllerFindAll,
  useGeofencesControllerFindAll,
} from "@/services/apis/gen/queries";
import { useQueryClient } from "@tanstack/react-query";
import { useAllDeviceStatuses } from "@/hooks/use-device-batch";

const PER_PAGE = 10;

function formatTimeAgo(dateStr: string) {
  const now = new Date();
  const diff = Math.floor((now.getTime() - new Date(dateStr).getTime()) / 60000);
  if (diff < 1) return "Vừa xong";
  if (diff < 60) return `${diff}p`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

function Paginator({ total, page, setPage }: { total: number; page: number; setPage: (p: number) => void }) {
  const pages = Math.ceil(total / PER_PAGE);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-between border-t border-border/30 px-5 py-3">
      <p className="text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, total)}</span> / {total}
      </p>
      <div className="flex gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === 1} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
        {Array.from({ length: Math.min(pages, 5) }, (_, i) => i + 1).map((p) => (
          <Button key={p} variant={p === page ? "default" : "ghost"} size="icon" className={`h-8 w-8 text-xs ${p !== page ? "text-muted-foreground" : ""}`} onClick={() => setPage(p)}>{p}</Button>
        ))}
        {pages > 5 && <span className="text-xs text-muted-foreground self-center px-1">…</span>}
        <Button variant="ghost" size="icon" className="h-8 w-8" disabled={page === pages} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

function TableSkeleton({ cols, rows = 5 }: { cols: number; rows?: number }) {
  return (
    <TableBody>
      {Array.from({ length: rows }).map((_, r) => (
        <TableRow key={r} className="border-border/30">
          {Array.from({ length: cols }).map((_, c) => (
            <TableCell key={c} className={c === 0 ? "pl-5" : c === cols - 1 ? "pr-5" : ""}>
              <Skeleton className="h-4 w-full max-w-[120px]" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </TableBody>
  );
}

export default function AdminResourcesPage() {
  const queryClient = useQueryClient();
  const [ownerFilter, setOwnerFilter] = useState("");
  const [deviceIdFilter, setDeviceIdFilter] = useState("");
  const [devPage, setDevPage] = useState(1);
  const [geoPage, setGeoPage] = useState(1);
  const [altPage, setAltPage] = useState(1);

  // ---- API hooks ----
  const { data: devicesRes, isLoading: loadingDevices } = useDevicesControllerFindAll({ limit: 100 });
  const { data: alertsRes, isLoading: loadingAlerts } = useAlertsControllerFindAll({ limit: 100 });
  const { data: geofencesRes, isLoading: loadingGeofences } = useGeofencesControllerFindAll({ limit: 100 });
  const { data: statusesRes } = useAllDeviceStatuses();

  const allDevices: AdminDevice[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = ((devicesRes as any)?.data ?? []) as any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statuses = ((statusesRes as any)?.data ?? statusesRes ?? []) as any[];
    const statusMap = new Map<string, { status: string; batteryLevel: number; updatedAt: string }>();
    for (const s of statuses) {
      statusMap.set(s.deviceId ?? s.device_id, s);
    }

    return raw.map((d) => {
      const st = statusMap.get(d.id);
      return {
        id: d.id,
        name: d.name ?? "",
        speedLimitKmh: d.speedLimitKmh ?? 0,
        status: (st?.status ?? "offline") as "online" | "offline" | "maintenance",
        battery: st?.batteryLevel ?? 0,
        lat: 0,
        lng: 0,
        cameraStatus: false,
        gnssStatus: false,
        lastSeen: st?.updatedAt ?? d.updatedAt ?? d.createdAt ?? "",
        createdAt: d.createdAt ?? "",
        ownerId: d.ownerId ?? d.owner?.id ?? "",
        ownerEmail: d.owner?.email ?? "—",
      };
    });
  }, [devicesRes, statusesRes]);

  const allGeofences: AdminGeofence[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = ((geofencesRes as any)?.data ?? []) as any[];
    return raw.map((g) => ({
      id: g.id,
      name: g.name ?? "",
      ownerId: g.createdBy ?? "",
      ownerEmail: g.creator?.email ?? "—",
      pointCount: 0, // GeoJSON polygon points — not trivially available from the API
      deviceCount: g.devices?.length ?? 0,
      createdAt: g.createdAt ?? "",
    }));
  }, [geofencesRes]);

  const allAlerts: AdminAlert[] = useMemo(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw = ((alertsRes as any)?.data ?? []) as any[];
    return raw.map((a) => ({
      id: a.id,
      deviceId: a.deviceId ?? "",
      deviceName: a.device?.name ?? "—",
      ownerId: a.device?.ownerId ?? a.device?.owner?.id ?? "",
      ownerEmail: a.device?.owner?.email ?? "—",
      type: a.alertType ?? "",
      message: a.message ?? "",
      isResolved: a.isResolved ?? false,
      hasMedia: !!a.snapshotUrl || !!a.snapshotMediaLogId || !!a.mediaLog,
      timestamp: a.createdAt ?? "",
    }));
  }, [alertsRes]);

  // ---- Client-side filter ----
  const filteredDevices = useMemo(() => allDevices.filter((d) => {
    const mo = !ownerFilter || d.ownerEmail.toLowerCase().includes(ownerFilter.toLowerCase()) || d.ownerId.toLowerCase().includes(ownerFilter.toLowerCase());
    const md = !deviceIdFilter || d.id.toLowerCase().includes(deviceIdFilter.toLowerCase()) || d.name.toLowerCase().includes(deviceIdFilter.toLowerCase());
    return mo && md;
  }), [allDevices, ownerFilter, deviceIdFilter]);

  const filteredGeo = useMemo(() => allGeofences.filter((g) => {
    return !ownerFilter || g.ownerEmail.toLowerCase().includes(ownerFilter.toLowerCase()) || g.ownerId.toLowerCase().includes(ownerFilter.toLowerCase());
  }), [allGeofences, ownerFilter]);

  const filteredAlerts = useMemo(() => allAlerts.filter((a) => {
    const mo = !ownerFilter || a.ownerEmail.toLowerCase().includes(ownerFilter.toLowerCase()) || a.ownerId.toLowerCase().includes(ownerFilter.toLowerCase());
    const md = !deviceIdFilter || a.deviceId.toLowerCase().includes(deviceIdFilter.toLowerCase()) || a.deviceName.toLowerCase().includes(deviceIdFilter.toLowerCase());
    return mo && md;
  }), [allAlerts, ownerFilter, deviceIdFilter]);

  const stats = [
    { title: "Thiết bị", value: allDevices.length, subtitle: `${allDevices.filter((d) => d.status === "online").length} online`, icon: Cpu, statClass: "s1" },
    { title: "Geofences", value: allGeofences.length, subtitle: `${allGeofences.reduce((s, g) => s + g.deviceCount, 0)} thiết bị đã gán`, icon: Pentagon, statClass: "s2" },
    { title: "Cảnh báo", value: allAlerts.length, subtitle: `${allAlerts.filter((a) => !a.isResolved).length} chưa xử lý`, icon: ShieldAlert, statClass: "s3" },
  ];

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/devices"] });
    queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
    queryClient.invalidateQueries({ queryKey: ["/api/geofences"] });
  };

  return (
    <>
      <AppHeader title="Tài nguyên" breadcrumbs={[{ label: "Admin", href: "/" }, { label: "Tài nguyên" }]} />
      <div className="my-devices-page flex flex-1 flex-col gap-5 min-h-full overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Quản trị tài nguyên</h1>
            <p className="text-sm text-cyan mt-1 opacity-85">Thiết bị, Geofences và Cảnh báo — với cột Chủ sở hữu và bộ lọc mạnh mẽ.</p>
          </div>
          <button
            id="refresh-resources-btn"
            onClick={handleRefresh}
            className="btn-primary"
            style={{ padding: "8px 16px", fontSize: "13px" }}
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </button>
        </div>

        {/* Stats cards */}
        <div className="stats">
          {(loadingDevices || loadingAlerts || loadingGeofences) ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="stat s1">
                <div className="stat-top">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-8 w-8 rounded-lg" />
                </div>
                <Skeleton className="h-7 w-16 mb-2" />
                <Skeleton className="h-3 w-28" />
              </div>
            ))
          ) : (
            stats.map((s) => <DeviceStatsCard key={s.title} {...s} />)
          )}
        </div>

        {/* Global Filters */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="px-5 py-3">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-xs font-semibold text-muted-foreground">Bộ lọc:</span>
              <div className="relative">
                <User className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Owner ID / Email" value={ownerFilter}
                  onChange={(e) => { setOwnerFilter(e.target.value); setDevPage(1); setGeoPage(1); setAltPage(1); }}
                  className="pl-8 h-8 w-[200px] text-xs bg-background/50" />
              </div>
              <div className="relative">
                <Cpu className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Device ID / Name" value={deviceIdFilter}
                  onChange={(e) => { setDeviceIdFilter(e.target.value); setDevPage(1); setAltPage(1); }}
                  className="pl-8 h-8 w-[200px] text-xs bg-background/50" />
              </div>
              {(ownerFilter || deviceIdFilter) && (
                <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setOwnerFilter(""); setDeviceIdFilter(""); }}>Xóa bộ lọc</Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Tabbed tables */}
        <Tabs defaultValue="devices" className="space-y-4">
          <TabsList className="bg-card/80 border border-border/50">
            <TabsTrigger value="devices" className="text-xs gap-1.5"><Cpu className="h-3.5 w-3.5" />Thiết bị ({filteredDevices.length})</TabsTrigger>
            <TabsTrigger value="geofences" className="text-xs gap-1.5"><Pentagon className="h-3.5 w-3.5" />Geofences ({filteredGeo.length})</TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs gap-1.5"><ShieldAlert className="h-3.5 w-3.5" />Cảnh báo ({filteredAlerts.length})</TabsTrigger>
          </TabsList>

          {/* DEVICES TAB */}
          <TabsContent value="devices">
            <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium pl-5">ID</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Tên</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Chủ sở hữu</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Status</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Battery</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium pr-5">Last Seen</TableHead>
                    </TableRow>
                  </TableHeader>
                  {loadingDevices ? (
                    <TableSkeleton cols={6} />
                  ) : (
                    <TableBody>
                      {filteredDevices.slice((devPage - 1) * PER_PAGE, devPage * PER_PAGE).map((d) => (
                        <TableRow key={d.id} className="border-border/30 transition-colors">
                          <TableCell className="pl-5"><code className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{d.id.slice(0, 8)}…</code></TableCell>
                          <TableCell><p className="text-sm font-semibold">{d.name}</p></TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-blue-500/20 text-blue-400">
                              <User className="h-2.5 w-2.5" />{d.ownerEmail}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${
                              d.status === "online" ? "text-emerald-500 border-emerald-500/20 bg-emerald-500/10" :
                              d.status === "offline" ? "text-red-400 border-red-500/20 bg-red-500/10" :
                              "text-amber-500 border-amber-500/20 bg-amber-500/10"
                            }`}>
                              {d.status === "online" ? <Wifi className="h-3 w-3 mr-1" /> : d.status === "offline" ? <WifiOff className="h-3 w-3 mr-1" /> : <Wrench className="h-3 w-3 mr-1" />}
                              {d.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-mono font-semibold ${d.battery > 20 ? "text-emerald-500" : "text-red-400"}`}>{d.battery}%</span>
                          </TableCell>
                          <TableCell className="pr-5"><span className="text-[10px] font-mono text-muted-foreground">{formatTimeAgo(d.lastSeen)}</span></TableCell>
                        </TableRow>
                      ))}
                      {filteredDevices.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">Không có thiết bị nào.</TableCell></TableRow>
                      )}
                    </TableBody>
                  )}
                </Table>
                <Paginator total={filteredDevices.length} page={devPage} setPage={setDevPage} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* GEOFENCES TAB */}
          <TabsContent value="geofences">
            <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium pl-5">ID</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Tên vùng</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Chủ sở hữu</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Devices</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium pr-5">Ngày tạo</TableHead>
                    </TableRow>
                  </TableHeader>
                  {loadingGeofences ? (
                    <TableSkeleton cols={5} />
                  ) : (
                    <TableBody>
                      {filteredGeo.slice((geoPage - 1) * PER_PAGE, geoPage * PER_PAGE).map((g) => (
                        <TableRow key={g.id} className="border-border/30 transition-colors">
                          <TableCell className="pl-5"><code className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{g.id.slice(0, 8)}…</code></TableCell>
                          <TableCell><p className="text-sm font-semibold">{g.name}</p></TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-blue-500/20 text-blue-400">
                              <User className="h-2.5 w-2.5" />{g.ownerEmail}
                            </Badge>
                          </TableCell>
                          <TableCell><span className="text-xs font-mono flex items-center gap-1"><Cpu className="h-3 w-3 text-muted-foreground" />{g.deviceCount}</span></TableCell>
                          <TableCell className="pr-5"><span className="text-[10px] font-mono text-muted-foreground">{new Date(g.createdAt).toLocaleDateString("vi-VN")}</span></TableCell>
                        </TableRow>
                      ))}
                      {filteredGeo.length === 0 && (
                        <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-10">Không có geofence nào.</TableCell></TableRow>
                      )}
                    </TableBody>
                  )}
                </Table>
                <Paginator total={filteredGeo.length} page={geoPage} setPage={setGeoPage} />
              </CardContent>
            </Card>
          </TabsContent>

          {/* ALERTS TAB */}
          <TabsContent value="alerts">
            <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/30 hover:bg-transparent">
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium pl-5">Loại</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Thiết bị</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Chủ sở hữu</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Nội dung</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Status</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium">Media</TableHead>
                      <TableHead className="text-[11px] uppercase tracking-wider font-medium pr-5">Thời gian</TableHead>
                    </TableRow>
                  </TableHeader>
                  {loadingAlerts ? (
                    <TableSkeleton cols={7} />
                  ) : (
                    <TableBody>
                      {filteredAlerts.slice((altPage - 1) * PER_PAGE, altPage * PER_PAGE).map((a) => {
                        const cfg = ALERT_TYPE_CONFIG[a.type];
                        return (
                          <TableRow key={a.id} className="border-border/30 transition-colors">
                            <TableCell className="pl-5">
                              <Badge variant="outline" className={`text-[10px] px-2 py-0.5 whitespace-nowrap ${cfg?.badgeClass ?? ""}`}>
                                <span className="mr-1">{cfg?.icon}</span>{cfg?.label ?? a.type}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <p className="text-xs font-semibold">{a.deviceName}</p>
                              <p className="text-[10px] font-mono text-muted-foreground">{a.deviceId.slice(0, 8)}…</p>
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 gap-1 border-blue-500/20 text-blue-400">
                                <User className="h-2.5 w-2.5" />{a.ownerEmail}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-[200px]"><p className="text-xs text-muted-foreground truncate">{a.message}</p></TableCell>
                            <TableCell>
                              {a.isResolved ? (
                                <div className="flex items-center gap-1 text-emerald-500"><CheckCircle2 className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">Đã xử lý</span></div>
                              ) : (
                                <div className="flex items-center gap-1 text-amber-500"><AlertTriangle className="h-3.5 w-3.5" /><span className="text-[10px] font-medium">Mở</span></div>
                              )}
                            </TableCell>
                            <TableCell>
                              {a.hasMedia ? <ImageIcon className="h-4 w-4 text-blue-400" /> : <span className="text-[10px] text-muted-foreground/40">—</span>}
                            </TableCell>
                            <TableCell className="pr-5"><span className="text-[10px] font-mono text-muted-foreground">{formatTimeAgo(a.timestamp)}</span></TableCell>
                          </TableRow>
                        );
                      })}
                      {filteredAlerts.length === 0 && (
                        <TableRow><TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">Không có cảnh báo nào.</TableCell></TableRow>
                      )}
                    </TableBody>
                  )}
                </Table>
                <Paginator total={filteredAlerts.length} page={altPage} setPage={setAltPage} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}
