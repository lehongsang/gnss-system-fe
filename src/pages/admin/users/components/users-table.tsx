import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, Search, Filter, MoreHorizontal, ShieldCheck, ShieldOff,
  UserCog, CheckCircle2, XCircle, ChevronLeft, ChevronRight, Mail, Cpu,
} from "lucide-react";
import type { SystemUser, UserRole, UserStatus } from "../admin-users";

interface UsersTableProps {
  users: SystemUser[];
  isLoading?: boolean;
  onBanToggle: (user: SystemUser) => void;
  onRoleChange: (user: SystemUser, role: UserRole) => void;
}

const ITEMS_PER_PAGE = 8;

function formatTimeAgo(dateStr: string) {
  const now = new Date();
  const then = new Date(dateStr);
  const diffMs = now.getTime() - then.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins}p trước`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h trước`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d trước`;
}

function SkeletonRow() {
  return (
    <TableRow className="border-border/30">
      <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
      <TableCell><div className="space-y-1"><Skeleton className="h-3.5 w-32" /><Skeleton className="h-2.5 w-40" /></div></TableCell>
      <TableCell><Skeleton className="h-5 w-14 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-5 w-14 rounded-md" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-10" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-8" /></TableCell>
      <TableCell><Skeleton className="h-3.5 w-16" /></TableCell>
      <TableCell><Skeleton className="h-8 w-8 rounded-md" /></TableCell>
    </TableRow>
  );
}

export function UsersTable({ users, isLoading = false, onBanToggle, onRoleChange }: UsersTableProps) {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const [statusFilter, setStatusFilter] = useState<UserStatus | "all">("all");
  const [currentPage, setCurrentPage] = useState(1);

  const filtered = users.filter((u) => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.id.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter === "all" || u.role === roleFilter;
    const matchStatus = statusFilter === "all" || u.status === statusFilter;
    return matchSearch && matchRole && matchStatus;
  });

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const startIdx = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginated = filtered.slice(startIdx, startIdx + ITEMS_PER_PAGE);

  return (
    <Card className="overflow-hidden border-border/50 bg-card/80 backdrop-blur-sm">
      <CardHeader className="px-5 pt-4 pb-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/10 text-violet-500">
              <Users className="h-4 w-4" />
            </div>
            <CardTitle className="text-sm font-semibold">Người dùng</CardTitle>
            <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 border-muted-foreground/20">
              {filtered.length} users
            </Badge>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input placeholder="Tìm tên, email, ID..." value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="pl-8 h-8 w-[180px] text-xs bg-background/50" />
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  <Filter className="h-3.5 w-3.5" />
                  {roleFilter === "all" ? "Role" : roleFilter === "admin" ? "Admin" : "User"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => { setRoleFilter("all"); setCurrentPage(1); }} className="text-xs">Tất cả</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setRoleFilter("admin"); setCurrentPage(1); }} className="text-xs">Admin</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setRoleFilter("user"); setCurrentPage(1); }} className="text-xs">User</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                  {statusFilter === "all" ? "Status" : statusFilter === "active" ? "Active" : "Banned"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-36">
                <DropdownMenuItem onClick={() => { setStatusFilter("all"); setCurrentPage(1); }} className="text-xs">Tất cả</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => { setStatusFilter("active"); setCurrentPage(1); }} className="text-xs">Active</DropdownMenuItem>
                <DropdownMenuItem onClick={() => { setStatusFilter("banned"); setCurrentPage(1); }} className="text-xs">Banned</DropdownMenuItem>
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
                <TableHead className="text-[11px] uppercase tracking-wider font-medium pl-5">ID</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">Người dùng</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">Role</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">Email</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">Devices</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium">Last Login</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider font-medium pr-5 w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: ITEMS_PER_PAGE }).map((_, i) => <SkeletonRow key={i} />)
              ) : paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                    <Users className="h-8 w-8 mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium">Không tìm thấy người dùng</p>
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((user) => (
                  <TableRow key={user.id} className="border-border/30 group transition-colors">
                    <TableCell className="pl-5">
                      <code className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{user.id}</code>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm font-semibold">{user.name}</p>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Mail className="h-2.5 w-2.5" />{user.email}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${
                        user.role === "admin"
                          ? "text-blue-400 border-blue-500/30 bg-blue-500/10"
                          : "text-slate-400 border-slate-500/30 bg-slate-500/10"
                      }`}>
                        {user.role === "admin" ? "Admin" : "User"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {user.status === "active" ? (
                        <div className="flex items-center gap-1 text-emerald-500">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-medium">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1 text-red-400">
                          <XCircle className="h-3.5 w-3.5" />
                          <span className="text-[10px] font-medium">Banned</span>
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {user.emailVerified ? (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-emerald-500 border-emerald-500/20 gap-1">
                          <CheckCircle2 className="h-2.5 w-2.5" />Verified
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5 text-amber-500 border-amber-500/20 gap-1">
                          <XCircle className="h-2.5 w-2.5" />Unverified
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Cpu className="h-3 w-3" />
                        <span className="font-mono font-semibold text-foreground">{user.deviceCount}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-[10px] text-muted-foreground font-mono">{formatTimeAgo(user.lastLoginAt)}</span>
                    </TableCell>
                    <TableCell className="pr-5">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem className="text-xs gap-2" onClick={() => onRoleChange(user, user.role === "admin" ? "user" : "admin")}>
                            <UserCog className="h-3.5 w-3.5" />
                            {user.role === "admin" ? "Đổi thành User" : "Đổi thành Admin"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className={`text-xs gap-2 ${user.status === "active" ? "text-red-400 focus:text-red-400" : "text-emerald-500 focus:text-emerald-500"}`}
                            onClick={() => onBanToggle(user)}
                          >
                            {user.status === "active" ? <ShieldOff className="h-3.5 w-3.5" /> : <ShieldCheck className="h-3.5 w-3.5" />}
                            {user.status === "active" ? "Ban người dùng" : "Unban người dùng"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {!isLoading && filtered.length > 0 && (
          <div className="flex items-center justify-between border-t border-border/30 px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Hiển thị <span className="font-semibold text-foreground">{startIdx + 1}–{Math.min(startIdx + ITEMS_PER_PAGE, filtered.length)}</span> trong <span className="font-semibold text-foreground">{filtered.length}</span>
            </p>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === 1} onClick={() => setCurrentPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /></Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button key={page} variant={page === currentPage ? "default" : "ghost"} size="icon"
                  className={`h-8 w-8 text-xs ${page !== currentPage ? "text-muted-foreground" : ""}`}
                  onClick={() => setCurrentPage(page)}>{page}</Button>
              ))}
              <Button variant="ghost" size="icon" className="h-8 w-8" disabled={currentPage === totalPages} onClick={() => setCurrentPage((p) => p + 1)}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
