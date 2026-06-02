import { useCallback, useRef, useState } from "react";
import Map, {
  Marker,
  Popup,
  Source,
  Layer,
  NavigationControl,
  FullscreenControl,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navigation as NavIcon, Layers } from "lucide-react";
import type { DashboardDevice as Device, DashboardGeofence as Geofence } from "@/types";

// --------------- config ---------------
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

const INITIAL_VIEW = {
  latitude: 21.0048,
  longitude: 105.8458,
  zoom: 15,
  pitch: 0,
  bearing: 0,
};

// --------------- helpers ---------------
function geofenceToGeoJSON(geofence: Geofence): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords = geofence.paths.map((p) => [p.lng, p.lat]);
  // Close the polygon
  if (coords.length > 0) coords.push(coords[0]);
  return {
    type: "Feature",
    properties: { id: geofence.id, name: geofence.name, color: geofence.color },
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

// --------------- component ---------------
interface MapViewProps {
  devices: Device[];
  geofences: Geofence[];
}

export function MapView({ devices, geofences }: MapViewProps) {
  const mapRef = useRef<MapRef>(null);
  const onlineCount = devices.filter((d) => d.status === "online").length;
  const offlineCount = devices.filter((d) => d.status === "offline").length;
  const [selectedDevice, setSelectedDevice] = useState<Device | null>(null);

  // Fit map bounds to devices on first load
  const onMapLoad = useCallback(() => {
    const map = mapRef.current;
    if (!map || devices.length === 0) return;

    const bounds = devices.reduce(
      (b, d) => {
        b.minLng = Math.min(b.minLng, d.lng);
        b.maxLng = Math.max(b.maxLng, d.lng);
        b.minLat = Math.min(b.minLat, d.lat);
        b.maxLat = Math.max(b.maxLat, d.lat);
        return b;
      },
      { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity },
    );

    map.fitBounds(
      [
        [bounds.minLng - 0.003, bounds.minLat - 0.003],
        [bounds.maxLng + 0.003, bounds.maxLat + 0.003],
      ],
      { padding: 50, duration: 1000 },
    );
  }, [devices]);

  return (
    <Card className="flex flex-col overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      {/* Header */}
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3 px-5 pt-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
            <NavIcon className="h-4 w-4" />
          </div>
          <div>
            <CardTitle className="text-sm font-semibold">
              Bản đồ trực tiếp
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              {onlineCount} đang hoạt động · {offlineCount} ngoại tuyến
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge
            variant="outline"
            className="text-[10px] gap-1 px-2 py-0.5 font-mono border-emerald-500/30 text-emerald-500"
          >
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            TRỰC TIẾP
          </Badge>
          <button className="h-7 w-7 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-accent/50 transition-colors">
            <Layers className="h-3.5 w-3.5" />
          </button>
        </div>
      </CardHeader>

      {/* Map body */}
      <CardContent className="flex-1 p-0 relative">
        <div className="h-[420px] w-full">
          <Map
            ref={mapRef}
            initialViewState={INITIAL_VIEW}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/navigation-preview-night-v4"
            style={{ width: "100%", height: "100%" }}
            onLoad={onMapLoad}
            attributionControl={false}
          >
            {/* Controls */}
            <NavigationControl position="top-right" showCompass={false} />
            <FullscreenControl position="top-right" />

            {/* Geofence polygons */}
            {geofences.map((geo) => (
              <Source
                key={geo.id}
                id={`geofence-${geo.id}`}
                type="geojson"
                data={geofenceToGeoJSON(geo)}
              >
                <Layer
                  id={`geofence-fill-${geo.id}`}
                  type="fill"
                  paint={{
                    "fill-color": geo.color,
                    "fill-opacity": 0.12,
                  }}
                />
                <Layer
                  id={`geofence-line-${geo.id}`}
                  type="line"
                  paint={{
                    "line-color": geo.color,
                    "line-width": 2,
                    "line-dasharray": [4, 2],
                  }}
                />
              </Source>
            ))}

            {/* Device markers */}
            {devices.map((device) => {
              const isOnline = device.status === "online";
              const size = device.type === "base" ? 20 : 16;
              return (
                <Marker
                  key={device.id}
                  latitude={device.lat}
                  longitude={device.lng}
                  anchor="center"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedDevice(device);
                  }}
                  style={{ cursor: "pointer" }}
                >
                  {/* Pulse ring */}
                  {isOnline && (
                    <span
                      className="absolute rounded-full bg-emerald-500/25 animate-ping"
                      style={{
                        width: size + 12,
                        height: size + 12,
                        top: -(size + 12 - size) / 2,
                        left: -(size + 12 - size) / 2,
                        animationDuration: "2.5s",
                      }}
                    />
                  )}
                  <div
                    className="rounded-full border-2 shadow-lg flex items-center justify-center"
                    style={{
                      width: size,
                      height: size,
                      backgroundColor: isOnline ? "#10b981" : "#ef4444",
                      borderColor: isOnline ? "#34d399" : "#f87171",
                      boxShadow: isOnline
                        ? "0 0 8px rgba(16,185,129,0.4)"
                        : "0 0 8px rgba(239,68,68,0.3)",
                    }}
                  >
                    <span
                      className="text-white font-bold"
                      style={{ fontSize: device.type === "base" ? 8 : 7 }}
                    >
                      {device.type === "base" ? "B" : device.type === "relay" ? "R" : "●"}
                    </span>
                  </div>
                </Marker>
              );
            })}

            {/* Popup for selected device */}
            {selectedDevice && (
              <Popup
                latitude={selectedDevice.lat}
                longitude={selectedDevice.lng}
                anchor="bottom"
                onClose={() => setSelectedDevice(null)}
                closeOnClick={false}
                className="mapbox-device-popup"
                maxWidth="240px"
              >
                <div style={{ fontFamily: "system-ui, sans-serif", padding: "2px 0" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>
                    {selectedDevice.name}
                  </p>
                  <p
                    style={{
                      margin: "2px 0 8px",
                      fontSize: 11,
                      color: "#94a3b8",
                      fontFamily: "monospace",
                    }}
                  >
                    {selectedDevice.id} · {selectedDevice.type}
                  </p>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "4px 12px",
                      fontSize: 11,
                      color: "#94a3b8",
                    }}
                  >
                    <span>Trạng thái</span>
                    <span
                      style={{
                        fontWeight: 600,
                        color: selectedDevice.status === "online" ? "#10b981" : "#ef4444",
                      }}
                    >
                      {selectedDevice.status === "online" ? "ĐANG CHẠY" : "MẤT KẾT NỐI"}
                    </span>

                    <span>Vệ tinh</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#e2e8f0" }}>
                      {selectedDevice.satellites}
                    </span>

                    <span>Pin</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#e2e8f0" }}>
                      {selectedDevice.battery}%
                    </span>

                    <span>Tọa độ</span>
                    <span style={{ fontFamily: "monospace", fontSize: 10, color: "#cbd5e1" }}>
                      {selectedDevice.lat.toFixed(4)}, {selectedDevice.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>
      </CardContent>
    </Card>
  );
}
