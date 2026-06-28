import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ShieldAlert,
  Cpu,
  Pentagon,
  Activity,
  Bell,
  Play,
  Volume2,
  VolumeX,
  ChevronRight,
  Save,
  Edit2,
  Settings2,
  ArrowUpRight
} from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  useDevicesControllerFindMine,
  useDevicesControllerUpdate,
  useGeofencesControllerFindMine,
  useAlertsControllerFindMine,
  getDevicesControllerFindMineQueryKey,
} from "@/services/apis/gen/queries";
import type { UserDevice, GeofenceZone, UserAlert } from "@/types";

export default function AlertRulesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Query devices
  const { data: devicesResponse, isLoading: isLoadingDevices } = useDevicesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevices = (devicesResponse as any)?.data ?? [];
  
  // Query geofences
  const { data: geofencesResponse, isLoading: isLoadingGeofences } = useGeofencesControllerFindMine();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawGeofences = (geofencesResponse as any)?.data ?? [];

  // Query alerts
  const { data: alertsResponse, isLoading: isLoadingAlerts } = useAlertsControllerFindMine({ page: 1, limit: 10 });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAlerts = (alertsResponse as any)?.data ?? [];

  const updateDeviceMutation = useDevicesControllerUpdate();

  // Speed Edit State
  const [editingDeviceId, setEditingDeviceId] = useState<string | null>(null);
  const [editSpeedLimit, setEditSpeedLimit] = useState<number>(60);

  // Simulator State
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [simDevice, setSimDevice] = useState<string>("");
  const [simAlertType, setSimAlertType] = useState<string>("speeding");
  const [simMessage, setSimMessage] = useState<string>("");

  // Synthesize custom sound triggers (without external audio dependencies)
  const playAlertSound = (type: string) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      if (type === "dangerous_obstacle" || type === "geofence_exit" || type === "critical") {
        // Double beep for critical alert
        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        gain.gain.setValueAtTime(0.12, ctx.currentTime);
        osc.start();
        osc.stop(ctx.currentTime + 0.12);
        
        setTimeout(() => {
          try {
            const ctx2 = new AudioCtx();
            const osc2 = ctx2.createOscillator();
            const gain2 = ctx2.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx2.destination);
            osc2.type = "sawtooth";
            osc2.frequency.setValueAtTime(880, ctx2.currentTime);
            gain2.gain.setValueAtTime(0.12, ctx2.currentTime);
            osc2.start();
            osc2.stop(ctx2.currentTime + 0.12);
          } catch {
            /* ignore */
          }
        }, 180);
      } else {
        // Soft sine sound effect
        osc.type = "sine";
        osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
        osc.frequency.exponentialRampToValueAtTime(783.99, ctx.currentTime + 0.15); // G5
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.22);
        osc.start();
        osc.stop(ctx.currentTime + 0.25);
      }
    } catch (e) {
      console.warn("Failed to synthesize audio beep", e);
    }
  };

  // Trigger simulated warning Toast
  const handleSimulate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!simDevice) {
      toast.warning("Vui lòng chọn một thiết bị");
      return;
    }

    const deviceName = rawDevices.find((d: UserDevice) => d.id === simDevice)?.name ?? simDevice;
    const typeLabels: Record<string, string> = {
      speeding: "Vượt tốc độ giới hạn (Speeding)",
      geofence_exit: "Ra khỏi vùng an toàn (Geofence Exit)",
      geofence_entry: "Đi vào vùng cấm (Geofence Entry)",
      signal_lost: "Mất tín hiệu định vị (Signal Lost)",
      dangerous_obstacle: "Phát hiện chướng ngại vật (Obstacle)",
      trajectory_deviation: "Lệch khỏi quỹ đạo (Deviation)",
    };

    const messageToSend = simMessage.trim() || `Cảnh báo: Thiết bị ${deviceName} phát hiện sự kiện ${typeLabels[simAlertType].toLowerCase()}`;

    // Play synthesized sound
    playAlertSound(simAlertType);

    // Trigger elegant Toast alert notification matching the event type
    const toastConfig = {
      description: messageToSend,
      duration: 6000,
      action: {
        label: "Định vị",
        onClick: () => navigate("/real-time-map"),
      },
    };

    if (["geofence_exit", "geofence_entry", "dangerous_obstacle"].includes(simAlertType)) {
      toast.error(`🚨 [NGUY HIỂM] ${typeLabels[simAlertType]}`, toastConfig);
    } else if (["speeding", "signal_lost"].includes(simAlertType)) {
      toast.warning(`⚠️ [CẢNH BÁO CAO] ${typeLabels[simAlertType]}`, toastConfig);
    } else {
      toast.info(`ℹ️ [CẢNH BÁO TRUNG] ${typeLabels[simAlertType]}`, toastConfig);
    }
  };

  // Update limit inline
  const handleSaveSpeedLimit = (deviceId: string) => {
    if (editSpeedLimit <= 0) {
      toast.error("Tốc độ tối thiểu phải lớn hơn 0 km/h");
      return;
    }

    const deviceName = rawDevices.find((d: UserDevice) => d.id === deviceId)?.name ?? "thiết bị";
    updateDeviceMutation.mutate(
      {
        id: deviceId,
        data: { speedLimitKmh: editSpeedLimit },
      },
      {
        onSuccess: () => {
          toast.success("Cập nhật thành công", {
            description: `Đã thay đổi giới hạn tốc độ thiết bị "${deviceName}" thành ${editSpeedLimit} km/h.`,
          });
          setEditingDeviceId(null);
          queryClient.invalidateQueries({
            queryKey: getDevicesControllerFindMineQueryKey(),
          });
        },
        onError: () => {
          toast.error("Cập nhật giới hạn tốc độ thất bại");
        },
      }
    );
  };
  
  const devicesWithSpeedLimit = rawDevices.filter((d: UserDevice) => (d.speedLimitKmh ?? 0) > 0).length;
  const avgSpeedLimit = rawDevices.length > 0
    ? Math.round(rawDevices.reduce((sum: number, d: UserDevice) => sum + (d.speedLimitKmh ?? 0), 0) / rawDevices.length)
    : 60;

  return (
    <>
      <AppHeader
        title="Quy tắc cảnh báo"
        breadcrumbs={[
          { label: "Cảnh báo & Media" },
          { label: "Quy tắc cảnh báo" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-6 p-6 min-h-full overflow-auto bg-background text-foreground">
        
        {/* Main Title & Audio Settings */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
              Cấu hình Quy tắc Cảnh báo
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Quản lý ngưỡng an toàn tốc độ, khu vực địa lý giám sát, tần suất mất tín hiệu và các lỗi phần cứng.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs border-border/50 bg-card/60 backdrop-blur-md transition-all hover:bg-accent"
              onClick={() => {
                setSoundEnabled(!soundEnabled);
                toast.info(soundEnabled ? "Đã tắt âm thanh cảnh báo" : "Đã bật âm thanh cảnh báo");
              }}
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-4 w-4 text-emerald-500 animate-pulse" />
                  <span>Âm thanh: BẬT</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-4 w-4 text-rose-500" />
                  <span>Âm thanh: TẮT</span>
                </>
              )}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-xs border-border/50 bg-card/60 backdrop-blur-md"
              onClick={() => navigate("/my-alerts")}
            >
              <Bell className="h-4 w-4" />
              <span>Hộp thư cảnh báo</span>
            </Button>
          </div>
        </div>

        {/* 4 Summary Stats of 4 Core Business Rules */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          
          <Card className="border-border/50 bg-card/60 backdrop-blur-md hover:shadow-lg hover:shadow-primary/5 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Vượt tốc độ giới hạn
              </CardTitle>
              <Cpu className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{devicesWithSpeedLimit} Thiết bị</div>
              <p className="text-xs text-muted-foreground mt-1">
                Giới hạn TB: {avgSpeedLimit} km/h (cooldown 60s)
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 backdrop-blur-md hover:shadow-lg hover:shadow-primary/5 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Hàng rào địa lý
              </CardTitle>
              <Pentagon className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{rawGeofences.length} Vùng giám sát</div>
              <p className="text-xs text-muted-foreground mt-1">
                Hỗ trợ 2 cơ chế: Vùng cấm và Vùng an toàn
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 backdrop-blur-md hover:shadow-lg hover:shadow-primary/5 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ngoại tuyến (Heartbeat)
              </CardTitle>
              <Activity className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">5 phút (300s)</div>
              <p className="text-xs text-muted-foreground mt-1">
                Background sweeper quét ngầm định kỳ mỗi 60s
              </p>
            </CardContent>
          </Card>

          <Card className="border-border/50 bg-card/60 backdrop-blur-md hover:shadow-lg hover:shadow-primary/5 transition-all">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Cảnh báo phần cứng
              </CardTitle>
              <ShieldAlert className="h-4 w-4 text-rose-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">MQTT Triggered</div>
              <p className="text-xs text-muted-foreground mt-1">
                Obstacle, deviation, signal loss qua MQTT
              </p>
            </CardContent>
          </Card>

        </div>

        {/* Dashboard Content & Simulator layout */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-10">
          
          {/* Rules Details / Config Tabs (Left 7 Cols) */}
          <div className="lg:col-span-7">
            <Tabs defaultValue="speeding" className="w-full">
              <TabsList className="flex h-auto w-full items-center justify-between border border-border/50 bg-muted/30 p-1 gap-1">
                <TabsTrigger value="speeding" className="flex-1 text-xs sm:text-sm py-2">Quá tốc độ</TabsTrigger>
                <TabsTrigger value="geofence" className="flex-1 text-xs sm:text-sm py-2">Hàng rào địa lý</TabsTrigger>
                <TabsTrigger value="heartbeat" className="flex-1 text-xs sm:text-sm py-2">Mất kết nối</TabsTrigger>
                <TabsTrigger value="hardware" className="flex-1 text-xs sm:text-sm py-2">Phần cứng</TabsTrigger>
              </TabsList>

              {/* Tab 1: Speed limit config */}
              <TabsContent value="speeding" className="mt-4">
                <Card className="border-border/50 bg-card/60 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-amber-500/10 text-amber-500">🏎️</span>
                      Quy tắc vượt tốc độ giới hạn (Speed Limit Rule)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Mỗi thiết bị có cấu hình tốc độ giới hạn riêng. Khi thiết bị di chuyển vượt quá tốc độ này, hệ thống sẽ tự động kích hoạt cảnh báo vượt giới hạn tốc độ. Thời gian giãn cách giữa hai cảnh báo liên tiếp là 60 giây để tối ưu dữ liệu truyền tải.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    {isLoadingDevices ? (
                      <div className="text-center py-6 text-sm text-muted-foreground animate-pulse">
                        Đang tải danh sách thiết bị...
                      </div>
                    ) : rawDevices.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground border border-dashed rounded-xl">
                        Không tìm thấy thiết bị nào trong tài khoản của bạn.
                      </div>
                    ) : (
                      <div className="border border-border/50 rounded-xl overflow-hidden">
                        <Table>
                          <TableHeader className="bg-muted/30">
                            <TableRow>
                              <TableHead className="w-[45%] text-xs font-semibold">Tên thiết bị</TableHead>
                              <TableHead className="w-[20%] text-xs font-semibold">Trạng thái</TableHead>
                              <TableHead className="w-[20%] text-xs font-semibold">Tốc độ tối đa</TableHead>
                              <TableHead className="w-[15%] text-right text-xs font-semibold">Thao tác</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {rawDevices.map((device: UserDevice) => (
                              <TableRow key={device.id} className="hover:bg-muted/20 transition-colors">
                                <TableCell className="font-medium text-xs py-3">{device.name || device.id}</TableCell>
                                <TableCell className="py-3">
                                  {device.status === "online" ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20 border-emerald-500/20 text-[10px]">Online</Badge>
                                  ) : device.status === "maintenance" ? (
                                    <Badge className="bg-amber-500/10 text-amber-500 hover:bg-amber-500/20 border-amber-500/20 text-[10px]">Bảo trì</Badge>
                                  ) : (
                                    <Badge className="bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border-slate-500/20 text-[10px]">Offline</Badge>
                                  )}
                                </TableCell>
                                <TableCell className="py-3">
                                  {editingDeviceId === device.id ? (
                                    <div className="flex items-center gap-1.5">
                                      <Input
                                        type="number"
                                        className="h-8 w-16 text-xs p-1"
                                        value={editSpeedLimit}
                                        min={10}
                                        max={200}
                                        onChange={(e) => setEditSpeedLimit(Number(e.target.value))}
                                      />
                                      <span className="text-[10px] text-muted-foreground">km/h</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs font-mono font-semibold">{device.speedLimitKmh ?? 60} km/h</span>
                                  )}
                                </TableCell>
                                <TableCell className="text-right py-3">
                                  {editingDeviceId === device.id ? (
                                    <div className="flex items-center justify-end gap-1.5">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                                        onClick={() => setEditingDeviceId(null)}
                                      >
                                        Hủy
                                      </Button>
                                      <Button
                                        size="sm"
                                        className="h-7 gap-1 px-2.5 text-[10px]"
                                        onClick={() => handleSaveSpeedLimit(device.id)}
                                      >
                                        <Save className="h-3 w-3" /> Lưu
                                      </Button>
                                    </div>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 hover:bg-accent"
                                      onClick={() => {
                                        setEditingDeviceId(device.id);
                                        setEditSpeedLimit(device.speedLimitKmh ?? 60);
                                      }}
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 2: Geofence preview & routing */}
              <TabsContent value="geofence" className="mt-4">
                <Card className="border-border/50 bg-card/60 backdrop-blur-md">
                  <CardHeader>
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <CardTitle className="text-base font-semibold flex items-center gap-2">
                          <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500">🗺️</span>
                          Quy tắc vùng giám sát (Geofencing Rules)
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Hỗ trợ tự động phát hiện vi phạm ranh giới thời gian thực trên 2 cơ chế vùng:
                        </CardDescription>
                      </div>
                      <Button
                        size="sm"
                        className="gap-1 text-xs whitespace-nowrap shadow-md shadow-primary/20"
                        onClick={() => navigate("/my-geofences")}
                      >
                        Vẽ vùng mới
                        <ArrowUpRight className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                      <div className="p-3 border border-emerald-500/20 bg-emerald-500/5 rounded-xl">
                        <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[10px] mb-2">Vùng an toàn (Allowed Zone)</Badge>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Thiết bị chỉ được phép hoạt động bên trong vùng được chọn. Nhận cảnh báo <code className="px-1 py-0.5 rounded bg-muted font-mono text-[9px]">geofence_exit</code> ngay khi đi chệch khỏi ranh giới.
                        </p>
                      </div>

                      <div className="p-3 border border-rose-500/20 bg-rose-500/5 rounded-xl">
                        <Badge className="bg-rose-500/10 text-rose-500 border-rose-500/20 text-[10px] mb-2">Vùng cấm (Forbidden Zone)</Badge>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Thiết bị bị cấm di chuyển vào. Kích hoạt cảnh báo nguy cấp <code className="px-1 py-0.5 rounded bg-muted font-mono text-[9px]">geofence_enter</code> ngay khi phát hiện thiết bị xâm phạm vùng.
                        </p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vùng đang hoạt động</h4>
                        <span className="text-xs text-muted-foreground">{rawGeofences.length} vùng khả dụng</span>
                      </div>

                      {isLoadingGeofences ? (
                        <div className="text-center py-4 text-sm text-muted-foreground animate-pulse">
                          Đang tải danh sách vùng giám sát...
                        </div>
                      ) : rawGeofences.length === 0 ? (
                        <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl">
                          Chưa có vùng giám sát nào được tạo. Click "Vẽ vùng mới" để bắt đầu thiết lập.
                        </div>
                      ) : (
                        <div className="border border-border/50 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                          <Table>
                            <TableHeader className="bg-muted/30 sticky top-0">
                              <TableRow>
                                <TableHead className="text-xs font-semibold py-2">Tên vùng</TableHead>
                                <TableHead className="text-xs font-semibold py-2">Loại ranh giới</TableHead>
                                <TableHead className="text-xs font-semibold py-2">Số đỉnh</TableHead>
                                <TableHead className="text-xs font-semibold py-2">Số thiết bị gán</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {rawGeofences.map((geo: GeofenceZone) => (
                                <TableRow key={geo.id} className="hover:bg-muted/10">
                                  <TableCell className="font-medium text-xs py-2.5 flex items-center gap-2">
                                    <span
                                      className="inline-block h-3 w-3 rounded-full border border-white/20"
                                      style={{ backgroundColor: geo.color || "#3b82f6" }}
                                    />
                                    {geo.name}
                                  </TableCell>
                                  <TableCell className="py-2.5">
                                    {geo.type === "forbidden_zone" ? (
                                      <Badge variant="outline" className="text-rose-500 border-rose-500/20 bg-rose-500/5 text-[9px]">Vùng cấm</Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-emerald-500 border-emerald-500/20 bg-emerald-500/5 text-[9px]">Vùng an toàn</Badge>
                                    )}
                                  </TableCell>
                                  <TableCell className="py-2.5 text-xs font-mono">{geo.vertexCount ?? 4} điểm</TableCell>
                                  <TableCell className="py-2.5 text-xs font-mono">{(geo.Devices ?? []).length} thiết bị</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 3: Heartbeat Offline Rule */}
              <TabsContent value="heartbeat" className="mt-4">
                <Card className="border-border/50 bg-card/60 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500">📡</span>
                      Quy tắc mất tín hiệu ngoại tuyến (Heartbeat sweeper)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Cơ chế kiểm soát hoạt động liên tục (Keep-Alive) từ thiết bị.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    <div className="rounded-xl border border-border/50 bg-muted/20 p-4 space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-500 mt-0.5">
                          <Activity className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-foreground">Background Heartbeat Sweeper</h4>
                          <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed">
                            Một tiến trình quét ngầm chạy tự động trên máy chủ mỗi 60 giây. Nếu một thiết bị đang có trạng thái online mà không gửi bất kỳ tọa độ viễn trắc nào trong vòng liên tục <span className="font-semibold text-foreground">5 phút (300 giây)</span>, hệ thống sẽ tự động cập nhật trạng thái thiết bị sang <code className="px-1 py-0.5 rounded bg-muted font-mono text-[10px]">offline</code> và bắn cảnh báo loại <Badge variant="secondary" className="text-[10px]">signal_lost</Badge>.
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 space-y-3">
                      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Trạng thái kết nối hiện tại</h4>
                      
                      {isLoadingDevices ? (
                        <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">
                          Đang đồng bộ trạng thái kết nối...
                        </div>
                      ) : (
                        <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
                          {rawDevices.map((device: UserDevice) => (
                            <div key={device.id} className="flex items-center justify-between p-3 border border-border/50 rounded-xl bg-card hover:bg-muted/10 transition-colors">
                              <div className="flex items-center gap-2">
                                <span className={`h-2.5 w-2.5 rounded-full ${device.status === "online" ? "bg-emerald-500 animate-pulse" : device.status === "maintenance" ? "bg-amber-500" : "bg-slate-500"}`} />
                                <span className="text-xs font-medium">{device.name || device.id}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground font-mono">
                                {device.status === "online" ? "Kết nối tốt" : device.status === "maintenance" ? "Bảo trì" : "Mất kết nối"}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab 4: Hardware and MQTT events */}
              <TabsContent value="hardware" className="mt-4">
                <Card className="border-border/50 bg-card/60 backdrop-blur-md">
                  <CardHeader>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">⚠️</span>
                      Cảnh báo vật lý từ MQTT (Hardware-driven Alerts)
                    </CardTitle>
                    <CardDescription className="text-xs">
                      Bản đồ loại sự kiện lỗi được bắn tự động từ phần cứng của thiết bị (sử dụng topic MQTT):
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    
                    <div className="grid gap-3 grid-cols-1 md:grid-cols-3">
                      <div className="p-3 border border-border/50 rounded-xl space-y-1 bg-muted/10">
                        <span className="text-xs font-mono font-semibold text-rose-400">dangerous_obstacle</span>
                        <p className="text-[11px] text-muted-foreground">Phát hiện chướng ngại vật phía trước bởi cảm biến Laser LiDAR/Radar. Độ nguy hại: <b>CRITICAL</b>.</p>
                      </div>
                      <div className="p-3 border border-border/50 rounded-xl space-y-1 bg-muted/10">
                        <span className="text-xs font-mono font-semibold text-violet-400">trajectory_deviation</span>
                        <p className="text-[11px] text-muted-foreground">Phát hiện thiết bị lệch khỏi đường dẫn/quỹ đạo tối ưu định sẵn. Độ nguy hại: <b>MEDIUM</b>.</p>
                      </div>
                      <div className="p-3 border border-border/50 rounded-xl space-y-1 bg-muted/10">
                        <span className="text-xs font-mono font-semibold text-slate-400">signal_lost</span>
                        <p className="text-[11px] text-muted-foreground">Mất hoàn toàn tín hiệu vệ tinh RTK GNSS phần cứng. Độ nguy hại: <b>HIGH</b>.</p>
                      </div>
                    </div>

                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cảnh báo gần đây</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs text-muted-foreground hover:text-foreground gap-1"
                          onClick={() => navigate("/my-alerts")}
                        >
                          Tất cả cảnh báo
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      {isLoadingAlerts ? (
                        <div className="text-center py-4 text-xs text-muted-foreground animate-pulse">
                          Đang tải lịch sử cảnh báo...
                        </div>
                      ) : rawAlerts.length === 0 ? (
                        <div className="text-center py-6 text-xs text-muted-foreground border border-dashed rounded-xl">
                          Chưa ghi nhận cảnh báo nào gần đây.
                        </div>
                      ) : (
                        <div className="border border-border/50 rounded-xl overflow-hidden max-h-56 overflow-y-auto">
                          <Table>
                            <TableBody>
                              {rawAlerts.map((alert: UserAlert) => (
                                <TableRow key={alert.id} className="hover:bg-muted/10">
                                  <TableCell className="py-2 px-3 text-xs w-[15%]">
                                    <Badge variant="outline" className={`text-[9px] ${
                                      alert.alertType === "dangerous_obstacle" ? "text-rose-400 border-rose-500/20 bg-rose-500/5" :
                                      alert.alertType === "speeding" ? "text-amber-500 border-amber-500/20 bg-amber-500/5" : "text-slate-400"
                                    }`}>
                                      {alert.alertType === "dangerous_obstacle" ? "Obstacle" : alert.alertType === "speeding" ? "Tốc độ" : alert.alertType}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="py-2 px-3 text-xs font-medium w-[25%]">{alert.device?.name || alert.deviceId}</TableCell>
                                  <TableCell className="py-2 px-3 text-[11px] text-muted-foreground w-[45%] truncate max-w-[200px]">{alert.message}</TableCell>
                                  <TableCell className="py-2 px-3 text-right text-[10px] text-muted-foreground w-[15%]">
                                    {new Date(alert.createdAt || alert.timestamp).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

            </Tabs>
          </div>

          {/* Alert Simulator Panel (Right 3 Cols) */}
          <div className="lg:col-span-3">
            <Card className="border-border/50 bg-card/60 backdrop-blur-md h-full flex flex-col hover:shadow-xl hover:shadow-primary/5 transition-all">
              <CardHeader className="border-b border-border/40 pb-4">
                <div className="flex items-center gap-2 text-rose-500">
                  <Settings2 className="h-5 w-5 animate-spin" style={{ animationDuration: "12s" }} />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider">
                    Trình giả lập Cảnh báo
                  </CardTitle>
                </div>
                <CardDescription className="text-[11px] mt-1 leading-relaxed">
                  Giả lập sự kiện WebSocket thời gian thực từ phần cứng thiết bị. Bấm kích hoạt để kiểm tra hiệu ứng thông báo và âm thanh.
                </CardDescription>
              </CardHeader>
              
              <CardContent className="flex-1 py-4">
                <form onSubmit={handleSimulate} className="space-y-4">
                  
                  {/* Select Device */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sim-device" className="text-xs font-medium">Thiết bị gửi sự kiện</Label>
                    <select
                      id="sim-device"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={simDevice}
                      onChange={(e) => {
                        setSimDevice(e.target.value);
                        if (e.target.value) {
                          const name = rawDevices.find((d: UserDevice) => d.id === e.target.value)?.name;
                          setSimMessage(`🚨 Cảnh báo từ thiết bị ${name || e.target.value}: Phát hiện chướng ngại vật nguy cấp ở phía trước.`);
                        }
                      }}
                      disabled={isLoadingDevices || rawDevices.length === 0}
                    >
                      <option className="bg-background text-foreground" value="">-- Chọn thiết bị --</option>
                      {rawDevices.map((d: UserDevice) => (
                        <option className="bg-background text-foreground" key={d.id} value={d.id}>
                          {d.name || d.id}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Select Alert Type */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sim-type" className="text-xs font-medium">Loại sự kiện (alertType)</Label>
                    <select
                      id="sim-type"
                      className="h-10 w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      value={simAlertType}
                      onChange={(e) => {
                        setSimAlertType(e.target.value);
                        const name = rawDevices.find((d: UserDevice) => d.id === simDevice)?.name ?? "Rover-GPS";
                        const messages: Record<string, string> = {
                          speeding: `⚠️ Thiết bị ${name} vượt quá tốc độ giới hạn: Đang chạy 92 km/h (Ngưỡng an toàn: 60 km/h).`,
                          geofence_exit: `🚨 Nguy hiểm: Thiết bị ${name} di chuyển RA KHỎI vùng an toàn cho phép (Allowed Zone).`,
                          geofence_entry: `🚨 Cảnh báo: Thiết bị ${name} đi VÀO vùng cấm cấm địa (Forbidden Zone).`,
                          signal_lost: `⚠️ Mất kết nối: Thiết bị ${name} mất hoàn toàn tín hiệu định vị RTK GNSS/GPS.`,
                          dangerous_obstacle: `🚨 Khẩn cấp: Thiết bị ${name} phát hiện vật cản nguy hiểm phía trước (khoảng cách 1.2m).`,
                          trajectory_deviation: `ℹ️ Thông báo: Thiết bị ${name} lệch khỏi quỹ đạo di chuyển định vị cho phép 3.5m.`,
                        };
                        setSimMessage(messages[e.target.value] || "");
                      }}
                    >
                      <option className="bg-background text-foreground" value="speeding">Vượt giới hạn tốc độ</option>
                      <option className="bg-background text-foreground" value="geofence_exit">Đi ra ngoài vùng cho phép</option>
                      <option className="bg-background text-foreground" value="geofence_entry">Đi vào vùng cấm</option>
                      <option className="bg-background text-foreground" value="signal_lost">Mất tín hiệu định vị</option>
                      <option className="bg-background text-foreground" value="dangerous_obstacle">Phát hiện vật cản nguy hiểm</option>
                      <option className="bg-background text-foreground" value="trajectory_deviation">Lệch khỏi quỹ đạo</option>
                    </select>
                  </div>

                  {/* Message Input */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sim-msg" className="text-xs font-medium">Nội dung thông báo (Tùy chỉnh)</Label>
                    <textarea
                      id="sim-msg"
                      rows={4}
                      className="w-full rounded-md border border-input bg-background p-2.5 text-xs text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-none"
                      placeholder="Nhập nội dung tin nhắn giả lập gửi đi..."
                      value={simMessage}
                      onChange={(e) => setSimMessage(e.target.value)}
                    />
                  </div>

                  {/* Fire Button */}
                  <Button
                    type="submit"
                    className="w-full gap-2 text-xs shadow-md shadow-primary/10 hover:shadow-primary/20 h-10 mt-2"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" />
                    Kích hoạt cảnh báo thử nghiệm
                  </Button>

                </form>
              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </>
  );
}
