import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  User,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Loader2,
  Mail,
  ShieldCheck,
  KeyRound
} from "lucide-react";

import { AppHeader } from "@/components/app-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { authClient } from "@/utils/auth-client";
import { useTheme } from "@/components/ui/theme-provider";

export default function SettingsPage() {
  const { data: session, refetch } = authClient.useSession();
  const { theme, setTheme } = useTheme();

  // Profile Form State
  const [name, setName] = useState("");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  useEffect(() => {
    if (session?.user) {
      setName(session.user.name || "");
    }
  }, [session]);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "US";

  // Handle Profile Update
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Họ và tên không được để trống");
      return;
    }

    setIsUpdatingProfile(true);
    try {
      const { error } = await authClient.updateUser({
        name: name.trim(),
      });

      if (error) {
        toast.error(error.message || "Không thể cập nhật hồ sơ");
      } else {
        toast.success("Cập nhật hồ sơ thành công", {
          description: "Thông tin hiển thị của bạn đã được thay đổi.",
        });
        await refetch();
      }
    } catch {
      toast.error("Có lỗi xảy ra khi cập nhật hồ sơ");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toast.error("Vui lòng nhập mật khẩu hiện tại");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("Mật khẩu mới phải có ít nhất 6 ký tự");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Mật khẩu xác nhận không khớp");
      return;
    }

    setIsChangingPassword(true);
    try {
      const { error } = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: false,
      });

      if (error) {
        toast.error(error.message || "Đổi mật khẩu thất bại");
      } else {
        toast.success("Đổi mật khẩu thành công", {
          description: "Mật khẩu tài khoản của bạn đã được cập nhật.",
        });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }
    } catch {
      toast.error("Có lỗi xảy ra khi đổi mật khẩu");
    } finally {
      setIsChangingPassword(false);
    }
  };

  return (
    <>
      <AppHeader
        title="Cài đặt"
        breadcrumbs={[
          { label: "Cài đặt" },
          { label: "Hồ sơ & Giao diện" },
        ]}
      />

      <div className="my-devices-page flex flex-1 flex-col gap-6 min-h-full overflow-auto">
        
        {/* Title */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-blue-400 bg-clip-text text-transparent">
            Cài đặt Tài khoản & Hệ thống
          </h1>
          <p className="text-sm text-cyan mt-1 opacity-85">
            Quản lý thông tin hồ sơ cá nhân, đổi mật khẩu và tùy biến giao diện hiển thị.
          </p>
        </div>

        {/* Layout grid */}
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-10">
          
          {/* Profile & Security Left Section (6 Cols) */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* Profile Update Card */}
            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                    <User className="h-4.5 w-4.5" />
                  </span>
                  Hồ sơ cá nhân
                </CardTitle>
                <CardDescription className="text-xs">
                  Cập nhật thông tin định danh hiển thị của bạn trên hệ thống.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleUpdateProfile} className="space-y-6">
                  
                  {/* Avatar section */}
                  <div className="flex items-center gap-4 p-4 rounded-xl border border-border/40 bg-muted/20">
                    <Avatar className="h-16 w-16 border-2 border-primary/20">
                      <AvatarFallback className="text-lg font-bold bg-primary/10 text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <h4 className="text-sm font-semibold text-foreground">{name || "User"}</h4>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="outline" className="text-[10px] uppercase tracking-wider py-0.5 border-primary/20 text-primary bg-primary/5">
                          {session?.user?.role || "user"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground">Thành viên hệ thống</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    
                    {/* Display name */}
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-name" className="text-xs font-semibold">Họ và tên</Label>
                      <Input
                        id="profile-name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Nhập họ và tên của bạn..."
                        className="h-10"
                      />
                    </div>

                    {/* Email (Disabled) */}
                    <div className="space-y-1.5">
                      <Label htmlFor="profile-email" className="text-xs font-semibold flex items-center gap-1">
                        Địa chỉ Email
                        <Badge variant="outline" className="text-[9px] h-4 py-0 border-emerald-500/20 text-emerald-500 bg-emerald-500/5 gap-0.5 font-normal">
                          <ShieldCheck className="h-2.5 w-2.5" /> Đã xác thực
                        </Badge>
                      </Label>
                      <div className="relative">
                        <Input
                          id="profile-email"
                          type="email"
                          value={session?.user?.email || ""}
                          disabled
                          className="h-10 pl-8 bg-muted text-muted-foreground cursor-not-allowed border-border/50"
                        />
                        <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                      </div>
                    </div>

                  </div>

                  <Button
                    type="submit"
                    disabled={isUpdatingProfile}
                    className="gap-2 text-xs h-10 px-6 shadow-md shadow-primary/20"
                  >
                    {isUpdatingProfile ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Đang lưu...
                      </>
                    ) : (
                      "Lưu thay đổi"
                    )}
                  </Button>

                </form>
              </CardContent>
            </Card>

            {/* Change Password Card */}
            <Card className="border-border/50 bg-card/60 backdrop-blur-md">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500">
                    <KeyRound className="h-4.5 w-4.5" />
                  </span>
                  Mật khẩu & Bảo mật
                </CardTitle>
                <CardDescription className="text-xs">
                  Cập nhật mật khẩu tài khoản thường xuyên để nâng cao bảo mật.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form onSubmit={handleChangePassword} className="space-y-4">
                  
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <Label htmlFor="curr-pass" className="text-xs font-semibold">Mật khẩu hiện tại</Label>
                    <Input
                      id="curr-pass"
                      type="password"
                      autoComplete="current-password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Nhập mật khẩu hiện tại..."
                      className="h-10"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    
                    {/* New Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="new-pass" className="text-xs font-semibold">Mật khẩu mới</Label>
                      <Input
                        id="new-pass"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Tối thiểu 6 ký tự..."
                        className="h-10"
                      />
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-1.5">
                      <Label htmlFor="confirm-pass" className="text-xs font-semibold">Xác nhận mật khẩu mới</Label>
                      <Input
                        id="confirm-pass"
                        type="password"
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Xác nhận lại mật khẩu..."
                        className="h-10"
                      />
                    </div>

                  </div>

                  <Button
                    type="submit"
                    variant="outline"
                    disabled={isChangingPassword || !newPassword}
                    className="gap-2 text-xs h-10 px-6 border-border/60 hover:bg-rose-500/10 hover:text-rose-500 hover:border-rose-500/30 transition-all"
                  >
                    {isChangingPassword ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Đang đổi...
                      </>
                    ) : (
                      "Cập nhật mật khẩu"
                    )}
                  </Button>

                </form>
              </CardContent>
            </Card>

          </div>

          {/* Theme Customization Right Section (4 Cols) */}
          <div className="lg:col-span-4">
            <Card className="border-border/50 bg-card/60 backdrop-blur-md h-full flex flex-col">
              <CardHeader className="border-b border-border/40 pb-4">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <span className="p-1.5 rounded-lg bg-violet-500/10 text-violet-500">
                    <Palette className="h-4.5 w-4.5" />
                  </span>
                  Tùy chỉnh giao diện
                </CardTitle>
                <CardDescription className="text-xs">
                  Chọn chủ đề hiển thị phù hợp với điều kiện ánh sáng môi trường của bạn.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6 space-y-6 flex-1 flex flex-col justify-between">
                
                <div className="space-y-4">
                  
                  {/* Option 1: Light Theme */}
                  <div
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      theme === "light"
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    }`}
                    onClick={() => setTheme("light")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-amber-500/10 rounded-lg text-amber-500">
                        <Sun className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">Chủ đề Sáng (Light)</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Giao diện màu nền trắng sáng trực quan</p>
                      </div>
                    </div>
                    {theme === "light" && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Option 2: Dark Theme */}
                  <div
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      theme === "dark"
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    }`}
                    onClick={() => setTheme("dark")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400">
                        <Moon className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">Chủ đề Tối (Dark)</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Tông màu tối dịu mắt, tiết kiệm năng lượng</p>
                      </div>
                    </div>
                    {theme === "dark" && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                  {/* Option 3: System Theme */}
                  <div
                    className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      theme === "system"
                        ? "border-primary bg-primary/5 shadow-md shadow-primary/5"
                        : "border-border/50 hover:border-border hover:bg-muted/30"
                    }`}
                    onClick={() => setTheme("system")}
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-slate-500/10 rounded-lg text-slate-400">
                        <Monitor className="h-5 w-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold">Chủ đề Hệ thống (System)</h4>
                        <p className="text-[10px] text-muted-foreground mt-0.5">Tự động đồng bộ theo cấu hình của hệ điều hành</p>
                      </div>
                    </div>
                    {theme === "system" && (
                      <div className="h-5 w-5 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                        <Check className="h-3 w-3 stroke-[3]" />
                      </div>
                    )}
                  </div>

                </div>

                <div className="mt-8 p-4 rounded-xl border border-border/40 bg-muted/20 text-xs text-muted-foreground leading-relaxed">
                  <p className="font-semibold text-foreground mb-1">Mẹo tùy chỉnh:</p>
                  Giao diện hệ thống sử dụng các CSS tokens động. Khi chuyển đổi chủ đề, tất cả các thành phần bản đồ giám sát và biểu đồ viễn trắc sẽ tự động chuyển màu mượt mà.
                </div>

              </CardContent>
            </Card>
          </div>

        </div>

      </div>
    </>
  );
}
