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
  ShieldAlert,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Cpu,
  Image as ImageIcon,
  Video,
  Eye,
} from "lucide-react";
import {
  ALERT_TYPE_CONFIG,
  type UserAlert,
  type AlertType,
} from "@/types";

interface AlertsTableProps {
  alerts: UserAlert[];
  isLoading?: boolean;
  onViewDetail: (alert: UserAlert) => void;
}

const ALL_TYPES: AlertType[] = [
  "speeding",
  "geofence_exit",
  "geofence_enter",
  "signal_loss",
  "dangerous_obstacle",
  "low_battery",
];

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

function SkeletonRow() {
  return (
    <TableRow className="border-border/30">
      <TableCell>
        <Skeleton className="h-5 w-24 rounded-md" />
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <Skeleton className="h-3.5 w-32" />
          <Skeleton className="h-2.5 w-20" />
        </div>
      </TableCell>
      <TableCell>
        <Skeleton className="h-3.5 w-48" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-3.5 w-16" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-5 w-16 rounded-md" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-4 w-4 rounded" />
      </TableCell>
      <TableCell>
        <Skeleton className="h-8 w-16 rounded-md" />
      </TableCell>
    </TableRow>
  );
}

export function AlertsTable({
  alerts,
  isLoading = false,
  onViewDetail,
}: AlertsTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<AlertType | "all">("all");
  const [statusFilter, setStatusFilter] = useState<
    "all" | "resolved" | "unresolved"
  >("all");

  // Filter
  const filtered = alerts.filter((a) => {
    const matchSearch =
      a.deviceName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.message.toLowerCase().includes(searchQuery.toLowerCase());
    const matchType = typeFilter === "all" || a.type === typeFilter;
    const matchStatus =
      statusFilter === "all" ||
      (statusFilter === "resolved" && a.isResolved) ||
      (statusFilter === "unresolved" && !a.isResolved);
    return matchSearch && matchType && matchStatus;
  });

  // Sort by timestamp descending
  const sorted = [...filtered].sort(
    (a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const paginated = sorted;

  const handleSearch = (val: string) => {
    setSearchQuery(val);
  };

  const unresolvedCount = alerts.filter((a) => !a.isResolved).length;

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-5 pt-4 pb-3 space-y-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold">
                Cảnh báo & Media
              </CardTitle>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {unresolvedCount} chưa xử lý
              </p>
            </div>
            <Badge
              variant="outline"
              className="text-[10px] font-mono px-2 py-0.5 border-muted-foreground/20"
            >
              {filtered.length} kết quả
            </Badge>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                id="alert-search"
                placeholder="Tìm thiết bị, nội dung..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                className="pl-8 h-8 w-[180px] text-xs bg-background/50"
              />
            </div>

            {/* Type filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  id="alert-filter-type"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                >
                  <Filter className="h-3.5 w-3.5" />
                  {typeFilter === "all"
                    ? "Loại"
                    : ALERT_TYPE_CONFIG[typeFilter].label}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    setTypeFilter("all");
                  }}
                  className="text-xs"
                >
                  Tất cả loại
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {ALL_TYPES.map((t) => (
                  <DropdownMenuItem
                    key={t}
                    onClick={() => {
                      setTypeFilter(t);
                    }}
                    className="text-xs gap-2"
                  >
                    <span>{ALERT_TYPE_CONFIG[t].icon}</span>
                    {ALERT_TYPE_CONFIG[t].label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Status filter */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1.5"
                >
                  {statusFilter === "all"
                    ? "Trạng thái"
                    : statusFilter === "resolved"
                    ? "Đã xử lý"
                    : "Chưa xử lý"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("all");
                  }}
                  className="text-xs"
                >
                  Tất cả
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("unresolved");
                  }}
                  className="text-xs gap-2"
                >
                  <AlertTriangle className="h-3 w-3 text-amber-500" />
                  Chưa xử lý
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    setStatusFilter("resolved");
                  }}
                  className="text-xs gap-2"
                >
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  Đã xử lý
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider font-medium pl-5">
                  Loại
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                  Thiết bị
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                  Nội dung
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                  Thời gian
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                  Trạng thái
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">
                  Media
                </TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium pr-5 w-[80px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <SkeletonRow key={`skeleton-${i}`} />
                ))
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <div className="flex flex-col items-center gap-2">
                      <ShieldAlert className="h-8 w-8 text-muted-foreground/30" />
                      <p className="text-sm font-medium">
                        Không có cảnh báo nào
                      </p>
                      <p className="text-xs text-muted-foreground/70">
                        Thay đổi bộ lọc để xem thêm.
                      </p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((alert) => {
                  const typeConfig = ALERT_TYPE_CONFIG[alert.type];

                  return (
                    <TableRow
                      key={alert.id}
                      className="border-border/30 group cursor-pointer transition-colors hover:bg-accent/30"
                      onClick={() => onViewDetail(alert)}
                    >
                      {/* Type Badge */}
                      <TableCell className="pl-5">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0.5 ${typeConfig.badgeClass} whitespace-nowrap`}
                        >
                          <span className="mr-1">{typeConfig.icon}</span>
                          {typeConfig.label}
                        </Badge>
                      </TableCell>

                      {/* Device */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Cpu className="h-3.5 w-3.5 text-muted-foreground" />
                          <div>
                            <p className="text-xs font-semibold">
                              {alert.deviceName}
                            </p>
                            <p className="text-[10px] text-muted-foreground font-mono">
                              {alert.deviceId.slice(0, 12)}...
                            </p>
                          </div>
                        </div>
                      </TableCell>

                      {/* Message */}
                      <TableCell className="max-w-[300px]">
                        <p className="text-xs text-muted-foreground truncate">
                          {alert.message}
                        </p>
                      </TableCell>

                      {/* Timestamp */}
                      <TableCell>
                        <span className="text-[10px] text-muted-foreground font-mono whitespace-nowrap">
                          {formatTimeAgo(alert.timestamp)}
                        </span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>
                        {alert.isResolved ? (
                          <div className="flex items-center gap-1 text-emerald-500">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-medium">
                              Đã xử lý
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-amber-500">
                            <AlertTriangle className="h-3.5 w-3.5" />
                            <span className="text-[10px] font-medium">
                              Mở
                            </span>
                          </div>
                        )}
                      </TableCell>

                      {/* Media indicator */}
                      <TableCell>
                        {alert.media ? (
                          alert.media.type === "image_frame" ? (
                            <ImageIcon className="h-4 w-4 text-blue-400" />
                          ) : (
                            <Video className="h-4 w-4 text-violet-400" />
                          )
                        ) : (
                          <span className="text-[10px] text-muted-foreground/40">
                            —
                          </span>
                        )}
                      </TableCell>

                      {/* Action */}
                      <TableCell className="pr-5">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewDetail(alert);
                          }}
                        >
                          <Eye className="h-3 w-3" />
                          Xem
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
