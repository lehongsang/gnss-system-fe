import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import Map, {
  Marker,
  NavigationControl,
  FullscreenControl,
  Popup,
  Source,
  Layer,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { useQueries } from "@tanstack/react-query";
import {
  useDevicesControllerFindMine,
  useGeofencesControllerFindMine,
  getDeviceStatusControllerGetStatusQueryOptions,
  getTelemetryControllerGetLatestQueryOptions,
} from "@/services/apis/gen/queries";
import { Wifi, WifiOff, Wrench } from "lucide-react";
import type { DeviceStatus } from "@/types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

const STATUS_COLORS: Record<DeviceStatus, string> = {
  online: "#10b981", // emerald-500
  offline: "#f87171", // red-400
  maintenance: "#f59e0b", // amber-500
};

export default function RealTimeMap() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

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
        title="Real-time Map"
        breadcrumbs={[
          { label: "Live Tracking" },
          { label: "Real-time Map" },
        ]}
      />
      <div className="flex flex-1 flex-col p-0 min-h-[calc(100vh-64px)] overflow-hidden relative">
        <Map
          initialViewState={initialViewState}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/dark-v11"
          style={{ width: "100%", height: "100%" }}
        >
          <NavigationControl position="top-right" showCompass={false} />
          <FullscreenControl position="top-right" />

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
          {devices.map((device: { id: string; lat: number; lng: number; status: string; heading: number }) => (
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
                className="relative flex items-center justify-center transition-transform hover:scale-110"
                style={{
                   transform: `rotate(${device.heading}deg)`,
                }}
              >
                <div 
                  className="absolute -top-1 w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent"
                  style={{ borderBottomColor: STATUS_COLORS[device.status as DeviceStatus] || STATUS_COLORS.offline }}
                />
                <div 
                  className="w-4 h-4 rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: STATUS_COLORS[device.status as DeviceStatus] || STATUS_COLORS.offline }}
                />
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
              <div className="flex flex-col gap-2 p-1 min-w-[200px] text-zinc-900">
                <div className="flex items-center justify-between border-b pb-2">
                  <h3 className="font-bold text-sm truncate pr-4">{selectedDevice.name}</h3>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-semibold text-white" style={{ backgroundColor: STATUS_COLORS[selectedDevice.status as DeviceStatus] }}>
                    {selectedDevice.status.toUpperCase()}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                  <div>
                    <span className="text-zinc-500 font-medium">Vận tốc:</span>
                    <p className="font-semibold font-mono">{selectedDevice.speed.toFixed(1)} km/h</p>
                  </div>
                  <div>
                    <span className="text-zinc-500 font-medium">Pin:</span>
                    <p className="font-semibold font-mono">{selectedDevice.battery}%</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-zinc-500 font-medium">Tọa độ:</span>
                    <p className="font-semibold font-mono">{selectedDevice.lat.toFixed(5)}, {selectedDevice.lng.toFixed(5)}</p>
                  </div>
                </div>
              </div>
            </Popup>
          )}
        </Map>

        {/* Floating Status Panel */}
        <div className="absolute top-4 left-4 bg-card/90 backdrop-blur-md border rounded-xl p-4 shadow-xl z-10 min-w-[250px]">
          <h2 className="font-semibold mb-3">Tổng quan thiết bị</h2>
          <div className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-emerald-500"><Wifi className="w-4 h-4"/> Đang chạy</span>
              <span className="font-bold">{devices.filter((d: { status: string }) => d.status === "online").length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-red-400"><WifiOff className="w-4 h-4"/> Mất kết nối</span>
              <span className="font-bold">{devices.filter((d: { status: string }) => d.status === "offline").length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="flex items-center gap-2 text-amber-500"><Wrench className="w-4 h-4"/> Bảo trì</span>
              <span className="font-bold">{devices.filter((d: { status: string }) => d.status === "maintenance").length}</span>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
