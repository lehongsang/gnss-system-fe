import { useState, useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Activity,
  Navigation,
  Gauge,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Cpu,
  Search,
  Crosshair,
  Compass,
  Clock,
  ArrowUpDown,
  Satellite,
  TrendingUp,
} from "lucide-react";
import { DeviceStatsCard } from "../my-devices/components/device-stats-card";
import {
  useDevicesControllerFindMine,
  useTelemetryControllerGetHistory,
  useTelemetryControllerGetLatest,
  SortOrder,
} from "@/services/apis/gen/queries";

// ---------- Helpers ----------
function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatCoord(val: number) {
  return val.toFixed(6);
}

function getSpeedColor(speed: number) {
  if (speed >= 80) return "text-red-400";
  if (speed >= 50) return "text-amber-500";
  return "text-emerald-500";
}

function getSpeedBg(speed: number) {
  if (speed >= 80) return "bg-red-500/10 border-red-500/20";
  if (speed >= 50) return "bg-amber-500/10 border-amber-500/20";
  return "bg-emerald-500/10 border-emerald-500/20";
}

function getHeadingLabel(heading: number) {
  if (heading >= 337.5 || heading < 22.5) return "N";
  if (heading >= 22.5 && heading < 67.5) return "NE";
  if (heading >= 67.5 && heading < 112.5) return "E";
  if (heading >= 112.5 && heading < 157.5) return "SE";
  if (heading >= 157.5 && heading < 202.5) return "S";
  if (heading >= 202.5 && heading < 247.5) return "SW";
  if (heading >= 247.5 && heading < 292.5) return "W";
  return "NW";
}

function getAccuracyBadge(status: string) {
  switch (status) {
    case "rtk_fixed":
      return {
        label: "RTK Fixed",
        className: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
      };
    case "rtk_float":
      return {
        label: "RTK Float",
        className: "bg-blue-500/10 text-blue-500 border-blue-500/20",
      };
    case "dgps":
      return {
        label: "DGPS",
        className: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
      };
    case "gnss_only":
      return {
        label: "GNSS Only",
        className: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      };
    default:
      return {
        label: status,
        className: "bg-muted text-muted-foreground",
      };
  }
}

// Skeleton Row
function SkeletonRow() {
  return (
    <TableRow className="border-border/30">
      <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-24" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-12" /></TableCell>
      <TableCell><Skeleton className="h-5 w-16 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-28" /></TableCell>
    </TableRow>
  );
}

export default function TelemetryPage() {
  // Date range state - default to today
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  // Device selector
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [limit, setLimit] = useState(10);

  // Fetch user's devices
  const { data: devicesResponse } = useDevicesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevices: any[] = (devicesResponse as any)?.data ?? [];

  // Auto-select first device if none selected
  const activeDeviceId = selectedDeviceId || rawDevices[0]?.id || "";
  const activeDeviceName =
    rawDevices.find((d) => d.id === activeDeviceId)?.name ?? "—";

  // Build query params
  const historyParams = useMemo(
    () => ({
      from: `${dateFrom}T00:00:00.000Z`,
      to: `${dateTo}T23:59:59.999Z`,
      page: currentPage,
      limit: limit,
      search: searchQuery || undefined,
      sortBy: "timestamp",
      sortOrder: SortOrder.DESC,
    }),
    [dateFrom, dateTo, currentPage, limit, searchQuery]
  );

  // Fetch telemetry history
  const { data: historyResponse, isLoading: isLoadingHistory } =
    useTelemetryControllerGetHistory(activeDeviceId, historyParams, {
      query: { enabled: !!activeDeviceId },
    });

  // Fetch latest telemetry
  const { data: latestResponse } = useTelemetryControllerGetLatest(
    activeDeviceId,
    { query: { enabled: !!activeDeviceId, refetchInterval: 15000 } }
  );

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historyData = historyResponse as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const telemetryRows: any[] = historyData?.data ?? [];
  const totalRows: number = historyData?.total ?? 0;
  const totalPages = historyData?.pageCount ?? 1;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latest = latestResponse as any;

  // Filter telemetry rows by search
  const filtered = telemetryRows;

  // Stats
  const avgSpeed =
    telemetryRows.length > 0
      ? Math.round(
          telemetryRows.reduce(
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (sum: number, r: any) => sum + (r.speed ?? 0),
            0
          ) / telemetryRows.length
        )
      : 0;
  const maxSpeed =
    telemetryRows.length > 0
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ? Math.max(...telemetryRows.map((r: any) => r.speed ?? 0))
      : 0;

  const stats = [
    {
      title: "Tổng điểm dữ liệu",
      value: totalRows,
      subtitle: `Trang ${currentPage}/${totalPages}`,
      icon: Activity,
      iconColor: "text-indigo-500",
      iconBg: "bg-indigo-500/10",
    },
    {
      title: "Tốc độ TB",
      value: `${avgSpeed} km/h`,
      subtitle: `Trang hiện tại (${telemetryRows.length} điểm)`,
      icon: Gauge,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      title: "Tốc độ cao nhất",
      value: `${maxSpeed} km/h`,
      subtitle: "Trong trang hiện tại",
      icon: TrendingUp,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    {
      title: "Vị trí hiện tại",
      value: latest
        ? `${Number(latest.lat).toFixed(4)}, ${Number(latest.lng).toFixed(4)}`
        : "—",
      subtitle: latest ? `${latest.speed ?? 0} km/h · ${latest.accuracyStatus ?? "—"}` : "Chưa có dữ liệu",
      icon: Satellite,
      iconColor: "text-cyan-500",
      iconBg: "bg-cyan-500/10",
    },
  ];

  return (
    <>
      <AppHeader
        title="Telemetry Data Explorer"
        breadcrumbs={[
          { label: "Telemetry" },
          { label: "Data Explorer" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Telemetry Data Explorer
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Khám phá và phân tích dữ liệu telemetry từ các thiết bị GNSS.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <DeviceStatsCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Filters Card */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="px-5 pt-4 pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Crosshair className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  Bộ lọc dữ liệu
                </CardTitle>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-5 pb-4">
            <div className="flex flex-wrap items-end gap-3">
              {/* Device selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                  Thiết bị
                </label>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="h-9 min-w-[200px] justify-start gap-2 text-xs"
                    >
                      <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                      {activeDeviceName}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[240px]">
                    {rawDevices.map(
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      (d: any) => (
                        <DropdownMenuItem
                          key={d.id}
                          className="text-xs gap-2"
                          onClick={() => {
                            setSelectedDeviceId(d.id);
                            setCurrentPage(1);
                          }}
                        >
                          <Cpu className="h-3.5 w-3.5" />
                          <div className="flex flex-col">
                            <span className="font-medium">{d.name}</span>
                            <span className="text-[10px] text-muted-foreground font-mono">
                              {d.macAddress}
                            </span>
                          </div>
                        </DropdownMenuItem>
                      )
                    )}
                    {rawDevices.length === 0 && (
                      <DropdownMenuItem disabled className="text-xs">
                        Không có thiết bị
                      </DropdownMenuItem>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Date From */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                  Từ ngày
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => {
                      setDateFrom(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9 pl-8 w-[160px] text-xs bg-background/50"
                  />
                </div>
              </div>

              {/* Date To */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                  Đến ngày
                </label>
                <div className="relative">
                  <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    type="date"
                    value={dateTo}
                    onChange={(e) => {
                      setDateTo(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="h-9 pl-8 w-[160px] text-xs bg-background/50"
                  />
                </div>
              </div>

              {/* Search */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] uppercase tracking-wider font-medium text-muted-foreground">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    id="telemetry-search"
                    placeholder="ID, tọa độ, trạng thái..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      setCurrentPage(1);
                    }}
                    className="pl-8 h-9 w-[220px] text-xs bg-background/50"
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Data Table */}
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="px-5 pt-4 pb-3 space-y-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Activity className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  Dữ liệu Telemetry
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono px-2 py-0.5 border-muted-foreground/20"
                >
                  {totalRows} bản ghi
                </Badge>
              </div>
              <Badge
                variant="outline"
                className="text-[10px] px-2 py-0.5 border-indigo-500/30 text-indigo-400"
              >
                <Cpu className="h-3 w-3 mr-1" />
                {activeDeviceName}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30 hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium pl-5">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Thời gian
                      </div>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Vĩ độ (Lat)
                      </div>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Kinh độ (Lng)
                      </div>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1">
                        <Gauge className="h-3 w-3" />
                        Tốc độ
                      </div>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1">
                        <Compass className="h-3 w-3" />
                        Hướng
                      </div>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                      <div className="flex items-center gap-1">
                        <Navigation className="h-3 w-3" />
                        Độ chính xác
                      </div>
                    </TableHead>
                    <TableHead className="text-[11px] uppercase tracking-wider font-medium pr-5">
                      <div className="flex items-center gap-1">
                        <ArrowUpDown className="h-3 w-3" />
                        ID
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingHistory ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <SkeletonRow key={`skeleton-${i}`} />
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-16 text-muted-foreground"
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Activity className="h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm font-medium">
                            Không có dữ liệu telemetry
                          </p>
                          <p className="text-xs text-muted-foreground/70">
                            Thử thay đổi khoảng thời gian hoặc chọn thiết bị
                            khác.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    filtered.map((row: any) => {
                      const accuracy = getAccuracyBadge(
                        row.accuracyStatus ?? ""
                      );
                      return (
                        <TableRow
                          key={row.id}
                          className="border-border/30 group transition-colors"
                        >
                          {/* Timestamp */}
                          <TableCell className="pl-5">
                            <span className="text-xs font-mono">
                              {formatDateTime(row.timestamp)}
                            </span>
                          </TableCell>

                          {/* Latitude */}
                          <TableCell>
                            <span className="text-xs font-mono text-muted-foreground">
                              {formatCoord(row.lat)}
                            </span>
                          </TableCell>

                          {/* Longitude */}
                          <TableCell>
                            <span className="text-xs font-mono text-muted-foreground">
                              {formatCoord(row.lng)}
                            </span>
                          </TableCell>

                          {/* Speed */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 font-mono ${getSpeedBg(row.speed)}`}
                            >
                              <span className={getSpeedColor(row.speed)}>
                                {row.speed} km/h
                              </span>
                            </Badge>
                          </TableCell>

                          {/* Heading */}
                          <TableCell>
                            <div className="flex items-center gap-1.5">
                              <div
                                className="flex h-5 w-5 items-center justify-center rounded-full bg-muted/50"
                                style={{
                                  transform: `rotate(${row.heading}deg)`,
                                }}
                              >
                                <Navigation className="h-3 w-3 text-indigo-400" />
                              </div>
                              <span className="text-xs font-mono text-muted-foreground">
                                {row.heading}°{" "}
                                <span className="text-[10px] text-muted-foreground/70">
                                  {getHeadingLabel(row.heading)}
                                </span>
                              </span>
                            </div>
                          </TableCell>

                          {/* Accuracy Status */}
                          <TableCell>
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0.5 ${accuracy.className}`}
                            >
                              {accuracy.label}
                            </Badge>
                          </TableCell>

                          {/* ID */}
                          <TableCell className="pr-5">
                            <code className="text-[10px] font-mono text-muted-foreground/60 bg-muted/30 px-1.5 py-0.5 rounded">
                              {row.id?.slice(0, 12)}...
                            </code>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Footer */}
            {!isLoadingHistory && totalRows > 0 && (
              <div className="flex items-center justify-between border-t border-border/30 px-5 py-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">Hiển thị</span>
                  <select
                    className="h-8 w-16 rounded border border-input bg-background text-foreground px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    value={limit}
                    onChange={(e) => {
                      setLimit(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                  >
                    <option className="bg-background text-foreground" value={10}>10</option>
                    <option className="bg-background text-foreground" value={20}>20</option>
                    <option className="bg-background text-foreground" value={50}>50</option>
                    <option className="bg-background text-foreground" value={100}>100</option>
                  </select>
                  <span className="text-xs text-muted-foreground">
                    / trang ({(currentPage - 1) * limit + 1}–{Math.min(currentPage * limit, totalRows)} trong {totalRows})
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    id="telemetry-pagination-prev"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === 1}
                    onClick={() =>
                      setCurrentPage((p) => Math.max(1, p - 1))
                    }
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    // Show pages around current page
                    let page: number;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <Button
                        key={page}
                        variant={page === currentPage ? "default" : "ghost"}
                        size="icon"
                        className={`h-8 w-8 text-xs ${
                          page === currentPage
                            ? ""
                            : "text-muted-foreground hover:text-foreground"
                        }`}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}
                  <Button
                    id="telemetry-pagination-next"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}
