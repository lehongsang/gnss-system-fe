import { useQuery } from "@tanstack/react-query";
import { axiosInstance } from "@/services/apis/axios-client";

export const dashboardKeys = {
  stats: ["dashboard", "stats"] as const,
  latestTelemetry: ["dashboard", "telemetry", "latest"] as const,
  deviceStatus: ["dashboard", "devices", "status"] as const,
};

export function useDashboardStats() {
  return useQuery({
    queryKey: dashboardKeys.stats,
    queryFn: async ({ signal }) => {
      const response = await axiosInstance.get("/api/dashboard/stats", { signal });
      return response;
    },
    refetchInterval: 60000,
  });
}

export function useLatestTelemetry() {
  return useQuery({
    queryKey: dashboardKeys.latestTelemetry,
    queryFn: async ({ signal }) => {
      const response = await axiosInstance.get("/api/telemetry/latest/mine", { signal });
      return response;
    },
    refetchInterval: 15000,
  });
}

export function useDeviceStatusMine() {
  return useQuery({
    queryKey: dashboardKeys.deviceStatus,
    queryFn: async ({ signal }) => {
      const response = await axiosInstance.get("/api/devices/status/mine", { signal });
      return response;
    },
    refetchInterval: 15000,
  });
}
