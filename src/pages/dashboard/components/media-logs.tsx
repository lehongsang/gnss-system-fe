import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Camera, Eye, ScanSearch } from "lucide-react";
import type { DashboardMediaLog as MediaLog } from "@/types";

function timeAgo(ts: string) {
  const diff = Math.floor((new Date("2026-04-22T15:41:00+07:00").getTime() - new Date(ts).getTime()) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  return `${Math.floor(diff / 60)}h ago`;
}

// SVG placeholder thumbnails with different visual themes for each detection type
function PlaceholderThumb({ object, index }: { object: string; index: number }) {
  const hues = [210, 160, 280, 340, 40, 120];
  const hue = hues[index % hues.length];

  return (
    <div className="relative h-full w-full overflow-hidden rounded-lg bg-gradient-to-br" style={{ background: `linear-gradient(135deg, hsl(${hue}, 60%, 15%) 0%, hsl(${hue}, 40%, 8%) 100%)` }}>
      <svg className="absolute inset-0 h-full w-full opacity-20" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <pattern id={`scan-${index}`} width="8" height="8" patternUnits="userSpaceOnUse">
            <line x1="0" y1="8" x2="8" y2="0" stroke={`hsl(${hue}, 70%, 50%)`} strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#scan-${index})`} />
      </svg>
      {/* Scan line effect */}
      <div className="absolute inset-x-0 top-1/3 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent animate-pulse" style={{ animationDuration: "2s" }} />
      {/* Detection box */}
      <div className="absolute inset-3 border border-dashed rounded" style={{ borderColor: `hsl(${hue}, 70%, 50%, 0.5)` }}>
        <div className="absolute -top-1.5 -left-1.5 h-3 w-3 border-t-2 border-l-2 rounded-tl" style={{ borderColor: `hsl(${hue}, 70%, 50%)` }} />
        <div className="absolute -top-1.5 -right-1.5 h-3 w-3 border-t-2 border-r-2 rounded-tr" style={{ borderColor: `hsl(${hue}, 70%, 50%)` }} />
        <div className="absolute -bottom-1.5 -left-1.5 h-3 w-3 border-b-2 border-l-2 rounded-bl" style={{ borderColor: `hsl(${hue}, 70%, 50%)` }} />
        <div className="absolute -bottom-1.5 -right-1.5 h-3 w-3 border-b-2 border-r-2 rounded-br" style={{ borderColor: `hsl(${hue}, 70%, 50%)` }} />
      </div>
      {/* Center icon */}
      <div className="absolute inset-0 flex items-center justify-center">
        <ScanSearch className="h-6 w-6 opacity-30" style={{ color: `hsl(${hue}, 70%, 60%)` }} />
      </div>
      {/* Label */}
      <div className="absolute bottom-1.5 left-1.5 text-[8px] font-mono px-1 py-0.5 rounded bg-black/50 backdrop-blur-sm" style={{ color: `hsl(${hue}, 70%, 70%)` }}>
        {object.split("—")[0].trim()}
      </div>
    </div>
  );
}

export function MediaLogs({ logs }: { logs: MediaLog[] }) {
  return (
    <Card className="flex flex-col overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-5 pt-4 pb-3 space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-500">
              <Camera className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">Recent Media Logs</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Vision detections</p>
            </div>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 border-cyan-500/30 text-cyan-400">
            {logs.length} captures
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[280px]">
          <div className="space-y-2 px-4 pb-4">
            {logs.map((log, i) => (
              <div key={log.id} className="group flex gap-3 rounded-lg p-2 transition-colors hover:bg-accent/30 cursor-pointer border border-transparent hover:border-border/40">
                {/* Thumbnail */}
                <div className="h-16 w-20 shrink-0 overflow-hidden rounded-lg">
                  <PlaceholderThumb object={log.objectDetected} index={i} />
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <Eye className="h-3 w-3 text-cyan-500 shrink-0" />
                    <p className="text-xs font-semibold truncate">{log.objectDetected}</p>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="font-mono">{log.confidence}%</span>
                    <span>·</span>
                    <span>{log.resolution}</span>
                    <span>·</span>
                    <span>{timeAgo(log.timestamp)}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground font-mono">{log.deviceName} ({log.deviceId})</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
