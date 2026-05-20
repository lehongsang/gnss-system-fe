import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient, useQueries } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Cpu, Wifi, WifiOff, Wrench, Plus } from "lucide-react";
import { toast } from "sonner";
import { DeviceStatsCard } from "./components/device-stats-card";
import { DeviceTable } from "./components/device-table";
import { DeviceFormDialog } from "./components/device-form-dialog";
import { DeleteConfirmDialog } from "./components/delete-confirm-dialog";
import type { UserDevice } from "@/types";
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
      macAddress: d.macAddress ?? "",
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
    macAddress: string;
    speedLimitKmh: number;
  }) => {
    if (editingDevice) {
      updateMutation.mutate(
        {
          id: editingDevice.id,
          data: {
            name: data.name,
            macAddress: data.macAddress,
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
            macAddress: data.macAddress,
            speedLimitKmh: data.speedLimitKmh,
          },
        },
        {
          onSuccess: () => {
            toast.success("Tạo thiết bị thành công", {
              description: `Thiết bị "${data.name}" đã được thêm vào hệ thống.`,
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
    </>
  );
}
