import { useQuery } from "@tanstack/react-query";
import { deviceBatchApi } from "@/services/apis/device-batch-api";

export const deviceBatchKeys = {
  allStatuses: ["admin", "device-status", "all"] as const,
  latestTelemetry: ["admin", "telemetry", "latest-all"] as const,
};

/** Fetch all device statuses at once (admin only) */
export function useAllDeviceStatuses() {
  return useQuery({
    queryKey: deviceBatchKeys.allStatuses,
    queryFn: ({ signal }) => deviceBatchApi.getAllStatuses(signal),
    staleTime: 15_000, // 15s — status changes frequently
  });
}

/** Fetch latest telemetry for all devices (admin only) */
export function useAllLatestTelemetry() {
  return useQuery({
    queryKey: deviceBatchKeys.latestTelemetry,
    queryFn: ({ signal }) => deviceBatchApi.getLatestTelemetryAll(signal),
    staleTime: 15_000,
  });
}
