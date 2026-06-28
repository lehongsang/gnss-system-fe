

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { storageApi } from "@/services/apis/storage-api";
import { AppHeader } from "@/components/app-header";
import { toast } from "sonner";
import {
  Database,
  HardDrive,
  File,
  Download,
  Trash2,
  Cloud,
  History,
  MoreVertical,
  Loader2,
  Search,
  Video,
  Image as ImageIcon,
} from "lucide-react";

// Helper to format bytes to human readable sizes (KB, MB, GB)
function formatBytes(bytes: number, decimals = 1) {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

// Helper to format ISO dates to Vietnamese local format
function formatDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

// Helper to display time difference for the last sync
function formatLastSync(dateStr?: string) {
  if (!dateStr) return "Chưa từng đồng bộ";
  try {
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "Vừa mới đây";
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return d.toLocaleDateString("vi-VN");
  } catch {
    return "Không rõ";
  }
}

export default function StoragePage() {
  const queryClient = useQueryClient();

  // Filter and pagination states
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [page, setPage] = useState(1);
  const limit = 10;

  // 1. Quota Query
  const { data: quota, isLoading: isQuotaLoading } = useQuery({
    queryKey: ["storage-quota"],
    queryFn: () => storageApi.getQuota(),
  });

  // 2. Files Query
  const { data: filesData, isLoading: isFilesLoading } = useQuery({
    queryKey: ["storage-files", page, type, search],
    queryFn: () =>
      storageApi.getFiles({
        page,
        limit,
        type: type || undefined,
        search: search || undefined,
      }),
  });



  // 4. Delete Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => storageApi.deleteFile(id),
    onSuccess: () => {
      toast.success("Xóa tệp tin thành công!");
      queryClient.invalidateQueries({ queryKey: ["storage-files"] });
      queryClient.invalidateQueries({ queryKey: ["storage-quota"] });
    },
    onError: (error: any) => {
      toast.error(error.message || "Xóa tệp tin thất bại");
    },
  });



  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa tệp tin "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const handleDownload = async (id: string) => {
    try {
      const response = await storageApi.getDownloadUrl(id);
      if (response.url) {
        window.open(response.url, "_blank");
      } else {
        toast.error("Không thể lấy liên kết tải xuống");
      }
    } catch (error: any) {
      toast.error(error.message || "Lỗi khi tải xuống tệp tin");
    }
  };

  // Safe variables for UI calculation
  const cloudUsage = quota?.cloudUsageBytes || 0;
  const cloudTotal = quota?.cloudTotalBytes || 100 * 1024 * 1024 * 1024; // 100GB fallback
  const cloudUsagePercent = Math.min(100, Math.round((cloudUsage / cloudTotal) * 100));

  const localBackup = quota?.localBackupBytes || 12.5 * 1024 * 1024 * 1024; // 12.5GB fallback
  // Mock total size for local drive backup: 100GB
  const localTotal = 100 * 1024 * 1024 * 1024;
  const localUsagePercent = Math.min(100, Math.round((localBackup / localTotal) * 100));

  const files = filesData?.data || [];
  const total = filesData?.total || 0;
  const pageCount = filesData?.pageCount || 1;

  return (
    <>
      <AppHeader
        title="Lưu trữ"
        breadcrumbs={[
          { label: "Nhật ký Media" },
          { label: "Lưu trữ" },
        ]}
      />
      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Lưu trữ & Tệp</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quản lý dung lượng lưu trữ đám mây và các tệp tin hệ thống.
          </p>
        </div>



        {/* Quota cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Cloud Storage Card */}
          <div className="bg-card border rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-blue-500/40 hover:shadow-lg hover:shadow-blue-500/10 transition-all duration-300">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Cloud className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <h3 className="font-semibold flex items-center gap-2">
                <Cloud className="w-5 h-5 text-blue-500" /> Cloud Storage
              </h3>
            </div>
            {isQuotaLoading ? (
              <div className="h-10 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold relative z-10">
                  {formatBytes(cloudUsage)}{" "}
                  <span className="text-base font-normal text-muted-foreground">
                    / {formatBytes(cloudTotal)}
                  </span>
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mt-2 relative z-10">
                  <div
                    className="bg-gradient-to-r from-blue-500 to-cyan-400 h-full rounded-full"
                    style={{ width: `${cloudUsagePercent}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground mt-1 relative z-10 flex justify-between">
                  <span>Đã sử dụng {cloudUsagePercent}%</span>
                </p>
              </>
            )}
          </div>

          {/* Local Backup Card */}
          <div className="bg-card border rounded-xl p-5 flex flex-col gap-3 relative overflow-hidden group hover:border-emerald-500/40 hover:shadow-lg hover:shadow-emerald-500/10 transition-all duration-300">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <HardDrive className="w-32 h-32" />
            </div>
            <div className="flex items-center justify-between relative z-10">
              <h3 className="font-semibold flex items-center gap-2">
                <HardDrive className="w-5 h-5 text-emerald-500" /> Local Backup
              </h3>
              <span className="text-xs font-medium px-2 py-1 bg-emerald-500/10 text-emerald-600 rounded-full">
                Active
              </span>
            </div>
            {isQuotaLoading ? (
              <div className="h-10 flex items-center">
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <>
                <div className="text-3xl font-bold relative z-10">
                  {formatBytes(localBackup)}
                </div>
                <div className="w-full bg-secondary h-2.5 rounded-full overflow-hidden mt-2 relative z-10">
                  <div
                    className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full"
                    style={{ width: `${localUsagePercent}%` }}
                  ></div>
                </div>
                <p className="text-sm text-muted-foreground mt-1 relative z-10 flex items-center gap-1">
                  <History className="w-3.5 h-3.5" /> Đồng bộ gần nhất:{" "}
                  {formatLastSync(quota?.lastSync)}
                </p>
              </>
            )}
          </div>
        </div>

        {/* Files manager table card */}
        <div className="bg-card border rounded-xl mt-2 overflow-hidden flex flex-col">
          <div className="p-4 border-b flex justify-between items-center bg-muted/10">
            <h3 className="font-semibold flex items-center gap-2">
              <Database className="w-4 h-4 text-muted-foreground" /> Danh sách tệp tin thiết bị
            </h3>
          </div>

          {/* Search and Filters Bar */}
          <div className="flex flex-col sm:flex-row gap-3 p-4 border-b bg-muted/5">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Tìm kiếm tệp tin..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1); // Reset to page 1 on search change
                }}
                className="w-full bg-background border rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setPage(1); // Reset to page 1 on filter change
              }}
              className="bg-background border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Tất cả định dạng</option>
              <option value="video">Video</option>
              <option value="image">Hình ảnh</option>
            </select>
          </div>

          {/* Table content */}
          <div className="overflow-x-auto">
            {isFilesLoading ? (
              <div className="py-12 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              </div>
            ) : files.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Database className="w-10 h-10 stroke-[1.2] opacity-40 animate-pulse text-blue-500" />
                <span className="text-sm font-medium">Không tìm thấy tệp tin nào.</span>
                <p className="text-xs text-muted-foreground/60 max-w-xs text-center">
                  Hãy thử tải lên tệp mới hoặc thay đổi bộ lọc tìm kiếm.
                </p>
              </div>
            ) : (
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className="bg-muted/30 text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3.5 font-medium">Tên tệp</th>
                    <th className="px-5 py-3.5 font-medium">Kích thước</th>
                    <th className="px-5 py-3.5 font-medium">Ngày tạo</th>
                    <th className="px-5 py-3.5 font-medium text-right">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {files.map((file) => (
                    <tr
                      key={file.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div
                            className={`p-2 rounded-lg ${
                              file.type === "video"
                                ? "bg-blue-500/10 text-blue-500"
                                : file.type === "image"
                                ? "bg-violet-500/10 text-violet-500"
                                : "bg-slate-500/10 text-slate-500"
                            }`}
                          >
                            {file.type === "video" ? (
                              <Video className="w-4 h-4" />
                            ) : file.type === "image" ? (
                              <ImageIcon className="w-4 h-4" />
                            ) : (
                              <File className="w-4 h-4" />
                            )}
                          </div>
                          <span className="font-medium text-foreground">
                            {file.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {formatBytes(file.size)}
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {formatDate(file.createdAt)}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleDownload(file.id)}
                            className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded-md transition-colors"
                            title="Tải xuống"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(file.id, file.name)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-md transition-colors disabled:opacity-50"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                          <button className="p-1.5 text-muted-foreground hover:bg-muted rounded-md transition-colors">
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination Footer */}
          {!isFilesLoading && pageCount > 1 && (
            <div className="p-4 border-t flex items-center justify-between bg-muted/10">
              <span className="text-xs text-muted-foreground">
                Hiển thị trang {page} / {pageCount} (Tổng số {total} tệp tin)
              </span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                  className="px-3 py-1 text-xs border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Trước
                </button>
                <button
                  disabled={page >= pageCount}
                  onClick={() => setPage(page + 1)}
                  className="px-3 py-1 text-xs border rounded-md hover:bg-muted disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  Sau
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
