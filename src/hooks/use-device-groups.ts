import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deviceGroupsApi,
  type CreateDeviceGroupDto,
  type UpdateDeviceGroupDto,
  type AssignDevicesDto,
} from "@/services/apis/device-groups-api";

export const deviceGroupKeys = {
  all: ["device-groups"] as const,
  list: (params?: { page?: number; limit?: number }) =>
    [...deviceGroupKeys.all, "list", params] as const,
  detail: (id: string) => [...deviceGroupKeys.all, "detail", id] as const,
};

/** Fetch paginated list of device groups */
export function useDeviceGroups(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: deviceGroupKeys.list(params),
    queryFn: ({ signal }) => deviceGroupsApi.getAll(params, signal),
  });
}

/** Fetch a single device group by ID */
export function useDeviceGroup(id: string) {
  return useQuery({
    queryKey: deviceGroupKeys.detail(id),
    queryFn: ({ signal }) => deviceGroupsApi.getOne(id, signal),
    enabled: !!id,
  });
}

/** Create a new device group */
export function useCreateDeviceGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDeviceGroupDto) => deviceGroupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceGroupKeys.all });
    },
  });
}

/** Update a device group */
export function useUpdateDeviceGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateDeviceGroupDto }) =>
      deviceGroupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceGroupKeys.all });
    },
  });
}

/** Delete a device group */
export function useDeleteDeviceGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deviceGroupsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceGroupKeys.all });
    },
  });
}

/** Assign devices to a group */
export function useAssignDevicesToGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignDevicesDto }) =>
      deviceGroupsApi.assignDevices(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceGroupKeys.all });
    },
  });
}

/** Remove devices from a group */
export function useRemoveDevicesFromGroup() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: AssignDevicesDto }) =>
      deviceGroupsApi.removeDevices(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deviceGroupKeys.all });
    },
  });
}
