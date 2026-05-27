import { useState } from "react";
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
import { Loader2 } from "lucide-react";
import type { UserDevice } from "@/types";

interface DeviceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  device?: UserDevice | null;
  onSubmit: (data: {
    name: string;
    speedLimitKmh: number;
  }) => void;
}

export function DeviceFormDialog({
  open,
  onOpenChange,
  device,
  onSubmit,
}: DeviceFormDialogProps) {
  const isEditing = !!device;

  const [name, setName] = useState(device?.name ?? "");
  const [speedLimit, setSpeedLimit] = useState(
    device?.speedLimitKmh?.toString() ?? "60"
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset form when dialog opens with different device
  const resetForm = () => {
    setName(device?.name ?? "");
    setSpeedLimit(device?.speedLimitKmh?.toString() ?? "60");
    setErrors({});
    setIsSubmitting(false);
  };

  const validate = () => {
    const newErrors: Record<string, string> = {};

    if (!name.trim()) {
      newErrors.name = "Tên thiết bị không được để trống.";
    }

    const speedNum = Number(speedLimit);
    if (!speedLimit || isNaN(speedNum)) {
      newErrors.speedLimit = "Speed Limit phải là một số.";
    } else if (speedNum < 10 || speedNum > 200) {
      newErrors.speedLimit = "Speed Limit phải từ 10 đến 200 km/h.";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    // Simulate API call
    await new Promise((res) => setTimeout(res, 800));

    onSubmit({
      name: name.trim(),
      speedLimitKmh: Number(speedLimit),
    });

    setIsSubmitting(false);
    onOpenChange(false);
  };


  return (
    <Dialog
      open={open}
      onOpenChange={(val) => {
        if (!val) resetForm();
        onOpenChange(val);
      }}
    >
      <DialogContent className="sm:max-w-[480px] border-border/50 bg-card/95 backdrop-blur-xl">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">
              {isEditing ? "Chỉnh sửa thiết bị" : "Thêm thiết bị mới"}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {isEditing
                ? "Cập nhật thông tin thiết bị của bạn."
                : "Điền thông tin để đăng ký thiết bị mới, hệ thống sẽ tạo MQTT credentials."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-5 py-5">
            {/* Device Name */}
            <div className="space-y-2">
              <Label htmlFor="device-name" className="text-xs font-medium">
                Tên thiết bị <span className="text-red-400">*</span>
              </Label>
              <Input
                id="device-name"
                placeholder="VD: Xe tải Bắc-Nam #1"
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


            {/* Speed Limit */}
            <div className="space-y-2">
              <Label htmlFor="device-speed" className="text-xs font-medium">
                Giới hạn tốc độ (km/h){" "}
                <span className="text-red-400">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="device-speed"
                  type="number"
                  placeholder="60"
                  min={10}
                  max={200}
                  value={speedLimit}
                  onChange={(e) => setSpeedLimit(e.target.value)}
                  className={`pr-14 ${
                    errors.speedLimit
                      ? "border-red-500/50 focus-visible:ring-red-500/30"
                      : ""
                  }`}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">
                  km/h
                </span>
              </div>
              {errors.speedLimit && (
                <p className="text-[11px] text-red-400 flex items-center gap-1">
                  <span className="inline-block h-1 w-1 rounded-full bg-red-400" />
                  {errors.speedLimit}
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-xs"
            >
              Hủy bỏ
            </Button>
            <Button type="submit" disabled={isSubmitting} className="text-xs">
              {isSubmitting && (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              )}
              {isEditing ? "Cập nhật" : "Tạo thiết bị"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
