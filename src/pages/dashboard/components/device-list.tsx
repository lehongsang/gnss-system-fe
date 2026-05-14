import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Satellite,
  BatteryMedium,
  BatteryLow,
  BatteryFull,
  BatteryWarning,
  Radio,
  Crosshair,
} from "lucide-react";
import type { DashboardDevice as Device } from "@/types";

interface DeviceListProps {
  devices: Device[];
}

function getBatteryIcon(level: number) {
  if (level >= 80) return BatteryFull;
  if (level >= 40) return BatteryMedium;
  if (level >= 15) return BatteryLow;
  return BatteryWarning;
}

function getBatteryColor(level: number) {
  if (level >= 60) return "text-emerald-500";
  if (level >= 30) return "text-amber-500";
  return "text-red-400";
}

function getHdopLabel(hdop: number) {
  if (hdop <= 1) return { label: "Excellent", color: "text-emerald-500" };
  if (hdop <= 2) return { label: "Good", color: "text-blue-400" };
  if (hdop <= 5) return { label: "Moderate", color: "text-amber-500" };
  return { label: "Poor", color: "text-red-400" };
}

function getTypeIcon(type: Device["type"]) {
  switch (type) {
    case "rover":
      return Crosshair;
    case "base":
      return Radio;
    case "relay":
      return Satellite;
  }
}

export function DeviceList({ devices }: DeviceListProps) {
  const sorted = [...devices].sort((a, b) => {
    if (a.status === b.status) return b.satellites - a.satellites;
    return a.status === "online" ? -1 : 1;
  });

  return (
    <Card className="flex flex-col overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-5 pt-4 pb-3 space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <Satellite className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-semibold">Device Status</CardTitle>
          </div>
          <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 border-muted-foreground/20">
            {devices.length} devices
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[388px]">
          <div className="space-y-0.5 px-3 pb-3">
            {sorted.map((device) => {
              const BatIcon = getBatteryIcon(device.battery);
              const batColor = getBatteryColor(device.battery);
              const hdopInfo = getHdopLabel(device.hdop);
              const TypeIcon = getTypeIcon(device.type);
              const isOnline = device.status === "online";
              const satPercent = (device.satellites / device.maxSatellites) * 100;

              return (
                <div
                  key={device.id}
                  className="group rounded-lg p-3 transition-colors hover:bg-accent/50 cursor-pointer border border-transparent hover:border-border/50"
                >
                  {/* Header row */}
                  <div className="flex items-center justify-between mb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${isOnline ? "bg-emerald-500/10 text-emerald-500" : "bg-muted text-muted-foreground"}`}>
                        <TypeIcon className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <p className="text-xs font-semibold leading-none">{device.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{device.id}</p>
                      </div>
                    </div>
                    <Badge
                      variant={isOnline ? "default" : "secondary"}
                      className={`text-[10px] px-1.5 py-0 h-5 ${
                        isOnline
                          ? "bg-emerald-500/15 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/20"
                          : "bg-muted text-muted-foreground border-muted-foreground/20 hover:bg-muted"
                      }`}
                    >
                      <span className={`mr-1 h-1.5 w-1.5 rounded-full ${isOnline ? "bg-emerald-500" : "bg-muted-foreground"}`} />
                      {isOnline ? "Online" : "Offline"}
                    </Badge>
                  </div>

                  {/* Metrics grid */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* HDOP / VDOP */}
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">HDOP / VDOP</p>
                      <p className={`text-xs font-bold font-mono ${hdopInfo.color}`}>
                        {device.hdop > 0 ? `${device.hdop} / ${device.vdop}` : "—"}
                      </p>
                      <p className={`text-[9px] ${hdopInfo.color}`}>{device.hdop > 0 ? hdopInfo.label : "N/A"}</p>
                    </div>

                    {/* Battery */}
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Battery</p>
                      <div className={`flex items-center gap-1 ${batColor}`}>
                        <BatIcon className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold font-mono">{device.battery}%</span>
                      </div>
                    </div>

                    {/* Satellites */}
                    <div className="space-y-1">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Satellites</p>
                      <p className="text-xs font-bold font-mono">
                        {device.satellites}/{device.maxSatellites}
                      </p>
                      <Progress
                        value={satPercent}
                        className="h-1.5 bg-muted"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
