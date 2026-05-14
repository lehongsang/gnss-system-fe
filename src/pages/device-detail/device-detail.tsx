import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { DeviceInfoPanel } from "./components/device-info-panel";
import { TelemetryMap } from "./components/telemetry-map";
import { DeviceFormDialog } from "../my-devices/components/device-form-dialog";
import type { DeviceDetailInfo, TelemetryPoint } from "@/types";
import {
  useDevicesControllerFindOne,
  useDeviceStatusControllerGetStatus,
  useTelemetryControllerGetHistory,
  useTelemetryControllerGetLatest,
  useDevicesControllerUpdate,
  getDevicesControllerFindOneQueryKey,
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
  const queryClient = useQueryClient();
  const updateMutation = useDevicesControllerUpdate();

  const handleUpdateDevice = (data: {
    name: string;
    macAddress: string;
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
    macAddress: raw.macAddress ?? "",
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
    satellites: latest?.satellites ?? 0,
    hdop: latest?.hdop ?? 0,
    vdop: latest?.vdop ?? 0,
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
        title="Device Detail"
        breadcrumbs={[
          { label: "Devices" },
          { label: "My Devices", href: "/my-devices" },
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
              <p className="text-sm text-muted-foreground mt-0.5 font-mono">
                {device.macAddress}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="gap-2 text-sm"
            onClick={() => setEditDialogOpen(true)}
          >
            <Pencil className="h-3.5 w-3.5" />
            Chỉnh sửa
          </Button>
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
    </>
  );
}
