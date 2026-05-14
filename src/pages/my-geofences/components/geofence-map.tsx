import { useRef, useCallback } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  FullscreenControl,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Pentagon, MousePointer2 } from "lucide-react";
import type { GeofenceZone } from "@/types";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

interface GeofenceMapProps {
  geofences: GeofenceZone[];
  selectedId: string | null;
  onSelectGeofence: (id: string | null) => void;
  isDrawing: boolean;
  drawPoints: { lat: number; lng: number }[];
  onMapClick: (lat: number, lng: number) => void;
}

function makeCounterClockwise(coords: number[][]) {
  if (coords.length < 4) return coords;
  let sum = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const cur = coords[i];
    const next = coords[i + 1];
    sum += (next[0] - cur[0]) * (next[1] + cur[1]);
  }
  // If sum > 0, it's clockwise, so reverse it
  if (sum > 0) {
    coords.reverse();
  }
  return coords;
}

function geofenceToGeoJSON(
  zone: GeofenceZone
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords = zone.paths.map((p) => [p.lng, p.lat]);
  if (coords.length > 0) {
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) {
      coords.push([...first]);
    }
  }
  makeCounterClockwise(coords);
  return {
    type: "Feature",
    properties: { id: zone.id, name: zone.name, color: zone.color },
    geometry: { type: "Polygon", coordinates: [coords] },
  };
}

function drawPointsToGeoJSON(
  points: { lat: number; lng: number }[]
): GeoJSON.Feature<GeoJSON.Polygon | GeoJSON.LineString> {
  const coords = points.map((p) => [p.lng, p.lat]);
  if (points.length >= 3) {
    coords.push(coords[0]);
    makeCounterClockwise(coords);
    return {
      type: "Feature",
      properties: {},
      geometry: { type: "Polygon", coordinates: [coords] },
    };
  }
  return {
    type: "Feature",
    properties: {},
    geometry: { type: "LineString", coordinates: coords },
  };
}

export function GeofenceMap({
  geofences,
  selectedId,
  isDrawing,
  drawPoints,
  onMapClick,
  onSelectGeofence,
}: GeofenceMapProps) {
  const mapRef = useRef<MapRef>(null);

  const onMapLoad = useCallback(() => {
    const map = mapRef.current;
    if (!map || geofences.length === 0) return;

    const allPoints = geofences.flatMap((g) => g.paths);
    if (allPoints.length === 0) return;

    const bounds = allPoints.reduce(
      (b, p) => ({
        minLng: Math.min(b.minLng, p.lng),
        maxLng: Math.max(b.maxLng, p.lng),
        minLat: Math.min(b.minLat, p.lat),
        maxLat: Math.max(b.maxLat, p.lat),
      }),
      {
        minLng: Infinity,
        maxLng: -Infinity,
        minLat: Infinity,
        maxLat: -Infinity,
      }
    );

    map.fitBounds(
      [
        [bounds.minLng - 0.01, bounds.minLat - 0.01],
        [bounds.maxLng + 0.01, bounds.maxLat + 0.01],
      ],
      { padding: 60, duration: 1000 }
    );
  }, [geofences]);

  const handleClick = (e: mapboxgl.MapLayerMouseEvent) => {
    if (isDrawing) {
      onMapClick(e.lngLat.lat, e.lngLat.lng);
      return;
    }
    const features = e.features;
    if (features && features.length > 0) {
      const clickedId = features[0].properties?.id;
      if (clickedId) {
        onSelectGeofence(clickedId);
        return;
      }
    }
    onSelectGeofence(null);
  };

  return (
    <Card className="flex flex-col overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="px-5 pt-4 pb-3 space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-500">
              <Pentagon className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                Bản đồ Geofence
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {geofences.length} vùng đã tạo
              </p>
            </div>
          </div>
          {isDrawing && (
            <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] animate-pulse">
              <MousePointer2 className="h-3 w-3 mr-1" />
              Đang vẽ — Click để đặt điểm ({drawPoints.length} điểm)
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <div className="h-[600px] w-full">
          <Map
            ref={mapRef}
            initialViewState={{
              latitude: 21.004,
              longitude: 105.846,
              zoom: 14,
            }}
            mapboxAccessToken={MAPBOX_TOKEN}
            mapStyle="mapbox://styles/mapbox/dark-v11"
            style={{
              width: "100%",
              height: "100%",
              cursor: isDrawing ? "crosshair" : "grab",
            }}
            onLoad={onMapLoad}
            onClick={handleClick}
            attributionControl={false}
            interactiveLayerIds={
              !isDrawing ? geofences.map((g) => `geofence-fill-${g.id}`) : undefined
            }
          >
            <NavigationControl position="top-right" showCompass={false} />
            <FullscreenControl position="top-right" />

            {/* Existing geofences */}
            {geofences.map((geo) => {
              const isSelected = geo.id === selectedId;
              return (
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
                      "fill-opacity": isSelected ? 0.3 : 0.15,
                    }}
                  />
                  <Layer
                    id={`geofence-line-${geo.id}`}
                    type="line"
                    paint={{
                      "line-color": geo.color,
                      "line-width": isSelected ? 3 : 2,
                      "line-dasharray": isSelected ? [1, 0] : [4, 2],
                    }}
                  />
                </Source>
              );
            })}

            {/* Drawing preview */}
            {isDrawing && drawPoints.length >= 2 && (
              <Source
                id="draw-preview"
                type="geojson"
                data={drawPointsToGeoJSON(drawPoints)}
              >
                {drawPoints.length >= 3 ? (
                  <>
                    <Layer
                      id="draw-fill"
                      type="fill"
                      paint={{
                        "fill-color": "#3b82f6",
                        "fill-opacity": 0.2,
                      }}
                    />
                    <Layer
                      id="draw-line"
                      type="line"
                      paint={{
                        "line-color": "#3b82f6",
                        "line-width": 2,
                        "line-dasharray": [4, 2],
                      }}
                    />
                  </>
                ) : (
                  <Layer
                    id="draw-line"
                    type="line"
                    paint={{
                      "line-color": "#3b82f6",
                      "line-width": 2,
                      "line-dasharray": [4, 2],
                    }}
                  />
                )}
              </Source>
            )}
          </Map>
        </div>
      </CardContent>
    </Card>
  );
}
