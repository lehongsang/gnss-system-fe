import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Pentagon,
  Plus,
  Pencil,
  Trash2,
  MoreHorizontal,
  Cpu,
  MapPin,
} from "lucide-react";
import type { GeofenceZone, SimpleDevice } from "@/types";

interface GeofenceListProps {
  geofences: GeofenceZone[];
  availableDevices: SimpleDevice[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onEdit: (geo: GeofenceZone) => void;
  onDelete: (id: string) => void;
  onAssignDevice: (geofenceId: string, deviceId: string) => void;
  onRemoveDevice: (geofenceId: string, deviceId: string) => void;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function GeofenceList({
  geofences,
  availableDevices,
  selectedId,
  onSelect,
  onEdit,
  onDelete,
  onAssignDevice,
  onRemoveDevice,
}: GeofenceListProps) {
  return (
    <Card className="flex flex-col overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm h-full">
      <CardHeader className="px-5 pt-4 pb-3 space-y-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <Pentagon className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-semibold">
              Danh sách vùng
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className="text-[10px] font-mono px-2 py-0.5 border-muted-foreground/20"
          >
            {geofences.length} vùng
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex-1 p-0">
        <ScrollArea className="h-[540px]">
          <div className="space-y-1 px-3 pb-3">
            {geofences.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Pentagon className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium">Chưa có vùng nào</p>
                <p className="text-xs text-muted-foreground/70">
                  Vẽ polygon trên bản đồ để tạo vùng mới.
                </p>
              </div>
            ) : (
              geofences.map((geo) => {
                const isSelected = geo.id === selectedId;
                const assignedNames = availableDevices
                  .filter((d) => geo.assignedDevices.includes(d.id))
                  .map((d) => d.name);
                const unassigned = availableDevices.filter(
                  (d) => !geo.assignedDevices.includes(d.id)
                );
                
                let displayPoints = geo.vertexCount ?? geo.paths.length;
                if (geo.vertexCount === undefined && displayPoints > 0) {
                  const first = geo.paths[0];
                  const last = geo.paths[displayPoints - 1];
                  if (first.lat === last.lat && first.lng === last.lng) {
                    displayPoints -= 1;
                  }
                }

                const zoneLabel =
                  geo.type === "forbidden_zone"
                    ? "Vùng cấm"
                    : "Vùng được phép";
                const zoneDescription =
                  geo.type === "forbidden_zone"
                    ? "Thiết bị không được đi vào vùng này."
                    : "Thiết bị phải ở trong vùng này.";

                return (
                  <div
                    key={geo.id}
                    className={`rounded-lg p-3 transition-all cursor-pointer border ${
                      isSelected
                        ? "border-primary/50 bg-accent/50 shadow-sm"
                        : "border-transparent hover:border-border/50 hover:bg-accent/30"
                    }`}
                    onClick={() => onSelect(geo.id)}
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full border-2"
                          style={{
                            backgroundColor: geo.color + "30",
                            borderColor: geo.color,
                          }}
                        />
                        <p className="text-sm font-semibold truncate max-w-[160px]">
                          {geo.name}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            className="text-xs gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEdit(geo);
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
                              onDelete(geo.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            Xóa vùng
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Zone type */}
                    <div className="flex flex-wrap items-center gap-2 mb-2.5 text-[10px]">
                      <Badge
                        className="px-2 py-0.5 text-[10px] font-medium"
                        style={{
                          backgroundColor:
                            geo.type === "forbidden_zone"
                              ? "#fee2e2"
                              : "#dbeafe",
                          color:
                            geo.type === "forbidden_zone"
                              ? "#b91c1c"
                              : "#0f172a",
                        }}
                      >
                        {zoneLabel}
                      </Badge>
                      <span className="text-muted-foreground">{zoneDescription}</span>
                    </div>

                    {/* Meta */}
                    <div className="flex items-center gap-3 mb-2.5">
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {displayPoints} điểm
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {formatDate(geo.createdAt)}
                      </span>
                    </div>

                    {/* Coordinate Details — visible when selected */}
                    {isSelected && geo.paths.length > 0 && (
                      <div className="mb-2.5 rounded-md border border-border/40 bg-muted/20 p-2">
                        <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium mb-1.5">
                          Tọa độ các đỉnh
                        </p>
                        <div className="space-y-1 max-h-[120px] overflow-y-auto">
                          {geo.paths.map((point, idx) => {
                            // Skip closing point
                            if (
                              idx === geo.paths.length - 1 &&
                              geo.paths.length > 1 &&
                              point.lat === geo.paths[0].lat &&
                              point.lng === geo.paths[0].lng
                            ) {
                              return null;
                            }
                            return (
                              <div
                                key={idx}
                                className="flex items-center gap-2 text-[10px] font-mono"
                              >
                                <span
                                  className="inline-flex items-center justify-center w-4 h-4 rounded text-[8px] font-bold text-white shrink-0"
                                  style={{ backgroundColor: geo.color }}
                                >
                                  {idx + 1}
                                </span>
                                <span className="text-muted-foreground">
                                  {point.lat.toFixed(6)}, {point.lng.toFixed(6)}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* Assigned Devices */}
                    <div className="space-y-1.5">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">
                        Thiết bị đã gán ({geo.assignedDevices.length})
                      </p>
                      {assignedNames.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {assignedNames.map((name, i) => (
                            <Badge
                              key={i}
                              variant="outline"
                              className="text-[10px] px-1.5 py-0 h-5 border-primary/20 text-primary gap-1 cursor-pointer hover:border-red-400/30 hover:text-red-400 transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                const dev = availableDevices.find(
                                  (d) => d.name === name
                                );
                                if (dev) onRemoveDevice(geo.id, dev.id);
                              }}
                              title="Click để gỡ"
                            >
                              <Cpu className="h-2.5 w-2.5" />
                              {name.length > 18
                                ? name.slice(0, 18) + "…"
                                : name}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-muted-foreground/50 italic">
                          Chưa gán thiết bị nào
                        </p>
                      )}

                      {/* Assign dropdown */}
                      {unassigned.length > 0 && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-[10px] gap-1 mt-1 w-full"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Plus className="h-3 w-3" />
                              Gán thiết bị
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="w-52 max-h-48 overflow-y-auto">
                            {unassigned.map((dev) => (
                              <DropdownMenuItem
                                key={dev.id}
                                className="text-xs gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onAssignDevice(geo.id, dev.id);
                                }}
                              >
                                <Cpu className="h-3 w-3 text-muted-foreground" />
                                {dev.name}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
