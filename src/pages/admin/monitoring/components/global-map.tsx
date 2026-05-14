import { useRef, useCallback, useState } from "react";
import Map, {
  Marker, Popup, Source, Layer, NavigationControl, FullscreenControl,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Navigation as NavIcon, ScanSearch, MapPin, User, X,
} from "lucide-react";
import type { GlobalDevice } from "@/types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

const STATUS_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  online: { bg: "#10b981", border: "#34d399", glow: "rgba(16,185,129,0.4)" },
  offline: { bg: "#ef4444", border: "#f87171", glow: "rgba(239,68,68,0.3)" },
  maintenance: { bg: "#f59e0b", border: "#fbbf24", glow: "rgba(245,158,11,0.3)" },
};

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number) {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function circleGeoJSON(lat: number, lng: number, radiusM: number, steps = 64): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: number[][] = [];
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * 2 * Math.PI;
    const dlat = (radiusM / 6371000) * (180 / Math.PI);
    const dlng = dlat / Math.cos((lat * Math.PI) / 180);
    coords.push([lng + dlng * Math.cos(angle), lat + dlat * Math.sin(angle)]);
  }
  return { type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [coords] } };
}

interface GlobalMapProps {
  devices: GlobalDevice[];
}

export function GlobalMap({ devices }: GlobalMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [selected, setSelected] = useState<GlobalDevice | null>(null);

  // Nearby search
  const [searchCenter, setSearchCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [radius, setRadius] = useState("500");
  const [nearbyResults, setNearbyResults] = useState<GlobalDevice[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);

  const onlineCount = devices.filter((d) => d.status === "online").length;

  const onMapLoad = useCallback(() => {
    const map = mapRef.current;
    if (!map || devices.length === 0) return;
    const bounds = devices.reduce(
      (b, d) => ({ minLng: Math.min(b.minLng, d.lng), maxLng: Math.max(b.maxLng, d.lng), minLat: Math.min(b.minLat, d.lat), maxLat: Math.max(b.maxLat, d.lat) }),
      { minLng: Infinity, maxLng: -Infinity, minLat: Infinity, maxLat: -Infinity }
    );
    map.fitBounds([[bounds.minLng - 0.02, bounds.minLat - 0.02], [bounds.maxLng + 0.02, bounds.maxLat + 0.02]], { padding: 60, duration: 1000 });
  }, [devices]);

  const handleMapClick = (e: mapboxgl.MapLayerMouseEvent) => {
    if (!isSearchMode) return;
    const { lat, lng } = e.lngLat;
    setSearchCenter({ lat, lng });
    const r = Number(radius) || 500;
    const results = devices.filter((d) => haversineDistance(lat, lng, d.lat, d.lng) <= r);
    setNearbyResults(results);
  };

  const toggleSearch = () => {
    if (isSearchMode) {
      setIsSearchMode(false);
      setSearchCenter(null);
      setNearbyResults([]);
    } else {
      setIsSearchMode(true);
    }
  };

  return (
    <Card className="flex flex-col overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="px-5 pt-4 pb-3 space-y-0">
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
                <NavIcon className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Global Map — Tất cả thiết bị</CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">{onlineCount}/{devices.length} online</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 border-emerald-500/30 text-emerald-500 gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />LIVE
              </Badge>
              <Button variant={isSearchMode ? "default" : "outline"} size="sm" className="h-8 text-xs gap-1.5" onClick={toggleSearch}>
                <ScanSearch className="h-3.5 w-3.5" />
                {isSearchMode ? "Tắt Nearby" : "Nearby Search"}
              </Button>
            </div>
          </div>
          {/* Nearby search controls */}
          {isSearchMode && (
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
              <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
              <span className="text-xs text-muted-foreground">Click bản đồ để chọn tâm, rồi nhập bán kính:</span>
              <Input type="number" value={radius} onChange={(e) => setRadius(e.target.value)}
                className="h-7 w-[80px] text-xs bg-background/50" min={100} max={50000} />
              <span className="text-xs text-muted-foreground">m</span>
              {searchCenter && (
                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 border-primary/30 text-primary ml-auto">
                  {nearbyResults.length} tìm thấy
                </Badge>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 relative">
        <div className="h-[550px] w-full">
          <Map ref={mapRef}
            initialViewState={{ latitude: 21.028, longitude: 105.854, zoom: 12 }}
            mapboxAccessToken={MAPBOX_TOKEN} mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{ width: "100%", height: "100%", cursor: isSearchMode ? "crosshair" : "grab" }}
            onLoad={onMapLoad} onClick={handleMapClick} attributionControl={false}
          >
            <NavigationControl position="top-right" showCompass={false} />
            <FullscreenControl position="top-right" />

            {/* Search radius circle */}
            {searchCenter && (
              <Source id="search-radius" type="geojson" data={circleGeoJSON(searchCenter.lat, searchCenter.lng, Number(radius) || 500)}>
                <Layer id="search-radius-fill" type="fill" paint={{ "fill-color": "#3b82f6", "fill-opacity": 0.1 }} />
                <Layer id="search-radius-line" type="line" paint={{ "line-color": "#3b82f6", "line-width": 2, "line-dasharray": [4, 2] }} />
              </Source>
            )}

            {/* Search center marker */}
            {searchCenter && (
              <Marker latitude={searchCenter.lat} longitude={searchCenter.lng} anchor="center">
                <div className="flex h-4 w-4 items-center justify-center rounded-full bg-primary border-2 border-white shadow-lg">
                  <span className="text-[6px] font-bold text-white">+</span>
                </div>
              </Marker>
            )}

            {/* Device markers */}
            {devices.map((device) => {
              const colors = STATUS_COLORS[device.status];
              const isHighlighted = nearbyResults.some((d) => d.id === device.id);
              const dimmed = searchCenter && !isHighlighted;
              return (
                <Marker key={device.id} latitude={device.lat} longitude={device.lng} anchor="center"
                  onClick={(e) => { e.originalEvent.stopPropagation(); setSelected(device); }}
                  style={{ cursor: "pointer", opacity: dimmed ? 0.3 : 1, transition: "opacity 0.3s" }}
                >
                  {device.status === "online" && !dimmed && (
                    <span className="absolute rounded-full animate-ping" style={{ width: 24, height: 24, top: -6, left: -6, backgroundColor: colors.bg + "30", animationDuration: "2.5s" }} />
                  )}
                  <div className="rounded-full border-2 shadow-lg flex items-center justify-center" style={{ width: 14, height: 14, backgroundColor: colors.bg, borderColor: colors.border, boxShadow: `0 0 8px ${colors.glow}` }}>
                    <span className="text-white font-bold" style={{ fontSize: 6 }}>●</span>
                  </div>
                </Marker>
              );
            })}

            {selected && (
              <Popup latitude={selected.lat} longitude={selected.lng} anchor="bottom" onClose={() => setSelected(null)} closeOnClick={false} maxWidth="260px">
                <div style={{ fontFamily: "system-ui", padding: "2px 0" }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: 13, color: "#e2e8f0" }}>{selected.name}</p>
                  <p style={{ margin: "2px 0 6px", fontSize: 11, color: "#94a3b8", fontFamily: "monospace" }}>{selected.id}</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "3px 12px", fontSize: 11, color: "#94a3b8" }}>
                    <span>Chủ sở hữu</span>
                    <span style={{ fontWeight: 600, color: "#60a5fa" }}>{selected.ownerEmail}</span>
                    <span>Status</span>
                    <span style={{ fontWeight: 600, color: selected.status === "online" ? "#10b981" : selected.status === "offline" ? "#ef4444" : "#f59e0b" }}>{selected.status.toUpperCase()}</span>
                    <span>Battery</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#e2e8f0" }}>{selected.battery}%</span>
                    <span>Speed</span>
                    <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#e2e8f0" }}>{selected.speed} km/h</span>
                  </div>
                </div>
              </Popup>
            )}
          </Map>
        </div>

        {/* Nearby results sidebar overlay */}
        {searchCenter && nearbyResults.length > 0 && (
          <div className="absolute top-3 left-3 w-[240px] rounded-lg bg-card/95 backdrop-blur-md border border-border/50 shadow-xl overflow-hidden">
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/30">
              <span className="text-xs font-semibold">Thiết bị lân cận</span>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setSearchCenter(null); setNearbyResults([]); }}>
                <X className="h-3 w-3" />
              </Button>
            </div>
            <ScrollArea className="h-[200px]">
              <div className="p-2 space-y-1">
                {nearbyResults.map((d) => {
                  const dist = haversineDistance(searchCenter.lat, searchCenter.lng, d.lat, d.lng);
                  return (
                    <div key={d.id} className="rounded-md p-2 hover:bg-accent/30 cursor-pointer transition-colors" onClick={() => setSelected(d)}>
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full" style={{ backgroundColor: STATUS_COLORS[d.status].bg }} />
                        <p className="text-xs font-semibold truncate flex-1">{d.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><User className="h-2.5 w-2.5" />{d.ownerEmail.split("@")[0]}</span>
                        <span className="text-[9px] text-muted-foreground ml-auto font-mono">{dist < 1000 ? `${Math.round(dist)}m` : `${(dist / 1000).toFixed(1)}km`}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
