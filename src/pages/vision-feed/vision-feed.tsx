import { useState, useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import {
  Camera,
  Maximize2,
  Minimize2,
  RefreshCw,
  WifiOff,
  Loader2,
  Image as ImageIcon,
  Video,
  Clock,
  Eye,
  Film,
  ArrowUpRight,
} from "lucide-react";
import {
  useDevicesControllerFindMine,
  useMediaLogsControllerFindMine,
  useMediaLogsControllerGetStreamUrl,
} from "@/services/apis/gen/queries";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";

// ── Helpers ──────────────────────────────────────────────────────────────────

function timeAgo(ts: string) {
  const diff = Math.floor((Date.now() - new Date(ts).getTime()) / 1000);
  if (diff < 10) return "Vừa xong";
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h trước`;
  return `${Math.floor(diff / 86400)}d trước`;
}

// ── Device Camera Card ───────────────────────────────────────────────────────

function DeviceCameraCard({
  device,
  latestMedia,
  isExpanded,
  onToggleExpand,
}: {
  device: { id: string; name: string };
  latestMedia: {
    id: string;
    mediaType: string;
    fileUrl: string;
    startTime: string;
  } | null;
  isExpanded: boolean;
  onToggleExpand: () => void;
}) {
  const { data: streamResponse, isLoading: isLoadingStream } =
    useMediaLogsControllerGetStreamUrl(latestMedia?.id ?? "", {
      query: { enabled: !!latestMedia },
    });

  const getUrl = () => {
    if (!streamResponse) return latestMedia?.fileUrl ?? "";
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (streamResponse as any).data ?? streamResponse;
    const url =
      data?.url ||
      data?.data?.url ||
      (typeof streamResponse === "string" ? streamResponse : null);
    return url || latestMedia?.fileUrl || "";
  };

  const streamUrl = getUrl();
  const hasMedia = !!latestMedia;
  const isVideo =
    latestMedia?.mediaType === "video_chunk" ||
    latestMedia?.mediaType === "video";

  return (
    <div
      className={`relative group rounded-xl overflow-hidden border transition-all duration-300 ${
        isExpanded
          ? "col-span-1 sm:col-span-2 border-cyan-500/50 shadow-lg shadow-cyan-500/10"
          : "border-border/50 hover:border-cyan-500/30 hover:shadow-md"
      } bg-card`}
    >
      {/* Camera Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 via-black/30 to-transparent">
        <div className="flex items-center gap-2">
          <div className="relative flex h-2.5 w-2.5 items-center justify-center">
            {hasMedia ? (
              <>
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.6)]"></span>
              </>
            ) : (
              <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500" />
            )}
          </div>
          <span className="text-xs font-semibold text-white truncate max-w-[180px]">
            {device.name}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {hasMedia && (
            <span className="text-[9px] font-mono text-white/70 bg-black/40 px-1.5 py-0.5 rounded">
              {isVideo ? "VID" : "IMG"}
            </span>
          )}
          <button
            onClick={onToggleExpand}
            className="p-1 rounded hover:bg-white/20 text-white/70 hover:text-white transition-colors"
          >
            {isExpanded ? (
              <Minimize2 className="w-3.5 h-3.5" />
            ) : (
              <Maximize2 className="w-3.5 h-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Media Preview Area */}
      <div className="relative bg-zinc-950 flex items-center justify-center overflow-hidden aspect-video">
        {!hasMedia ? (
          <div className="flex flex-col items-center gap-3 text-zinc-600">
            <WifiOff className="w-8 h-8 opacity-40" />
            <span className="text-xs">Chưa có dữ liệu</span>
          </div>
        ) : isLoadingStream ? (
          <Loader2 className="w-6 h-6 animate-spin text-zinc-500" />
        ) : isVideo ? (
          <video
            src={streamUrl + "#t=0.001"}
            className="w-full h-full object-cover"
            controls={isExpanded}
            preload="metadata"
            playsInline
            muted
          />
        ) : (
          <img
            src={streamUrl}
            alt={device.name}
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            loading="lazy"
          />
        )}
      </div>

      {/* Footer Info */}
      <div className="px-3 py-2.5 flex items-center justify-between bg-card border-t border-border/30">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {hasMedia ? (
            <>
              <Clock className="w-3 h-3" />
              <span className="font-mono">
                {timeAgo(latestMedia.startTime)}
              </span>
            </>
          ) : (
            <>
              <WifiOff className="w-3 h-3" />
              <span>Chưa có dữ liệu</span>
            </>
          )}
        </div>
        {hasMedia && (
          <Badge
            variant="outline"
            className="text-[9px] px-1.5 py-0 h-4 font-mono border-emerald-500/40 text-emerald-400"
          >
            {isVideo ? (
              <>
                <Video className="w-2.5 h-2.5 mr-0.5" /> Video
              </>
            ) : (
              <>
                <ImageIcon className="w-2.5 h-2.5 mr-0.5" /> Ảnh
              </>
            )}
          </Badge>
        )}
      </div>
    </div>
  );
}

// ── Recent Activity Row ──────────────────────────────────────────────────────

function RecentActivityRow({
  media,
  deviceName,
}: {
  media: {
    id: string;
    mediaType: string;
    startTime: string;
    deviceId: string;
  };
  deviceName: string;
}) {
  const isVideo =
    media.mediaType === "video_chunk" || media.mediaType === "video";

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-accent/40 hover:translate-x-1 transition-all duration-300 border-b border-border/20 last:border-b-0">
      <div
        className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 ${
          isVideo ? "bg-blue-500/10 text-blue-400" : "bg-violet-500/10 text-violet-400"
        }`}
      >
        {isVideo ? <Video className="w-4 h-4" /> : <ImageIcon className="w-4 h-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{deviceName}</p>
        <p className="text-xs text-muted-foreground font-mono">
          {new Date(media.startTime).toLocaleString("vi-VN")}
        </p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant="outline" className="text-[10px] font-mono px-1.5 py-0 h-5">
          {media.mediaType.toUpperCase()}
        </Badge>
        <span className="text-xs text-muted-foreground">
          {timeAgo(media.startTime)}
        </span>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function VisionFeed() {
  const [expandedDeviceId, setExpandedDeviceId] = useState<string | null>(null);

  // Fetch all user devices
  const { data: devicesResponse, isLoading: isLoadingDevices } =
    useDevicesControllerFindMine();
  const rawDevices = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((devicesResponse as any)?.data ?? []) as { id: string; name: string }[],
    [devicesResponse]
  );

  // Fetch recent media logs sorted by time (latest first)
  const {
    data: mediaResponse,
    isLoading: isLoadingMedia,
    refetch,
    isFetching,
  } = useMediaLogsControllerFindMine(
    {
      sortBy: "startTime",
      sortOrder: "DESC",
      limit: 100,
    },
    {
      query: {
        refetchInterval: 15000,
      },
    }
  );

  const allMedia = useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ((mediaResponse as any)?.data ?? []) as {
        id: string;
        mediaType: string;
        fileUrl: string;
        deviceId: string;
        startTime: string;
      }[],
    [mediaResponse]
  );

  // Group by device → take only the LATEST per device
  const latestPerDevice = useMemo(() => {
    const map = new Map<
      string,
      {
        id: string;
        mediaType: string;
        fileUrl: string;
        deviceId: string;
        startTime: string;
      }
    >();
    for (const m of allMedia) {
      if (!map.has(m.deviceId)) {
        map.set(m.deviceId, m);
      }
    }
    return map;
  }, [allMedia]);

  // Build device name lookup
  const deviceNameMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const d of rawDevices) {
      map.set(d.id, d.name);
    }
    return map;
  }, [rawDevices]);

  const isLoading = isLoadingDevices || isLoadingMedia;

  // Count devices that have ANY media data
  const activeCount = rawDevices.filter((d) =>
    latestPerDevice.has(d.id)
  ).length;

  // Recent activity: latest 10 media entries
  const recentActivity = allMedia.slice(0, 10);

  // Dynamic grid columns based on number of devices
  const gridCols =
    rawDevices.length <= 2
      ? "grid-cols-1 sm:grid-cols-2"
      : rawDevices.length <= 4
        ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-2"
        : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  return (
    <>
      <AppHeader
        title="Luồng Video"
        breadcrumbs={[{ label: "Nhật ký Media" }, { label: "Luồng Video" }]}
      />
      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        {/* Top Bar */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 text-cyan-500">
                <Camera className="h-5 w-5" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight">
                  Luồng Video
                </h1>
                <p className="text-sm text-muted-foreground">
                  Giám sát hình ảnh mới nhất từ các thiết bị
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Device status */}
            <div className="flex items-center gap-2 text-sm bg-card border border-border/50 rounded-lg px-3 py-2">
              <Eye className="w-4 h-4 text-cyan-500" />
              <span className="text-muted-foreground">
                <span className="font-bold text-foreground">{activeCount}</span>{" "}
                / {rawDevices.length} có dữ liệu
              </span>
            </div>

            {/* Refresh button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="gap-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Làm mới
            </Button>
          </div>
        </div>

        {/* Auto-refresh indicator */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-pulse" />
          <span>Tự động làm mới mỗi 15 giây</span>
          {isFetching && (
            <span className="text-cyan-500 font-medium ml-1">
              Đang cập nhật...
            </span>
          )}
        </div>

        {/* Camera Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center flex-1 min-h-[400px]">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : rawDevices.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 min-h-[400px] text-muted-foreground">
            <Camera className="w-12 h-12 mb-4 opacity-20" />
            <p>Chưa có thiết bị nào</p>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {/* Device Camera Grid */}
            <div className={`grid ${gridCols} gap-4`}>
              {rawDevices.map((device) => (
                <DeviceCameraCard
                  key={device.id}
                  device={device}
                  latestMedia={latestPerDevice.get(device.id) ?? null}
                  isExpanded={expandedDeviceId === device.id}
                  onToggleExpand={() =>
                    setExpandedDeviceId((prev) =>
                      prev === device.id ? null : device.id
                    )
                  }
                />
              ))}
            </div>

            {/* Recent Activity Section */}
            {recentActivity.length > 0 && (
              <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                  <div className="flex items-center gap-2">
                    <Film className="w-4 h-4 text-cyan-500" />
                    <h2 className="text-sm font-semibold">
                      Hoạt động gần đây
                    </h2>
                    <Badge
                      variant="outline"
                      className="text-[10px] font-mono px-1.5 py-0 h-5 border-cyan-500/30 text-cyan-400"
                    >
                      {allMedia.length} bản ghi
                    </Badge>
                  </div>
                  <Link
                    to="/media-logs"
                    className="flex items-center gap-1 text-xs text-cyan-500 hover:text-cyan-400 transition-colors"
                  >
                    Xem tất cả
                    <ArrowUpRight className="w-3 h-3" />
                  </Link>
                </div>
                <div>
                  {recentActivity.map((media) => (
                    <RecentActivityRow
                      key={media.id}
                      media={media}
                      deviceName={
                        deviceNameMap.get(media.deviceId) ?? media.deviceId
                      }
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
