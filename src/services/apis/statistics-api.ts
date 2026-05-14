import { orvalClient } from "./axios-client";
import type {
  SystemOverview,
  TelemetryStat,
  AlertTypeStat,
  MediaStat,
} from "@/types";

/**
 * Admin Statistics API
 * Manual API calls (not Orval-generated) for the admin statistics endpoints.
 * Base path: /api/admin/statistics
 */

export const statisticsApi = {
  /** GET /api/admin/statistics/overview */
  getOverview: (signal?: AbortSignal) =>
    orvalClient<SystemOverview>(
      { url: `/api/admin/statistics/overview`, method: "GET", signal },
    ),

  /** GET /api/admin/statistics/telemetry */
  getTelemetryStats: (signal?: AbortSignal) =>
    orvalClient<TelemetryStat[]>(
      { url: `/api/admin/statistics/telemetry`, method: "GET", signal },
    ),

  /** GET /api/admin/statistics/alerts */
  getAlertTypeStats: (signal?: AbortSignal) =>
    orvalClient<AlertTypeStat[]>(
      { url: `/api/admin/statistics/alerts`, method: "GET", signal },
    ),

  /** GET /api/admin/statistics/media */
  getMediaStats: (signal?: AbortSignal) =>
    orvalClient<MediaStat[]>(
      { url: `/api/admin/statistics/media`, method: "GET", signal },
    ),
};
