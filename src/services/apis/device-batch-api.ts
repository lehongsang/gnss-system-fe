import { orvalClient } from "./axios-client";

/**
 * Admin Device-Status & Telemetry batch APIs.
 * These endpoints return data for ALL devices at once (admin-only).
 */

export interface DeviceStatusItem {
  deviceId: string;
  status: "online" | "offline" | "maintenance";
  batteryLevel: number;
  cameraStatus: boolean;
  gnssStatus: boolean;
  updatedAt: string;
}

export interface LatestTelemetryItem {
  device_id: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  altitude: number;
  timestamp: string;
}

export const deviceBatchApi = {
  /** GET /api/devices/status/all — all device statuses */
  getAllStatuses: (signal?: AbortSignal) =>
    orvalClient<DeviceStatusItem[]>(
      { url: `/api/devices/status/all`, method: "GET", signal },
    ),

  /** GET /api/telemetry/latest/all — latest telemetry per device */
  getLatestTelemetryAll: (signal?: AbortSignal) =>
    orvalClient<LatestTelemetryItem[]>(
      { url: `/api/telemetry/latest/all`, method: "GET", signal },
    ),
};
