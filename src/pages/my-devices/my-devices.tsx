import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Copy, Cpu, Lock, Server, Wifi, WifiOff, Wrench, Plus } from "lucide-react";
import { toast } from "sonner";
import { DeviceStatsCard } from "./components/device-stats-card";
import { DeviceTable } from "./components/device-table";
import { DeviceFormDialog } from "./components/device-form-dialog";
import { DeleteConfirmDialog } from "./components/delete-confirm-dialog";
import type { MqttCredentials, UserDevice } from "@/types";
import {
  useDevicesControllerFindMine,
  useDevicesControllerCreate,
  useDevicesControllerUpdate,
  useDevicesControllerRemove,
  getDevicesControllerFindMineQueryKey,
  getDeviceStatusControllerGetStatusQueryOptions,
} from "@/services/apis/gen/queries";

export default function MyDevicesPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Fetch devices from API
  const { data: devicesResponse, isLoading } = useDevicesControllerFindMine();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevices = (devicesResponse as any)?.data ?? [];

  const statusQueries = useQueries({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    queries: rawDevices.map((d: any) => {
      const options = getDeviceStatusControllerGetStatusQueryOptions(d.id);
      return {
        ...options,
        refetchInterval: 10000,
      };
    }),
  });

  const statusMap = new Map();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rawDevices.forEach((d: any, index: number) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const s = (statusQueries[index]?.data as any) || {};
    statusMap.set(d.id, s);
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const devices: UserDevice[] = rawDevices.map((d: any) => {
    const s = statusMap.get(d.id) || {};
    return {
      id: d.id,
      name: d.name ?? "",
      speedLimitKmh: d.speedLimitKmh ?? 0,
      status: s.status ?? "offline",
      battery: s.batteryLevel ?? 0,
      lat: 0,
      lng: 0,
      cameraStatus: s.cameraStatus ?? false,
      gnssStatus: s.gnssStatus ?? false,
      lastSeen: s.updatedAt ?? d.updatedAt ?? d.createdAt ?? "",
      createdAt: d.createdAt ?? "",
    };
  });

  // Mutations
  const createMutation = useDevicesControllerCreate();
  const updateMutation = useDevicesControllerUpdate();
  const deleteMutation = useDevicesControllerRemove();

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [editingDevice, setEditingDevice] = useState<UserDevice | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingDevice, setDeletingDevice] = useState<UserDevice | null>(null);
  const [credentialsOpen, setCredentialsOpen] = useState(false);
  const [createdMqttCredentials, setCreatedMqttCredentials] = useState<MqttCredentials | null>(null);
  const [isCopyingCredentials, setIsCopyingCredentials] = useState(false);

  // Stats
  const totalDevices = devices.length;
  const onlineCount = devices.filter((d) => d.status === "online").length;
  const offlineCount = devices.filter((d) => d.status === "offline").length;
  const maintenanceCount = devices.filter(
    (d) => d.status === "maintenance"
  ).length;
  const avgBattery =
    devices.length > 0
      ? Math.round(
          devices.reduce((sum, d) => sum + d.battery, 0) / devices.length
        )
      : 0;

  const invalidateDevices = () => {
    queryClient.invalidateQueries({
      queryKey: getDevicesControllerFindMineQueryKey(),
    });
  };

  // Handlers
  const handleCreate = () => {
    setEditingDevice(null);
    setFormOpen(true);
  };

  const handleEdit = (device: UserDevice) => {
    setEditingDevice(device);
    setFormOpen(true);
  };

  const handleDelete = (device: UserDevice) => {
    setDeletingDevice(device);
    setDeleteOpen(true);
  };

  const handleView = (device: UserDevice) => {
    navigate(`/my-devices/${device.id}`);
  };

  const handleFormSubmit = (data: {
    name: string;
    speedLimitKmh: number;
  }) => {
    if (editingDevice) {
      updateMutation.mutate(
        {
          id: editingDevice.id,
          data: {
            name: data.name,
            speedLimitKmh: data.speedLimitKmh,
          },
        },
        {
          onSuccess: () => {
            toast.success("Cập nhật thành công", {
              description: `Thiết bị "${data.name}" đã được cập nhật.`,
            });
            invalidateDevices();
          },
          onError: () => {
            toast.error("Cập nhật thất bại", {
              description: "Có lỗi xảy ra khi cập nhật thiết bị.",
            });
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          data: {
            name: data.name,
            speedLimitKmh: data.speedLimitKmh,
          },
        },
        {
          onSuccess: (response) => {
            const mqttCredentials = (response as { mqttCredentials?: MqttCredentials })?.mqttCredentials ?? null;
            if (mqttCredentials) {
              setCreatedMqttCredentials(mqttCredentials);
              setCredentialsOpen(true);
            }

            toast.success("Tạo thiết bị thành công", {
              description: mqttCredentials
                ? `Thiết bị "${data.name}" đã được tạo. Vui lòng lưu thông tin MQTT hiển thị.`
                : `Thiết bị "${data.name}" đã được thêm vào hệ thống.`,
            });
            invalidateDevices();
          },
          onError: () => {
            toast.error("Tạo thiết bị thất bại", {
              description: "Có lỗi xảy ra khi tạo thiết bị.",
            });
          },
        }
      );
    }
  };

  const handleDeleteConfirm = () => {
    if (!deletingDevice) return;
    deleteMutation.mutate(
      { id: deletingDevice.id },
      {
        onSuccess: () => {
          toast.success("Đã xóa thiết bị", {
            description: `"${deletingDevice.name}" đã được xóa khỏi hệ thống.`,
          });
          setDeletingDevice(null);
          invalidateDevices();
        },
        onError: () => {
          toast.error("Xóa thất bại", {
            description: "Có lỗi xảy ra khi xóa thiết bị.",
          });
        },
      }
    );
  };

  const stats = [
    {
      title: "Tổng thiết bị",
      value: totalDevices,
      subtitle: `${onlineCount} online · ${offlineCount} offline · ${maintenanceCount} bảo trì`,
      icon: Cpu,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
    },
    {
      title: "Đang hoạt động",
      value: onlineCount,
      subtitle: `${
        totalDevices > 0
          ? Math.round((onlineCount / totalDevices) * 100)
          : 0
      }% thiết bị online`,
      icon: Wifi,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      title: "Mất kết nối",
      value: offlineCount,
      subtitle: `Cần kiểm tra kết nối`,
      icon: WifiOff,
      iconColor: "text-red-400",
      iconBg: "bg-red-500/10",
    },
    {
      title: "Đang bảo trì",
      value: maintenanceCount,
      subtitle: `Pin trung bình: ${avgBattery}%`,
      icon: Wrench,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
  ];

  return (
    <>
      <AppHeader
        title="Thiết bị của tôi"
        breadcrumbs={[
          { label: "Thiết bị" },
          { label: "Thiết bị của tôi" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        {/* Page title + Add button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Thiết bị của tôi</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Quản lý và giám sát tất cả các thiết bị GNSS của bạn.
            </p>
          </div>
          <Button
            id="add-device-btn"
            onClick={handleCreate}
            className="gap-2 text-sm shadow-lg shadow-primary/20"
          >
            <Plus className="h-4 w-4" />
            Thêm thiết bị
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <DeviceStatsCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Device Table */}
        <DeviceTable
          devices={devices}
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onView={handleView}
        />
      </div>

      {/* Create / Edit Dialog */}
      <DeviceFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        device={editingDevice}
        onSubmit={handleFormSubmit}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        deviceName={deletingDevice?.name ?? ""}
        onConfirm={handleDeleteConfirm}
      />

      <Dialog
        open={credentialsOpen}
        onOpenChange={(value) => {
          if (!value) {
            setCreatedMqttCredentials(null);
          }
          setCredentialsOpen(value);
        }}
      >
        <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden border-border/50 bg-card/95 backdrop-blur-xl">
          <DialogHeader className="shrink-0">
            <DialogTitle className="text-lg font-semibold">
              Thông tin MQTT thiết bị
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Mật khẩu chỉ hiển thị một lần. Sao chép và lưu lại cấu hình cho thiết bị.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-3 flex-1 overflow-y-auto pr-1">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-border/50 bg-muted p-4">
                <p className="text-[11px] uppercase tracking-[.2em] text-muted-foreground">
                  MQTT Username
                </p>
                <p className="mt-2 break-all text-sm font-medium">
                  {createdMqttCredentials?.mqttUsername ?? "-"}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] text-muted-foreground">
                  <Lock className="h-3.5 w-3.5" />
                  <span>MQTT Password</span>
                </div>
                <p className="mt-2 break-all text-sm font-semibold text-rose-500">
                  {createdMqttCredentials?.mqttPassword ?? "-"}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted p-4">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[.2em] text-muted-foreground">
                  <Server className="h-3.5 w-3.5" />
                  <span>Broker</span>
                </div>
                <p className="mt-2 text-sm break-all">
                  {createdMqttCredentials?.mqttProtocol ?? "-"}://{createdMqttCredentials?.mqttHost ?? "-"}:{createdMqttCredentials?.mqttPort ?? "-"}
                </p>
              </div>
              <div className="rounded-xl border border-border/50 bg-muted p-4">
                <p className="text-[11px] uppercase tracking-[.2em] text-muted-foreground">
                  Device ID
                </p>
                <p className="mt-2 break-all text-sm">
                  {createdMqttCredentials?.deviceId ?? "-"}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-border/50 bg-muted p-4">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-[11px] uppercase tracking-[.2em] text-muted-foreground">
                    Topics MQTT được phép
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Thiết bị chỉ được publish/subcribe theo cấu hình này.
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  className="whitespace-nowrap"
                  onClick={async () => {
                    if (!createdMqttCredentials) return;
                    setIsCopyingCredentials(true);
                    try {
                      await navigator.clipboard.writeText(
                        JSON.stringify(createdMqttCredentials, null, 2)
                      );
                      toast.success("Đã sao chép MQTT credentials.");
                    } catch {
                      toast.error("Không thể sao chép. Vui lòng thử lại.");
                    } finally {
                      setIsCopyingCredentials(false);
                    }
                  }}
                >
                  <Copy className="h-4 w-4" /> Sao chép JSON
                </Button>
              </div>
              <div className="mt-4 grid gap-2 text-sm">
                {createdMqttCredentials?.topics &&
                  Object.entries(createdMqttCredentials.topics).map(
                    ([topicName, topicValue]) => (
                      <div
                        key={topicName}
                        className="rounded-lg border border-border/50 bg-background/80 p-3"
                      >
                        <p className="text-[11px] uppercase tracking-[.2em] text-muted-foreground">
                          {topicName}
                        </p>
                        <p className="mt-1 break-all font-mono text-xs">
                          {topicValue}
                        </p>
                      </div>
                    )
                  )}
              </div>
            </div>
          </div>

          <DialogFooter className="shrink-0 pt-3 border-t border-border/20">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCredentialsOpen(false)}
            >
              Đóng
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                if (!createdMqttCredentials) return;
                setIsCopyingCredentials(true);
                try {
                  await navigator.clipboard.writeText(
                    JSON.stringify(createdMqttCredentials, null, 2)
                  );
                  toast.success("Đã sao chép MQTT credentials.");
                } catch {
                  toast.error("Không thể sao chép. Vui lòng thử lại.");
                } finally {
                  setIsCopyingCredentials(false);
                }
              }}
              disabled={!createdMqttCredentials || isCopyingCredentials}
            >
              <Copy className="h-4 w-4" /> Sao chép cấu hình
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
