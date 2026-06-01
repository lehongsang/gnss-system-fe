import { useEffect } from "react";
import {
  createBrowserRouter,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom";
import GuestRoute from "./GuestRoute";
import NotFound from "./NotFound";
import ProtectedRoute from "./ProtectedRoute";
import AppLayout from "@/components/app-layout";
import Login from "@/pages/login/login";
import Register from "@/pages/register/register";
import ForgotPassword from "@/pages/forgot-password/forgot-password";
import AdminRoute from "./AdminRoute";
import Dashboard from "@/pages/dashboard/dashboard";
import MyDevices from "@/pages/my-devices/my-devices";
import DeviceDetail from "@/pages/device-detail/device-detail";
import MyGeofences from "@/pages/my-geofences/my-geofences";
import MyAlerts from "@/pages/my-alerts/my-alerts";
import AlertRules from "@/pages/alert-rules/alert-rules";
import AdminUsers from "@/pages/admin/users/admin-users";
import AdminMonitoring from "@/pages/admin/monitoring/admin-monitoring";
import AdminResources from "@/pages/admin/resources/admin-resources";
import AdminStatistics from "@/pages/admin/statistics/admin-statistics";
import VerifyOtp from "@/pages/verify-otp/verify-otp";

// New Pages
import TrackHistory from "@/pages/track-history/track-history";
import MediaLogs from "@/pages/media-logs/media-logs";
import StoragePage from "@/pages/storage/storage";
import TelemetryPage from "@/pages/telemetry/telemetry";
import TelemetryCharts from "@/pages/telemetry-charts/telemetry-charts";
import DeviceGroupsPage from "@/pages/device-groups/device-groups";
import RealTimeMap from "@/pages/real-time-map/real-time-map";
import VisionFeed from "@/pages/vision-feed/vision-feed";
import LiveStreamPage from "@/pages/live-stream/live-stream";
import SettingsPage from "@/pages/settings/settings";
import RoutePlanning from "@/pages/route-planning/route-planning";

const Root = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    // Other global effects can go here
  }, [location, navigate]);

  return (
    <div className="min-h-screen w-full">
      <Outlet />
    </div>
  );
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Root />,
    children: [
      // Guest-only: auth pages
      {
        path: "login",
        element: (
          <GuestRoute>
            <Login />
          </GuestRoute>
        ),
      },
      {
        path: "register",
        element: (
          <GuestRoute>
            <Register />
          </GuestRoute>
        ),
      },
      {
        path: "verify-otp",
        element: (
          <GuestRoute>
            <VerifyOtp />
          </GuestRoute>
        ),
      },
      {
        path: "forgot-password",
        element: (
          <GuestRoute>
            <ForgotPassword />
          </GuestRoute>
        ),
      },
      // Protected: requires authentication + sidebar layout
      {
        element: <ProtectedRoute />,
        children: [
          {
            element: <AppLayout />,
            children: [
              {
                index: true,
                element: <Dashboard />,
              },
              {
                path: "my-devices",
                element: <MyDevices />,
              },
              {
                path: "my-devices/:id",
                element: <DeviceDetail />,
              },
              {
                path: "device-groups",
                element: <DeviceGroupsPage />,
              },
              {
                path: "my-geofences",
                element: <MyGeofences />,
              },
              {
                path: "my-alerts",
                element: <MyAlerts />,
              },
              {
                path: "alert-rules",
                element: <AlertRules />,
              },
              {
                path: "track-history",
                element: <TrackHistory />,
              },
              {
                path: "real-time-map",
                element: <RealTimeMap />,
              },
              {
                path: "route-planning",
                element: <RoutePlanning />,
              },
              {
                path: "vision-feed",
                element: <VisionFeed />,
              },
              {
                path: "live-stream",
                element: <LiveStreamPage />,
              },
              {
                path: "media-logs",
                element: <MediaLogs />,
              },
              {
                path: "storage",
                element: <StoragePage />,
              },
              {
                path: "telemetry",
                element: <TelemetryPage />,
              },
              {
                path: "telemetry-charts",
                element: <TelemetryCharts />,
              },
              {
                path: "settings",
                element: <SettingsPage />,
              },
              // Admin routes (Role: Admin)
              {
                element: <AdminRoute />,
                children: [
                  {
                    path: "admin/users",
                    element: <AdminUsers />,
                  },
                  {
                    path: "admin/monitoring",
                    element: <AdminMonitoring />,
                  },
                  {
                    path: "admin/resources",
                    element: <AdminResources />,
                  },
                  {
                    path: "admin/statistics",
                    element: <AdminStatistics />,
                  },
                ],
              },
              // Add more protected pages here, each gets sidebar + header automatically
            ],
          },
        ],
      },
      // 404
      { path: "*", element: <NotFound /> },
    ],
  },
]);
