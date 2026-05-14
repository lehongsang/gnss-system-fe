import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AppHeader } from "@/components/app-header";
import {
  AlertTriangle,
  CheckCircle2,
  Bell,
  Image as ImageIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import { DeviceStatsCard } from "../my-devices/components/device-stats-card";
import { AlertsTable } from "./components/alerts-table";
import { AlertDetailDialog } from "./components/alert-detail-dialog";
import type { UserAlert } from "@/types";
import {
  useAlertsControllerFindMine,
  useAlertsControllerResolve,
  getAlertsControllerFindMineQueryKey,
} from "@/services/apis/gen/queries";

export default function MyAlertsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  // Fetch alerts from API
  const { data: alertsResponse, isLoading } = useAlertsControllerFindMine({
    page,
    limit,
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rawAlerts = (alertsResponse as any)?.data ?? [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const alerts: UserAlert[] = rawAlerts.map((a: any) => ({
      id: a.id,
      deviceId: a.deviceId ?? a.device?.id ?? "",
      deviceName: a.device?.name ?? a.deviceId ?? "",
      type: a.alertType ?? a.type ?? "signal_lost",
      message: a.message ?? "",
      isResolved: a.isResolved ?? false,
      timestamp: a.createdAt ?? "",
      media: a.mediaLog
        ? {
            type: a.mediaLog.mediaType ?? "image_frame",
            url: a.mediaLog.media?.url ?? "",
            thumbnail: a.mediaLog.media?.url ?? "",
          }
        : undefined,
    })
  );

  const total = (alertsResponse?.total as number) ?? 0;
  const pageCount = (alertsResponse?.pageCount as number) ?? 1;

  const resolveMutation = useAlertsControllerResolve();

  // Dialog
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<UserAlert | null>(null);

  // Stats
  const totalAlerts = alerts.length;
  const unresolvedCount = alerts.filter((a) => !a.isResolved).length;
  const resolvedCount = alerts.filter((a) => a.isResolved).length;
  const mediaCount = alerts.filter((a) => a.media).length;

  // Handlers
  const handleViewDetail = (alert: UserAlert) => {
    setSelectedAlert(alert);
    setDetailOpen(true);
  };

  const handleResolve = (alertId: string) => {
    resolveMutation.mutate(
      { id: alertId },
      {
        onSuccess: () => {
          toast.success("Đã đánh dấu xử lý", {
            description: "Cảnh báo đã được cập nhật trạng thái.",
          });
          queryClient.invalidateQueries({
            queryKey: getAlertsControllerFindMineQueryKey(),
          });
        },
        onError: () => {
          toast.error("Xử lý thất bại");
        },
      }
    );
  };

  const stats = [
    {
      title: "Tổng cảnh báo",
      value: totalAlerts,
      subtitle: "Toàn bộ cảnh báo trong hệ thống",
      icon: Bell,
      iconColor: "text-blue-500",
      iconBg: "bg-blue-500/10",
    },
    {
      title: "Chưa xử lý",
      value: unresolvedCount,
      subtitle: "Cần xem xét và xử lý",
      icon: AlertTriangle,
      iconColor: "text-amber-500",
      iconBg: "bg-amber-500/10",
    },
    {
      title: "Đã xử lý",
      value: resolvedCount,
      subtitle: `${
        totalAlerts > 0
          ? Math.round((resolvedCount / totalAlerts) * 100)
          : 0
      }% tổng cảnh báo`,
      icon: CheckCircle2,
      iconColor: "text-emerald-500",
      iconBg: "bg-emerald-500/10",
    },
    {
      title: "Có Media",
      value: mediaCount,
      subtitle: "Ảnh snapshot hoặc video clip",
      icon: ImageIcon,
      iconColor: "text-violet-500",
      iconBg: "bg-violet-500/10",
    },
  ];

  return (
    <>
      <AppHeader
        title="My Alerts & Media"
        breadcrumbs={[
          { label: "Alerts & Media" },
          { label: "My Alerts & Media" },
        ]}
      />

      <div className="flex flex-1 flex-col gap-5 p-5 min-h-full overflow-auto">
        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            My Alerts & Media
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Xem và quản lý cảnh báo từ các thiết bị, bao gồm ảnh và video đính
            kèm.
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <DeviceStatsCard key={stat.title} {...stat} />
          ))}
        </div>

        {/* Alerts Table */}
        <AlertsTable
          alerts={alerts}
          isLoading={isLoading}
          onViewDetail={handleViewDetail}
        />

        {/* Pagination Controls */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Hiển thị</span>
            <select
              className="h-9 w-20 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value));
                setPage(1);
              }}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
            <span className="text-sm text-muted-foreground">
              / trang (Tổng: {total})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              Trước
            </Button>
            <span className="text-sm text-muted-foreground px-2">
              Trang {page} / {pageCount || 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= pageCount}
            >
              Sau
            </Button>
          </div>
        </div>
      </div>

      {/* Alert Detail Dialog with Media */}
      <AlertDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        alert={selectedAlert}
        onResolve={handleResolve}
      />
    </>
  );
}
