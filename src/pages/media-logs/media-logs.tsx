import { useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Film, Video, Image as ImageIcon, Download, Search, Loader2 } from "lucide-react";
import { useMediaLogsControllerFindMine, useDevicesControllerFindMine, useMediaLogsControllerGetStreamUrl } from "@/services/apis/gen/queries";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

function MediaLogItem({ media }: { media: { id: string; mediaType: string; fileUrl: string; deviceId: string; startTime: string } }) {
  const { data: streamResponse, isLoading } = useMediaLogsControllerGetStreamUrl(media.id);
  
  const getUrl = () => {
    if (!streamResponse) return media.fileUrl;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (streamResponse as any).data ?? streamResponse;
    const url = data?.url || data?.data?.url || (typeof streamResponse === 'string' ? streamResponse : null);
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

export default function MediaLogs() {
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("all");
  const [page, setPage] = useState(1);
  const limit = 12;

  // Lấy danh sách thiết bị
  const { data: devicesResponse } = useDevicesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevices = (devicesResponse as any)?.data ?? [];

  // Lấy danh sách Media Logs
  const { data: mediaResponse, isLoading: isLoadingMedia } = useMediaLogsControllerFindMine({
    deviceId: selectedDeviceId !== "all" ? selectedDeviceId : undefined,
    page,
    limit,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mediaLogs = (mediaResponse as any)?.data ?? (mediaResponse as any)?.data?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const total = (mediaResponse as any)?.total ?? (mediaResponse as any)?.data?.total ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (mediaResponse as any)?.pageCount ?? (mediaResponse as any)?.data?.pageCount ?? 1;

  return (
    <>
      <AppHeader
        title="Media Logs"
        breadcrumbs={[
          { label: "Media Logs" },
          { label: "Media Logs" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Media Logs</h1>
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
              <button className="px-3 py-1 text-xs font-medium rounded-md bg-background shadow-sm border border-border/50">Tất cả</button>
              {/* Could add further filters for image/video later */}
            </div>
          </div>
        </div>
        
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
          <div className="flex flex-col gap-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
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
      </div>
    </>
  );
}
