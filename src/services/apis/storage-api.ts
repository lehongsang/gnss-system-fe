import { orvalClient } from "./axios-client";

export interface StorageQuota {
  cloudUsageBytes: number;
  cloudTotalBytes: number;
  localBackupBytes: number;
  lastSync: string;
}

export interface StorageFile {
  id: string;
  name: string;
  type: string;
  size: number;
  createdAt: string;
}

export interface StorageFilesResponse {
  data: StorageFile[];
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export const storageApi = {
  /** GET /api/storage/quota */
  getQuota: (signal?: AbortSignal) =>
    orvalClient<StorageQuota>({
      url: `/api/storage/quota`,
      method: "GET",
      signal,
    }),

  /** GET /api/storage/files */
  getFiles: (
    params?: {
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "ASC" | "DESC";
      type?: string;
      search?: string;
    },
    signal?: AbortSignal,
  ) =>
    orvalClient<StorageFilesResponse>({
      url: `/api/storage/files`,
      method: "GET",
      params,
      signal,
    }),

  /** POST /api/storage/files/upload */
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return orvalClient<{ id: string; name: string }>(
      {
        url: `/api/storage/files/upload`,
        method: "POST",
        data: formData,
        headers: {
          "Content-Type": "multipart/form-data",
        },
      },
    );
  },

  /** GET /api/storage/files/:id/download */
  getDownloadUrl: (id: string, signal?: AbortSignal) =>
    orvalClient<{ url: string }>({
      url: `/api/storage/files/${id}/download`,
      method: "GET",
      signal,
    }),

  /** DELETE /api/storage/files/:id */
  deleteFile: (id: string) =>
    orvalClient<{ message: string }>({
      url: `/api/storage/files/${id}`,
      method: "DELETE",
    }),
};
