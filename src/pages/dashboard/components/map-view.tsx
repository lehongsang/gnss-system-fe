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
    <div className="panel">
      {/* Header */}
      <div className="panel-head">
        <div className="left">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 11l19-9-9 19-2-8-8-2z" />
          </svg>
          <div>
            <h2>Bản đồ trực tiếp</h2>
            <div className="sub">
              {onlineCount} đang hoạt động · {offlineCount} ngoại tuyến
            </div>
          </div>
        </div>
        <span className="live-badge">TRỰC TIẾP</span>
      </div>

      {/* Map body */}
      <div className="relative">
        <div className="h-[430px] w-full">
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
                  id={`geofence-border-${geo.id}`}
                  type="line"
                  paint={{
                    "line-color": geo.color,
                    "line-width": 2,
                    "line-opacity": 0.7,
                  }}
                />
              </Source>
            ))}

            {/* Device Markers */}
            {devices.map((device) => {
              const isOnline = device.status === "online";
              return (
                <Marker
                  key={device.id}
                  latitude={device.lat}
                  longitude={device.lng}
                  anchor="bottom"
                  onClick={(e) => {
                    e.originalEvent.stopPropagation();
                    setSelectedDevice(device);
                  }}
                >
                  <div className="flex flex-col items-center cursor-pointer group">
                    {/* Device Label */}
                    <div className="bg-slate-950/90 text-white text-[10px] font-bold px-1.5 py-0.5 rounded border border-white/10 shadow-lg mb-1 pointer-events-none opacity-80 group-hover:opacity-100 transition-opacity">
                      {device.name}
                    </div>
                    {/* Pin Graphic */}
                    <div className="relative flex items-center justify-center">
                      <div
                        className={`absolute w-5 h-5 rounded-full animate-ping opacity-60 ${
                          isOnline ? "bg-emerald-400" : "bg-rose-400"
                        }`}
                        style={{ animationDuration: "2s" }}
                      />
                      <div
                        className={`w-3.5 h-3.5 rounded-full border-2 border-white flex items-center justify-center shadow-md relative z-10 ${
                          isOnline ? "bg-emerald-500" : "bg-rose-500"
                        }`}
                      />
                    </div>
                  </div>
                </Marker>
              );
            })}

            {/* Device Info Popup */}
            {selectedDevice && (
              <Popup
                latitude={selectedDevice.lat}
                longitude={selectedDevice.lng}
                anchor="top"
                onClose={() => setSelectedDevice(null)}
                closeOnClick={false}
                maxWidth="260px"
              >
                <div style={{ padding: 4 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                      borderBottom: "1px solid rgba(255,255,255,0.1)",
                      paddingBottom: 4,
                    }}
                  >
                    <span style={{ fontWeight: 700, fontSize: 13, color: "#fff" }}>
                      {selectedDevice.name}
                    </span>
                    <span
                      style={{
                        fontSize: 9,
                        fontWeight: 600,
                        opacity: 0.6,
                        color: "#94a3b8",
                      }}
                    >
                      {selectedDevice.type.toUpperCase()}
                    </span>
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "80px 1fr",
                      gap: "4px 8px",
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
                    <span style={{ color: "#e2e8f0" }}>{selectedDevice.satellites}</span>

                    <span>Pin</span>
                    <span style={{ color: "#e2e8f0" }}>{selectedDevice.battery}%</span>

                    <span>Tọa độ</span>
                    <span style={{ color: "#cbd5e1" }}>
                      {selectedDevice.lat.toFixed(4)}, {selectedDevice.lng.toFixed(4)}
                    </span>
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>
      </div>
    </div>
  );
}
