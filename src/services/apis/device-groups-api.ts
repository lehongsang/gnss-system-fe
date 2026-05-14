import { orvalClient } from "./axios-client";

// ---------- Types ----------

export interface DeviceInGroup {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  macAddress: string;
  ownerId: string;
  speedLimitKmh: number;
  deviceGroupId: string;
  deletedAt: string | null;
}

export interface DeviceGroup {
  id: string;
  createdAt: string;
  updatedAt: string;
  name: string;
  description: string;
  ownerId: string;
  deviceCount: number;
}

export interface DeviceGroupDetail extends DeviceGroup {
  devices: DeviceInGroup[];
}

export interface DeviceGroupListResponse {
  data: DeviceGroup[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
  hasNextPage: boolean;
}

export interface CreateDeviceGroupDto {
  name: string;
  description: string;
}

export interface UpdateDeviceGroupDto {
  name?: string;
  description?: string;
}

export interface AssignDevicesDto {
  deviceIds: string[];
}

// ---------- API ----------

export const deviceGroupsApi = {
  /** GET /api/device-groups — list all groups */
  getAll: (params?: { page?: number; limit?: number }, signal?: AbortSignal) =>
    orvalClient<DeviceGroupListResponse>({
      url: `/api/device-groups`,
      method: "GET",
      params,
      signal,
    }),

  /** GET /api/device-groups/:id — get single group with devices */
  getOne: (id: string, signal?: AbortSignal) =>
    orvalClient<DeviceGroupDetail>({
      url: `/api/device-groups/${id}`,
      method: "GET",
      signal,
    }),

  /** POST /api/device-groups — create a group */
  create: (data: CreateDeviceGroupDto) =>
    orvalClient<DeviceGroup>({
      url: `/api/device-groups`,
      method: "POST",
      data,
    }),

  /** PATCH /api/device-groups/:id — update a group */
  update: (id: string, data: UpdateDeviceGroupDto) =>
    orvalClient<DeviceGroup>({
      url: `/api/device-groups/${id}`,
      method: "PATCH",
      data,
    }),

  /** DELETE /api/device-groups/:id — delete a group */
  delete: (id: string) =>
    orvalClient<void>({
      url: `/api/device-groups/${id}`,
      method: "DELETE",
    }),

  /** POST /api/device-groups/:id/devices — assign devices to group */
  assignDevices: (id: string, data: AssignDevicesDto) =>
    orvalClient<void>({
      url: `/api/device-groups/${id}/devices`,
      method: "POST",
      data,
    }),

  /** DELETE /api/device-groups/:id/devices — remove devices from group */
  removeDevices: (id: string, data: AssignDevicesDto) =>
    orvalClient<void>({
      url: `/api/device-groups/${id}/devices`,
      method: "DELETE",
      data,
    }),
};
