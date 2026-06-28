import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { AppHeader } from "@/components/app-header";
import Map, {
  Marker,
  NavigationControl,
  FullscreenControl,
  Source,
  Layer,
  type MapRef,
} from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { toast } from "sonner";
import { io, Socket } from "socket.io-client";
import {
  useDevicesControllerFindMine,
  useTelemetryControllerGetLatest,
  useRoutePlansControllerPreview,
  useRoutePlansControllerCreate,
  useRoutePlansControllerFindMine,
  useRoutePlansControllerActivate,
  useRoutePlansControllerComplete,
  useRoutePlansControllerCancel,
  useRoutePlansControllerRemove,
} from "@/services/apis/gen/queries";
import {
  MapPin,
  Route,
  Play,
  StopCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RefreshCcw,
  Check,
  Compass,
  AlertTriangle,
  Search,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import type { UserDevice } from "@/types";
import { authClient } from "@/utils/auth-client";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const STATUS_CONFIG = {
  planned: { label: "Đã lên kế hoạch", color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
  active: { label: "Đang hoạt động", color: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20" },
  completed: { label: "Đã hoàn thành", color: "bg-slate-500/10 text-slate-400 border-slate-500/20" },
  cancelled: { label: "Đã hủy", color: "bg-red-500/10 text-red-400 border-red-500/20" },
};

interface RoutePlan {
  id: string;
  name: string;
  status: string;
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
  profile?: string;
  deviationThresholdMeters: number;
  distanceMeters: number;
  durationSeconds: number;
  geom?: { type: "LineString"; coordinates: [number, number][] };
}

interface PlaceSuggestion {
  id: string;
  mapboxId: string;
  name: string;
  fullAddress: string;
}

const generateUUID = () => {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

export default function RoutePlanningPage() {
  const mapRef = useRef<MapRef>(null);
  const socketRef = useRef<Socket | null>(null);
  const sessionTokenRef = useRef<string>("");

  const getSessionToken = () => {
    if (!sessionTokenRef.current) {
      sessionTokenRef.current = generateUUID();
    }
    return sessionTokenRef.current;
  };

  const resetSessionToken = () => {
    sessionTokenRef.current = generateUUID();
  };

  const { data: session } = authClient.useSession();
  const currentUser = session?.user;

  // UI Control states
  const [manualSelectedId, setManualSelectedId] = useState<string>("");
  const [routeName, setRouteName] = useState<string>("");
  const [mode, setMode] = useState<"driving" | "walking" | "cycling">("driving");
  const [deviationThresholdMeters, setDeviationThresholdMeters] = useState<number>(50);
  const [isChoosingDest, setIsChoosingDest] = useState<boolean>(false);
  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState<boolean>(false);
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState<boolean>(false);

  // Map coordinate states
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [destination, setDestination] = useState<{ lat: number; lng: number } | null>(null);
  const [previewRoute, setPreviewRoute] = useState<{
    distanceMeters: number;
    durationSeconds: number;
    geojson?: { type: "LineString"; coordinates: [number, number][] };
  } | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);

  // Search destination states
  const [searchText, setSearchText] = useState<string>(" ");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [destinationLabel, setDestinationLabel] = useState<string>("");

  // Devices WebSocket real-time position
  const [realtimeTelemetry, setRealtimeTelemetry] = useState<{
    lat: number;
    lng: number;
    speed?: number;
    heading?: number;
  } | null>(null);

  // Queries
  const { data: devicesResponse, isLoading: isLoadingDevices } = useDevicesControllerFindMine();

  const devices = useMemo(() => {
    const rawDevices = (devicesResponse as { data?: UserDevice[] })?.data;
    return Array.isArray(rawDevices) ? rawDevices : [];
  }, [devicesResponse]);

  // Derive selected device: use manually selected, or default to first available
  const selectedDeviceId = manualSelectedId || (devices.length > 0 ? devices[0].id : "");

  // Find selected device object
  const activeDevice = useMemo(
    () => devices.find((d) => d.id === selectedDeviceId),
    [devices, selectedDeviceId]
  );

  // Fetch latest telemetry for selected device
  const { data: latestTelemetryResponse, refetch: refetchLatestTelemetry } =
    useTelemetryControllerGetLatest(selectedDeviceId, {
      query: { enabled: !!selectedDeviceId },
    });

  // Fetch mine route plans
  const routeParams = useMemo(
    () => ({
      deviceId: selectedDeviceId || undefined,
      limit: 50,
    }),
    [selectedDeviceId]
  );
  
  const { data: routesResponse, isLoading: isLoadingRoutes, refetch: refetchRoutes } =
    useRoutePlansControllerFindMine(routeParams, {
      query: { enabled: !!selectedDeviceId },
    });
  
  const routePlans = useMemo(() => {
    const raw = (routesResponse as { data?: RoutePlan[] })?.data;
    return Array.isArray(raw) ? raw : [];
  }, [routesResponse]);

  // Active route in routePlans
  const activeRoutePlan = useMemo(
    () => routePlans.find((r: RoutePlan) => r.status === "active"),
    [routePlans]
  );

  // Track previous device ID to reset state during render (avoids synchronous setState in useEffect)
  const [prevDeviceId, setPrevDeviceId] = useState<string>("");
  if (selectedDeviceId !== prevDeviceId) {
    setPrevDeviceId(selectedDeviceId);
    setOrigin(null);
    setDestination(null);
    setPreviewRoute(null);
    setSelectedRouteId(null);
    setRealtimeTelemetry(null);
    setSearchText("");
    setDestinationLabel("");
    setSuggestions([]);
  }

  // Handle selected device changes (fetch side effects only)
  useEffect(() => {
    if (selectedDeviceId) {
      refetchLatestTelemetry();
      refetchRoutes();
    }
  }, [selectedDeviceId, refetchLatestTelemetry, refetchRoutes]);

  // Track latest telemetry response to set starting origin during render
  const [prevLatestTelemetry, setPrevLatestTelemetry] = useState<unknown>(null);
  if (latestTelemetryResponse !== prevLatestTelemetry) {
    setPrevLatestTelemetry(latestTelemetryResponse);
    const lat = (latestTelemetryResponse as { lat?: number })?.lat;
    const lng = (latestTelemetryResponse as { lng?: number })?.lng;
    if (lat && lng) {
      setOrigin({ lat, lng });
    }
  }

  // Center map to origin when starting position is determined
  useEffect(() => {
    if (origin && mapRef.current) {
      mapRef.current.flyTo({ center: [origin.lng, origin.lat], zoom: 14 });
    }
  }, [origin]);

  // Fetch suggestions from Mapbox Geocoding API
  const fetchSuggestions = useCallback(async (query: string) => {
    if (!query || query.trim().length < 2 || !MAPBOX_TOKEN) {
      setSuggestions([]);
      return;
    }
    
    setIsSearching(true);
    try {
      // Build proximity string based on origin (telemetry) or map center
      let proximity = "";
      if (origin) {
        proximity = `&proximity=${origin.lng},${origin.lat}`;
      } else if (mapRef.current) {
        const center = mapRef.current.getCenter();
        proximity = `&proximity=${center.lng},${center.lat}`;
      }

      const token = getSessionToken();
      const url = `https://api.mapbox.com/search/searchbox/v1/suggest?q=${encodeURIComponent(
        query
      )}&country=VN&language=vi&limit=5${proximity}&types=poi,address,street,place&session_token=${token}&access_token=${MAPBOX_TOKEN}`;

      const res = await fetch(url);
      if (!res.ok) throw new Error("Search failed");
      const data = await res.json();

      if (data && Array.isArray(data.suggestions)) {
        const mapped = (data.suggestions as Array<{
          mapbox_id: string;
          name: string;
          full_address?: string;
          place_formatted?: string;
        }>).map((item) => {
          return {
            id: item.mapbox_id,
            mapboxId: item.mapbox_id,
            name: item.name,
            fullAddress: item.full_address ?? item.place_formatted ?? "",
          };
        });
        setSuggestions(mapped);
      } else {
        setSuggestions([]);
      }
    } catch (err) {
      console.error("Geocoding error", err);
      setSuggestions([]);
    } finally {
      setIsSearching(false);
    }
  }, [origin]);

  // Debounce search suggestions query
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      const trimmed = searchText.trim();
      if (trimmed && trimmed !== destinationLabel) {
        fetchSuggestions(trimmed);
      } else {
        setSuggestions([]);
      }
    }, 400);

    return () => clearTimeout(delayDebounceFn);
  }, [searchText, destinationLabel, fetchSuggestions]);

  // Synthesize custom warning sound for route deviation
  const playDeviationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      
      // Siren sweeping effect
      const playBeep = (freq: number, start: number, duration: number) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, start);
        osc.frequency.linearRampToValueAtTime(freq * 1.5, start + duration);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.01, start + duration);
        osc.start(start);
        osc.stop(start + duration);
      };

      const now = ctx.currentTime;
      playBeep(440, now, 0.25);
      playBeep(440, now + 0.3, 0.25);
      playBeep(660, now + 0.6, 0.4);
    } catch {
      /* ignore audio error */
    }
  };

  // Connect WebSocket & Join Room
  useEffect(() => {
    if (!selectedDeviceId || !currentUser?.id) return;

    // Establish WebSocket Connection
    const socket = io(`${API_URL}/gnss`, {
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      // Subscribe to device updates
      socket.emit("subscribe:device", selectedDeviceId);
      // Join user room for alerts
      socket.emit("join:user", currentUser.id);
    });

    // Handle telemetry update
    socket.on("telemetry:update", (data: { deviceId: string; lat: number; lng: number; speed?: number; heading?: number }) => {
      if (data.deviceId === selectedDeviceId) {
        setRealtimeTelemetry({
          lat: data.lat,
          lng: data.lng,
          speed: data.speed,
          heading: data.heading,
        });
      }
    });

    // Handle trajectory deviation alert
    socket.on("alert:new", (alert: { alertType: string; deviceId: string; message: string; lat?: number; lng?: number }) => {
      if (alert.alertType === "trajectory_deviation" && alert.deviceId === selectedDeviceId) {
        playDeviationSound();
        toast.error(`🚨 CẢNH BÁO LỆCH TUYẾN!`, {
          description: alert.message,
          duration: 10000,
          action: {
            label: "Xem bản đồ",
            onClick: () => {
              if (mapRef.current && alert.lat && alert.lng) {
                mapRef.current.flyTo({ center: [alert.lng, alert.lat], zoom: 16 });
              }
            },
          },
        });
      }
    });

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [selectedDeviceId, currentUser]);

  // Mutations
  const previewMutation = useRoutePlansControllerPreview();
  const createMutation = useRoutePlansControllerCreate();
  const activateMutation = useRoutePlansControllerActivate();
  const completeMutation = useRoutePlansControllerComplete();
  const cancelMutation = useRoutePlansControllerCancel();
  const removeMutation = useRoutePlansControllerRemove();

  // Handle select suggestion from Search Box suggest
  const handleSelectSuggestion = async (suggestion: PlaceSuggestion) => {
    const token = getSessionToken();
    try {
      const url = `https://api.mapbox.com/search/searchbox/v1/retrieve/${suggestion.mapboxId}?session_token=${token}&access_token=${MAPBOX_TOKEN}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Retrieve failed");
      const data = await res.json();
      
      const feature = data.features?.[0];
      if (feature && feature.geometry?.coordinates) {
        const [lng, lat] = feature.geometry.coordinates;
        const center = { lat, lng };
        const label = feature.properties?.full_address ?? feature.properties?.name ?? suggestion.name;
        
        setDestination(center);
        setDestinationLabel(label);
        setSearchText(label);
        setSuggestions([]);
        
        // Reset session token for the next search
        resetSessionToken();

        // Fly map to destination
        if (mapRef.current) {
          mapRef.current.flyTo({
            center: [lng, lat],
            zoom: 15,
            essential: true,
          });
        }

        toast.success("Đã chọn điểm đến thành công", {
          description: suggestion.name,
        });
      }
    } catch (err) {
      console.error("Retrieve error", err);
      toast.error("Không thể lấy tọa độ của địa điểm này.");
    }
  };

  // Clear selected destination and search text
  const handleClearDestination = () => {
    setDestination(null);
    setDestinationLabel("");
    setSearchText("");
    setPreviewRoute(null);
    setSuggestions([]);
  };

  // Handle map click to set destination
  const handleMapClick = (e: { lngLat: { lng: number; lat: number } }) => {
    if (!isChoosingDest) return;
    const { lng, lat } = e.lngLat;
    setDestination({ lat, lng });
    const formattedCoord = `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
    setDestinationLabel(`Toạ độ chọn trên bản đồ: ${formattedCoord}`);
    setSearchText(formattedCoord);
    setIsChoosingDest(false);
    toast.success("Đã chọn điểm đến thành công", {
      description: `Tọa độ: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
    });
  };

  // 1. Preview Route Action
  const handlePreviewRoute = () => {
    if (!origin) {
      toast.warning("Thiết bị chưa có vị trí xuất phát. Vui lòng thử lại sau khi có tín hiệu định vị.");
      return;
    }
    if (!destination) {
      toast.warning("Vui lòng click chọn điểm đến trên bản đồ trước.");
      return;
    }

    previewMutation.mutate(
      {
        data: {
          origin: { lat: origin.lat, lng: origin.lng },
          destination: { lat: destination.lat, lng: destination.lng },
          mode,
        },
      },
      {
        onSuccess: (res: unknown) => {
          const data = res as {
            distanceMeters: number;
            durationSeconds: number;
            geojson?: { type: "LineString"; coordinates: [number, number][] };
          };
          setPreviewRoute(data);
          toast.success("Tìm tuyến đường thành công!", {
            description: `Quãng đường: ${(data.distanceMeters / 1000).toFixed(2)} km, Thời gian: ${Math.round(data.durationSeconds / 60)} phút`,
          });
          
          // Fit map bounds to preview
          if (mapRef.current && data.geojson?.coordinates) {
            const bounds = data.geojson.coordinates.reduce(
              (b: mapboxgl.LngLatBounds, coord: [number, number]) => b.extend(coord),
              new window.mapboxgl.LngLatBounds()
            );
            mapRef.current.fitBounds(bounds, { padding: 60, duration: 1000 });
          }
        },
        onError: (err: unknown) => {
          const error = err as { response?: { data?: { message?: string } } };
          toast.error("Không tìm thấy tuyến đường", {
            description: error?.response?.data?.message || "Đường truyền Mapbox lỗi hoặc vị trí không thể tìm thấy tuyến đi phù hợp.",
          });
        },
      }
    );
  };

  // 2. Save Route Plan Action
  const handleSaveRoute = () => {
    if (!selectedDeviceId) return;
    if (!previewRoute) {
      toast.warning("Vui lòng bấm 'Xem trước tuyến' để hiển thị bản đồ trước khi lưu.");
      return;
    }
    const nameToSave = routeName.trim() || `Tuyến đường ${activeDevice?.name || "thực nghiệm"}`;

    createMutation.mutate(
      {
        data: {
          deviceId: selectedDeviceId,
          name: nameToSave,
          origin: { lat: origin!.lat, lng: origin!.lng },
          destination: { lat: destination!.lat, lng: destination!.lng },
          mode,
          deviationThresholdMeters,
        },
      },
      {
        onSuccess: () => {
          toast.success("Lưu tuyến đường thành công!", {
            description: `Tuyến "${nameToSave}" đã được lưu trữ ở trạng thái lên kế hoạch.`,
          });
          setRouteName("");
          setPreviewRoute(null);
          setDestination(null);
          setSearchText("");
          setDestinationLabel("");
          refetchRoutes();
        },
        onError: (err: unknown) => {
          const error = err as { response?: { data?: { message?: string } } };
          toast.error("Lưu tuyến đường thất bại", {
            description: error?.response?.data?.message || "Lỗi máy chủ khi lưu.",
          });
        },
      }
    );
  };

  // 3. Show Saved Route on Map
  const handleLoadSavedRoute = (route: RoutePlan) => {
    setSelectedRouteId(route.id);
    setOrigin({ lat: route.originLat, lng: route.originLng });
    setDestination({ lat: route.destinationLat, lng: route.destinationLng });
    const formattedCoord = `${route.destinationLat.toFixed(6)}, ${route.destinationLng.toFixed(6)}`;
    setDestinationLabel(route.name || `Tuyến đường ${formattedCoord}`);
    setSearchText(route.name || formattedCoord);
    setMode((route.profile?.split("/")?.[1] || "driving") as "driving" | "walking" | "cycling");
    setDeviationThresholdMeters(route.deviationThresholdMeters);

    // Convert coordinates in geom to LineString GeoJSON
    if (route.geom) {
      const distanceMeters = route.distanceMeters ?? 0;
      const durationSeconds = route.durationSeconds ?? 0;
      setPreviewRoute({
        distanceMeters,
        durationSeconds,
        geojson: route.geom,
      });

      // Fit map bounds
      if (mapRef.current && route.geom.coordinates) {
        const bounds = route.geom.coordinates.reduce(
          (b: mapboxgl.LngLatBounds, coord: [number, number]) => b.extend(coord),
          new window.mapboxgl.LngLatBounds()
        );
        mapRef.current.fitBounds(bounds, { padding: 80, duration: 1000 });
      }
    }
  };

  // 4. Activate Route Planning (Start monitor)
  const handleActivateRoute = (id: string) => {
    activateMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Bắt đầu giám sát tuyến thành công!", {
            description: "Hệ thống đang theo dõi hành trình của thiết bị này thời gian thực.",
          });
          refetchRoutes();
        },
        onError: (err: unknown) => {
          const error = err as { response?: { data?: { message?: string } } };
          toast.error("Bắt đầu giám sát thất bại", {
            description: error?.response?.data?.message || "Có lỗi xảy ra.",
          });
        },
      }
    );
  };

  // 5. Complete Route
  const handleCompleteRoute = (id: string) => {
    completeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Đã hoàn thành hành trình!", {
            description: "Dừng giám sát lệch tuyến cho thiết bị này.",
          });
          refetchRoutes();
        },
        onError: (err: unknown) => {
          const error = err as { response?: { data?: { message?: string } } };
          toast.error("Thực hiện thất bại", {
            description: error?.response?.data?.message || "Có lỗi xảy ra.",
          });
        },
      }
    );
  };

  // 6. Cancel Route
  const handleCancelRoute = (id: string) => {
    cancelMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.warning("Hành trình đã được hủy bỏ!", {
            description: "Đã hủy giám sát hành trình.",
          });
          refetchRoutes();
        },
        onError: (err: unknown) => {
          const error = err as { response?: { data?: { message?: string } } };
          toast.error("Thực hiện thất bại", {
            description: error?.response?.data?.message || "Có lỗi xảy ra.",
          });
        },
      }
    );
  };

  // 7. Delete Route
  const handleDeleteRoute = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Đã xóa tuyến đường.");
          if (selectedRouteId === id) {
            setSelectedRouteId(null);
            setPreviewRoute(null);
            setDestination(null);
          }
          refetchRoutes();
        },
        onError: (err: unknown) => {
          const error = err as { response?: { data?: { message?: string } } };
          toast.error("Xóa thất bại", {
            description: error?.response?.data?.message || "Có lỗi xảy ra.",
          });
        },
      }
    );
  };

  // Helper to get formatted GeoJSON source for map preview
  const routeGeoJSONSource = useMemo(() => {
    if (!previewRoute?.geojson) return null;
    return {
      type: "Feature",
      properties: {},
      geometry: previewRoute.geojson,
    };
  }, [previewRoute]);

  // Helper to format values
  const formatTime = (seconds: number) => {
    const mins = Math.round(seconds / 60);
    if (mins < 60) return `${mins} phút`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs} giờ ${remainingMins} phút`;
  };

  // Real-time device marker coordinates
  const deviceMarkerCoords = useMemo(() => {
    if (realtimeTelemetry?.lat && realtimeTelemetry?.lng) {
      return { lat: realtimeTelemetry.lat, lng: realtimeTelemetry.lng };
    }
    if (origin) {
      return { lat: origin.lat, lng: origin.lng };
    }
    return null;
  }, [realtimeTelemetry, origin]);

  return (
    <>
      <AppHeader
        title="Tìm đường & Giám sát lệch tuyến"
        breadcrumbs={[
          { label: "Theo dõi trực tiếp" },
          { label: "Tìm đường & Giám sát" },
        ]}
      />

      <div className="flex flex-1 flex-col p-0 min-h-[calc(100vh-64px)] overflow-hidden relative bg-background text-foreground">
        
        {/* MAP CANVAS */}
        <Map
          ref={mapRef}
          initialViewState={{
            latitude: 21.0285,
            longitude: 105.8542,
            zoom: 11,
          }}
          mapboxAccessToken={MAPBOX_TOKEN}
          mapStyle="mapbox://styles/mapbox/navigation-preview-night-v4"
          style={{ width: "100%", height: "100%" }}
          onClick={handleMapClick}
        >
          <NavigationControl position="bottom-right" showCompass={false} />
          <FullscreenControl position="bottom-right" />

          {/* Device Real-Time Marker */}
          {deviceMarkerCoords && (
            <Marker
              latitude={deviceMarkerCoords.lat}
              longitude={deviceMarkerCoords.lng}
              anchor="center"
            >
              <div className="relative flex flex-col items-center justify-center transition-transform scale-110">
                <div 
                  className="relative flex items-center justify-center"
                  style={{
                    transform: `rotate(${realtimeTelemetry?.heading ?? (latestTelemetryResponse as { heading?: number })?.heading ?? 0}deg)`,
                  }}
                >
                  <span className="absolute rounded-full bg-emerald-500/30 animate-ping" style={{ width: 28, height: 28 }} />
                  <div className="absolute -top-1.5 w-0 h-0 border-l-[4px] border-r-[4px] border-b-[7px] border-l-transparent border-r-transparent border-b-emerald-400" />
                  <div className="w-3.5 h-3.5 rounded-full border-2 border-white shadow-xl bg-emerald-500" />
                </div>
                <div className="mt-1 bg-card/90 text-card-foreground text-[8px] font-extrabold px-1 py-0.5 rounded border shadow-md whitespace-nowrap">
                  🚗 {activeDevice?.name || "Thiết bị"}
                </div>
              </div>
            </Marker>
          )}

          {/* Destination Marker */}
          {destination && (
            <Marker
              latitude={destination.lat}
              longitude={destination.lng}
              anchor="bottom"
            >
              <div className="relative flex flex-col items-center justify-center">
                <div className="h-6 w-6 rounded-full bg-rose-500 border-2 border-white shadow-xl flex items-center justify-center text-white font-extrabold animate-bounce">
                  🚩
                </div>
              </div>
            </Marker>
          )}

          {/* Active / Preview Route Polyline */}
          {routeGeoJSONSource && (
            <Source id="route-path" type="geojson" data={routeGeoJSONSource as GeoJSON.Feature}>
              <Layer
                id="route-path-line"
                type="line"
                paint={{
                  "line-color": activeRoutePlan?.id === selectedRouteId ? "#10b981" : "#ff6b00",
                  "line-width": 5,
                  "line-opacity": 0.85,
                }}
              />
            </Source>
          )}
        </Map>

        {/* LEFT FLOATING CONTROL PANEL */}
        <div 
          className={`absolute top-4 left-4 bg-card/95 backdrop-blur-md border rounded-xl p-4 shadow-xl z-10 w-[300px] sm:w-[320px] transition-all duration-300 ${
            isLeftPanelCollapsed ? "-translate-x-[calc(100%-40px)] opacity-60" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="font-semibold text-sm flex items-center gap-2">
              <Route className="h-4.5 w-4.5 text-blue-500 animate-pulse" /> Thiết lập lộ trình
            </h2>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0"
              onClick={() => setIsLeftPanelCollapsed(!isLeftPanelCollapsed)}
            >
              {isLeftPanelCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
            </Button>
          </div>

          {!isLeftPanelCollapsed && (
            <div className="space-y-4 pt-2 border-t border-border/30">
              
              {/* Device Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="device-select" className="text-xs font-semibold">Chọn thiết bị</Label>
                <select
                  id="device-select"
                  value={selectedDeviceId}
                  onChange={(e) => setManualSelectedId(e.target.value)}
                  className="h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-xs text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={isLoadingDevices || devices.length === 0}
                >
                  {devices.length === 0 ? (
                    <option value="">Không có thiết bị</option>
                  ) : (
                    devices.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name || d.id}
                      </option>
                    ))
                  )}
                </select>
              </div>

              {/* Status Warning if device has no telemetry */}
              {!origin && selectedDeviceId && (
                <div className="p-2.5 rounded-lg border border-amber-500/20 bg-amber-500/5 text-[11px] text-amber-500 flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>Thiết bị chưa có vị trí mới nhất để tạo tuyến.</span>
                </div>
              )}

              {/* Destination configuration (Search & Click map) */}
              {origin && (
                <div className="space-y-2.5 relative">
                  <Label className="text-xs font-semibold">Cấu hình điểm đến</Label>
                  
                  {/* Search input field */}
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
                      <Search className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                    <Input
                      type="text"
                      className="pl-8 pr-8 h-9 text-xs"
                      placeholder="Tìm địa điểm đến..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                    />
                    {(searchText.trim() || destination) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute inset-y-0 right-0 h-9 w-9 text-muted-foreground hover:text-foreground"
                        onClick={handleClearDestination}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>

                  {/* Suggestions dropdown */}
                  {(suggestions.length > 0 || isSearching) && (
                    <div className="absolute left-0 right-0 top-full mt-1.5 bg-card border rounded-lg shadow-2xl z-50 max-h-48 overflow-y-auto divide-y divide-border/20 backdrop-blur-md">
                      {isSearching ? (
                        <div className="p-3 text-[10px] text-muted-foreground text-center animate-pulse">
                          Đang tìm kiếm địa điểm...
                        </div>
                      ) : (
                        suggestions.map((suggestion) => (
                          <div
                            key={suggestion.id}
                            className="p-2 hover:bg-accent/40 cursor-pointer text-left transition-colors"
                            onClick={() => handleSelectSuggestion(suggestion)}
                          >
                            <div className="text-[11px] font-bold text-foreground truncate">{suggestion.name}</div>
                            {suggestion.fullAddress && (
                              <div className="text-[9px] text-muted-foreground truncate mt-0.5">{suggestion.fullAddress}</div>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  )}

                  {/* OR Select from map option */}
                  <div className="flex gap-2 items-center justify-between">
                    <Button
                      type="button"
                      variant={isChoosingDest ? "destructive" : "outline"}
                      size="sm"
                      className="flex-1 text-[11px] gap-1.5 h-8.5"
                      onClick={() => setIsChoosingDest(!isChoosingDest)}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      {isChoosingDest ? "Nhấp trên bản đồ..." : "Chọn từ bản đồ"}
                    </Button>
                    {destination && (
                      <Badge variant="outline" className="text-[10px] py-1 px-2.5 bg-rose-500/5 border-rose-500/20 text-rose-500 flex items-center justify-center shrink-0">
                        🚩 Đã chọn
                      </Badge>
                    )}
                  </div>
                </div>
              )}

              {/* Mode & Threshold Config */}
              {destination && (
                <>
                  {/* Route Name Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="route-name" className="text-xs font-semibold">Tên tuyến đường</Label>
                    <Input
                      id="route-name"
                      type="text"
                      className="h-9 text-xs"
                      placeholder="Ví dụ: Tuyến đến kho A..."
                      value={routeName}
                      onChange={(e) => setRouteName(e.target.value)}
                    />
                  </div>

                  {/* Mode Selector */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold">Phương tiện</Label>
                    <div className="flex bg-background/60 border border-border/40 rounded-lg p-0.5 select-none w-full">
                      {(["driving", "walking", "cycling"] as const).map((m) => {
                        const label = m === "driving" ? "🚗 Ô tô" : m === "walking" ? "🚶 Đi bộ" : "🚲 Xe đạp";
                        return (
                          <button
                            key={m}
                            type="button"
                            className={`flex-1 py-1.5 text-[10px] font-bold rounded-md transition-all cursor-pointer ${
                              mode === m
                                ? "bg-primary text-primary-foreground shadow-xs font-semibold"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                            onClick={() => setMode(m)}
                          >
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Deviation Threshold Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="threshold" className="text-xs font-semibold">Ngưỡng lệch tuyến (mét)</Label>
                    <Input
                      id="threshold"
                      type="number"
                      className="h-9 text-xs"
                      value={deviationThresholdMeters}
                      onChange={(e) => setDeviationThresholdMeters(Math.max(10, Number(e.target.value)))}
                      min={10}
                      max={1000}
                    />
                    <p className="text-[10px] text-muted-foreground">Kích hoạt cảnh báo lệch tuyến khi đi quá {deviationThresholdMeters}m.</p>
                  </div>
                </>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-2 border-t border-border/20">
                {destination && (
                  <Button
                    type="button"
                    className="w-full text-xs gap-1.5 h-9 bg-blue-600 hover:bg-blue-500 shadow-md shadow-blue-600/20 cursor-pointer"
                    onClick={handlePreviewRoute}
                    disabled={previewMutation.isPending}
                  >
                    {previewMutation.isPending ? "Đang tìm đường..." : "Xem trước tuyến"}
                  </Button>
                )}

                {previewRoute && !selectedRouteId && (
                  <Button
                    type="button"
                    variant="secondary"
                    className="w-full text-xs gap-1.5 h-9 border border-primary/20 cursor-pointer"
                    onClick={handleSaveRoute}
                    disabled={createMutation.isPending}
                  >
                    Lưu tuyến đường
                  </Button>
                )}
              </div>

              {/* Preview Stats */}
              {previewRoute && (
                <div className="rounded-xl border border-blue-500/15 bg-blue-500/5 dark:bg-blue-500/10 p-3.5 text-xs text-blue-400 mt-3 hover:shadow-[0_0_15px_rgba(59,130,246,0.1)] transition-all">
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[11px] text-muted-foreground font-semibold">Quãng đường:</span>
                    <span className="font-mono font-bold text-sm text-blue-400">{(previewRoute.distanceMeters / 1000).toFixed(2)} km</span>
                  </div>
                  <div className="h-px bg-blue-500/10 my-1.5" />
                  <div className="flex justify-between items-center py-0.5">
                    <span className="text-[11px] text-muted-foreground font-semibold">Thời gian dự kiến:</span>
                    <span className="font-mono font-bold text-sm text-blue-400">{formatTime(previewRoute.durationSeconds)}</span>
                  </div>
                </div>
              )}

            </div>
          )}
        </div>

        {/* RIGHT FLOATING SAVED ROUTES PANEL */}
        <div 
          className={`absolute top-4 right-4 bg-card/95 backdrop-blur-md border rounded-xl p-4 shadow-xl z-10 w-[300px] sm:w-[320px] max-h-[500px] flex flex-col transition-all duration-300 ${
            isRightPanelCollapsed ? "translate-x-[calc(100%-40px)] opacity-60" : ""
          }`}
        >
          <div className="flex items-center justify-between gap-4 mb-3 shrink-0">
            {isRightPanelCollapsed ? (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0"
                onClick={() => setIsRightPanelCollapsed(false)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
            ) : (
              <>
                <h2 className="font-semibold text-sm flex items-center gap-2">
                  <Compass className="h-4.5 w-4.5 text-emerald-500" /> Tuyến đường đã lưu
                </h2>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground shrink-0"
                  onClick={() => setIsRightPanelCollapsed(true)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </>
            )}
          </div>

          {!isRightPanelCollapsed && (
            <div className="flex-1 flex flex-col min-h-0 border-t border-border/30 pt-2 space-y-3">
              
              {/* Refresh list button */}
              <div className="flex justify-between items-center text-xs text-muted-foreground shrink-0">
                <span>{routePlans.length} tuyến đường</span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 gap-1 px-2 text-[10px]"
                  onClick={() => refetchRoutes()}
                >
                  <RefreshCcw className="h-3 w-3" /> Tải lại
                </Button>
              </div>

              {/* Scrollable list */}
              <div className="flex-1 overflow-auto pr-1 space-y-2.5">
                {isLoadingRoutes ? (
                  <div className="text-center py-6 text-xs text-muted-foreground animate-pulse">Đang tải danh sách...</div>
                ) : routePlans.length === 0 ? (
                  <div className="text-center py-8 text-xs text-muted-foreground border border-dashed rounded-xl leading-relaxed">
                    Chưa có tuyến đường nào được thiết lập cho thiết bị này.
                  </div>
                ) : (
                  routePlans.map((route: RoutePlan) => {
                    const statusCfg = STATUS_CONFIG[route.status as keyof typeof STATUS_CONFIG] || STATUS_CONFIG.planned;
                    const isSelected = selectedRouteId === route.id;
                    const isActive = route.status === "active";

                    return (
                      <div
                        key={route.id}
                        onClick={() => handleLoadSavedRoute(route)}
                        className={`rounded-xl border p-3 cursor-pointer transition-all duration-300 space-y-2.5 ${
                          isSelected 
                            ? "border-blue-500 bg-blue-500/5 shadow-md scale-[1.01]" 
                            : "border-border/40 bg-card hover:bg-muted/10"
                        }`}
                      >
                        <div className="flex justify-between items-start gap-2">
                          <h4 className={`text-xs font-semibold truncate ${isSelected ? "text-blue-400" : ""}`}>{route.name}</h4>
                          <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium border whitespace-nowrap uppercase ${statusCfg.color}`}>
                            {statusCfg.label}
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-[10px] text-muted-foreground font-medium">
                          <div>
                            <span>KC: </span>
                            <span className="text-foreground">{(route.distanceMeters / 1000).toFixed(2)} km</span>
                          </div>
                          <div>
                            <span>Lệch: </span>
                            <span className="text-foreground">±{route.deviationThresholdMeters}m</span>
                          </div>
                        </div>

                        {/* Interactive actions for selected route */}
                        {isSelected && (
                          <div className="flex gap-1.5 pt-2 border-t border-border/20 shrink-0">
                            {!isActive && route.status === "planned" && (
                              <Button
                                type="button"
                                size="sm"
                                className="flex-1 text-[10px] py-1 h-7.5 bg-emerald-600 hover:bg-emerald-500 gap-1"
                                onClick={() => handleActivateRoute(route.id)}
                              >
                                <Play className="h-3 w-3 fill-current" /> Giám sát
                              </Button>
                            )}

                            {isActive && (
                              <>
                                <Button
                                  type="button"
                                  size="sm"
                                  className="flex-1 text-[10px] py-1 h-7.5 bg-indigo-600 hover:bg-indigo-500 gap-1"
                                  onClick={() => handleCompleteRoute(route.id)}
                                >
                                  <Check className="h-3 w-3 stroke-[3]" /> Xong
                                </Button>
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="destructive"
                                  className="flex-1 text-[10px] py-1 h-7.5 gap-1"
                                  onClick={() => handleCancelRoute(route.id)}
                                >
                                  <StopCircle className="h-3 w-3" /> Hủy
                                </Button>
                              </>
                            )}

                            {route.status !== "active" && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7.5 w-7.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg"
                                onClick={(e) => handleDeleteRoute(route.id, e)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

            </div>
          )}
        </div>

      </div>
    </>
  );
}
