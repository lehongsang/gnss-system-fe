import { useState, useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
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
  Satellite,
  TrendingUp,
} from "lucide-react";
import {
  useDevicesControllerFindMine,
  useTelemetryControllerGetHistory,
  useTelemetryControllerGetLatest,
  SortOrder,
} from "@/services/apis/gen/queries";
import type { UserDevice } from "@/types";

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

interface TelemetryHistoryRow {
  id: string;
  timestamp: string;
  lat: number;
  lng: number;
  speed: number;
  heading?: number;
  accuracyStatus?: string;
  battery?: number;
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
  const rawDevices = (devicesResponse as unknown as { data?: UserDevice[] })?.data ?? [];

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

  const historyData = historyResponse as unknown as { data?: TelemetryHistoryRow[]; total?: number; pageCount?: number } | undefined;
  const telemetryRows = historyData?.data ?? [];
  const totalRows = historyData?.total ?? 0;
  const totalPages = historyData?.pageCount ?? 1;

  const latest = latestResponse as unknown as TelemetryHistoryRow | undefined;

  // Filter telemetry rows by search
  const filtered = telemetryRows;

  // Stats
  const avgSpeed =
    telemetryRows.length > 0
      ? Math.round(
          telemetryRows.reduce(
            (sum: number, r) => sum + (r.speed ?? 0),
            0
          ) / telemetryRows.length
        )
      : 0;
  const maxSpeed =
    telemetryRows.length > 0
      ? Math.max(...telemetryRows.map((r) => r.speed ?? 0))
      : 0;

  return (
    <>
      <AppHeader
        title="Khám phá dữ liệu viễn trắc"
        breadcrumbs={[
          { label: "Theo dõi trực tiếp" },
          { label: "Khám phá dữ liệu viễn trắc" },
        ]}
      />

      <div className="my-devices-page flex flex-1 flex-col gap-5 min-h-full overflow-auto">
        <div className="header">
          <h1>Khám phá dữ liệu viễn trắc</h1>
          <p>Khám phá và phân tích dữ liệu telemetry từ các thiết bị GNSS.</p>
        </div>

        <div className="stats">
          <div className="stat s1">
            <div className="stat-top">
              <span className="stat-label">Tổng điểm dữ liệu</span>
              <div className="stat-icon">
                <Activity className="h-4 w-4" />
              </div>
            </div>
            <div className="stat-val">{totalRows}</div>
            <div className="stat-sub">Trang {currentPage}/{totalPages}</div>
          </div>
          <div className="stat s2">
            <div className="stat-top">
              <span className="stat-label">Tốc độ TB</span>
              <div className="stat-icon">
                <Clock className="h-4 w-4" />
              </div>
            </div>
            <div className="stat-val">{avgSpeed} km/h</div>
            <div className="stat-sub">Trang hiện tại ({telemetryRows.length} điểm)</div>
          </div>
          <div className="stat s3">
            <div className="stat-top">
              <span className="stat-label">Tốc độ cao nhất</span>
              <div className="stat-icon">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
            <div className="stat-val">{maxSpeed.toFixed(1)} km/h</div>
            <div className="stat-sub">Trong trang hiện tại</div>
          </div>
          <div className="stat s4">
            <div className="stat-top">
              <span className="stat-label">Vị trí hiện tại</span>
              <div className="stat-icon">
                <Satellite className="h-4 w-4" />
              </div>
            </div>
            <div className="stat-val" style={{ fontSize: "18px" }}>
              {latest ? `${Number(latest.lat).toFixed(4)}, ${Number(latest.lng).toFixed(4)}` : "—"}
            </div>
            <div className="stat-sub">
              {latest ? `${(latest.speed ?? 0).toFixed(1)} km/h · ${latest.accuracyStatus ?? "—"}` : "Chưa có dữ liệu"}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="left">
              <div className="panel-icon">
                <Crosshair className="h-4 w-4" />
              </div>
              <h2>Bộ lọc dữ liệu</h2>
            </div>
          </div>
          <div className="filter-grid">
            <div className="filter-field">
              <div className="flabel">Thiết bị</div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <div className="device-select">
                    <Cpu className="h-4 w-4" />
                    {activeDeviceName}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-[240px]">
                  {rawDevices.map((d) => (
                    <DropdownMenuItem
                      key={d.id}
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedDeviceId(d.id);
                        setCurrentPage(1);
                      }}
                    >
                      {d.name}
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
            <div className="filter-field">
              <div className="flabel">Từ ngày</div>
              <div className="date-input">
                <Calendar className="h-4 w-4" />
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => {
                    setDateFrom(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <div className="filter-field">
              <div className="flabel">Đến ngày</div>
              <div className="date-input">
                <Calendar className="h-4 w-4" />
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => {
                    setDateTo(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
            <div className="filter-field">
              <div className="flabel">Tìm kiếm</div>
              <div className="search-box">
                <Search className="h-4 w-4" />
                <input
                  placeholder="Tọa độ, trạng thái..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setCurrentPage(1);
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-head">
            <div className="left">
              <div className="panel-icon">
                <Activity className="h-4 w-4" />
              </div>
              <h2>
                Dữ liệu Telemetry
                <span className="count-pill">{totalRows} bản ghi</span>
              </h2>
            </div>
            <div className="panel-actions">
              <span className="device-tag">
                <Cpu className="h-3 w-3" />
                {activeDeviceName}
              </span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table>
              <thead>
                <tr>
                  <th>
                    <span className="th-ic">
                      <Clock className="h-3 w-3" />
                      Thời gian
                    </span>
                  </th>
                  <th>
                    <span className="th-ic">
                      <MapPin className="h-3 w-3" />
                      Vĩ độ (Lat)
                    </span>
                  </th>
                  <th>
                    <span className="th-ic">
                      <MapPin className="h-3 w-3" />
                      Kinh độ (Lng)
                    </span>
                  </th>
                  <th>
                    <span className="th-ic">
                      <Gauge className="h-3 w-3" />
                      Tốc độ
                    </span>
                  </th>
                  <th>
                    <span className="th-ic">
                      <Compass className="h-3 w-3" />
                      Hướng
                    </span>
                  </th>
                  <th>
                    <span className="th-ic">
                      <Navigation className="h-3 w-3" />
                      Độ chính xác
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoadingHistory ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={6} className="text-center py-6">
                        <span className="text-sm text-muted-foreground animate-pulse">Đang tải...</span>
                      </td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-16 text-muted-foreground">
                      Không có dữ liệu telemetry cho thiết bị này.
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const status = row.accuracyStatus ?? "gnss_only";
                    const isLow = row.speed < 50;
                    const isMid = row.speed >= 50 && row.speed < 80;
                    const speedClass = isLow ? "low" : isMid ? "mid" : "high";
                    const heading = row.heading ?? 0;
                    const headingLabel = getHeadingLabel(heading);
                    return (
                      <tr key={row.id}>
                        <td className="time-cell">{formatDateTime(row.timestamp)}</td>
                        <td className="coord-cell">{formatCoord(row.lat)}</td>
                        <td className="coord-cell">{formatCoord(row.lng)}</td>
                        <td>
                          <span className={`speed-pill ${speedClass}`}>
                            {row.speed.toFixed(1)} km/h
                          </span>
                        </td>
                        <td>
                          <div className="heading-cell">
                            <Navigation className="h-3.5 w-3.5" style={{ transform: `rotate(${heading}deg)`, color: "#33d2c9" }} />
                            <b>{heading}°</b> {headingLabel}
                          </div>
                        </td>
                        <td>
                          <span className="accuracy-tag">
                            {status === "rtk_fixed" ? "RTK Fixed" : status === "rtk_float" ? "RTK Float" : status === "dgps" ? "DGPS" : "GNSS Only"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {!isLoadingHistory && totalRows > 0 && (
            <div className="flex items-center justify-between border-t border-border/30 px-5 py-3 bg-card/20">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Hiển thị</span>
                <select
                  className="h-8 w-16 rounded border border-input bg-background text-foreground px-2 py-1 text-xs shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring cursor-pointer"
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
                  className="h-8 w-8 cursor-pointer"
                  disabled={currentPage === 1}
                  onClick={() =>
                    setCurrentPage((p) => Math.max(1, p - 1))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
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
                      className={`h-8 w-8 text-xs cursor-pointer ${
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
                  className="h-8 w-8 cursor-pointer"
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
        </div>
      </div>
    </>
  );
}
