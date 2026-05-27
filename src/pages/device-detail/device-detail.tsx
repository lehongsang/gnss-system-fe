import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  ArrowLeft,
  Copy,
  Lock,
  Pencil,
  AlertTriangle,
} from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { DeviceInfoPanel } from "./components/device-info-panel";
import { TelemetryMap } from "./components/telemetry-map";
import { DeviceFormDialog } from "../my-devices/components/device-form-dialog";
import type { DeviceDetailInfo, MqttCredentials, TelemetryPoint } from "@/types";
import { axiosInstance } from "@/services/apis/axios-client";
import {
  useDevicesControllerFindOne,
  useDeviceStatusControllerGetStatus,
  useTelemetryControllerGetHistory,
  useTelemetryControllerGetLatest,
  useDevicesControllerUpdate,
  getDevicesControllerFindOneQueryKey,
  getDevicesControllerFindMineQueryKey,
  SortOrder,
} from "@/services/apis/gen/queries";

export default function DeviceDetailPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const deviceId = id ?? "";

  // Date range for telemetry map
  const today = new Date().toISOString().split("T")[0];
  const [dateFrom, setDateFrom] = useState(today);
  const [dateTo, setDateTo] = useState(today);

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [credentialDialogOpen, setCredentialDialogOpen] = useState(false);
  const [regeneratedMqttCredentials, setRegeneratedMqttCredentials] = useState<
    MqttCredentials | null
  >(null);
  const [isCopyingMqtt, setIsCopyingMqtt] = useState(false);
  const queryClient = useQueryClient();
  const updateMutation = useDevicesControllerUpdate();

  const regenerateMutation = useMutation({
    mutationFn: async () => {
      return axiosInstance.post<MqttCredentials>(
        `/api/devices/${deviceId}/mqtt-credentials/regenerate`
      );
    },
    onSuccess: (res) => {
      setRegeneratedMqttCredentials(res.data);
      setCredentialDialogOpen(true);
      queryClient.invalidateQueries({
        queryKey: getDevicesControllerFindOneQueryKey(deviceId),
      });
      queryClient.invalidateQueries({
        queryKey: getDevicesControllerFindMineQueryKey(),
      });
      toast.success("Tạo lại MQTT credentials thành công", {
        description:
          "Mật khẩu cũ đã hết hiệu lực. Sao chép mật khẩu mới và cấu hình lại thiết bị ngay.",
      });
    },
    onError: (error: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const err = error as any;
      if (err?.response?.status === 403) {
        toast.error("Không được phép. Vui lòng đăng nhập lại hoặc liên hệ quản trị.");
      } else {
        toast.error(
          "Không thể tạo lại MQTT credentials. Vui lòng thử lại sau."
        );
      }
    },
  });

  const handleUpdateDevice = (data: {
    name: string;
    speedLimitKmh: number;
  }) => {
    updateMutation.mutate(
      { id: deviceId, data },
      {
        onSuccess: () => {
          toast.success("Cập nhật thiết bị thành công!");
          queryClient.invalidateQueries({
            queryKey: getDevicesControllerFindOneQueryKey(deviceId),
          });
        },
        onError: () => {
          toast.error("Cập nhật thiết bị thất bại");
        },
      }
    );
  };

  // Fetch device from API
  const { data: deviceResponse } = useDevicesControllerFindOne(deviceId);
  const { data: statusResponse } = useDeviceStatusControllerGetStatus(
    deviceId,
    {
      query: {
        refetchInterval: 10000,
      },
    }
  );

  // Fetch latest telemetry for lat/lng
  const { data: latestTelemetry } = useTelemetryControllerGetLatest(deviceId, {
    query: { enabled: !!deviceId, refetchInterval: 15000 },
  });

  // Fetch telemetry history for the map
  const historyParams = useMemo(
    () => ({
      from: `${dateFrom}T00:00:00.000Z`,
      to: `${dateTo}T23:59:59.999Z`,
      page: 1,
      limit: 500, // Enough points for the map polyline
      sortBy: "timestamp",
      sortOrder: SortOrder.ASC,
    }),
    [dateFrom, dateTo]
  );

  const { data: historyResponse, isLoading: isLoadingHistory } =
    useTelemetryControllerGetHistory(deviceId, historyParams, {
      query: { enabled: !!deviceId },
    });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const raw = (deviceResponse as any) || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const statusData = (statusResponse as any) || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const latest = (latestTelemetry as any) || null;

  const device: DeviceDetailInfo = {
    id: raw.id ?? deviceId,
    name: raw.name ?? "",
    speedLimitKmh: raw.speedLimitKmh ?? 0,
    status: statusData.status ?? "offline",
    battery: statusData.batteryLevel ?? 0,
    lat: latest?.lat ?? 0,
    lng: latest?.lng ?? 0,
    cameraStatus: statusData.cameraStatus ?? false,
    gnssStatus: statusData.gnssStatus ?? false,
    lastSeen: statusData.updatedAt ?? raw.updatedAt ?? "",
    createdAt: raw.createdAt ?? "",
    owner: raw.owner?.name ?? "",
    satellites: statusData.satellitesTracked ?? 0,
    hdop: 0,
    vdop: 0,
  };

  // Map history response to TelemetryPoint[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const historyData = historyResponse as any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const telemetryRows: any[] = historyData?.data ?? [];

  const telemetry: TelemetryPoint[] = telemetryRows.map((r) => ({
    lat: r.lat,
    lng: r.lng,
    speed: r.speed ?? 0,
    battery: r.batteryLevel ?? 0,
    timestamp: r.timestamp,
  }));

  return (
    <>
      <AppHeader
        title="Chi tiết thiết bị"
        breadcrumbs={[
          { label: "Thiết bị" },
          { label: "Thiết bị của tôi", href: "/my-devices" },
          { label: device.name },
        ]}
      />

      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        {/* Page title row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9"
              onClick={() => navigate("/my-devices")}
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {device.name}
              </h1>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              className="gap-2 text-sm"
              onClick={() => setEditDialogOpen(true)}
            >
              <Pencil className="h-3.5 w-3.5" />
              Chỉnh sửa
            </Button>
            <Button
              variant="destructive"
              className="gap-2 text-sm"
              onClick={() => regenerateMutation.mutate()}
              disabled={regenerateMutation.isPending}
            >
              <Lock className="h-3.5 w-3.5" />
              Tạo lại MQTT credentials
            </Button>
          </div>
        </div>

        {/* Main 2-column layout */}
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-10">
          {/* Left: Device Info */}
          <div className="lg:col-span-3">
            <DeviceInfoPanel device={device} />
          </div>

          {/* Right: Telemetry Map */}
          <div className="lg:col-span-7">
            <TelemetryMap
              telemetry={telemetry}
              deviceName={device.name}
              isLoading={isLoadingHistory}
              dateFrom={dateFrom}
              dateTo={dateTo}
              onDateFromChange={setDateFrom}
              onDateToChange={setDateTo}
            />
          </div>
        </div>
      </div>

      <DeviceFormDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        device={device}
        onSubmit={handleUpdateDevice}
      />

      <Dialog open={credentialDialogOpen} onOpenChange={setCredentialDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              MQTT Credentials mới
            </DialogTitle>
            <DialogDescription>
              Mật khẩu cũ đã hết hiệu lực. Sao chép thông tin bên dưới và cấu hình lại thiết bị ngay.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-900">
              <pre className="whitespace-pre-wrap break-words text-xs">
                {regeneratedMqttCredentials
                  ? JSON.stringify(regeneratedMqttCredentials, null, 2)
                  : "Đang tải..."}
              </pre>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="secondary"
                className="gap-2"
                onClick={async () => {
                  if (!regeneratedMqttCredentials) return;
                  setIsCopyingMqtt(true);
                  await navigator.clipboard.writeText(
                    JSON.stringify(regeneratedMqttCredentials)
                  );
                  setIsCopyingMqtt(false);
                  toast.success("Đã sao chép MQTT credentials mới vào clipboard.");
                }}
                disabled={!regeneratedMqttCredentials || isCopyingMqtt}
              >
                <Copy className="h-3.5 w-3.5" />
                {isCopyingMqtt ? "Đang sao chép..." : "Sao chép JSON"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setCredentialDialogOpen(false)}
              >
                Đóng
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
