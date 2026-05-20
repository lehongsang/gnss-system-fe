import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Pentagon } from "lucide-react";

type GeofenceFormType = "allowed_zone" | "forbidden_zone";

interface GeofenceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pointCount: number;
  initialData?: { name: string; color: string; type: GeofenceFormType } | null;
  onSubmit: (data: { name: string; color: string; type: GeofenceFormType }) => Promise<void> | void;
}

const DEFAULT_TYPE_COLORS: Record<GeofenceFormType, string> = {
  allowed_zone: "#3b82f6",
  forbidden_zone: "#ef4444",
};

const PRESET_COLORS = [
  "#3b82f6",
  "#ef4444",
  "#22c55e",
  "#f59e0b",
  "#8b5cf6",
  "#ec4899",
  "#06b6d4",
  "#f97316",
];

export function GeofenceFormDialog({
  open,
  onOpenChange,
  pointCount,
  initialData,
  onSubmit,
}: GeofenceFormDialogProps) {
  const [name, setName] = useState("");
  const [zoneType, setZoneType] = useState<GeofenceFormType>("allowed_zone");
  const [color, setColor] = useState(DEFAULT_TYPE_COLORS.allowed_zone);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      if (initialData) {
        setName(initialData.name);
        setZoneType(initialData.type || "allowed_zone");
        setColor(initialData.color || DEFAULT_TYPE_COLORS[initialData.type] || DEFAULT_TYPE_COLORS.allowed_zone);
      } else {
        setName("");
        setZoneType("allowed_zone");
        setColor(DEFAULT_TYPE_COLORS.allowed_zone);
      }
      setErrors({});
      setIsSubmitting(false);
    }
  }, [open, initialData]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) {
      newErrors.name = "Tên vùng không được để trống.";
    }
    if (pointCount < 3) {
      newErrors.points = "Cần ít nhất 3 điểm để tạo polygon.";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit({ name: name.trim(), color, type: zoneType });
      setName("");
      setZoneType("allowed_zone");
      setColor(DEFAULT_TYPE_COLORS.allowed_zone);
      setErrors({});
      onOpenChange(false);
    } catch (error) {
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] border-border/50 bg-card/95 backdrop-blur-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold flex items-center gap-2">
              <Pentagon className="h-5 w-5 text-emerald-500" />
              {initialData ? "Chỉnh sửa vùng giám sát" : "Lưu vùng giám sát"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {initialData ? "Cập nhật thông tin vùng giám sát." : "Đặt tên và chọn màu cho vùng giám sát vừa vẽ."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-5">
            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="geo-name" className="text-xs font-medium">
                Tên vùng <span className="text-red-400">*</span>
              </Label>
              <Input
                id="geo-name"
                placeholder="VD: Kho hàng Long Biên"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={
                  errors.name
                    ? "border-red-500/50 focus-visible:ring-red-500/30"
                    : ""
                }
              />
              {errors.name && (
                <p className="text-[11px] text-red-400 flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-red-400" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Zone Type */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Loại vùng</Label>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={zoneType === "allowed_zone" ? "secondary" : "outline"}
                  className="text-sm"
                  onClick={() => setZoneType("allowed_zone")}
                >
                  Vùng được phép
                </Button>
                <Button
                  type="button"
                  variant={zoneType === "forbidden_zone" ? "secondary" : "outline"}
                  className="text-sm"
                  onClick={() => setZoneType("forbidden_zone")}
                >
                  Vùng cấm
                </Button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {zoneType === "allowed_zone"
                  ? "Thiết bị phải di chuyển bên trong vùng này. Cảnh báo khi rời vùng."
                  : "Thiết bị không được đi vào bên trong vùng này. Cảnh báo khi vào vùng."}
              </p>
            </div>

            {/* Color Picker */}
            <div className="space-y-2">
              <Label className="text-xs font-medium">Màu sắc</Label>
              <div className="flex gap-2 flex-wrap">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`h-8 w-8 rounded-lg border-2 transition-all ${
                      color === c
                        ? "border-white scale-110 shadow-lg"
                        : "border-transparent hover:scale-105"
                    }`}
                    style={{ backgroundColor: c }}
                    onClick={() => setColor(c)}
                  />
                ))}
              </div>
            </div>

            {/* Points info */}
            {errors.points && (
              <p className="text-[11px] text-red-400 flex items-center gap-1">
                <span className="inline-block h-1 w-1 rounded-full bg-red-400" />
                {errors.points}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {initialData ? "Cập nhật" : "Tạo vùng"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
