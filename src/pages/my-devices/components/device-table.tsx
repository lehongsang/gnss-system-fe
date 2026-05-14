import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Cpu,
  Search,
  Filter,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
  ChevronLeft,
  ChevronRight,
  Gauge,
  Wifi,
  WifiOff,
  Wrench,
} from "lucide-react";
import type { UserDevice, DeviceStatus } from "@/types";

interface DeviceTableProps {
  devices: UserDevice[];
  isLoading?: boolean;
  onEdit: (device: UserDevice) => void;
  onDelete: (device: UserDevice) => void;
  onView: (device: UserDevice) => void;
}

const STATUS_CONFIG: Record<
  DeviceStatus,
  { label: string; dotColor: string; badgeClass: string; icon: typeof Wifi }
> = {
  online: {
    label: "Online",
    dotColor: "bg-emerald-500",
    badgeClass:
      "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:bg-emerald-500/15",
    icon: Wifi,
  },
  offline: {
    label: "Offline",
    dotColor: "bg-red-400",
    badgeClass:
      "bg-red-500/10 text-red-400 border-red-500/20 hover:bg-red-500/15",
    icon: WifiOff,
  },
  maintenance: {
    label: "Maintenance",
    dotColor: "bg-amber-500",
    badgeClass:
      "bg-amber-500/10 text-amber-500 border-amber-500/20 hover:bg-amber-500/15",
    icon: Wrench,
  },
};

const ITEMS_PER_PAGE = 5;

function getBatteryColor(level: number) {
  if (level > 20) return "bg-emerald-500";
  return "bg-red-400";
}

function getBatteryTextColor(level: number) {
  if (level > 20) return "text-emerald-500";
  return "text-red-400";
}

function getBatteryBgColor(level: number) {
  if (level > 20) return "bg-emerald-500/20";
  return "bg-red-500/20";
}

function formatTimeAgo(dateStr: string) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} ngày trước`;
}

// Skeleton row component
function SkeletonRow() {
  return (
    <TableRow className="border-border/30">
      <TableCell>
        <div className="flex items-center gap-3">
          <Skeleton className="h-9 w-9 rounded-lg" />
          <div className="space-y-1.5">
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-2.5 w-24" />
          </div>
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-3.5 w-28 font-mono" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3.5 w-14" />
      </TableCell>
      <TableCell>
        <div className="space-y-1.5">
          <Skeleton className="h-2.5 w-10" />
          <Skeleton className="h-2 w-full max-w-[100px]" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-3.5 w-20" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-8 rounded-md" />
      </TableCell>
    </TableRow>
  );
}

export function DeviceTable({
  devices,
  isLoading = false,
  onEdit,
  onDelete,
  onView,
}: DeviceTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DeviceStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);

  // Filter devices
  const filtered = devices.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      d.macAddress.toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = statusFilter === "all" || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  // Reset page when filter changes
  const handleSearch = (val: string) => {
    setSearchQuery(val);
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: DeviceStatus | "all") => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-5 pt-4 pb-3 space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-500">
              <Cpu className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-semibold">
              Danh sách thiết bị
            </CardTitle>
            <Badge
              variant="outline"
              className="text-[10px] font-mono px-2 py-0.5 border-muted-foreground/20"
            >
              {filtered.length} thiết bị
            </Badge>
          </div>

          {/* Search + Filter */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="device-search"
                placeholder="Tìm tên hoặc MAC..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 h-8 w-[200px] text-xs bg-background/50"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  id="device-filter-status"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                >
                  <Filter className="h-3.5 w-3.5" />
                  {statusFilter === "all"
                    ? "Tất cả"
                    : STATUS_CONFIG[statusFilter].label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => handleStatusFilter("all")}
                  className="text-xs"
                >
                  Tất cả
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => handleStatusFilter("online")}
                  className="text-xs"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500 mr-2" />
                  Online
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusFilter("offline")}
                  className="text-xs"
                >
                  <span className="h-2 w-2 rounded-full bg-red-400 mr-2" />
                  Offline
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => handleStatusFilter("maintenance")}
                  className="text-xs"
                >
                  <span className="h-2 w-2 rounded-full bg-amber-500 mr-2" />
                  Maintenance
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Table */}
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-medium pl-5">
                  Thiết bị
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                  MAC Address
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                  Trạng thái
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                  Speed Limit
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                  Pin
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                  Hoạt động gần nhất
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium pr-5 w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                // Skeleton Loaders
                Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                  <SkeletonRow key={`skeleton-${i}`} />
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <Cpu className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm font-medium">
                        Không tìm thấy thiết bị nào
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((device) => {
                  const statusCfg = STATUS_CONFIG[device.status];
                  const StatusIcon = statusCfg.icon;

                  return (
                    <TableRow
                      key={device.id}
                      className="border-border/30 group cursor-pointer transition-colors"
                      onClick={() => onView(device)}
                    >
                      {/* Device Name + ID */}
                      <TableCell className="pl-5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`flex h-9 w-9 items-center justify-center rounded-lg transition-colors ${
                              device.status === "online"
                                ? "bg-blue-500/10 text-blue-500"
                                : device.status === "maintenance"
                                ? "bg-amber-500/10 text-amber-500"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <Cpu className="h-4 w-4" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold leading-none group-hover:text-primary transition-colors">
                              {device.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono mt-1">
                              {device.id.slice(0, 8)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* MAC Address */}
                      <TableCell>
                        <code className="text-xs font-mono text-muted-foreground bg-muted/50 px-2 py-0.5 rounded">
                          {device.macAddress}
                        </code>
                      </TableCell>

                      {/* Status Badge */}
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 ${statusCfg.badgeClass}`}
                        >
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {statusCfg.label}
                        </Badge>
                      </TableCell>

                      {/* Speed Limit */}
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <Gauge className="h-3.5 w-3.5" />
                          <span className="font-mono font-semibold text-foreground">
                            {device.speedLimitKmh}
                          </span>
                          <span className="text-[10px]">km/h</span>
                        </div>
                      </TableCell>

                      {/* Battery */}
                      <TableCell>
                        <div className="space-y-1 w-[100px]">
                          <div className="flex items-center justify-between">
                            <span
                              className={`text-[11px] font-bold font-mono ${getBatteryTextColor(
                                device.battery
                              )}`}
                            >
                              {device.battery}%
                            </span>
                          </div>
                          <div
                            className={`h-1.5 w-full rounded-full ${getBatteryBgColor(
                              device.battery
                            )} overflow-hidden`}
                          >
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getBatteryColor(
                                device.battery
                              )}`}
                              style={{ width: `${device.battery}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>

                      {/* Last Seen */}
                      <TableCell>
                        <span className="text-xs text-muted-foreground">
                          {formatTimeAgo(device.lastSeen)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="pr-5">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              className="text-xs gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                onView(device);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Xem chi tiết
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs gap-2"
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(device);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                              Chỉnh sửa
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-xs gap-2 text-red-400 focus:text-red-400"
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(device);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa thiết bị
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination Footer */}
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/30 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Hiển thị{" "}
              <span className="font-semibold text-foreground">
                {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)}
              </span>{" "}
              trong tổng{" "}
              <span className="font-semibold text-foreground">
                {filtered.length}
              </span>{" "}
              thiết bị
            </p>
            <div className="flex items-center gap-1">
              <Button
                id="pagination-prev"
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                (page) => (
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
                )
              )}
              <Button
                id="pagination-next"
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
  );
}
