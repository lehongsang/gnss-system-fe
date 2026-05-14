import { useRef, useCallback, useState } from "react";
import Map, {
  Source,
  Layer,
  Marker,
  NavigationControl,
  FullscreenControl,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Route, CalendarDays, Play, Pause, MapPin } from "lucide-react";
import type { TelemetryPoint, GeofenceZone } from "@/types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

interface TelemetryMapProps {
  telemetry: TelemetryPoint[];
  geofences?: GeofenceZone[];
  deviceName: string;
  isLoading?: boolean;
  dateFrom: string;
  dateTo: string;
  onDateFromChange: (val: string) => void;
  onDateToChange: (val: string) => void;
}

function toGeoJSONLine(
  points: TelemetryPoint[]
): GeoJSON.Feature<GeoJSON.LineString> {
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "LineString",
      coordinates: points.map((p) => [p.lng, p.lat]),
    },
  };
}

function toGeoJSONPolygon(
  paths: { lat: number; lng: number }[]
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coordinates = paths.map((p) => [p.lng, p.lat]);
  if (coordinates.length > 0) {
    coordinates.push(coordinates[0]);
  }
  return {
    type: "Feature",
    properties: {},
    geometry: {
      type: "Polygon",
      coordinates: [coordinates],
    },
  };
}

export function TelemetryMap({
  telemetry,
  geofences = [],
  deviceName,
  isLoading,
  dateFrom,
  dateTo,
  onDateFromChange,
  onDateToChange,
}: TelemetryMapProps) {
  const mapRef = useRef<MapRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playIndex, setPlayIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Playback logic
  const startPlayback = () => {
    if (isPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setIsPlaying(false);
      return;
    }
    setIsPlaying(true);
    setPlayIndex(0);
    intervalRef.current = setInterval(() => {
      setPlayIndex((prev) => {
        if (prev >= telemetry.length - 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          setIsPlaying(false);
          return telemetry.length - 1;
        }
        return prev + 1;
      });
    }, 500);
  };

  const currentPoint = telemetry[playIndex];
  const visiblePoints = telemetry.slice(0, playIndex + 1);

  // Fit bounds on map load
  const onMapLoad = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;

    let minLng = Infinity;
    let maxLng = -Infinity;
    let minLat = Infinity;
    let maxLat = -Infinity;

    telemetry.forEach((p) => {
      minLng = Math.min(minLng, p.lng);
      maxLng = Math.max(maxLng, p.lng);
      minLat = Math.min(minLat, p.lat);
      maxLat = Math.max(maxLat, p.lat);
    });

    geofences.forEach((geo) => {
      geo.paths.forEach((p) => {
        minLng = Math.min(minLng, p.lng);
        maxLng = Math.max(maxLng, p.lng);
        minLat = Math.min(minLat, p.lat);
        maxLat = Math.max(maxLat, p.lat);
      });
    });

    if (minLng === Infinity) return;

    map.fitBounds(
      [
        [minLng, minLat],
        [maxLng, maxLat],
      ],
      { padding: 50, duration: 1000 }
    );
  }, [telemetry, geofences]);

  return (
    <Card className="flex flex-col overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="px-5 pt-4 pb-3 space-y-0">
        <div className="flex flex-col gap-3">
          {/* Title row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                <Route className="h-4 w-4" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  Lịch sử hành trình
                </CardTitle>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {deviceName} · {telemetry.length} điểm telemetry
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono px-2 py-0.5 border-indigo-500/30 text-indigo-400"
            >
              <MapPin className="h-3 w-3 mr-1" />
              Polyline
            </Badge>
          </div>

          {/* Date Range Picker row */}
          <div className="flex items-center gap-2 flex-wrap">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
            <div className="flex items-center gap-1.5">
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => onDateFromChange(e.target.value)}
                className="h-8 w-[140px] text-xs bg-background/50"
              />
              <span className="text-xs text-muted-foreground">→</span>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => onDateToChange(e.target.value)}
                className="h-8 w-[140px] text-xs bg-background/50"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant={isPlaying ? "destructive" : "default"}
                size="sm"
                className="h-8 text-xs gap-1.5"
                onClick={startPlayback}
                disabled={telemetry.length === 0}
              >
                {isPlaying ? (
                  <Pause className="h-3.5 w-3.5" />
                ) : (
                  <Play className="h-3.5 w-3.5" />
                )}
                {isPlaying ? "Dừng" : "Phát lại"}
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0 relative">
        <div className="h-[520px] w-full">
          {isLoading ? (
            <div className="h-full w-full flex items-center justify-center bg-muted/20">
              <div className="flex flex-col items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-4 w-32" />
              </div>
            </div>
          ) : (
            <Map
              ref={mapRef}
              initialViewState={{
                latitude: telemetry[0]?.lat ?? 21.028,
                longitude: telemetry[0]?.lng ?? 105.854,
                zoom: 14,
              }}
              mapboxAccessToken={MAPBOX_TOKEN}
              mapStyle="mapbox://styles/mapbox/dark-v11"
              style={{ width: "100%", height: "100%" }}
              onLoad={onMapLoad}
              attributionControl={false}
            >
              <NavigationControl position="top-right" showCompass={false} />
              <FullscreenControl position="top-right" />

              {/* Geofences */}
              {geofences.map((geo) => (
                <Source
                  key={`geo-${geo.id}`}
                  id={`geo-${geo.id}`}
                  type="geojson"
                  data={toGeoJSONPolygon(geo.paths)}
                >
                  <Layer
                    id={`geo-fill-${geo.id}`}
                    type="fill"
                    paint={{
                      "fill-color": geo.color || "#3b82f6",
                      "fill-opacity": 0.2,
                    }}
                  />
                  <Layer
                    id={`geo-line-${geo.id}`}
                    type="line"
                    paint={{
                      "line-color": geo.color || "#3b82f6",
                      "line-width": 2,
                    }}
                  />
                </Source>
              ))}

              {/* Full route polyline (dimmed) */}
              {telemetry.length > 1 && (
                <Source
                  id="telemetry-full"
                  type="geojson"
                  data={toGeoJSONLine(telemetry)}
                >
                  <Layer
                    id="telemetry-full-line"
                    type="line"
                    paint={{
                      "line-color": "#6366f1",
                      "line-width": 3,
                      "line-opacity": 0.25,
                    }}
                  />
                </Source>
              )}

              {/* Played route polyline (bright) */}
              {isPlaying && visiblePoints.length > 1 && (
                <Source
                  id="telemetry-played"
                  type="geojson"
                  data={toGeoJSONLine(visiblePoints)}
                >
                  <Layer
                    id="telemetry-played-line"
                    type="line"
                    paint={{
                      "line-color": "#818cf8",
                      "line-width": 4,
                      "line-opacity": 0.9,
                    }}
                  />
                </Source>
              )}

              {/* Start Marker */}
              {telemetry.length > 0 && (
                <Marker
                  latitude={telemetry[0].lat}
                  longitude={telemetry[0].lng}
                  anchor="center"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 border-2 border-emerald-300 shadow-lg">
                    <span className="text-[8px] font-bold text-white">S</span>
                  </div>
                </Marker>
              )}

              {/* End Marker */}
              {telemetry.length > 1 && (
                <Marker
                  latitude={telemetry[telemetry.length - 1].lat}
                  longitude={telemetry[telemetry.length - 1].lng}
                  anchor="center"
                >
                  <div className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 border-2 border-red-300 shadow-lg">
                    <span className="text-[8px] font-bold text-white">E</span>
                  </div>
                </Marker>
              )}

              {/* Current playback position marker */}
              {isPlaying && currentPoint && (
                <Marker
                  latitude={currentPoint.lat}
                  longitude={currentPoint.lng}
                  anchor="center"
                >
                  <div className="relative">
                    <span
                      className="absolute rounded-full bg-indigo-500/30 animate-ping"
                      style={{
                        width: 28,
                        height: 28,
                        top: -8,
                        left: -8,
                        animationDuration: "1.5s",
                      }}
                    />
                    <div className="flex h-3 w-3 items-center justify-center rounded-full bg-indigo-500 border-2 border-white shadow-lg" />
                  </div>
                </Marker>
              )}
            </Map>
          )}
        </div>

        {/* Playback info overlay */}
        {currentPoint && !isLoading && (
          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between rounded-lg bg-card/90 backdrop-blur-md border border-border/50 px-4 py-2.5 shadow-lg">
            <div className="flex items-center gap-6">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                  Tốc độ
                </p>
                <p className="text-sm font-bold font-mono">
                  {currentPoint.speed}{" "}
                  <span className="text-[10px] text-muted-foreground font-normal">
                    km/h
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                  Tọa độ
                </p>
                <p className="text-[10px] font-mono text-muted-foreground">
                  {currentPoint.lat.toFixed(4)}, {currentPoint.lng.toFixed(4)}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                Thời gian
              </p>
              <p className="text-xs font-mono">
                {new Date(currentPoint.timestamp).toLocaleTimeString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && telemetry.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <Route className="h-8 w-8 text-muted-foreground/30" />
              <p className="text-sm font-medium">Chưa có dữ liệu hành trình</p>
              <p className="text-xs text-muted-foreground/70">
                Thử thay đổi khoảng thời gian
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
