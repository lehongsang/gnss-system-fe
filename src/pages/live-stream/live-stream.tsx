import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { axiosInstance } from "@/services/apis/axios-client";
import { useDevicesControllerFindMine } from "@/services/apis/gen/queries";
import { Loader2, Video, AlertTriangle, Globe, Play, StopCircle, RefreshCcw } from "lucide-react";
import type { UserDevice } from "@/types";

type LiveStreamStatus = "starting" | "ready" | "failed" | "stopped";

interface StreamSession {
  requestId: string;
  deviceId: string;
  status: LiveStreamStatus;
  webrtcUrl: string | null;
  startedAt: string;
  expiresAt: string;
  errorMessage?: string;
}

const STATUS_LABEL: Record<LiveStreamStatus, string> = {
  starting: "Đang kết nối camera",
  ready: "Live đã sẵn sàng",
  failed: "Kết nối thất bại",
  stopped: "Đã dừng livestream",
};

const STATUS_COLOR: Record<LiveStreamStatus, string> = {
  starting: "bg-amber-100 text-amber-700",
  ready: "bg-emerald-100 text-emerald-700",
  failed: "bg-red-100 text-red-700",
  stopped: "bg-slate-100 text-slate-700",
};

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export default function LiveStreamPage() {
  const { data: devicesResponse, isLoading: isLoadingDevices } = useDevicesControllerFindMine();
  const devices = useMemo(() => {
    const rawDevices = (devicesResponse as { data?: UserDevice[] })?.data;
    return Array.isArray(rawDevices) ? rawDevices : [];
  }, [devicesResponse]);

  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [durationSeconds, setDurationSeconds] = useState(300);
  const [session, setSession] = useState<StreamSession | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedDevice = useMemo(
    () => devices.find((device: UserDevice) => device.id === selectedDeviceId),
    [devices, selectedDeviceId]
  );

  useEffect(() => {
    if (!selectedDeviceId && devices.length > 0) {
      setSelectedDeviceId(devices[0].id);
    }
  }, [devices, selectedDeviceId]);

  useEffect(() => {
    if (session?.status !== "starting") {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      return;
    }

    const poll = async () => {
      if (!session || !selectedDeviceId) return;
      try {
        const statusResponse = await axiosInstance.get<StreamSession>(`/api/live-streams/${selectedDeviceId}/status`);
        setSession(statusResponse.data);
      } catch {
        setErrorMessage("Không thể kiểm tra trạng thái livestream.");
      }
    };

    if (!pollRef.current) {
      pollRef.current = setInterval(poll, 1500);
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [session?.status, selectedDeviceId, session]);

  useEffect(() => {
    if (!session || session.status !== "ready") return;
    const expiresAt = new Date(session.expiresAt).getTime();
    const now = Date.now();
    if (expiresAt <= now) {
      setSession((current) =>
        current ? { ...current, status: "stopped" } : current
      );
      return;
    }
    const timer = window.setTimeout(() => {
      setSession((current) =>
        current ? { ...current, status: "stopped" } : current
      );
    }, expiresAt - now);

    return () => window.clearTimeout(timer);
  }, [session]);

  const startLiveStream = async () => {
    if (!selectedDeviceId) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await axiosInstance.post<StreamSession>(`/api/live-streams/${selectedDeviceId}/start`, {
        durationSeconds,
      });
      setSession(response.data);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Khởi động livestream thất bại."
      );
      setSession({
        requestId: "",
        deviceId: selectedDeviceId,
        status: "failed",
        webrtcUrl: null,
        startedAt: new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        errorMessage: err?.response?.data?.message || err?.message || "Lỗi không xác định.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const stopLiveStream = async () => {
    if (!selectedDeviceId) return;
    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const response = await axiosInstance.post<StreamSession>(`/api/live-streams/${selectedDeviceId}/stop`, {});
      setSession(response.data);
    } catch (error) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      setErrorMessage(
        err?.response?.data?.message || err?.message || "Dừng livestream thất bại."
      );
    } finally {
      setIsSubmitting(false);
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    }
  };

  const countDown = useMemo(() => {
    if (!session?.expiresAt) return "";
    const remaining = Math.max(0, new Date(session.expiresAt).getTime() - Date.now());
    const minutes = Math.floor(remaining / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);
    return `${minutes} phút ${seconds < 10 ? "0" : ""}${seconds} giây`;
  }, [session?.expiresAt]);

  const isReady = session?.status === "ready";
  const isStarting = session?.status === "starting";
  const isFailed = session?.status === "failed";

  return (
    <>
      <AppHeader
        title="Live Stream"
        breadcrumbs={[
          { label: "Live Stream" },
          { label: "Xem trực tiếp thiết bị" },
        ]}
      />

      <div className="my-devices-page flex flex-1 flex-col gap-5 min-h-full overflow-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Xem trực tuyến (Live Stream)</h1>
          <p className="text-sm text-cyan mt-1 opacity-85">
            Truy cập luồng truyền phát video trực tiếp thời gian thực từ camera của thiết bị giám sát.
          </p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[340px_1fr]">
          <div className="space-y-5">
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Thiết bị và cấu hình</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="device-select" className="text-xs font-medium">
                    Chọn thiết bị
                  </Label>
                  <select
                    id="device-select"
                    value={selectedDeviceId}
                    onChange={(e) => setSelectedDeviceId(e.target.value)}
                    className="h-11 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    disabled={isLoadingDevices || devices.length === 0}
                  >
                    {devices.length === 0 ? (
                      <option value="">Không có thiết bị</option>
                    ) : (
                      devices.map((device: UserDevice) => (
                        <option key={device.id} value={device.id}>
                          {device.name ?? device.id}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="duration" className="text-xs font-medium">
                    Thời lượng (giây)
                  </Label>
                  <Input
                    id="duration"
                    type="number"
                    min={30}
                    max={3600}
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Math.max(30, Math.min(3600, Number(e.target.value))))}
                    className="h-11"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Giá trị hợp lệ: 30 - 3600 giây. Mặc định 300 giây.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    className="gap-2"
                    onClick={startLiveStream}
                    disabled={!selectedDeviceId || isSubmitting || isStarting || isReady}
                  >
                    {isSubmitting && !isReady ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Play className="h-4 w-4" />
                    )}
                    Bắt đầu
                  </Button>
                  <Button
                    variant="outline"
                    className="gap-2"
                    onClick={stopLiveStream}
                    disabled={!selectedDeviceId || isSubmitting || (!isStarting && !isReady)}
                  >
                    <StopCircle className="h-4 w-4" />
                    Dừng
                  </Button>
                  <Button
                    variant="ghost"
                    className="gap-2"
                    onClick={() => {
                      if (session && selectedDeviceId) {
                        axiosInstance.get<StreamSession>(`/api/live-streams/${selectedDeviceId}/status`).then((response) => {
                          setSession(response.data);
                        });
                      }
                    }}
                    disabled={!selectedDeviceId}
                  >
                    <RefreshCcw className="h-4 w-4" />
                    Làm mới
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Trạng thái session</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={`px-2 py-1 text-xs font-semibold ${STATUS_COLOR[session?.status ?? "stopped"]}`}>
                    {session ? STATUS_LABEL[session.status] : "Chưa bắt đầu"}
                  </Badge>
                  {session?.status === "starting" && (
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang khởi tạo luồng video...
                    </div>
                  )}
                </div>

                <div className="grid gap-3 text-sm text-muted-foreground">
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Thiết bị</p>
                    <p className="text-foreground">{(selectedDevice?.name ?? selectedDeviceId) || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Request ID</p>
                    <p className="text-foreground">{session?.requestId || "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Bắt đầu</p>
                    <p className="text-foreground">{session?.startedAt ? formatDateTime(session.startedAt) : "-"}</p>
                  </div>
                  <div>
                    <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Hết hạn</p>
                    <p className="text-foreground">{session?.expiresAt ? formatDateTime(session.expiresAt) : "-"}</p>
                  </div>
                  {session?.status === "ready" && (
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground/80">Còn lại</p>
                      <p className="text-foreground">{countDown}</p>
                    </div>
                  )}
                </div>

                {isFailed && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    <div className="flex items-center gap-2 font-semibold mb-1">
                      <AlertTriangle className="h-4 w-4" /> Lỗi
                    </div>
                    <p>{session?.errorMessage || errorMessage || "Không thể khởi tạo livestream."}</p>
                  </div>
                )}

                {errorMessage && !isFailed && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                    {errorMessage}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="border-border/50 bg-card/80">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">Xem live</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {isReady && session?.webrtcUrl ? (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-border/50 bg-black/80 overflow-hidden aspect-video">
                      <iframe
                        title="Live stream player"
                        src={session.webrtcUrl}
                        allow="camera; microphone; autoplay; fullscreen; encrypted-media"
                        className="h-full w-full bg-black"
                      />
                    </div>
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => window.open(session.webrtcUrl ?? "", "_blank", "noopener,noreferrer")}
                    >
                      <Video className="h-4 w-4" /> Mở player trong tab mới
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-border/50 bg-muted/50 p-8 text-center text-sm text-muted-foreground">
                    <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-900/10 text-slate-600">
                      <Globe className="h-5 w-5" />
                    </div>
                    <p className="font-medium text-foreground">Chờ khởi tạo camera hành trình</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      Nhấn "Bắt đầu" để kết nối và hiển thị camera hành trình trực tiếp của thiết bị.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  );
}
