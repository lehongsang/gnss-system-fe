import { useState, useRef } from "react";
import { AppHeader } from "@/components/app-header";
import Map, {
  Marker,
  NavigationControl,
  FullscreenControl,
  Popup,
  Source,
  Layer,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQueries } from "@tanstack/react-query";
import {
  useDevicesControllerFindMine,
  useGeofencesControllerFindMine,
  getDeviceStatusControllerGetStatusQueryOptions,
  getTelemetryControllerGetLatestQueryOptions,
} from "@/services/apis/gen/queries";
import { Wifi, WifiOff, Wrench, Maximize2, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DeviceStatus } from "@/types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

const STATUS_COLORS: Record<DeviceStatus, string> = {
  online: "#10b981", // emerald-500
  offline: "#f87171", // red-400
  maintenance: "#f59e0b", // amber-500
};

export default function RealTimeMap() {
  const mapRef = useRef<MapRef>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [isPanelCollapsed, setIsPanelCollapsed] = useState(false);

  // 1. Lấy danh sách thiết bị
  const { data: devicesResponse } = useDevicesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevices = (devicesResponse as any)?.data ?? [];

  // 2. Fetch trạng thái + vị trí mới nhất của toàn bộ thiết bị (real-time)
  const statusQueries = useQueries({
    queries: rawDevices.map((d: { id: string }) => ({
      ...getDeviceStatusControllerGetStatusQueryOptions(d.id),
      refetchInterval: 10000,
    })),
  });

  const latestQueries = useQueries({
    queries: rawDevices.map((d: { id: string }) => ({
      ...getTelemetryControllerGetLatestQueryOptions(d.id),
      refetchInterval: 10000,
    })),
  });

  // 3. Lấy danh sách Geofence để vẽ lên bản đồ
  const { data: geofencesResponse } = useGeofencesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawGeofences = (geofencesResponse as any)?.data ?? [];

  // Parse devices
  const devices = rawDevices.map((d: { id: string; name: string }, i: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statusData = (statusQueries[i]?.data as any) || {};
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const latestData = (latestQueries[i]?.data as any) || {};
    
    return {
      id: d.id,
      name: d.name,
      status: (statusData.status as DeviceStatus) ?? "offline",
      battery: statusData.batteryLevel ?? 0,
      lat: latestData.lat ?? 0,
      lng: latestData.lng ?? 0,
      speed: latestData.speed ?? 0,
      heading: latestData.heading ?? 0,
      lastSeen: statusData.updatedAt ?? "",
    };
  }).filter((d: { lat: number; lng: number }) => d.lat !== 0 && d.lng !== 0); // Chỉ hiện xe có tọa độ hợp lệ

  // Center Map around Hanoi by default, or fit to bounds of all devices if available
  const initialViewState = {
    latitude: 21.0285,
    longitude: 105.8542,
    zoom: 11,
  };

  const selectedDevice = devices.find((d: { id: string }) => d.id === selectedDeviceId);

  const handleFitBounds = () => {
    const map = mapRef.current;
    if (!map || devices.length === 0) return;

    const bounds = devices.reduce(
      (b: { minLng: number; maxLng: number; minLat: number; maxLat: number }, d: { lng: number; lat: number }) => {
        b.minLng = Math.min(b.minLng, d.lng);
        b.maxLng = Math.max(b.maxLng, d.lng);
        b.minLat = Math.min(b.minLat, d.lat);
        b.maxLat = Math.max(b.maxLat, d.lat);
        return b;
      },
      { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
    );

    if (bounds.minLng === Infinity) return;

    map.fitBounds(
      [
        [bounds.minLng - 0.005, bounds.minLat - 0.005],
        [bounds.maxLng + 0.005, bounds.maxLat + 0.005],
      ],
      { padding: 80, duration: 1000 }
    );
  };

  function toGeoJSONPolygon(paths: { lat: number; lng: number }[]): GeoJSON.Feature<GeoJSON.Polygon> {
    const coordinates = paths.map((p) => [p.lng, p.lat]);
    if (coordinates.length > 0) coordinates.push(coordinates[0]);
    return {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [coordinates] },
    };
  }

  return (
    <>
      <AppHeader
        title="Bản đồ thời gian thực"
        breadcrumbs={[
          { label: "Theo dõi trực tiếp" },
          { label: "Bản đồ thời gian thực" },
        ]}
      />
      <div className="flex flex-1 flex-col p-0 min-h-[calc(100vh-64px)] overflow-hidden relative">
        <Map
          ref={mapRef}
          initialViewState={initialViewState}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/navigation-preview-night-v4"
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <FullscreenControl position="top-right" />

          {/* Fit Bounds Floating Button */}
          <div className="absolute top-24 right-2.5 z-10 flex flex-col gap-2">
            <Button
              variant="secondary"
              size="icon"
              className="h-8.5 w-8.5 rounded-md border border-border/80 shadow-md bg-card/95 hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
              onClick={handleFitBounds}
              title="Xem toàn bộ thiết bị"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>

          {/* Render Geofences */}
          {rawGeofences.map((geo: { id: string; color?: string; paths: { lat: number; lng: number }[] }) => (
            <Source
              key={`geo-${geo.id}`}
              id={`geo-${geo.id}`}
              type="geojson"
              data={toGeoJSONPolygon(Array.isArray(geo.paths) ? geo.paths : [])}
            >
              <Layer
                id={`geo-fill-${geo.id}`}
                type="fill"
                paint={{ "fill-color": geo.color || "#3b82f6", "fill-opacity": 0.15 }}
              />
              <Layer
                id={`geo-line-${geo.id}`}
                type="line"
                paint={{ "line-color": geo.color || "#3b82f6", "line-width": 2 }}
              />
            </Source>
          ))}

          {/* Render Devices */}
          {devices.map((device: { id: string; name: string; lat: number; lng: number; status: string; heading: number }) => (
            <Marker
              key={device.id}
              latitude={device.lat}
              longitude={device.lng}
              anchor="center"
              onClick={(e) => {
                e.originalEvent.stopPropagation();
                setSelectedDeviceId(device.id);
              }}
              style={{ cursor: "pointer" }}
            >
              <div 
                className="relative flex flex-col items-center justify-center transition-transform hover:scale-110"
              >
                {/* Heading Arrow indicator */}
                <div 
                  className="relative flex items-center justify-center"
                  style={{
                     transform: `rotate(${device.heading}deg)`,
                  }}
                >
                  <div 
                    className="absolute -top-1.5 w-0 h-0 border-l-[5px] border-r-[5px] border-b-[8px] border-l-transparent border-r-transparent"
                    style={{ borderBottomColor: STATUS_COLORS[device.status as DeviceStatus] || STATUS_COLORS.offline }}
                  />
                  <div 
                    className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-lg"
                    style={{ backgroundColor: STATUS_COLORS[device.status as DeviceStatus] || STATUS_COLORS.offline }}
                  />
                </div>
                {/* Device Name label (horizontal) */}
                <div className="mt-1 bg-card/90 backdrop-blur-sm text-card-foreground text-[8px] font-extrabold px-1.5 py-0.5 rounded border border-border/50 shadow-md whitespace-nowrap tracking-wide">
                  {device.name}
                </div>
              </div>
            </Marker>
          ))}

          {/* Device Popup */}
          {selectedDevice && (
            <Popup
              latitude={selectedDevice.lat}
              longitude={selectedDevice.lng}
              anchor="bottom"
              offset={15}
              closeOnClick={false}
              onClose={() => setSelectedDeviceId(null)}
              className="z-50"
              maxWidth="300px"
            >
              <div className="flex flex-col gap-2.5 p-1.5 min-w-[210px] text-slate-100">
                <div className="flex items-center justify-between border-b border-slate-700/50 pb-2">
                  <h3 className="font-bold text-sm truncate pr-4 text-white">{selectedDevice.name}</h3>
                  <span className="text-[9px] px-1.5 py-0.5 rounded font-mono font-bold text-white shadow-xs" style={{ backgroundColor: STATUS_COLORS[selectedDevice.status as DeviceStatus] }}>
                    {selectedDevice.status.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5 text-[11px] mt-1">
                  <div>
                    <span className="text-slate-400 font-medium">Vận tốc:</span>
                    <p className="font-bold font-mono text-slate-200 mt-0.5">{selectedDevice.speed.toFixed(1)} km/h</p>
                  </div>
                  <div>
                    <span className="text-slate-400 font-medium">Pin:</span>
                    <p className="font-bold font-mono text-slate-200 mt-0.5">{selectedDevice.battery}%</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-400 font-medium">Tọa độ:</span>
                    <p className="font-bold font-mono text-slate-200 mt-0.5">{selectedDevice.lat.toFixed(5)}, {selectedDevice.lng.toFixed(5)}</p>
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </Map>

        {/* Floating Collapsible Status Panel */}
        <div 
          className={`absolute top-4 left-4 bg-card/95 backdrop-blur-md border rounded-xl p-4 shadow-xl z-10 min-w-[250px] transition-all duration-300 ${
            isPanelCollapsed ? "-translate-x-[calc(100%-40px)] opacity-60" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="font-semibold text-sm">Tổng quan thiết bị</h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setIsPanelCollapsed(!isPanelCollapsed)}
            >
              {isPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {!isPanelCollapsed && (
            <div className="space-y-3 pt-2 border-t border-border/30">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#10b981] shadow-[0_0_4px_#10b981]" />
                  <Wifi className="w-3.5 h-3.5 text-emerald-500"/> Đang chạy (Online)
                </span>
                <span className="font-bold font-mono text-sm">{devices.filter((d: { status: string }) => d.status === "online").length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#f87171] shadow-[0_0_4px_#f87171]" />
                  <WifiOff className="w-3.5 h-3.5 text-red-400"/> Mất kết nối (Offline)
                </span>
                <span className="font-bold font-mono text-sm">{devices.filter((d: { status: string }) => d.status === "offline").length}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#f59e0b] shadow-[0_0_4px_#f59e0b]" />
                  <Wrench className="w-3.5 h-3.5 text-amber-500"/> Bảo trì (Maintenance)
                </span>
                <span className="font-bold font-mono text-sm">{devices.filter((d: { status: string }) => d.status === "maintenance").length}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
