import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Clock,
  Image as ImageIcon,
  Video,
  X,
  ZoomIn,

} from "lucide-react";
import { ALERT_TYPE_CONFIG, type UserAlert } from "@/types";
import { useMediaLogsControllerGetStreamUrl } from "@/services/apis/gen/queries";

interface AlertDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert: UserAlert | null;
  onResolve: (alertId: string) => void;
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function AlertDetailDialog({
  open,
  onOpenChange,
  alert,
  onResolve,
}: AlertDetailDialogProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const { data: streamResponse, isLoading: isLoadingMedia } = useMediaLogsControllerGetStreamUrl(
    alert?.media?.mediaLogId || "",
    { query: { enabled: !!alert?.media?.mediaLogId && open } }
  );

  const getMediaUrl = () => {
    if (!alert?.media) return "";
    if (!alert.media.mediaLogId) return alert.media.url;
    if (!streamResponse) return alert.media.url;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (streamResponse as any).data ?? streamResponse;
    const url = data?.url || data?.data?.url || (typeof streamResponse === 'string' ? streamResponse : null);
    return url || alert.media.url;
  };

  const actualMediaUrl = getMediaUrl();

  if (!alert) return null;

  const typeConfig = ALERT_TYPE_CONFIG[alert.type];

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px] border-border/50 bg-card/95 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{typeConfig.icon}</span>
              <div>
                <DialogTitle className="text-lg font-semibold">
                  Chi tiết cảnh báo
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {alert.id}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {/* Alert Type & Status */}
            <div className="flex items-center justify-between">
              <Badge
                variant="outline"
                className={`text-xs px-2.5 py-1 ${typeConfig.badgeClass}`}
              >
                {typeConfig.icon} {typeConfig.label}
              </Badge>
              {alert.isResolved ? (
                <Badge
                  variant="outline"
                  className="text-xs text-emerald-500 border-emerald-500/20 gap-1"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  Đã xử lý
                </Badge>
              ) : (
                <Badge
                  variant="outline"
                  className="text-xs text-amber-500 border-amber-500/20 gap-1"
                >
                  <AlertTriangle className="h-3 w-3" />
                  Chưa xử lý
                </Badge>
              )}
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  Thiết bị
                </p>
                <div className="flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-primary" />
                  <span className="text-xs font-semibold">
                    {alert.deviceName}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                  {alert.deviceId}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1">
                  Thời gian
                </p>
                <div className="flex items-center gap-1.5">
                  <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs font-medium">
                    {formatDateTime(alert.timestamp)}
                  </span>
                </div>
              </div>
            </div>

            {/* Message */}
            <div className="p-3 rounded-lg bg-muted/30 border border-border/30">
              <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                Nội dung
              </p>
              <p className="text-sm leading-relaxed">{alert.message}</p>
            </div>

            {/* Media Section */}
            {alert.media && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {alert.media.type === "image_frame" ? (
                    <ImageIcon className="h-4 w-4 text-blue-400" />
                  ) : (
                    <Video className="h-4 w-4 text-violet-400" />
                  )}
                  <p className="text-xs font-semibold">
                    {alert.media.type === "image_frame"
                      ? "Ảnh Snapshot"
                      : "Video Clip"}
                  </p>
                </div>

                {alert.media.type === "image_frame" ? (
                  /* Image with lightbox */
                  <div
                    className="relative group rounded-lg overflow-hidden border border-border/30 cursor-pointer"
                    onClick={() => setLightboxOpen(true)}
                  >
                    {isLoadingMedia ? (
                      <div className="w-full h-[240px] bg-muted/50 animate-pulse rounded-lg flex items-center justify-center text-muted-foreground text-xs">Đang tải ảnh...</div>
                    ) : (
                      <img
                        src={actualMediaUrl}
                        alt="Alert snapshot"
                        className="w-full h-[240px] object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                      <ZoomIn className="h-8 w-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                ) : (
                  /* Video Player with progress bar */
                  <div className="rounded-lg overflow-hidden border border-border/30">
                    {isLoadingMedia ? (
                      <div className="w-full h-[240px] bg-muted/50 animate-pulse rounded-lg flex items-center justify-center text-muted-foreground text-xs">Đang tải video...</div>
                    ) : (
                      <video
                        controls
                        className="w-full h-[240px] bg-black"
                        poster={alert.media.thumbnail}
                      >
                        <source src={actualMediaUrl} type="video/mp4" />
                        Trình duyệt không hỗ trợ video.
                      </video>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Action */}
            {!alert.isResolved && (
              <Button
                className="w-full gap-2 text-sm"
                onClick={() => {
                  onResolve(alert.id);
                  onOpenChange(false);
                }}
              >
                <CheckCircle2 className="h-4 w-4" />
                Đánh dấu đã xử lý
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Lightbox for image */}
      {lightboxOpen && alert.media?.type === "image_frame" && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center cursor-zoom-out"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-4 right-4 h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors z-10"
            onClick={() => setLightboxOpen(false)}
          >
            <X className="h-5 w-5 text-white" />
          </button>
          <img
            src={actualMediaUrl}
            alt="Alert snapshot full"
            className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </>
  );
}
