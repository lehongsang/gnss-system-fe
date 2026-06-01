import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Cpu,
  Wifi,
  WifiOff,
  Wrench,
  Camera,
  CameraOff,
  Satellite,
  SatelliteDish,
  BatteryFull,
  BatteryLow,
  BatteryMedium,
  BatteryWarning,
  Gauge,
  MapPin,
  Calendar,
  Hash,
  User,
} from "lucide-react";
import type { DeviceDetailInfo } from "@/types";

interface DeviceInfoPanelProps {
  device: DeviceDetailInfo;
}

const STATUS_MAP = {
  online: {
    label: "Online",
    icon: Wifi,
    dotColor: "bg-emerald-500",
    badgeClass:
      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
  },
  offline: {
    label: "Offline",
    icon: WifiOff,
    dotColor: "bg-red-400",
    badgeClass: "bg-red-500/10 text-red-400 border-red-500/20",
  },
  maintenance: {
    label: "Maintenance",
    icon: Wrench,
    dotColor: "bg-amber-500",
    badgeClass:
      "bg-amber-500/10 text-amber-500 border-amber-500/20",
  },
};


function getBatteryColor(level: number) {
  if (level > 20) return "text-emerald-500";
  return "text-red-400";
}

function getBatteryBarColor(level: number) {
  if (level > 20) return "bg-emerald-500";
  return "bg-red-400";
}

function getBatteryBg(level: number) {
  if (level > 20) return "bg-emerald-500/20";
  return "bg-red-500/20";
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function BatteryIcon({ level, className }: { level: number; className?: string }) {
  if (level >= 80) return <BatteryFull className={className} />;
  if (level >= 40) return <BatteryMedium className={className} />;
  if (level >= 15) return <BatteryLow className={className} />;
  return <BatteryWarning className={className} />;
}

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Cpu;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        <span className="text-xs">{label}</span>
      </div>
      <div className="text-xs font-medium">{children}</div>
    </div>
  );
}

export function DeviceInfoPanel({ device }: DeviceInfoPanelProps) {
  const statusCfg = STATUS_MAP[device.status];
  const StatusIcon = statusCfg.icon;
  const batColor = getBatteryColor(device.battery);

  return (
    <div className="space-y-4">
      {/* Device Identity Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm overflow-hidden">
        <CardHeader className="pb-3 px-5 pt-4">
          <div className="flex items-center gap-3">
            <div
              className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                device.status === "online"
                  ? "bg-blue-500/10 text-blue-500"
                  : device.status === "maintenance"
                  ? "bg-amber-500/10 text-amber-500"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              <Cpu className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{device.name}</h2>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] px-2 py-0.5 ${statusCfg.badgeClass}`}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              {statusCfg.label}
            </Badge>
          </div>
        </CardHeader>

        <CardContent className="px-5 pb-4">
          <Separator className="mb-3" />

          <InfoRow icon={Hash} label="Device ID">
            <code className="font-mono text-[10px] bg-muted/50 px-1.5 py-0.5 rounded">
              {device.id}
            </code>
          </InfoRow>

          <InfoRow icon={User} label="Chủ sở hữu">
            <span className="text-primary">{device.owner}</span>
          </InfoRow>

          <InfoRow icon={Gauge} label="Speed Limit">
            <span className="font-mono">{device.speedLimitKmh} km/h</span>
          </InfoRow>

          <InfoRow icon={MapPin} label="Tọa độ">
            <span className="font-mono text-[10px]">
              {device.lat.toFixed(4)}, {device.lng.toFixed(4)}
            </span>
          </InfoRow>

          <InfoRow icon={Calendar} label="Hoạt động gần nhất">
            {formatDate(device.lastSeen)}
          </InfoRow>

          <InfoRow icon={Calendar} label="Ngày tạo">
            {formatDate(device.createdAt)}
          </InfoRow>
        </CardContent>
      </Card>

      {/* Battery Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3 px-5 pt-4">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg ${
                device.battery > 20
                  ? "bg-emerald-500/10 text-emerald-500"
                  : "bg-red-500/10 text-red-400"
              }`}
            >
              <BatteryIcon level={device.battery} className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-semibold">
              Mức pin
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4">
          <div className="flex items-center justify-between mb-2">
            <span className={`text-2xl font-bold ${batColor}`}>
              {device.battery}%
            </span>
            <span className="text-xs text-muted-foreground">
              {device.battery > 80
                ? "Tốt"
                : device.battery > 20
                ? "Trung bình"
                : "Yếu — cần sạc"}
            </span>
          </div>
          <div
            className={`h-3 w-full rounded-full ${getBatteryBg(
              device.battery
            )} overflow-hidden`}
          >
            <div
              className={`h-full rounded-full transition-all duration-700 ${getBatteryBarColor(
                device.battery
              )}`}
              style={{ width: `${device.battery}%` }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Camera & GNSS Status Card */}
      <Card className="border-border/50 bg-card/80 backdrop-blur-sm">
        <CardHeader className="pb-3 px-5 pt-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <SatelliteDish className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-semibold">
              Trạng thái Module
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="px-5 pb-4 space-y-3">
          {/* Camera */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2.5">
              {device.cameraStatus ? (
                <Camera className="h-4 w-4 text-emerald-500" />
              ) : (
                <CameraOff className="h-4 w-4 text-red-400" />
              )}
              <div>
                <p className="text-xs font-medium">Camera</p>
                <p className="text-[10px] text-muted-foreground">
                  Vision module
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold gap-1.5 px-2 py-0.5 border ${
                device.cameraStatus
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${device.cameraStatus ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]' : 'bg-red-500'}`} />
              {device.cameraStatus ? "Hoạt động" : "Ngoại tuyến"}
            </Badge>
          </div>

          {/* GNSS */}
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30 border border-border/30">
            <div className="flex items-center gap-2.5">
              <Satellite
                className={`h-4 w-4 ${
                  device.gnssStatus ? "text-emerald-500" : "text-red-400"
                }`}
              />
              <div>
                <p className="text-xs font-medium">GNSS Receiver</p>
                <p className="text-[10px] text-muted-foreground">
                  {device.satellites} vệ tinh
                </p>
              </div>
            </div>
            <Badge
              variant="outline"
              className={`text-[10px] font-semibold gap-1.5 px-2 py-0.5 border ${
                device.gnssStatus
                  ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                  : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${device.gnssStatus ? 'bg-emerald-500 animate-pulse shadow-[0_0_6px_#10b981]' : 'bg-red-500'}`} />
              {device.gnssStatus ? "Hoạt động" : "Ngoại tuyến"}
            </Badge>
          </div>

          {/* Satellite Progress */}
          {device.gnssStatus && (
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">
                  Số vệ tinh bắt được
                </span>
                <span className="text-xs font-mono font-bold">
                  {device.satellites}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
