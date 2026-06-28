import { useState, useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { Clock, Navigation, MapPinned, Cpu } from "lucide-react";
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

export default function TrackHistory() {
  // Device Selection
  const { data: devicesResponse } = useDevicesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevices = (devicesResponse as any)?.data ?? [];
  
  const [manualSelectedId, setManualSelectedId] = useState<string>("");
  
  // Derive selected device: use manually selected, or default to first available
  const selectedDeviceId = manualSelectedId || (rawDevices.length > 0 ? rawDevices[0].id : "");

  const [focusedPoint, setFocusedPoint] = useState<TelemetryPoint | null>(null);

  // Track the previous device ID to reset focusedPoint when it changes
  const [prevDeviceId, setPrevDeviceId] = useState<string>("");
  if (selectedDeviceId !== prevDeviceId) {
    setPrevDeviceId(selectedDeviceId);
    setFocusedPoint(null);
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

  function formatTime(dateStr: string) {
    return new Date(dateStr).toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }

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
      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Lịch sử di chuyển</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Xem lại lịch sử di chuyển của thiết bị theo thời gian.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center justify-between px-3 py-2 border rounded-md w-[250px] h-9 bg-card cursor-pointer hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-2">
                    <Cpu className="h-4 w-4 text-blue-500" />
                    <span className="text-sm truncate">
                      {selectedDevice ? selectedDevice.name : "Chọn thiết bị..."}
                    </span>
                  </div>
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
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 min-h-0">
          <div className="lg:col-span-2 rounded-xl flex flex-col overflow-hidden">
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
              />
            ) : (
               <div className="flex flex-col items-center justify-center h-[520px] bg-muted/20 border rounded-xl">
                 <MapPinned className="w-16 h-16 mx-auto text-blue-500/30 mb-4" />
                 <p className="text-muted-foreground font-medium">Chưa chọn thiết bị</p>
               </div>
            )}
          </div>
          
          <div className="bg-card border rounded-xl p-5 flex flex-col gap-4 max-h-[520px] lg:max-h-[600px] overflow-hidden">
            <h3 className="font-semibold text-lg flex items-center gap-2 shrink-0">
              <Clock className="w-5 h-5 text-blue-500"/> Nhật ký hành trình
            </h3>
            
            <div className="overflow-auto pr-2 flex-1 relative before:absolute before:inset-y-0 before:left-[16px] before:w-0.5 before:bg-border/50 space-y-3">
              {isLoadingHistory ? (
                 <div className="flex justify-center p-4"><span className="text-sm text-muted-foreground">Đang tải...</span></div>
              ) : logRows.length === 0 ? (
                 <div className="text-center p-4 text-sm text-muted-foreground">Không có dữ liệu trong khoảng thời gian này.</div>
              ) : (
                logRows.map((item, idx) => {
                  const status = item.speed > 0 ? "Moving" : "Stopped";
                  const isFocused = focusedPoint && focusedPoint.timestamp === item.timestamp;
                  return (
                    <div 
                      key={idx} 
                      className="relative flex items-start gap-4 p-1 group cursor-pointer"
                      onClick={() => setFocusedPoint(item)}
                    >
                      <div className={`z-10 flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ring-4 ring-card transition-all duration-300 ${
                        isFocused 
                          ? 'bg-cyan-500/20 text-cyan-400 ring-cyan-500/30 shadow-lg shadow-cyan-500/20 scale-110' 
                          : status === 'Moving' 
                            ? 'bg-blue-500/20 text-blue-500' 
                            : 'bg-amber-500/20 text-amber-500'
                      }`}>
                        <Navigation className={`w-3.5 h-3.5 transition-transform duration-300 ${status === 'Stopped' ? 'rotate-180' : ''} ${isFocused ? 'text-cyan-400 animate-pulse' : ''}`} />
                      </div>
                      
                      <div className={`flex-1 border rounded-lg p-3 transition-all duration-300 ${
                        isFocused 
                          ? 'bg-cyan-500/10 border-cyan-500/80 shadow-md shadow-cyan-500/10 scale-[1.01]' 
                          : 'bg-muted/10 border-border/50 hover:bg-muted/30'
                      }`}>
                        <div className="flex justify-between items-center mb-1">
                          <p className={`font-semibold text-sm transition-colors ${isFocused ? 'text-cyan-400 font-bold' : ''}`}>{formatTime(item.timestamp)}</p>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors ${
                            isFocused 
                              ? 'bg-cyan-500/20 text-cyan-400'
                              : status === 'Moving' 
                                ? 'bg-blue-500/10 text-blue-500' 
                                : 'bg-amber-500/10 text-amber-500'
                          }`}>{isFocused ? 'Đang chọn' : status === 'Moving' ? 'Đang di chuyển' : 'Đang dừng'}</span>
                        </div>
                        <p className={`text-[11px] font-mono truncate transition-colors ${isFocused ? 'text-cyan-300/80' : 'text-muted-foreground'}`}>
                          {item.lat.toFixed(6)}, {item.lng.toFixed(6)}
                        </p>
                        <p className={`text-[11px] font-medium mt-1 transition-colors ${isFocused ? 'text-cyan-200/90' : 'text-foreground/80'}`}>Vận tốc: {item.speed.toFixed(1)} km/h</p>
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
