import { authClient } from "@/utils/auth-client";
import { Navigate, Outlet } from "react-router-dom";
import { Loader2 } from "lucide-react";

const AdminRoute = () => {
  const { useSession } = authClient;
  const { data: session, isPending: isLoadingSession } = useSession();

  if (isLoadingSession) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-background text-foreground">
        <Loader2 className="mb-4 h-8 w-8 animate-spin text-muted-foreground" />
        <p className="text-sm font-medium animate-pulse">Checking permissions...</p>
      </div>
    );
  }

  // If no session or user is not an admin, redirect to root/dashboard
  if (!session || session.user.role !== "admin") {
    // We do a slight timeout to avoid state update warnings during render
    setTimeout(() => {
      // You can add a toast here if you want:
      // toast.error("You don't have permission to access Admin Tools");
    }, 0);
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

export default AdminRoute;
