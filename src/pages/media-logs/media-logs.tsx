import { useState, useRef, useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { Film, Video, Image as ImageIcon, Download, Search, Loader2, Maximize2, Sparkles, AlertCircle, Play, RefreshCw } from "lucide-react";
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
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { axiosInstance } from "@/services/apis/axios-client";

const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_TOKEN ?? "";

interface AIMediaLogFields {
  processingStatus?: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled' | null;
  processedS3Key?: string | null;
  processingError?: string | null;
}

type MediaLogItemType = {
  id: string;
  mediaType: string;
  fileUrl: string;
  deviceId: string;
  startTime: string;
} & AIMediaLogFields;

type MediaResponseCast = {
  data?: MediaLogItemType[] | {
    data?: MediaLogItemType[];
    total?: number;
    pageCount?: number;
  };
  total?: number;
  pageCount?: number;
};

function useAnalyzeMediaLog() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, mode, isMoving }: { id: string; mode: 'VECTORS' | 'HEATMAP'; isMoving: boolean }) => {
      return axiosInstance.post(`/api/media-logs/${id}/analyze`, { mode, isMoving });
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['/api/media-logs/mine'] });
      queryClient.invalidateQueries({ queryKey: [`/api/media-logs/${variables.id}/stream`] });
    },
  });
}

function MediaLogItem({ 
  media 
}: { 
  media: { id: string; mediaType: string; fileUrl: string; deviceId: string; startTime: string } & AIMediaLogFields 
}) {
  const [videoType, setVideoType] = useState<'raw' | 'processed'>('raw');
  const [showConfig, setShowConfig] = useState(false);
  const [mode, setMode] = useState<'VECTORS' | 'HEATMAP'>('VECTORS');
  const [isMoving, setIsMoving] = useState(true);

  const queryClient = useQueryClient();
  const { mutate: analyzeMutate, isPending: isAnalyzing } = useAnalyzeMediaLog();
  const { data: devicesResponse } = useDevicesControllerFindMine();
  const rawDevices = (devicesResponse as { data?: { id: string; name: string }[] })?.data ?? [];
  const deviceName = rawDevices.find((d) => d.id === media.deviceId)?.name ?? media.deviceId;

  const { data: streamResponse, isLoading } = useMediaLogsControllerGetStreamUrl(media.id, {
    query: {
      queryKey: [`/api/media-logs/${media.id}/stream`, { type: videoType }]
    },
    request: {
      params: { type: videoType }
    }
  });
  
  const getUrl = () => {
    if (!streamResponse) return media.fileUrl;
    const res = streamResponse as Record<string, unknown>;
    const data = (res.data as Record<string, unknown> | undefined) ?? res;
    const innerData = data?.data as Record<string, unknown> | undefined;
    const url = (data?.url as string | undefined) || (innerData?.url as string | undefined) || (typeof streamResponse === 'string' ? streamResponse : null);
    return url || media.fileUrl;
  };

  const streamUrl = getUrl();
  const videoUrl = streamUrl ? streamUrl + "#t=0.001" : undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTimeRef = useRef<number>(0);

  const handleTypeChange = (type: 'raw' | 'processed') => {
    if (videoRef.current) {
      lastTimeRef.current = videoRef.current.currentTime;
    }
    setVideoType(type);
  };

  const isVideo = media.mediaType === 'video_chunk' || media.mediaType === 'video';

  return (
    <div className="border border-border/50 rounded-xl overflow-hidden bg-card shadow-sm flex flex-col group hover:shadow-md transition-shadow">
      <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden" title={streamUrl}>
        {isLoading ? (
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        ) : isVideo ? (
          <>
            <video 
              ref={videoRef}
              src={videoUrl} 
              className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" 
              controls 
              preload="metadata" 
              playsInline 
              onLoadedMetadata={() => {
                if (videoRef.current && lastTimeRef.current > 0) {
                  videoRef.current.currentTime = lastTimeRef.current;
                }
              }}
            />
            {videoType === 'raw' && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Video className="w-10 h-10 text-white/80 shadow-sm drop-shadow-md" />
              </div>
            )}
            
            {media.processingStatus === 'completed' && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-1 py-1 rounded-lg border border-white/10 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleTypeChange('raw')}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all ${
                    videoType === 'raw'
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Gốc
                </button>
                <button
                  onClick={() => handleTypeChange('processed')}
                  className={`px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all flex items-center gap-1 ${
                    videoType === 'processed'
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3 h-3" />
                  Phân tích AI
                </button>
              </div>
            )}
          </>
        ) : (
          <img src={streamUrl} alt="Log" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity group-hover:scale-105 duration-300" />
        )}
        <div className="absolute top-2 left-2 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-1 rounded-md flex items-center gap-1.5 shadow-sm">
          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
          {deviceName}
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
      <div className="p-3 flex flex-col flex-1 justify-between">
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            {isVideo ? (
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

        {/* AI Processing Section */}
        {isVideo && (
          <div className="mt-2.5 pt-2.5 border-t border-border/30">
            {media.processingStatus === null || media.processingStatus === undefined ? (
              showConfig ? (
                <div className="p-2.5 rounded-lg bg-muted/40 border border-border/50 flex flex-col gap-2 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-muted-foreground">Chế độ vẽ:</span>
                    <div className="flex bg-muted rounded-md p-0.5 border border-border/50">
                      <button
                        onClick={() => setMode('VECTORS')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          mode === 'VECTORS' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Vector
                      </button>
                      <button
                        onClick={() => setMode('HEATMAP')}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          mode === 'HEATMAP' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Heatmap
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-muted-foreground">Camera:</span>
                    <div className="flex bg-muted rounded-md p-0.5 border border-border/50">
                      <button
                        onClick={() => setIsMoving(true)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          isMoving ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Di chuyển
                      </button>
                      <button
                        onClick={() => setIsMoving(false)}
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold transition-all ${
                          !isMoving ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'
                        }`}
                      >
                        Cố định
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 mt-1">
                    <Button
                      size="sm"
                      className="flex-1 text-[10px] h-6 bg-cyan-600 hover:bg-cyan-500 text-white font-medium"
                      disabled={isAnalyzing}
                      onClick={() => {
                        analyzeMutate({ id: media.id, mode, isMoving }, {
                          onSuccess: () => {
                            setShowConfig(false);
                          }
                        });
                      }}
                    >
                      {isAnalyzing ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Play className="w-3 h-3 mr-1" />}
                      Bắt đầu
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-[10px] h-6 px-2"
                      onClick={() => setShowConfig(false)}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-7 border-cyan-500/20 hover:border-cyan-500/40 text-cyan-600 hover:text-cyan-500 flex items-center justify-center gap-1 font-medium bg-cyan-500/[0.02] hover:bg-cyan-500/[0.06] transition-colors"
                  onClick={() => setShowConfig(true)}
                >
                  <Sparkles className="w-3 h-3" />
                  Phân tích chuyển động
                </Button>
              )
            ) : media.processingStatus === 'pending' || media.processingStatus === 'processing' ? (
              <div className="p-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10 flex items-center justify-between text-xs text-cyan-600">
                <div className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  <span className="font-medium text-[11px]">
                    {media.processingStatus === 'pending' ? 'Đang chờ xử lý...' : 'Đang phân tích...'}
                  </span>
                </div>
                <button 
                  onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/media-logs/mine'] })} 
                  className="p-1 hover:bg-cyan-500/10 rounded transition-colors text-cyan-500"
                  title="Cập nhật"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            ) : media.processingStatus === 'failed' ? (
              <div className="flex flex-col gap-1.5">
                <div className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 flex items-start gap-1.5 text-xs text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-[11px]">Phân tích thất bại</div>
                    <div className="text-[10px] text-red-500/80 leading-snug break-all mt-0.5">
                      {media.processingError || 'Lỗi từ AI worker'}
                    </div>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full text-xs h-6.5 border-red-500/20 hover:border-red-500/40 text-red-500 hover:bg-red-500/[0.04] flex items-center justify-center gap-1"
                  onClick={() => setShowConfig(true)}
                >
                  <RefreshCw className="w-3 h-3" />
                  Thử lại
                </Button>
              </div>
            ) : media.processingStatus === 'completed' ? (
              <div className="text-[10px] text-emerald-600 bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded flex items-center gap-1.5 font-medium justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                Đã hoàn thành phân tích AI
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function MediaPinPopupContent({ 
  media 
}: { 
  media: MediaPinDto & AIMediaLogFields 
}) {
  const [videoType, setVideoType] = useState<'raw' | 'processed'>('raw');
  const { mutate: analyzeMutate, isPending: isAnalyzing } = useAnalyzeMediaLog();
  const queryClient = useQueryClient();
  const { data: devicesResponse } = useDevicesControllerFindMine();
  const rawDevices = (devicesResponse as { data?: { id: string; name: string }[] })?.data ?? [];
  const deviceName = rawDevices.find((d) => d.id === media.deviceId)?.name ?? media.deviceId;

  const { data: streamResponse, isLoading } = useMediaLogsControllerGetStreamUrl(media.id, {
    query: {
      queryKey: [`/api/media-logs/${media.id}/stream`, { type: videoType }]
    },
    request: {
      params: { type: videoType }
    }
  });

  const getUrl = () => {
    if (!streamResponse) return media.fileUrl;
    const res = streamResponse as Record<string, unknown>;
    const data = (res.data as Record<string, unknown> | undefined) ?? res;
    const innerData = data?.data as Record<string, unknown> | undefined;
    const url = (data?.url as string | undefined) || (innerData?.url as string | undefined) || (typeof streamResponse === 'string' ? streamResponse : null);
    return url || media.fileUrl;
  };

  const streamUrl = getUrl();
  const videoUrl = streamUrl ? streamUrl + "#t=0.001" : undefined;

  const videoRef = useRef<HTMLVideoElement>(null);
  const lastTimeRef = useRef<number>(0);

  const handleTypeChange = (type: 'raw' | 'processed') => {
    if (videoRef.current) {
      lastTimeRef.current = videoRef.current.currentTime;
    }
    setVideoType(type);
  };

  const isVideo = media.mediaType === 'video_chunk' || media.mediaType === 'video';

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
      <div className="relative aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center border border-border/20 shadow-sm mt-1 group">
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        ) : isVideo ? (
          <>
            <video 
              ref={videoRef}
              src={videoUrl} 
              className="w-full h-full object-cover" 
              controls 
              preload="metadata" 
              playsInline 
              autoPlay
              muted
              onLoadedMetadata={() => {
                if (videoRef.current && lastTimeRef.current > 0) {
                  videoRef.current.currentTime = lastTimeRef.current;
                }
              }}
            />
            {media.processingStatus === 'completed' && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/60 backdrop-blur-md px-1 py-1 rounded-lg border border-white/10 flex gap-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => handleTypeChange('raw')}
                  className={`px-2 py-0.5 text-[9px] font-semibold rounded transition-all ${
                    videoType === 'raw'
                      ? 'bg-white text-zinc-950 shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  Gốc
                </button>
                <button
                  onClick={() => handleTypeChange('processed')}
                  className={`px-2 py-0.5 text-[9px] font-semibold rounded transition-all flex items-center gap-0.5 ${
                    videoType === 'processed'
                      ? 'bg-cyan-500 text-white shadow-sm'
                      : 'text-white/70 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  AI
                </button>
              </div>
            )}
          </>
        ) : (
          <img 
            src={streamUrl} 
            alt="Captured media" 
            className="w-full h-full object-cover" 
          />
        )}
      </div>
      <div className="mt-1 flex flex-col gap-1 text-[11px] text-zinc-600">
        <div className="flex justify-between items-center">
          <div>
            <span className="font-semibold text-zinc-500">Thiết bị:</span>
            <span className="ml-1 font-mono font-bold bg-zinc-100 px-1 py-0.2 rounded border border-zinc-200">{deviceName}</span>
          </div>
        </div>

        {/* Simplified AI Section for Popup */}
        {isVideo && (
          <div className="mt-1 pt-1.5 border-t border-zinc-100">
            {media.processingStatus === null || media.processingStatus === undefined ? (
              <Button
                variant="outline"
                size="sm"
                className="w-full text-[10px] h-6 border-cyan-500/20 text-cyan-600 hover:text-cyan-500 flex items-center justify-center gap-1 font-medium bg-cyan-500/[0.02] hover:bg-cyan-500/[0.06] transition-colors"
                disabled={isAnalyzing}
                onClick={() => {
                  analyzeMutate({ id: media.id, mode: 'VECTORS', isMoving: true }, {
                    onSuccess: () => {
                      queryClient.invalidateQueries({ queryKey: ['/api/media-logs/pins'] });
                    }
                  });
                }}
              >
                {isAnalyzing ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <Sparkles className="w-2.5 h-2.5" />}
                Phân tích AI
              </Button>
            ) : media.processingStatus === 'pending' || media.processingStatus === 'processing' ? (
              <div className="p-1 rounded bg-cyan-50 border border-cyan-100 flex items-center justify-between text-[10px] text-cyan-600">
                <div className="flex items-center gap-1">
                  <Loader2 className="w-2.5 h-2.5 animate-spin" />
                  <span>Đang xử lý AI...</span>
                </div>
                <button 
                  onClick={() => {
                    queryClient.invalidateQueries({ queryKey: ['/api/media-logs/pins'] });
                  }}
                  className="hover:bg-cyan-200/50 p-0.5 rounded transition-colors text-cyan-500"
                >
                  <RefreshCw className="w-2 h-2" />
                </button>
              </div>
            ) : media.processingStatus === 'failed' ? (
              <div className="p-1 rounded bg-red-50 border border-red-100 flex items-center justify-between text-[10px] text-red-500">
                <span>Phân tích AI lỗi</span>
                <button 
                  onClick={() => {
                    analyzeMutate({ id: media.id, mode: 'VECTORS', isMoving: true });
                  }}
                  className="underline hover:text-red-600"
                >
                  Thử lại
                </button>
              </div>
            ) : media.processingStatus === 'completed' ? (
              <div className="text-[9px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1 justify-center font-medium">
                Đã phân tích AI thành công
              </div>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

export default function MediaLogs() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"grid" | "map">("grid");
  const [selectedPin, setSelectedPin] = useState<(MediaPinDto & AIMediaLogFields) | null>(null);
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
  }, {
    query: {
      refetchInterval: (query) => {
        const res = query?.state?.data as MediaResponseCast | undefined;
        const list = Array.isArray(res?.data) ? (res?.data ?? []) : (res?.data?.data ?? []);
        const isProcessing = list.some((m) => m?.processingStatus === 'pending' || m?.processingStatus === 'processing');
        return isProcessing ? 5000 : false;
      }
    }
  });

  const castMediaResponse = mediaResponse as MediaResponseCast | undefined;
  const mediaLogs = Array.isArray(castMediaResponse?.data)
    ? (castMediaResponse?.data ?? [])
    : (castMediaResponse?.data?.data ?? []);
  const total = castMediaResponse?.total ?? (castMediaResponse?.data as { total?: number } | undefined)?.total ?? 0;
  const pageCount = castMediaResponse?.pageCount ?? (castMediaResponse?.data as { pageCount?: number } | undefined)?.pageCount ?? 1;

  // Lấy danh sách ghim Media (dành cho Dạng bản đồ)
  const { data: pinsResponse, isLoading: isLoadingPins } = useMediaLogsControllerMapPins({
    deviceId: selectedDeviceId !== "all" ? selectedDeviceId : undefined,
  }, {
    query: {
      refetchInterval: (query) => {
        const res = query?.state?.data as { data?: (MediaPinDto & AIMediaLogFields)[] } | (MediaPinDto & AIMediaLogFields)[] | undefined;
        const list = Array.isArray(res) ? res : (res?.data ?? []);
        const isProcessing = list.some((m) => m?.processingStatus === 'pending' || m?.processingStatus === 'processing');
        return isProcessing ? 5000 : false;
      }
    }
  });

  const pins = useMemo(() => {
    const castPinsResponse = pinsResponse as { data?: (MediaPinDto & AIMediaLogFields)[] } | (MediaPinDto & AIMediaLogFields)[] | undefined;
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
            <p className="text-sm text-cyan mt-1 opacity-85">
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
                      setSelectedPin(pin as MediaPinDto & AIMediaLogFields);
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
                  {mediaLogs.map((media: MediaLogItemType) => (
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
