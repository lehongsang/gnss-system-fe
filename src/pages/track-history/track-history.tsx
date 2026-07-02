import { useState, useMemo, useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { Clock, Navigation, MapPinned, Cpu, Play, Pause, CalendarDays, MapPin } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { TelemetryMap } from "../device-detail/components/telemetry-map";
import {
  useDevicesControllerFindMine,
  useTelemetryControllerGetHistory,
  useGeofencesControllerFindMine,
  SortOrder,
} from "@/services/apis/gen/queries";
import type { TelemetryPoint, GeofenceZone } from "@/types";

function getHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function TrackHistory() {
  // Device Selection
  const { data: devicesResponse } = useDevicesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevices = (devicesResponse as any)?.data ?? [];
  
  const [manualSelectedId, setManualSelectedId] = useState<string>("");
  
  // Derive selected device: use manually selected, or default to first available
  const selectedDeviceId = manualSelectedId || (rawDevices.length > 0 ? rawDevices[0].id : "");

  const [focusedPoint, setFocusedPoint] = useState<TelemetryPoint | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [playIndex, setPlayIndex] = useState(0);

  // Track the previous device ID to reset focusedPoint when it changes
  const [prevDeviceId, setPrevDeviceId] = useState<string>("");
  if (selectedDeviceId !== prevDeviceId) {
    setPrevDeviceId(selectedDeviceId);
    setFocusedPoint(null);
    setPlayIndex(0);
    setIsPlaying(false);
  }

  // Date range
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  // Fetch telemetry history
  const historyParams = useMemo(
    () => ({
      from: `${dateFrom}T00:00:00.000Z`,
      to: `${dateTo}T23:59:59.999Z`,
      page: 1,
      limit: 500, // For drawing polyline
      sortBy: "timestamp",
      sortOrder: SortOrder.ASC,
    }),
    [dateFrom, dateTo]
  );

  const { data: historyResponse, isLoading: isLoadingHistory } =
    useTelemetryControllerGetHistory(selectedDeviceId, historyParams, {
      query: { enabled: !!selectedDeviceId },
    });

  // Fetch geofences
  const { data: geofencesResponse } = useGeofencesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawGeofences = (geofencesResponse as any)?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allGeofences: GeofenceZone[] = rawGeofences.map((g: any) => ({
    id: g.id,
    name: g.name ?? "",
    type: g.type ?? "allowed_zone",
    color: g.color ?? (g.type === "forbidden_zone" ? "#ef4444" : "#3b82f6"),
    paths: Array.isArray(g.paths) ? g.paths : [],
    assignedDevices: Array.isArray(g.Devices) ? g.Devices : [],
    createdAt: g.createdAt ?? "",
    vertexCount: g.vertexCount ?? 0,
  }));

  const deviceGeofences = allGeofences.filter((g) => 
    g.assignedDevices.some((dev: unknown) => {
      if (typeof dev === "string") {
        return dev === selectedDeviceId;
      }
      if (dev && typeof dev === "object" && "id" in dev) {
        return (dev as { id: string }).id === selectedDeviceId;
      }
      return false;
    })
  );

  // Parse history
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historyData = historyResponse as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const telemetryRows: any[] = historyData?.data ?? [];

  const telemetry: TelemetryPoint[] = telemetryRows.map(
    (r: {
      lat: number;
      lng: number;
      speed?: number;
      batteryLevel?: number;
      timestamp: string;
    }) => ({
    lat: r.lat,
    lng: r.lng,
    speed: r.speed ?? 0,
    battery: r.batteryLevel ?? 0,
    timestamp: r.timestamp,
  }));

  const selectedDevice = rawDevices.find(
    (d: { id: string; name: string }) => d.id === selectedDeviceId
  );

  // Playback timer loop in track-history.tsx
  useEffect(() => {
    if (isPlaying) {
      const interval = setInterval(() => {
        setPlayIndex((prev) => {
          if (prev >= telemetry.length - 1) {
            setIsPlaying(false);
            return telemetry.length - 1;
          }
          const next = prev + 1;
          setFocusedPoint(telemetry[next]);
          return next;
        });
      }, 1000 / playbackSpeed);
      return () => clearInterval(interval);
    }
  }, [isPlaying, playbackSpeed, telemetry]);

  const togglePlayback = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (playIndex >= telemetry.length - 1) {
        setPlayIndex(0);
        if (telemetry.length > 0) setFocusedPoint(telemetry[0]);
      }
      setIsPlaying(true);
    }
  };

  // Trip Stats calculations
  const distanceKm = useMemo(() => {
    let total = 0;
    for (let i = 0; i < telemetry.length - 1; i++) {
      total += getHaversineDistance(telemetry[i].lat, telemetry[i].lng, telemetry[i+1].lat, telemetry[i+1].lng);
    }
    return total.toFixed(2);
  }, [telemetry]);

  const durationStr = useMemo(() => {
    if (telemetry.length < 2) return "0 giờ 0 phút";
    const start = new Date(telemetry[0].timestamp).getTime();
    const end = new Date(telemetry[telemetry.length - 1].timestamp).getTime();
    const diffMs = end - start;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins} phút`;
    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours} giờ ${mins} phút`;
  }, [telemetry]);

  const avgSpeed = useMemo(() => {
    if (telemetry.length === 0) return "0.0";
    const sum = telemetry.reduce((acc, p) => acc + p.speed, 0);
    return (sum / telemetry.length).toFixed(1);
  }, [telemetry]);

  // Reverse the array for the log view so newest is at top
  const logRows = [...telemetry].reverse();

  return (
    <>
      <AppHeader
        title="Lịch sử di chuyển"
        breadcrumbs={[
          { label: "Theo dõi trực tiếp" },
          { label: "Lịch sử di chuyển" },
        ]}
      />
      <div className="my-devices-page flex flex-1 flex-col gap-5 min-h-full overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lịch sử di chuyển</h1>
            <p className="text-sm text-cyan mt-1 opacity-85">
              Xem lại lịch sử di chuyển của thiết bị theo thời gian.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="device-chip cursor-pointer">
                  <div className="ic">
                    <Cpu className="h-[13px] w-[13px]" />
                  </div>
                  {selectedDevice ? selectedDevice.name : "Chọn thiết bị..."}
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[250px]">
                {rawDevices.map((d: { id: string; name: string }) => (
                  <DropdownMenuItem
                    key={d.id}
                    onClick={() => setManualSelectedId(d.id)}
                    className="cursor-pointer"
                  >
                    {d.name}
                  </DropdownMenuItem>
                ))}
                {rawDevices.length === 0 && (
                  <div className="text-sm text-muted-foreground p-2 text-center">
                    Không có thiết bị
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="main-grid">
          {/* Left Panel */}
          <div className="panel">
            <div className="panel-head">
              <div className="left">
                <div className="panel-icon">
                  <Navigation className="h-[17px] w-[17px]" />
                </div>
                <div>
                  <h2>Lịch sử hành trình</h2>
                  <div className="sub">{selectedDevice ? selectedDevice.name : "Device"} · {telemetry.length} điểm telemetry</div>
                </div>
              </div>
              <span className="polyline-tag">
                <MapPin className="h-3 w-3" />
                Polyline
              </span>
            </div>

            <div className="controls-row">
              <div className="date-field">
                <CalendarDays className="h-[15px] w-[15px]" />
                TỪ: 
                <input 
                  type="date" 
                  value={dateFrom} 
                  onChange={(e) => setDateFrom(e.target.value)} 
                />
              </div>
              <span className="arrow-sep">→</span>
              <div className="date-field">
                ĐẾN: 
                <input 
                  type="date" 
                  value={dateTo} 
                  onChange={(e) => setDateTo(e.target.value)} 
                />
              </div>
            </div>

            <div className="summary-row">
              <div className="summary-stats">
                <div className="sum-item distance">Quãng đường: <b>{distanceKm} km</b></div>
                <div className="sum-item time">Thời gian: <b>{durationStr}</b></div>
                <div className="sum-item speed">Tốc độ TB: <b>{avgSpeed} km/h</b></div>
              </div>
              <div className="playback-controls">
                <div className="speed-pills">
                  {([1, 2, 4, 8] as const).map((speed) => (
                    <div
                      key={speed}
                      className={`speed-pill ${playbackSpeed === speed ? "active" : ""}`}
                      onClick={() => setPlaybackSpeed(speed)}
                    >
                      {speed}x
                    </div>
                  ))}
                </div>
                <button className="btn-play" onClick={togglePlayback} disabled={telemetry.length === 0}>
                  {isPlaying ? (
                    <>
                      <Pause className="h-[13px] w-[13px]" />
                      Tạm dừng
                    </>
                  ) : (
                    <>
                      <Play className="h-[13px] w-[13px] fill-current" />
                      Phát lại
                    </>
                  )}
                </button>
              </div>
            </div>

            <div className="map-area">
              {selectedDeviceId ? (
                <TelemetryMap
                  telemetry={telemetry}
                  geofences={deviceGeofences}
                  deviceName={selectedDevice?.name ?? "Thiết bị"}
                  isLoading={isLoadingHistory}
                  dateFrom={dateFrom}
                  dateTo={dateTo}
                  onDateFromChange={setDateFrom}
                  onDateToChange={setDateTo}
                  focusedPoint={focusedPoint}
                  hideHeader={true}
                  externalIsPlaying={isPlaying}
                  externalPlayIndex={playIndex}
                  externalPlaybackSpeed={playbackSpeed}
                />
              ) : (
                <div className="flex flex-col items-center justify-center h-full bg-muted/20">
                  <MapPinned className="w-16 h-16 mx-auto text-blue-500/30 mb-4" />
                  <p className="text-muted-foreground font-medium">Chưa chọn thiết bị</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel: Journey Log */}
          <div className="panel log-panel">
            <div className="panel-head">
              <div className="left">
                <div className="panel-icon" style={{ background: "rgba(51, 210, 201, 0.1)", color: "#33d2c9" }}>
                  <Clock className="h-[17px] w-[17px]" />
                </div>
                <h2>Nhật ký hành trình</h2>
              </div>
            </div>
            <div className="log-list max-h-[600px] overflow-y-auto">
              {isLoadingHistory ? (
                <div className="flex justify-center p-8"><span className="text-sm text-muted-foreground">Đang tải...</span></div>
              ) : logRows.length === 0 ? (
                <div className="text-center p-8 text-sm text-muted-foreground">Không có dữ liệu trong khoảng thời gian này.</div>
              ) : (
                logRows.map((item, idx) => {
                  const status = item.speed > 0 ? "Đang di chuyển" : "Đang dừng";
                  const isFocused = focusedPoint && focusedPoint.timestamp === item.timestamp;
                  
                  // Compute corresponding index in telemetry array
                  const origIdx = telemetry.length - 1 - idx;
                  
                  return (
                    <div 
                      key={idx} 
                      className={`log-item ${isFocused ? 'bg-white/5' : ''}`}
                      onClick={() => {
                        setFocusedPoint(item);
                        setPlayIndex(origIdx);
                      }}
                    >
                      <div className="log-rail">
                        <div className="log-dot" style={isFocused ? { background: "rgba(51, 210, 201, 0.15)", color: "#33d2c9" } : undefined}>
                          <Navigation className={`w-3.5 h-3.5 ${status === 'Đang dừng' ? 'rotate-180' : ''}`} />
                        </div>
                      </div>
                      <div className="log-content">
                        <div className="log-top">
                          <span className="log-time" style={isFocused ? { color: "#33d2c9" } : undefined}>
                            {new Date(item.timestamp).toLocaleTimeString("vi-VN", {
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </span>
                          <span className="log-status" style={
                            isFocused 
                              ? { background: "rgba(51, 210, 201, 0.15)", color: "#33d2c9" } 
                              : status === 'Đang dừng' 
                                ? { background: "rgba(240, 169, 63, 0.15)", color: "#f0a93f" } 
                                : undefined
                          }>
                            {status}
                          </span>
                        </div>
                        <div className="log-coords">{item.lat.toFixed(6)}, {item.lng.toFixed(6)}</div>
                        <div className="log-speed">Vận tốc: <b>{item.speed.toFixed(1)} km/h</b></div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
