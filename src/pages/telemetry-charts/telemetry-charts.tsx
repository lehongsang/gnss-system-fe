import { useState, useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  BarChart3,
  Calendar,
  Cpu,
  Loader2,
  Gauge,
  Navigation,
  Activity,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import {
  useDevicesControllerFindMine,
  useTelemetryControllerGetHistory,
  SortOrder,
} from "@/services/apis/gen/queries";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Legend,
  ReferenceLine,
} from "recharts";

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(ts: string) {
  return new Date(ts).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatShortDate(ts: string) {
  return new Date(ts).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
  });
}

// ── Custom Tooltip ───────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-zinc-900/95 backdrop-blur-md border border-zinc-700/50 rounded-lg px-3 py-2 shadow-xl">
      <p className="text-[10px] text-zinc-400 font-mono mb-1">{label}</p>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {payload.map((entry: any, i: number) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-zinc-300">{entry.name}:</span>
          <span className="font-mono font-semibold text-white">
            {typeof entry.value === "number"
              ? entry.value.toFixed(2)
              : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Stat Summary Card ────────────────────────────────────────────────────────

function StatMini({
  label,
  value,
  unit,
  trend,
  color,
}: {
  label: string;
  value: string | number;
  unit: string;
  trend?: "up" | "down" | "flat";
  color: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-muted/30 border border-border/30">
      <div
        className="w-1 h-8 rounded-full"
        style={{ backgroundColor: color }}
      />
      <div className="flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm font-bold font-mono">
          {value}{" "}
          <span className="text-xs text-muted-foreground font-normal">
            {unit}
          </span>
        </p>
      </div>
      {trend && (
        <div>
          {trend === "up" && (
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          )}
          {trend === "down" && (
            <TrendingDown className="w-4 h-4 text-red-400" />
          )}
          {trend === "flat" && <Minus className="w-4 h-4 text-zinc-500" />}
        </div>
      )}
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function TelemetryCharts() {
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");

  // Fetch user's devices
  const { data: devicesResponse } = useDevicesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevices: any[] = (devicesResponse as any)?.data ?? [];

  const activeDeviceId = selectedDeviceId || rawDevices[0]?.id || "";
  const activeDeviceName =
    rawDevices.find((d: { id: string }) => d.id === activeDeviceId)?.name ??
    "—";

  // Fetch telemetry history (limit 500 for charting)
  const historyParams = useMemo(
    () => ({
      from: `${dateFrom}T00:00:00.000Z`,
      to: `${dateTo}T23:59:59.999Z`,
      limit: 500,
      sortBy: "timestamp",
      sortOrder: SortOrder.ASC,
    }),
    [dateFrom, dateTo]
  );

  const { data: historyResponse, isLoading } =
    useTelemetryControllerGetHistory(activeDeviceId, historyParams, {
      query: { enabled: !!activeDeviceId },
    });

  const rawData = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((historyResponse as any)?.data ?? []) as any[],
    [historyResponse]
  );

  // Transform for chart
  const chartData = useMemo(
    () =>
      rawData.map((r) => ({
        time: formatTime(r.timestamp),
        date: formatShortDate(r.timestamp),
        speed: Number(r.speed) || 0,
        heading: Number(r.heading) || 0,
        lat: Number(r.lat) || 0,
        lng: Number(r.lng) || 0,
        altitude: Number(r.altitude) || 0,
      })),
    [rawData]
  );

  // Compute stats
  const stats = useMemo(() => {
    if (chartData.length === 0) return null;
    const speeds = chartData.map((d) => d.speed);
    const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
    const maxSpeed = Math.max(...speeds);
    const minSpeed = Math.min(...speeds);

    // Trend: compare last 10% vs first 10%
    const slice = Math.max(1, Math.floor(speeds.length * 0.1));
    const earlyAvg =
      speeds.slice(0, slice).reduce((a, b) => a + b, 0) / slice;
    const lateAvg =
      speeds.slice(-slice).reduce((a, b) => a + b, 0) / slice;
    const trend: "up" | "down" | "flat" =
      lateAvg > earlyAvg * 1.1
        ? "up"
        : lateAvg < earlyAvg * 0.9
          ? "down"
          : "flat";

    return { avgSpeed, maxSpeed, minSpeed, trend, total: chartData.length };
  }, [chartData]);

  const speedDistributionData = useMemo(() => {
    const buckets = [
      { range: "0-10", min: 0, max: 10, count: 0, fill: "#10b981" },
      { range: "10-20", min: 10, max: 20, count: 0, fill: "#10b981" },
      { range: "20-30", min: 20, max: 30, count: 0, fill: "#06b6d4" },
      { range: "30-40", min: 30, max: 40, count: 0, fill: "#06b6d4" },
      { range: "40-50", min: 40, max: 50, count: 0, fill: "#6366f1" },
      { range: "50-60", min: 50, max: 60, count: 0, fill: "#f59e0b" },
      { range: "60-80", min: 60, max: 80, count: 0, fill: "#f59e0b" },
      { range: "80+", min: 80, max: Infinity, count: 0, fill: "#ef4444" },
    ];
    for (const d of chartData) {
      const bucket = buckets.find(
        (b) => d.speed >= b.min && d.speed < b.max
      );
      if (bucket) bucket.count++;
    }
    return buckets;
  }, [chartData]);

  return (
    <>
      <AppHeader
        title="Telemetry Charts"
        breadcrumbs={[{ label: "Telemetry" }, { label: "Charts" }]}
      />
      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/10 text-indigo-500">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Telemetry Charts
              </h1>
              <p className="text-sm text-muted-foreground">
                Trực quan hóa dữ liệu GNSS telemetry theo thời gian
              </p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
          <CardContent className="px-5 py-4">
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
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {rawDevices.map((d: any) => (
                      <DropdownMenuItem
                        key={d.id}
                        className="text-xs gap-2"
                        onClick={() => setSelectedDeviceId(d.id)}
                      >
                        <Cpu className="h-3.5 w-3.5" />
                        <span className="font-medium">{d.name}</span>
                      </DropdownMenuItem>
                    ))}
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
                    onChange={(e) => setDateFrom(e.target.value)}
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
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-9 pl-8 w-[160px] text-xs bg-background/50"
                  />
                </div>
              </div>

              {/* Data points count */}
              <div className="ml-auto">
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono px-2.5 py-1 border-indigo-500/30 text-indigo-400"
                >
                  <Activity className="w-3 h-3 mr-1" />
                  {chartData.length} điểm dữ liệu
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Loading / Empty */}
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
            <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
            <p className="text-sm font-medium">Không có dữ liệu telemetry</p>
            <p className="text-xs mt-1">
              Thử thay đổi khoảng thời gian hoặc chọn thiết bị khác.
            </p>
          </div>
        ) : (
          <>
            {/* Stats Summary */}
            {stats && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <StatMini
                  label="Tốc độ TB"
                  value={stats.avgSpeed.toFixed(1)}
                  unit="km/h"
                  trend={stats.trend}
                  color="#6366f1"
                />
                <StatMini
                  label="Tốc độ cao nhất"
                  value={stats.maxSpeed.toFixed(1)}
                  unit="km/h"
                  color="#f59e0b"
                />
                <StatMini
                  label="Tốc độ thấp nhất"
                  value={stats.minSpeed.toFixed(1)}
                  unit="km/h"
                  color="#10b981"
                />
                <StatMini
                  label="Tổng điểm"
                  value={stats.total}
                  unit="bản ghi"
                  trend="flat"
                  color="#06b6d4"
                />
              </div>
            )}

            {/* Speed Line Chart */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                      <Gauge className="h-3.5 w-3.5" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      Tốc độ theo thời gian
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 border-muted-foreground/20"
                  >
                    km/h
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient
                          id="speedGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#6366f1"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#6366f1"
                            stopOpacity={0}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272a"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      {stats && (
                        <ReferenceLine
                          y={stats.avgSpeed}
                          stroke="#6366f1"
                          strokeDasharray="5 5"
                          strokeOpacity={0.5}
                          label={{
                            value: `TB: ${stats.avgSpeed.toFixed(1)}`,
                            position: "insideTopRight",
                            fill: "#6366f1",
                            fontSize: 10,
                          }}
                        />
                      )}
                      <Area
                        type="monotone"
                        dataKey="speed"
                        stroke="#6366f1"
                        strokeWidth={2}
                        fill="url(#speedGradient)"
                        name="Tốc độ (km/h)"
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: "#6366f1",
                          stroke: "#fff",
                          strokeWidth: 2,
                        }}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Heading Chart */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
                      <Navigation className="h-3.5 w-3.5" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      Hướng di chuyển
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 border-muted-foreground/20"
                  >
                    Độ (°)
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272a"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        domain={[0, 360]}
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                        width={40}
                        ticks={[0, 90, 180, 270, 360]}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="heading"
                        stroke="#06b6d4"
                        strokeWidth={1.5}
                        name="Hướng (°)"
                        dot={false}
                        activeDot={{
                          r: 4,
                          fill: "#06b6d4",
                          stroke: "#fff",
                          strokeWidth: 2,
                        }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Speed Distribution Bar Chart */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                      <BarChart3 className="h-3.5 w-3.5" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      Phân bố tốc độ
                    </CardTitle>
                  </div>
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 border-muted-foreground/20"
                  >
                    Số lần xuất hiện
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={speedDistributionData}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272a"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="range"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        label={{
                          value: "km/h",
                          position: "insideBottomRight",
                          offset: -5,
                          fill: "#71717a",
                          fontSize: 10,
                        }}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                        width={35}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar
                        dataKey="count"
                        name="Số lần"
                        radius={[4, 4, 0, 0]}
                      >
                        {/* Colors are set per-item via the fill property in data */}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Coordinates Chart */}
            <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
              <CardHeader className="px-5 pt-4 pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
                      <TrendingUp className="h-3.5 w-3.5" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      Biến thiên tọa độ
                    </CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-2 pb-4">
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="#27272a"
                        vertical={false}
                      />
                      <XAxis
                        dataKey="time"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        axisLine={{ stroke: "#27272a" }}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        yAxisId="lat"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                        domain={["auto", "auto"]}
                        tickFormatter={(v) => v.toFixed(4)}
                      />
                      <YAxis
                        yAxisId="lng"
                        orientation="right"
                        tick={{ fontSize: 10, fill: "#71717a" }}
                        axisLine={false}
                        tickLine={false}
                        width={60}
                        domain={["auto", "auto"]}
                        tickFormatter={(v) => v.toFixed(4)}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 11 }}
                        iconSize={8}
                      />
                      <Line
                        yAxisId="lat"
                        type="monotone"
                        dataKey="lat"
                        stroke="#10b981"
                        strokeWidth={1.5}
                        name="Vĩ độ (Lat)"
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                      <Line
                        yAxisId="lng"
                        type="monotone"
                        dataKey="lng"
                        stroke="#f59e0b"
                        strokeWidth={1.5}
                        name="Kinh độ (Lng)"
                        dot={false}
                        activeDot={{ r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </>
  );
}
