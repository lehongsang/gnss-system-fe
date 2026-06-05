import { useState, useRef, useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { Film, Video, Image as ImageIcon, Download, Search, Loader2, Maximize2 } from "lucide-react";
import { 
  useMediaLogsControllerFindMine, 
  useDevicesControllerFindMine, 
  useMediaLogsControllerGetStreamUrl,
  useMediaLogsControllerMapPins,
  type MediaPinDto
} from "@/services/apis/gen/queries";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import Map, { Marker, NavigationControl, FullscreenControl, Popup, type MapRef } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

function MediaLogItem({ media }: { media: { id: string; mediaType: string; fileUrl: string; deviceId: string; startTime: string } }) {
  const { data: streamResponse, isLoading } = useMediaLogsControllerGetStreamUrl(media.id);
  
  const getUrl = () => {
    if (!streamResponse) return media.fileUrl;
    const res = streamResponse as Record<string, unknown>;
    const data = res.data as Record<string, unknown> | undefined;
    const innerData = data?.data as Record<string, unknown> | undefined;
    const url = (data?.url as string | undefined) || (innerData?.url as string | undefined) || (typeof streamResponse === 'string' ? streamResponse : null);
    return url || media.fileUrl;
  };

  const streamUrl = getUrl();
  const videoUrl = streamUrl ? streamUrl + "#t=0.001" : undefined;

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm flex flex-col group hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden" title={streamUrl}>
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : media.mediaType === 'video_chunk' || media.mediaType === 'video' ? (
          <>
            <video src={videoUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" controls preload="metadata" playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <Video className="w-10 h-10 text-white/80 shadow-sm drop-shadow-md" />
            </div>
          </>
        ) : (
          <img src={streamUrl} alt="Log" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-300" />
        )}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          {media.deviceId}
        </div>
        <a 
          href={streamUrl} 
          target="_blank" 
          rel="noopener noreferrer" 
          download 
          className="absolute top-2 right-2 p-1.5 bg-black/50 hover:bg-blue-500 text-white rounded-md transition-colors opacity-0 group-hover:opacity-100 shadow-sm"
        >
          <Download className="w-3.5 h-3.5" />
        </a>
      </div>
      <div className="p-3">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {media.mediaType === 'video_chunk' || media.mediaType === 'video' ? (
              <Film className="w-4 h-4 text-blue-500" />
            ) : (
              <ImageIcon className="w-4 h-4 text-violet-500" />
            )}
            <span className="font-medium text-foreground text-xs">
              {new Date(media.startTime).toLocaleString("vi-VN")}
            </span>
          </div>
          <span className="text-[10px] bg-muted/50 font-mono px-1.5 py-0.5 rounded border border-border/50">
            {media.mediaType.toUpperCase()}
          </span>
        </div>
      </div>
    </div>
  );
}

function MediaPinPopupContent({ media }: { media: { id: string; mediaType: string; fileUrl: string; deviceId: string; startTime: string } }) {
  const { data: streamResponse, isLoading } = useMediaLogsControllerGetStreamUrl(media.id);

  const getUrl = () => {
    if (!streamResponse) return media.fileUrl;
    const res = streamResponse as Record<string, unknown>;
    const data = res.data as Record<string, unknown> | undefined;
    const innerData = data?.data as Record<string, unknown> | undefined;
    const url = (data?.url as string | undefined) || (innerData?.url as string | undefined) || (typeof streamResponse === 'string' ? streamResponse : null);
    return url || media.fileUrl;
  };

  const streamUrl = getUrl();
  const videoUrl = streamUrl ? streamUrl + "#t=0.001" : undefined;

  return (
    <div className="flex flex-col gap-2 p-1 min-w-[240px] max-w-[280px] text-zinc-900">
      <div className="flex items-center justify-between border-b pb-1.5">
        <span className="text-[10px] bg-muted/80 font-mono px-1.5 py-0.5 rounded border border-border/50 font-bold uppercase">
          {media.mediaType.toUpperCase()}
        </span>
        <span className="text-[10px] text-zinc-500 font-semibold font-mono">
          {new Date(media.startTime).toLocaleString("vi-VN")}
        </span>
      </div>
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-border/20 shadow-sm mt-1">
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : media.mediaType === 'video_chunk' || media.mediaType === 'video' ? (
          <video 
            src={videoUrl} 
            className="w-full h-full object-cover" 
            controls 
            preload="metadata" 
            playsInline 
            autoPlay
            muted
          />
        ) : (
          <img 
            src={streamUrl} 
            alt="Captured media" 
            className="w-full h-full object-cover" 
          />
        )}
      </div>
      <div className="mt-1 flex flex-col gap-0.5 text-[11px] text-zinc-600">
        <div>
          <span className="font-semibold text-zinc-500">Thiết bị:</span>
          <span className="ml-1 font-mono font-bold bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">{media.deviceId}</span>
        </div>
      </div>
    </div>
  );
}

export default function MediaLogs() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [selectedPin, setSelectedPin] = useState<MediaPinDto | null>(null);
  const mapRef = useRef<MapRef>(null);
  const limit = 12;

  // Lấy danh sách thiết bị
  const { data: devicesResponse } = useDevicesControllerFindMine();
  const rawDevices = (devicesResponse as { data?: { id: string; name: string }[] })?.data ?? [];

  // Lấy danh sách Media Logs (dành cho Dạng lưới)
  const { data: mediaResponse, isLoading: isLoadingMedia } = useMediaLogsControllerFindMine({
    deviceId: selectedDeviceId !== "all" ? selectedDeviceId : undefined,
    page,
    limit,
    sortBy: 'startTime',
    sortOrder: 'DESC',
  });

  type MediaLogItemType = {
    id: string;
    mediaType: string;
    fileUrl: string;
    deviceId: string;
    startTime: string;
  };

  type MediaResponseCast = {
    data?: MediaLogItemType[] | {
      data?: MediaLogItemType[];
      total?: number;
      pageCount?: number;
    };
    total?: number;
    pageCount?: number;
  };

  const castMediaResponse = mediaResponse as MediaResponseCast | undefined;
  const mediaLogs = Array.isArray(castMediaResponse?.data)
    ? (castMediaResponse?.data ?? [])
    : (castMediaResponse?.data?.data ?? []);
  const total = castMediaResponse?.total ?? (castMediaResponse?.data as { total?: number } | undefined)?.total ?? 0;
  const pageCount = castMediaResponse?.pageCount ?? (castMediaResponse?.data as { pageCount?: number } | undefined)?.pageCount ?? 1;

  // Lấy danh sách ghim Media (dành cho Dạng bản đồ)
  const { data: pinsResponse, isLoading: isLoadingPins } = useMediaLogsControllerMapPins({
    deviceId: selectedDeviceId !== "all" ? selectedDeviceId : undefined,
  });

  const pins = useMemo(() => {
    const castPinsResponse = pinsResponse as { data?: MediaPinDto[] } | MediaPinDto[] | undefined;
    const rawPins = Array.isArray(castPinsResponse)
      ? castPinsResponse
      : (castPinsResponse?.data ?? []);
    return rawPins.filter((p) => p && typeof p.lat === "number" && typeof p.lng === "number" && p.lat !== 0 && p.lng !== 0);
  }, [pinsResponse]);

  const initialViewState = useMemo(() => {
    if (pins.length > 0) {
      return {
        latitude: pins[0].lat,
        longitude: pins[0].lng,
        zoom: 12,
      };
    }
    return {
      latitude: 21.0285,
      longitude: 105.8542,
      zoom: 12,
    };
  }, [pins]);

  const handleFitPinsBounds = () => {
    const map = mapRef.current;
    if (!map || pins.length === 0) return;

    const bounds = pins.reduce(
      (b: { minLng: number; maxLng: number; minLat: number; maxLat: number }, pin: MediaPinDto) => {
        b.minLng = Math.min(b.minLng, pin.lng);
        b.maxLng = Math.max(b.maxLng, pin.lng);
        b.minLat = Math.min(b.minLat, pin.lat);
        b.maxLat = Math.max(b.maxLat, pin.lat);
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

  return (
    <>
      <AppHeader
        title="Nhật ký Media"
        breadcrumbs={[
          { label: "Nhật ký Media" },
          { label: "Nhật ký Media" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-5 p-5 min-h-[calc(100vh-64px)] overflow-hidden">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Nhật ký Media</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Quản lý các đoạn video và hình ảnh được ghi lại từ các thiết bị.
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="flex items-center justify-between px-3 py-2 border border-input rounded-md w-[200px] h-9 bg-card cursor-pointer hover:bg-muted/50 transition-colors">
                  <span className="text-sm truncate">
                    {selectedDeviceId === "all" 
                      ? "Tất cả thiết bị" 
                      : rawDevices.find((d: { id: string }) => d.id === selectedDeviceId)?.name ?? "Tất cả thiết bị"}
                  </span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[200px]">
                <DropdownMenuItem onClick={() => { setSelectedDeviceId("all"); setPage(1); }} className="cursor-pointer">
                  Tất cả thiết bị
                </DropdownMenuItem>
                {rawDevices.map((d: { id: string; name: string }) => (
                  <DropdownMenuItem key={d.id} onClick={() => { setSelectedDeviceId(d.id); setPage(1); }} className="cursor-pointer">
                    {d.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex items-center gap-1 bg-muted/30 p-1 rounded-lg border border-border/50">
              <button 
                onClick={() => setViewMode("grid")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === "grid" 
                    ? "bg-background shadow-sm border border-border/50 text-foreground font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Dạng lưới
              </button>
              <button 
                onClick={() => setViewMode("map")}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === "map" 
                    ? "bg-background shadow-sm border border-border/50 text-foreground font-semibold" 
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Dạng bản đồ
              </button>
            </div>
          </div>
        </div>
        
        {viewMode === "map" ? (
          <div className="flex-1 relative w-full rounded-xl overflow-hidden border border-border/50 shadow-sm bg-muted/10 min-h-[500px]">
            {isLoadingPins ? (
              <div className="absolute inset-0 flex items-center justify-center bg-background/50 z-10">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : pins.length === 0 ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 z-10 text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>Không tìm thấy điểm ghim Media nào</p>
              </div>
            ) : null}

            <Map
              ref={mapRef}
              initialViewState={initialViewState}
              mapboxAccessToken={MAPBOX_TOKEN}
              mapStyle="mapbox://styles/mapbox/navigation-preview-night-v4"
              style={{ width: "100%", height: "100%" }}
            >
              <NavigationControl position="top-right" showCompass={false} />
              <FullscreenControl position="top-right" />

              {/* Fit Bounds Button */}
              {pins.length > 0 && (
                <div className="absolute top-24 right-2.5 z-10">
                  <Button
                    variant="secondary"
                    size="icon"
                    className="h-8.5 w-8.5 rounded-md border border-border/80 shadow-md bg-card/95 hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground"
                    onClick={handleFitPinsBounds}
                    title="Xem toàn bộ ghim"
                  >
                    <Maximize2 className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {/* Map Markers for Media Pins */}
              {pins.map((pin: MediaPinDto) => {
                const isVideo = pin.mediaType === "video_chunk" || pin.mediaType === "video";
                return (
                  <Marker
                    key={pin.id}
                    latitude={pin.lat}
                    longitude={pin.lng}
                    anchor="bottom"
                    onClick={(e) => {
                      e.originalEvent.stopPropagation();
                      setSelectedPin(pin);
                    }}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="relative group transition-transform hover:scale-110">
                      {/* Marker Icon */}
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-full border-2 border-white shadow-lg transition-colors ${
                          isVideo
                            ? "bg-blue-600 text-white hover:bg-blue-500"
                            : "bg-violet-600 text-white hover:bg-violet-500"
                        }`}
                      >
                        {isVideo ? <Video className="h-3.5 w-3.5" /> : <ImageIcon className="h-3.5 w-3.5" />}
                      </div>
                      {/* Triangle Pointer */}
                      <div
                        className={`mx-auto w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent ${
                          isVideo ? "border-t-blue-600" : "border-t-violet-600"
                        }`}
                      />
                    </div>
                  </Marker>
                );
              })}

              {/* Pin Popup */}
              {selectedPin && (
                <Popup
                  latitude={selectedPin.lat}
                  longitude={selectedPin.lng}
                  anchor="bottom"
                  offset={35}
                  closeOnClick={false}
                  onClose={() => setSelectedPin(null)}
                  className="z-50"
                  maxWidth="320px"
                >
                  <MediaPinPopupContent media={selectedPin} />
                </Popup>
              )}
            </Map>
          </div>
        ) : (
          <>
            {isLoadingMedia ? (
              <div className="flex items-center justify-center flex-1 min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
              </div>
            ) : mediaLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] text-muted-foreground">
                <Search className="w-12 h-12 mb-4 opacity-20" />
                <p>Không tìm thấy Media Log nào</p>
              </div>
            ) : (
              <div className="flex flex-col gap-6 overflow-auto flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5 p-0.5">
                  {mediaLogs.map((media: { id: string; mediaType: string; fileUrl: string; deviceId: string; startTime: string }) => (
                    <MediaLogItem key={media.id} media={media} />
                  ))}
                </div>
                
                {pageCount > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-4 pb-10">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === 1}
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                    >
                      Trang trước
                    </Button>
                    <span className="text-sm text-muted-foreground px-4">
                      Trang {page} / {pageCount} ({total} bản ghi)
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page === pageCount}
                      onClick={() => setPage(p => Math.min(pageCount, p + 1))}
                    >
                      Trang sau
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}
