import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface DeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  deviceName: string;
  onConfirm: () => void;
}

export function DeleteConfirmDialog({
  open,
  onOpenChange,
  deviceName,
  onConfirm,
}: DeleteConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[420px] border-border/50 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/10">
              <AlertTriangle className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">
                Xác nhận xóa
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Hành động này không thể hoàn tác.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-3">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Bạn có chắc chắn muốn xóa thiết bị{" "}
            <span className="font-semibold text-foreground">
              "{deviceName}"
            </span>{" "}
            khỏi hệ thống? Tất cả dữ liệu telemetry và lịch sử cảnh báo liên
            quan sẽ bị xóa vĩnh viễn.
          </p>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            className="text-xs"
          >
            Hủy bỏ
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={() => {
              onConfirm();
              onOpenChange(false);
            }}
            className="text-xs"
          >
            Xóa thiết bị
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
