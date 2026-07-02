import { Camera, Eye } from "lucide-react";
import type { DashboardMediaLog as MediaLog } from "@/types";
import { useMediaLogsControllerGetStreamUrl } from "@/services/apis/gen/queries";

function timeAgo(ts: string) {
  const diff = Math.floor((new Date().getTime() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

function MediaLogItem({ log }: { log: MediaLog }) {
  const { data: streamResponse } = useMediaLogsControllerGetStreamUrl(log.id);

  const getUrl = () => {
    if (!streamResponse) return log.thumbnail;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (streamResponse as any).data ?? streamResponse;
    const url = data?.url || data?.data?.url || (typeof streamResponse === 'string' ? streamResponse : null);
    return url || log.thumbnail;
  };

  const streamUrl = getUrl();
  const isVideo = log.objectDetected === "Video recording";

  return (
    <div className="media-item">
      {isVideo ? (
        <video
          src={streamUrl ? streamUrl + "#t=0.001" : undefined}
          className="media-thumb object-cover"
          preload="metadata"
          playsInline
          muted
        />
      ) : streamUrl ? (
        <img
          src={streamUrl}
          alt="Media capture"
          className="media-thumb"
        />
      ) : (
        <div className="media-thumb bg-slate-950 flex items-center justify-center text-xs text-muted-foreground">
          No Preview
        </div>
      )}
      
      <div className="media-info">
        <div className="title">
          <Eye style={{ width: "13px", height: "13px" }} />
          {log.objectDetected}
        </div>
        <div className="meta">
          <b>{log.confidence}%</b> · {log.resolution} · {timeAgo(log.timestamp)}
        </div>
        <div className="meta" style={{ marginTop: "3px" }}>
          {log.deviceName}
        </div>
      </div>
    </div>
  );
}

export function MediaLogs({ logs }: { logs: MediaLog[] }) {
  return (
    <div className="panel violet">
      <div className="panel-head">
        <div className="left">
          <div className="panel-icon-box">
            <Camera style={{ width: "18px", height: "18px" }} />
          </div>
          <div>
            <h2>Nhật ký Media gần đây</h2>
            <div className="sub">Nhận diện hình ảnh</div>
          </div>
        </div>
        <span className="media-tag">{logs.length} lượt ghi</span>
      </div>

      <div className="max-h-[300px] overflow-y-auto">
        {logs.map((log) => (
          <MediaLogItem key={log.id} log={log} />
        ))}
      </div>
    </div>
  );
}
