import { useState, useEffect } from "react";
import { AppHeader } from "@/components/app-header";
import { Users, ShieldCheck, ShieldOff, UserCog } from "lucide-react";
import { toast } from "sonner";
import { DeviceStatsCard } from "@/pages/my-devices/components/device-stats-card";
import { UsersTable } from "./components/users-table";
import { authClient } from "@/utils/auth-client";

export type UserRole = "admin" | "user";
export type UserStatus = "active" | "banned";

export interface SystemUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  deviceCount: number;
  createdAt: string;
  lastLoginAt: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await authClient.admin.listUsers({ query: { limit: 100 } });
      if (error) {
        toast.error("Lỗi tải danh sách người dùng: " + error.message);
        return;
      }
      
      if (data && data.users) {
        const mappedUsers: SystemUser[] = data.users.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name || "Unknown",
          role: (u.role || "user") as UserRole,
          status: u.banned ? "banned" : "active",
          emailVerified: u.emailVerified,
          deviceCount: 0, // Not available in auth DB
          createdAt: u.createdAt.toISOString(),
          lastLoginAt: u.updatedAt.toISOString(), // fallback
        }));
        setUsers(mappedUsers);
      }
    } catch (e) {
      console.error(e);
      toast.error("Đã xảy ra lỗi khi tải danh sách người dùng.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const total = users.length;
  const activeCount = users.filter((u) => u.status === "active").length;
  const bannedCount = users.filter((u) => u.status === "banned").length;
  const adminCount = users.filter((u) => u.role === "admin").length;

  const handleBanToggle = async (user: SystemUser) => {
    const newStatus = user.status === "active" ? "banned" : "active";
    try {
      let error;
      if (newStatus === "banned") {
        const res = await authClient.admin.banUser({ userId: user.id });
        error = res.error;
      } else {
        const res = await authClient.admin.unbanUser({ userId: user.id });
        error = res.error;
      }
      
      if (error) throw new Error(error.message);

      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, status: newStatus as "active" | "banned" } : u));
      toast.success(newStatus === "banned" ? "Đã ban người dùng" : "Đã unban người dùng", {
        description: `${user.name} (${user.email})`,
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error("Lỗi thao tác: " + e.message);
      } else {
        toast.error("Lỗi thao tác: Đã có lỗi xảy ra");
      }
    }
  };

  const handleRoleChange = async (user: SystemUser, role: UserRole) => {
    try {
      const { error } = await authClient.admin.setRole({ userId: user.id, role });
      if (error) throw new Error(error.message);

      setUsers((prev) => prev.map((u) => u.id === user.id ? { ...u, role } : u));
      toast.success("Đã đổi vai trò", {
        description: `${user.name} → ${role === "admin" ? "Admin" : "User"}`,
      });
    } catch (e: unknown) {
      if (e instanceof Error) {
        toast.error("Lỗi thao tác: " + e.message);
      } else {
        toast.error("Lỗi thao tác: Đã có lỗi xảy ra");
      }
    }
  };

  const stats = [
    { title: "Tổng người dùng", value: total, subtitle: `${adminCount} admin · ${total - adminCount} user`, icon: Users, statClass: "s1" },
    { title: "Đang hoạt động", value: activeCount, subtitle: `${total > 0 ? Math.round((activeCount / total) * 100) : 0}% tài khoản active`, icon: ShieldCheck, statClass: "s2" },
    { title: "Đã bị ban", value: bannedCount, subtitle: "Tài khoản bị khóa", icon: ShieldOff, statClass: "s3" },
    { title: "Quản trị viên", value: adminCount, subtitle: "Có toàn quyền hệ thống", icon: UserCog, statClass: "s4" },
  ];

  return (
    <>
      <AppHeader title="Quản lý người dùng" breadcrumbs={[{ label: "Admin", href: "/" }, { label: "Quản lý người dùng" }]} />
      <div className="my-devices-page flex flex-1 flex-col gap-5 min-h-full overflow-auto">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Quản lý người dùng</h1>
          <p className="text-sm text-cyan mt-1 opacity-85">Xem, ban/unban và đổi vai trò cho tất cả người dùng trong hệ thống.</p>
        </div>
        <div className="stats">
          {stats.map((s) => <DeviceStatsCard key={s.title} {...s} />)}
        </div>
        <UsersTable users={users} isLoading={isLoading} onBanToggle={handleBanToggle} onRoleChange={handleRoleChange} />
      </div>
    </>
  );
}
