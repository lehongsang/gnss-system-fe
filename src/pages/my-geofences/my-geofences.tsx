import { useState, useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";

import { GeofenceMap } from "./components/geofence-map";
import { GeofenceList } from "./components/geofence-list";
import { GeofenceFormDialog } from "./components/geofence-form-dialog";
import { DeleteConfirmDialog } from "../my-devices/components/delete-confirm-dialog";
import type { GeofenceZone, SimpleDevice } from "@/types";
import {
  useGeofencesControllerFindMine,
  useGeofencesControllerCreate,
  useGeofencesControllerUpdate,
  useGeofencesControllerAssignDevice,
  useGeofencesControllerRemoveDevice,
  useGeofencesControllerRemove,
  useDevicesControllerFindMine,
  getGeofencesControllerFindMineQueryKey,
} from "@/services/apis/gen/queries";
import { useQueryClient } from "@tanstack/react-query";

export default function MyGeofencesPage() {
  const queryClient = useQueryClient();
  // Fetch from API
  const { data: geofencesResponse } = useGeofencesControllerFindMine();
  const { data: devicesResponse } = useDevicesControllerFindMine();
  const { mutateAsync: createGeofence } = useGeofencesControllerCreate();
  const { mutateAsync: updateGeofence } = useGeofencesControllerUpdate();
  const { mutateAsync: assignDeviceApi } = useGeofencesControllerAssignDevice();
  const { mutateAsync: removeDeviceApi } = useGeofencesControllerRemoveDevice();
  const { mutateAsync: deleteGeofence } = useGeofencesControllerRemove();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawGeofences = (geofencesResponse as any)?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const apiGeofences: GeofenceZone[] = rawGeofences.map((g: any) => {
    return {
      id: g.id,
      name: g.name ?? "",
      type: g.type ?? "allowed_zone",
      color: g.color ?? (g.type === "forbidden_zone" ? "#ef4444" : "#3b82f6"),
      paths: Array.isArray(g.paths) ? g.paths : [],
      assignedDevices: Array.isArray(g.Devices) ? g.Devices : [],
      createdAt: g.createdAt ?? "",
      vertexCount: g.vertexCount ?? 0,
    };
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawDevicesForGeofence = (devicesResponse as any)?.data ?? [];
   
  const availableDevices: SimpleDevice[] = rawDevicesForGeofence.map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (d: any) => ({ id: d.id, name: d.name ?? "" })
  );

  const [geofences, setGeofences] = useState<GeofenceZone[]>(apiGeofences);

  useEffect(() => {
    if (geofencesResponse) {
      setGeofences(apiGeofences);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geofencesResponse]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPoints, setDrawPoints] = useState<{ lat: number; lng: number }[]>(
    []
  );

  // Dialogs
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingGeofence, setEditingGeofence] = useState<GeofenceZone | null>(null);

  // Start drawing
  const handleStartDraw = () => {
    setIsDrawing(true);
    setDrawPoints([]);
    setSelectedId(null);
    toast.info("Chế độ vẽ đã bật", {
      description: "Click trên bản đồ để đặt các đỉnh polygon.",
    });
  };

  // Stop drawing & save
  const handleFinishDraw = () => {
    if (drawPoints.length < 3) {
      toast.error("Cần ít nhất 3 điểm", {
        description: "Polygon cần tối thiểu 3 đỉnh để hợp lệ.",
      });
      return;
    }
    setFormOpen(true);
  };

  // Cancel drawing
  const handleCancelDraw = () => {
    setIsDrawing(false);
    setDrawPoints([]);
  };

  // Map click handler for drawing
  const handleMapClick = (lat: number, lng: number) => {
    setDrawPoints((prev) => [...prev, { lat, lng }]);
  };

  // Create geofence
  const handleCreateGeofence = async (data: { name: string; color: string; type: "allowed_zone" | "forbidden_zone" }) => {
    try {
      const coordinates = drawPoints.map((p) => [p.lng, p.lat]);
      if (coordinates.length > 0) {
        coordinates.push([drawPoints[0].lng, drawPoints[0].lat]);
      }

      const color = data.color || (data.type === "forbidden_zone" ? "#ef4444" : "#3b82f6");
      const response = await createGeofence({
        data: {
          name: data.name,
          type: data.type,
          color,
          geom: {
            type: "Polygon",
            coordinates: [coordinates],
          },
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      // Optimistic update with the drawn points
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const newGeoData = (response as any)?.data;
      const newGeofence: GeofenceZone = {
        id: newGeoData?.id ?? `temp-${Date.now()}`,
        name: data.name,
        type: data.type,
        color,
        paths: [...drawPoints],
        assignedDevices: [],
        createdAt: newGeoData?.createdAt ?? new Date().toISOString(),
      };

      setGeofences((prev) => [newGeofence, ...prev]);

      toast.success("Tạo vùng thành công", {
        description: `"${data.name}" đã được thêm vào bản đồ.`,
      });

      setIsDrawing(false);
      setDrawPoints([]);
      
      // Sync with backend to get the real geofence data
      queryClient.invalidateQueries({
        queryKey: getGeofencesControllerFindMineQueryKey(),
      });
    } catch (error) {
      toast.error("Tạo vùng thất bại", {
        description: "Có lỗi xảy ra khi tạo vùng giám sát.",
      });
      throw error;
    }
  };

  // Update geofence
  const handleUpdateGeofence = async (data: { name: string; color: string; type: "allowed_zone" | "forbidden_zone" }) => {
    if (!editingGeofence) return;
    try {
      await updateGeofence({
        id: editingGeofence.id,
        data: {
          name: data.name,
          color: data.color,
          type: data.type,
        } as any, // eslint-disable-line @typescript-eslint/no-explicit-any
      });

      toast.success("Cập nhật thành công", {
        description: `"${data.name}" đã được cập nhật.`,
      });

      setEditingGeofence(null);
      
      // Sync with backend
      queryClient.invalidateQueries({
        queryKey: getGeofencesControllerFindMineQueryKey(),
      });
    } catch (error) {
      toast.error("Cập nhật thất bại", {
        description: "Có lỗi xảy ra khi cập nhật vùng giám sát.",
      });
      throw error;
    }
  };

  const handleEditClick = (geo: GeofenceZone) => {
    setEditingGeofence(geo);
  };

  // Delete geofence
  const handleDelete = (id: string) => {
    setDeletingId(id);
    setDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deletingId) return;
    const name = geofences.find((g) => g.id === deletingId)?.name ?? "";

    try {
      await deleteGeofence({ id: deletingId });

      setGeofences((prev) => prev.filter((g) => g.id !== deletingId));
      if (selectedId === deletingId) setSelectedId(null);
      toast.success("Đã xóa vùng", {
        description: `"${name}" đã được xóa khỏi hệ thống.`,
      });
      setDeletingId(null);

      // Sync with backend
      queryClient.invalidateQueries({
        queryKey: getGeofencesControllerFindMineQueryKey(),
      });
    } catch (error) {
      toast.error("Xóa vùng thất bại", {
        description: "Có lỗi xảy ra khi xóa vùng giám sát.",
      });
      throw error;
    }
  };

  // Assign / Remove device
  const handleAssignDevice = async (geofenceId: string, deviceId: string) => {
    try {
      await assignDeviceApi({
        id: geofenceId,
        data: { deviceId },
      });

      setGeofences((prev) =>
        prev.map((g) =>
          g.id === geofenceId
            ? { ...g, assignedDevices: [...g.assignedDevices, deviceId] }
            : g
        )
      );
      const devName = availableDevices.find((d) => d.id === deviceId)?.name ?? deviceId;
      toast.success("Đã gán thiết bị", {
        description: `"${devName}" đã được gán vào vùng.`,
      });
      
      // Optionally sync in background
      queryClient.invalidateQueries({
        queryKey: getGeofencesControllerFindMineQueryKey(),
      });
    } catch (error) {
      toast.error("Gán thiết bị thất bại", {
        description: "Có lỗi xảy ra khi gán thiết bị.",
      });
      throw error;
    }
  };

  const handleRemoveDevice = async (geofenceId: string, deviceId: string) => {
    try {
      await removeDeviceApi({
        id: geofenceId,
        deviceId: deviceId,
      });

      setGeofences((prev) =>
        prev.map((g) =>
          g.id === geofenceId
            ? {
                ...g,
                assignedDevices: g.assignedDevices.filter((d) => d !== deviceId),
              }
            : g
        )
      );
      toast.info("Đã gỡ thiết bị khỏi vùng.");
      
      // Optionally sync in background
      queryClient.invalidateQueries({
        queryKey: getGeofencesControllerFindMineQueryKey(),
      });
    } catch (error) {
      toast.error("Gỡ thiết bị thất bại", {
        description: "Có lỗi xảy ra khi gỡ thiết bị.",
      });
      throw error;
    }
  };

  const deletingName =
    geofences.find((g) => g.id === deletingId)?.name ?? "";

  return (
    <>
      <AppHeader
        title="Vùng địa lý của tôi"
        breadcrumbs={[
          { label: "Vùng địa lý" },
          { label: "Vùng địa lý của tôi" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        {/* Page title + Draw button */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Vùng địa lý của tôi</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Tạo và quản lý các vùng giám sát trên bản đồ.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {isDrawing ? (
              <>
                <Button
                  variant="outline"
                  className="gap-2 text-sm"
                  onClick={handleCancelDraw}
                >
                  <X className="h-4 w-4" />
                  Hủy
                </Button>
                <Button
                  className="gap-2 text-sm shadow-lg shadow-primary/20"
                  onClick={handleFinishDraw}
                  disabled={drawPoints.length < 3}
                >
                  <Check className="h-4 w-4" />
                  Hoàn tất ({drawPoints.length} điểm)
                </Button>
              </>
            ) : (
              <Button
                id="draw-geofence-btn"
                className="gap-2 text-sm shadow-lg shadow-primary/20"
                onClick={handleStartDraw}
              >
                <Plus className="h-4 w-4" />
                Vẽ vùng mới
              </Button>
            )}
          </div>
        </div>

        {/* Map + List layout */}
        <div className="grid gap-5 grid-cols-1 lg:grid-cols-10">
          {/* Map (left / top) */}
          <div className="lg:col-span-7">
            <GeofenceMap
              geofences={geofences}
              selectedId={selectedId}
              onSelectGeofence={setSelectedId}
              isDrawing={isDrawing}
              drawPoints={drawPoints}
              onMapClick={handleMapClick}
            />
          </div>

          {/* List (right / bottom) */}
          <div className="lg:col-span-3">
            <GeofenceList
              geofences={geofences}
              availableDevices={availableDevices}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onEdit={handleEditClick}
              onDelete={handleDelete}
              onAssignDevice={handleAssignDevice}
              onRemoveDevice={handleRemoveDevice}
            />
          </div>
        </div>
      </div>

      {/* Create Form Dialog */}
      <GeofenceFormDialog
        open={formOpen || !!editingGeofence}
        onOpenChange={(val) => {
          if (!val) {
            setFormOpen(false);
            setEditingGeofence(null);
          }
        }}
        pointCount={editingGeofence ? editingGeofence.vertexCount || editingGeofence.paths.length : drawPoints.length}
        initialData={
          editingGeofence
            ? { name: editingGeofence.name, color: editingGeofence.color, type: editingGeofence.type }
            : null
        }
        onSubmit={(data) => {
          if (editingGeofence) {
            return handleUpdateGeofence(data);
          }
          return handleCreateGeofence(data);
        }}
      />

      {/* Delete Confirm Dialog */}
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        deviceName={deletingName}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
