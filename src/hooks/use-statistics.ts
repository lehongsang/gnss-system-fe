import { useQuery } from "@tanstack/react-query";
import { statisticsApi } from "@/services/apis/statistics-api";

/**
 * Query keys for admin statistics endpoints.
 * Grouped under ["admin", "statistics", ...] namespace.
 */
export const statisticsKeys = {
  all: ["admin", "statistics"] as const,
  overview: () => [...statisticsKeys.all, "overview"] as const,
  telemetry: () => [...statisticsKeys.all, "telemetry"] as const,
  alertTypes: () => [...statisticsKeys.all, "alertTypes"] as const,
  media: () => [...statisticsKeys.all, "media"] as const,
};

/** Fetch system overview (users, devices, geofences, alerts totals) */
export function useStatisticsOverview() {
  return useQuery({
    queryKey: statisticsKeys.overview(),
    queryFn: ({ signal }) => statisticsApi.getOverview(signal),
    staleTime: 30_000, // 30s — overview changes infrequently
  });
}

/** Fetch telemetry data-point counts per day (last 7 days) */
export function useStatisticsTelemetry() {
  return useQuery({
    queryKey: statisticsKeys.telemetry(),
    queryFn: ({ signal }) => statisticsApi.getTelemetryStats(signal),
    staleTime: 60_000, // 1 min
  });
}

/** Fetch alert-type distribution */
export function useStatisticsAlertTypes() {
  return useQuery({
    queryKey: statisticsKeys.alertTypes(),
    queryFn: ({ signal }) => statisticsApi.getAlertTypeStats(signal),
    staleTime: 60_000,
  });
}

/** Fetch media upload stats per day (last 7 days) */
export function useStatisticsMedia() {
  return useQuery({
    queryKey: statisticsKeys.media(),
    queryFn: ({ signal }) => statisticsApi.getMediaStats(signal),
    staleTime: 60_000,
  });
}
