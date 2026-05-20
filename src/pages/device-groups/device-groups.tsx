import { useState, useMemo } from "react";
import { AppHeader } from "@/components/app-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Plus,
  Search,
  Folder,
  FolderOpen,
  Edit,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Loader2,
  Cpu,
  Gauge,
  Unlink,
} from "lucide-react";
import { toast } from "sonner";
import {
  useDeviceGroups,
  useDeviceGroup,
  useCreateDeviceGroup,
  useUpdateDeviceGroup,
  useDeleteDeviceGroup,
  useRemoveDevicesFromGroup,
  useAssignDevicesToGroup,
} from "@/hooks/use-device-groups";
import { useDevicesControllerFindMine } from "@/services/apis/gen/queries";
import type { DeviceGroup } from "@/services/apis/device-groups-api";

// ---------- Helpers ----------
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ---------- Group Tree Item ----------
function GroupTreeItem({
  group,
  onEdit,
  onDelete,
}: {
  group: DeviceGroup;
  onEdit: (g: DeviceGroup) => void;
  onDelete: (g: DeviceGroup) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedDeviceIds, setSelectedDeviceIds] = useState<string[]>([]);
  const [deviceSearch, setDeviceSearch] = useState("");

  // Only fetch detail (with devices) when expanded
  const { data: detail, isLoading: isLoadingDetail } = useDeviceGroup(
    isOpen ? group.id : ""
  );
  const removeMutation = useRemoveDevicesFromGroup();
  const assignMutation = useAssignDevicesToGroup();

  // Fetch all user devices for the add-dialog
  const { data: devicesResponse } = useDevicesControllerFindMine(undefined, {
    query: { enabled: addDialogOpen },
  });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const allDevices: any[] = useMemo(() => (devicesResponse as any)?.data ?? [], [devicesResponse]);

  const devices = useMemo(() => detail?.devices ?? [], [detail?.devices]);
  const deviceIdsInGroup = useMemo(
    () => new Set(devices.map((d) => d.id)),
    [devices]
  );

  // Devices available to add (not already in this group)
  const availableDevices = useMemo(() => {
    const list = allDevices.filter((d) => !deviceIdsInGroup.has(d.id));
    if (!deviceSearch) return list;
    const q = deviceSearch.toLowerCase();
    return list.filter(
      (d) =>
        d.name?.toLowerCase().includes(q) ||
        d.macAddress?.toLowerCase().includes(q)
    );
  }, [allDevices, deviceIdsInGroup, deviceSearch]);

  const handleRemoveDevice = (deviceId: string, deviceName: string) => {
    removeMutation.mutate(
      { id: group.id, data: { deviceIds: [deviceId] } },
      {
        onSuccess: () => {
          toast.success(`Đã gỡ "${deviceName}" khỏi nhóm`);
        },
        onError: () => {
          toast.error("Gỡ thiết bị thất bại");
        },
      }
    );
  };

  const openAddDialog = () => {
    setSelectedDeviceIds([]);
    setDeviceSearch("");
    setAddDialogOpen(true);
  };

  const toggleDevice = (deviceId: string) => {
    setSelectedDeviceIds((prev) =>
      prev.includes(deviceId)
        ? prev.filter((id) => id !== deviceId)
        : [...prev, deviceId]
    );
  };

  const handleAssignDevices = () => {
    if (selectedDeviceIds.length === 0) return;
    assignMutation.mutate(
      { id: group.id, data: { deviceIds: selectedDeviceIds } },
      {
        onSuccess: () => {
          toast.success(
            `Đã thêm ${selectedDeviceIds.length} thiết bị vào nhóm`
          );
          setAddDialogOpen(false);
          setSelectedDeviceIds([]);
        },
        onError: () => {
          toast.error("Thêm thiết bị thất bại");
        },
      }
    );
  };

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        {/* ── Parent: Group row ── */}
        <div className="flex items-center gap-2 px-4 py-2.5 hover:bg-muted/30 transition-colors rounded-lg group/row">
          <CollapsibleTrigger asChild>
            <button className="flex items-center gap-2.5 flex-1 min-w-0 text-left">
              <ChevronRight
                className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? "rotate-90" : ""
                }`}
              />
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                {isOpen ? (
                  <FolderOpen className="h-4 w-4" />
                ) : (
                  <Folder className="h-4 w-4" />
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-sm font-semibold truncate">
                  {group.name}
                </span>
                <span className="text-[11px] text-muted-foreground truncate">
                  {group.description}
                </span>
              </div>
            </button>
          </CollapsibleTrigger>

          <div className="flex items-center gap-2 shrink-0">
            <Badge
              variant="secondary"
              className="font-mono text-[10px] px-2 py-0.5"
            >
              {group.deviceCount} thiết bị
            </Badge>
            <span className="text-[10px] text-muted-foreground font-mono hidden sm:inline">
              {formatDate(group.createdAt)}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity"
              onClick={() => onEdit(group)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 opacity-0 group-hover/row:opacity-100 transition-opacity text-destructive hover:text-destructive"
              onClick={() => onDelete(group)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* ── Children: Device rows ── */}
        <CollapsibleContent>
          <div className="ml-[22px] border-l border-border/40 pl-4 pb-1">
            {isLoadingDetail ? (
              <div className="flex flex-col gap-2 py-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div
                    key={`skel-${i}`}
                    className="flex items-center gap-3 px-3 py-2"
                  >
                    <Skeleton className="h-7 w-7 rounded-md" />
                    <div className="flex flex-col gap-1 flex-1">
                      <Skeleton className="h-3.5 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                ))}
              </div>
            ) : devices.length === 0 ? (
              <div className="flex items-center gap-2 px-3 py-3 text-muted-foreground/60">
                <Cpu className="h-4 w-4" />
                <span className="text-xs">
                  Chưa có thiết bị nào trong nhóm này
                </span>
              </div>
            ) : (
              devices.map((device) => (
                <div
                  key={device.id}
                  className="flex items-center gap-3 px-3 py-2 hover:bg-muted/20 transition-colors rounded-md group/device"
                >
                  {/* Tree connector dot */}
                  <div className="relative">
                    <div className="absolute -left-[21px] top-1/2 w-4 h-px bg-border/40" />
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-500">
                      <Cpu className="h-3.5 w-3.5" />
                    </div>
                  </div>

                  {/* Device info */}
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-xs font-medium truncate">
                      {device.name}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono truncate">
                      {device.macAddress}
                    </span>
                  </div>

                  {/* Speed limit badge */}
                  <Badge
                    variant="outline"
                    className="text-[9px] px-1.5 py-0 font-mono border-amber-500/20 text-amber-500 hidden sm:flex"
                  >
                    <Gauge className="h-3 w-3 mr-0.5" />
                    {device.speedLimitKmh} km/h
                  </Badge>

                  {/* Updated at */}
                  <span className="text-[10px] text-muted-foreground font-mono hidden md:inline">
                    {formatDateTime(device.updatedAt)}
                  </span>

                  {/* Remove from group */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover/device:opacity-100 transition-opacity text-destructive hover:text-destructive hover:bg-destructive/10"
                    onClick={() => handleRemoveDevice(device.id, device.name)}
                    disabled={removeMutation.isPending}
                    title="Gỡ khỏi nhóm"
                  >
                    {removeMutation.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Unlink className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              ))
            )}

            {/* Add device button */}
            {!isLoadingDetail && (
              <button
                className="flex items-center gap-2 px-3 py-2 mt-1 text-xs text-muted-foreground hover:text-foreground hover:bg-muted/20 rounded-md transition-colors w-full"
                onClick={openAddDialog}
              >
                <div className="relative">
                  <div className="absolute -left-[21px] top-1/2 w-4 h-px bg-border/40" />
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-dashed border-border/60">
                    <Plus className="h-3.5 w-3.5" />
                  </div>
                </div>
                <span>Thêm thiết bị vào nhóm</span>
              </button>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* ============ ADD DEVICE DIALOG ============ */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>Thêm thiết bị vào nhóm</DialogTitle>
            <DialogDescription>
              Chọn thiết bị để thêm vào nhóm{" "}
              <span className="font-semibold text-foreground">
                {group.name}
              </span>
              .
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Tìm theo tên hoặc MAC..."
                value={deviceSearch}
                onChange={(e) => setDeviceSearch(e.target.value)}
                className="h-9 pl-8 text-xs"
              />
            </div>

            {/* Device list */}
            <div className="max-h-[300px] overflow-y-auto space-y-1 border rounded-md p-2">
              {availableDevices.length === 0 ? (
                <div className="flex flex-col items-center gap-1 py-6 text-muted-foreground">
                  <Cpu className="h-6 w-6 text-muted-foreground/30" />
                  <p className="text-xs">
                    Không có thiết bị nào khả dụng để thêm
                  </p>
                </div>
              ) : (
                availableDevices.map((device) => (
                  <label
                    key={device.id}
                    className="flex items-center gap-3 px-3 py-2.5 hover:bg-muted/30 rounded-md cursor-pointer transition-colors"
                  >
                    <Checkbox
                      checked={selectedDeviceIds.includes(device.id)}
                      onCheckedChange={() => toggleDevice(device.id)}
                    />
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 text-cyan-500">
                      <Cpu className="h-3.5 w-3.5" />
                    </div>
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-xs font-medium truncate">
                        {device.name}
                      </span>
                      <span className="text-[10px] text-muted-foreground font-mono truncate">
                        {device.macAddress}
                      </span>
                    </div>
                  </label>
                ))
              )}
            </div>

            {selectedDeviceIds.length > 0 && (
              <p className="text-xs text-muted-foreground">
                Đã chọn{" "}
                <span className="font-semibold text-foreground">
                  {selectedDeviceIds.length}
                </span>{" "}
                thiết bị
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              disabled={assignMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={handleAssignDevices}
              disabled={
                assignMutation.isPending || selectedDeviceIds.length === 0
              }
            >
              {assignMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Thêm {selectedDeviceIds.length > 0 ? selectedDeviceIds.length : ""}{" "}
              thiết bị
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------- Skeleton for loading state ----------
function SkeletonGroupItem() {
  return (
    <div className="flex items-center gap-2.5 px-4 py-2.5">
      <Skeleton className="h-4 w-4 rounded" />
      <Skeleton className="h-8 w-8 rounded-lg" />
      <div className="flex flex-col gap-1 flex-1">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="h-5 w-20 rounded-md" />
    </div>
  );
}

const ITEMS_PER_PAGE = 10;

// ---------- Page ----------
export default function DeviceGroupsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<DeviceGroup | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formDescription, setFormDescription] = useState("");

  // API hooks
  const { data: response, isLoading } = useDeviceGroups({
    page: currentPage,
    limit: ITEMS_PER_PAGE,
  });
  const createMutation = useCreateDeviceGroup();
  const updateMutation = useUpdateDeviceGroup();
  const deleteMutation = useDeleteDeviceGroup();

  const groups: DeviceGroup[] = response?.data ?? [];
  const totalRows = response?.total ?? 0;
  const totalPages = response?.pageCount ?? 1;

  // Client-side search filter
  const filtered = groups.filter((g) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      g.name.toLowerCase().includes(q) ||
      g.description.toLowerCase().includes(q)
    );
  });

  // ---------- Handlers ----------
  const openCreate = () => {
    setFormName("");
    setFormDescription("");
    setCreateOpen(true);
  };

  const handleCreate = () => {
    if (!formName.trim()) {
      toast.error("Tên nhóm không được để trống");
      return;
    }
    createMutation.mutate(
      { name: formName.trim(), description: formDescription.trim() },
      {
        onSuccess: () => {
          toast.success("Tạo nhóm thành công");
          setCreateOpen(false);
        },
        onError: () => toast.error("Tạo nhóm thất bại"),
      }
    );
  };

  const openEdit = (group: DeviceGroup) => {
    setSelectedGroup(group);
    setFormName(group.name);
    setFormDescription(group.description);
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!selectedGroup || !formName.trim()) return;
    updateMutation.mutate(
      {
        id: selectedGroup.id,
        data: { name: formName.trim(), description: formDescription.trim() },
      },
      {
        onSuccess: () => {
          toast.success("Cập nhật nhóm thành công");
          setEditOpen(false);
          setSelectedGroup(null);
        },
        onError: () => toast.error("Cập nhật nhóm thất bại"),
      }
    );
  };

  const openDelete = (group: DeviceGroup) => {
    setSelectedGroup(group);
    setDeleteOpen(true);
  };

  const handleDelete = () => {
    if (!selectedGroup) return;
    deleteMutation.mutate(selectedGroup.id, {
      onSuccess: () => {
        toast.success("Xóa nhóm thành công");
        setDeleteOpen(false);
        setSelectedGroup(null);
      },
      onError: () => toast.error("Xóa nhóm thất bại"),
    });
  };

  return (
    <>
      <AppHeader
        title="Nhóm thiết bị"
        breadcrumbs={[
          { label: "Thiết bị" },
          { label: "Nhóm thiết bị" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        {/* Page title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Nhóm thiết bị
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Quản lý và phân nhóm các thiết bị GNSS để dễ dàng theo dõi.
            </p>
          </div>
          <Button className="gap-2" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            Tạo nhóm mới
          </Button>
        </div>

        {/* Tree Card */}
        <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
          <CardHeader className="px-5 pt-4 pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-500">
                  <Folder className="h-4 w-4" />
                </div>
                <CardTitle className="text-sm font-semibold">
                  Danh sách nhóm
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px] font-mono px-2 py-0.5 border-muted-foreground/20"
                >
                  {totalRows} nhóm
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder="Tìm kiếm nhóm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-[250px] pl-8 text-xs bg-background/50"
                />
              </div>
            </div>
          </CardHeader>

          <CardContent className="px-2 pb-2">
            <div className="flex flex-col gap-0.5">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <SkeletonGroupItem key={`skel-${i}`} />
                ))
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-16 text-muted-foreground">
                  <Folder className="h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm font-medium">
                    Chưa có nhóm thiết bị nào
                  </p>
                  <p className="text-xs text-muted-foreground/70">
                    Hãy tạo nhóm mới để bắt đầu quản lý thiết bị.
                  </p>
                </div>
              ) : (
                filtered.map((group) => (
                  <GroupTreeItem
                    key={group.id}
                    group={group}
                    onEdit={openEdit}
                    onDelete={openDelete}
                  />
                ))
              )}
            </div>

            {/* Pagination */}
            {!isLoading && totalRows > 0 && (
              <div className="flex items-center justify-between border-t border-border/30 px-3 pt-3 mt-2">
                <p className="text-xs text-muted-foreground">
                  Hiển thị{" "}
                  <span className="font-semibold text-foreground">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalRows)}
                  </span>{" "}
                  trong tổng{" "}
                  <span className="font-semibold text-foreground">
                    {totalRows}
                  </span>{" "}
                  nhóm
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {Array.from(
                    { length: Math.min(totalPages, 5) },
                    (_, i) => {
                      let page: number;
                      if (totalPages <= 5) page = i + 1;
                      else if (currentPage <= 3) page = i + 1;
                      else if (currentPage >= totalPages - 2)
                        page = totalPages - 4 + i;
                      else page = currentPage - 2 + i;
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "ghost"}
                          size="icon"
                          className={`h-8 w-8 text-xs ${
                            page === currentPage
                              ? ""
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          onClick={() => setCurrentPage(page)}
                        >
                          {page}
                        </Button>
                      );
                    }
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    disabled={currentPage === totalPages}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPages, p + 1))
                    }
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ============ CREATE DIALOG ============ */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Tạo nhóm mới</DialogTitle>
            <DialogDescription>
              Tạo một nhóm thiết bị mới để quản lý dễ dàng hơn.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="create-name">Tên nhóm</Label>
              <Input
                id="create-name"
                placeholder="Ví dụ: Nhóm xe tải"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="create-desc">Mô tả</Label>
              <Input
                id="create-desc"
                placeholder="Mô tả ngắn về nhóm..."
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !formName.trim()}
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Tạo nhóm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ EDIT DIALOG ============ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa nhóm</DialogTitle>
            <DialogDescription>
              Cập nhật thông tin nhóm thiết bị.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-name">Tên nhóm</Label>
              <Input
                id="edit-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="edit-desc">Mô tả</Label>
              <Input
                id="edit-desc"
                value={formDescription}
                onChange={(e) => setFormDescription(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditOpen(false)}
              disabled={updateMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              onClick={handleEdit}
              disabled={updateMutation.isPending || !formName.trim()}
            >
              {updateMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Lưu thay đổi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ============ DELETE DIALOG ============ */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Xóa nhóm</DialogTitle>
            <DialogDescription>
              Bạn có chắc chắn muốn xóa nhóm{" "}
              <span className="font-semibold text-foreground">
                {selectedGroup?.name}
              </span>
              ? Hành động này không thể hoàn tác.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={deleteMutation.isPending}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Xóa nhóm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
