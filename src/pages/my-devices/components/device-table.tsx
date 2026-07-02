import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TableCell,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Cpu,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Eye,
} from "lucide-react";
import type { UserDevice, DeviceStatus } from "@/types";

interface DeviceTableProps {
  devices: UserDevice[];
  isLoading?: boolean;
  onEdit: (device: UserDevice) => void;
  onDelete: (device: UserDevice) => void;
  onView: (device: UserDevice) => void;
}

const ITEMS_PER_PAGE = 5;

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

  // Calculate counts for filters
  const counts = useMemo(() => {
    return {
      all: devices.length,
      online: devices.filter((d) => d.status === "online").length,
      offline: devices.filter((d) => d.status === "offline").length,
      maintenance: devices.filter((d) => d.status === "maintenance").length,
    };
  }, [devices]);

  // Filter devices
  const filtered = devices.filter((d) => {
    const matchSearch =
      d.name.toLowerCase().includes(searchQuery.toLowerCase());
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
    <div className="panel">
      <div className="panel-head">
        <div className="left">
          <div className="panel-icon">
            <Cpu className="h-[17px] w-[17px]" />
          </div>
          <h2>Danh sách thiết bị <span className="count-pill">{filtered.length} thiết bị</span></h2>
        </div>
        <div className="panel-actions">
          <div className="search-box">
            <Search className="h-3.5 w-3.5" />
            <input
              placeholder="Tìm theo tên thiết bị..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
            />
          </div>
          <div className="filter-pills">
            <button
              type="button"
              onClick={() => handleStatusFilter("all")}
              className={`fpill ${statusFilter === "all" ? "active" : ""}`}
            >
              Tất cả ({counts.all})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter("online")}
              className={`fpill green ${statusFilter === "online" ? "active" : ""}`}
            >
              <span className="dot bg-emerald-500" />
              Online ({counts.online})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter("offline")}
              className={`fpill red ${statusFilter === "offline" ? "active" : ""}`}
            >
              <span className="dot bg-rose-500" />
              Offline ({counts.offline})
            </button>
            <button
              type="button"
              onClick={() => handleStatusFilter("maintenance")}
              className={`fpill amber ${statusFilter === "maintenance" ? "active" : ""}`}
            >
              <span className="dot bg-amber-500" />
              Bảo trì ({counts.maintenance})
            </button>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table>
          <thead>
            <tr>
              <th>Thiết bị</th>
              <th>Trạng thái</th>
              <th>Giới hạn tốc độ</th>
              <th>Pin</th>
              <th>Hoạt động gần nhất</th>
              <th style={{ textAlign: "right" }}>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              // Skeleton Loaders
              Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => (
                <SkeletonRow key={`skeleton-${i}`} />
              ))
            ) : paginated.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-muted-foreground">
                  <div className="flex flex-col items-center gap-2">
                    <Cpu className="h-8 w-8 text-muted-foreground/30" />
                    <p className="text-sm font-medium">Không tìm thấy thiết bị nào</p>
                    <p className="text-xs text-muted-foreground/70">
                      Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.
                    </p>
                  </div>
                </td>
              </tr>
            ) : (
              paginated.map((device) => {
                const isOnline = device.status === "online";
                const isMaintenance = device.status === "maintenance";

                const pinValClass = device.battery > 60 ? "high" : device.battery >= 20 ? "mid" : "low";
                const pinFillStyle = {
                  width: `${device.battery}%`,
                  background: device.battery > 60 
                    ? "linear-gradient(90deg,#3ecf8e,#2fb37a)" 
                    : device.battery >= 20 
                    ? "linear-gradient(90deg,#f0a93f,#d97706)" 
                    : "linear-gradient(90deg,#ef5d6f,#dc2626)"
                };

                return (
                  <tr
                    key={device.id}
                    onClick={() => onView(device)}
                    className="cursor-pointer"
                  >
                    {/* Device Avatar + Name */}
                    <td>
                      <div className="dev-name">
                        <div className="dev-avatar">
                          <Cpu className="h-[17px] w-[17px]" />
                        </div>
                        <div>
                          <div>{device.name}</div>
                          <div className="dev-id">{device.id.slice(0, 8)}...</div>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={`badge ${isOnline ? "on" : isMaintenance ? "amber" : "off"}`}>
                        {isOnline ? "Online" : isMaintenance ? "Bảo trì" : "Offline"}
                      </span>
                    </td>

                    {/* Speed Limit */}
                    <td>
                      <div className="limit-cell">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M12 2l9 4.5v9L12 22l-9-6.5v-9z" />
                        </svg>
                        Giới hạn: <b>{device.speedLimitKmh} km/h</b>
                      </div>
                    </td>

                    {/* Battery progress */}
                    <td className="pin-cell">
                      <div className={`pin-val ${pinValClass === "high" ? "high" : pinValClass === "mid" ? "text-amber-500" : "text-rose-500"}`}>
                        {device.battery}%
                      </div>
                      <div className="pin-bar-track">
                        <div className="pin-bar-fill" style={pinFillStyle} />
                      </div>
                    </td>

                    {/* Last activity */}
                    <td className="activity-cell">
                      {formatTimeAgo(device.lastSeen)}
                    </td>

                    {/* Actions */}
                    <td onClick={(e) => e.stopPropagation()}>
                      <div className="action-icons">
                        <button
                          className="action-btn"
                          title="Xem chi tiết"
                          onClick={() => onView(device)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        <button
                          className="action-btn"
                          title="Chỉnh sửa"
                          onClick={() => onEdit(device)}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="action-btn danger">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              className="text-xs gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
                              onClick={() => onDelete(device)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              Xóa thiết bị
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Footer Paging */}
      {!isLoading && filtered.length > 0 && (
        <div className="table-footer">
          <span>Hiển thị {startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)} trong tổng {filtered.length} thiết bị</span>
          <div className="pager">
            <button
              className="pager-btn cursor-pointer"
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                className={`pager-btn cursor-pointer ${page === currentPage ? "current" : ""}`}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </button>
            ))}
            <button
              className="pager-btn cursor-pointer"
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
