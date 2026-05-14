# 📋 Báo cáo Ghép API Frontend ↔ Backend (GNSS System)

> **Ngày cập nhật:** 2026-05-03 (lần 2)  
> **Backend:** `gnss-system` (NestJS) — 32 API endpoints  
> **Frontend:** `react-base` (Vite + React 19 + TanStack Query)  
> **API Client:** Orval v7.13.2 (auto-generated) + manual hooks (statistics)

---

## ✅ Đã hoàn thành

### 1. Sửa Orval Config

```diff
- "../tmt-ilupet-api/open-api.json"
+ "../gnss-system/open-api.json"
```

### 2. Regenerate API Client

File [queries.ts](file:///c:/Users/Admin/Desktop/DATN/react-base/src/services/apis/gen/queries.ts) — 6394 dòng, 173KB — tất cả hooks React Query sẵn sàng.

### 3. Tạo Shared Types

File [src/types/index.ts](file:///c:/Users/Admin/Desktop/DATN/react-base/src/types/index.ts) — chứa tất cả type definitions chung thay thế types từ mock-data files đã xóa. Bao gồm cả types cho Statistics (`SystemOverview`, `TelemetryStat`, `AlertTypeStat`, `MediaStat`).

### 4. Xóa Mock Data Files ✅

| File đã xóa | Thay thế bằng |
|---|---|
| `src/pages/my-devices/mock-data.ts` | `useDevicesControllerFindMine` + `useDevicesControllerCreate/Update/Remove` |
| `src/pages/my-alerts/mock-data.ts` | `useAlertsControllerFindMine` + `useAlertsControllerResolve` |
| `src/pages/my-geofences/mock-data.ts` | `useGeofencesControllerFindMine` + `useDevicesControllerFindMine` |
| `src/pages/device-detail/mock-data.ts` | `useDevicesControllerFindOne` + `useTelemetryControllerGetLatest` |
| `src/pages/admin/statistics/mock-data.ts` | **ĐÃ XÓA** — thay bằng `useStatistics*` hooks |
| `src/pages/admin/users/mock-data.ts` | **ĐÃ XÓA** — thay bằng `authClient.admin.listUsers` |

### 5. Cập nhật Component Imports

Tất cả sub-components đã chuyển import types từ `../mock-data` → `@/types`:

| Component | Import cũ | Import mới |
|---|---|---|
| `device-table.tsx` | `../mock-data` | `@/types` |
| `device-form-dialog.tsx` | `../mock-data` | `@/types` |
| `alerts-table.tsx` | `../mock-data` | `@/types` |
| `alert-detail-dialog.tsx` | `../mock-data` | `@/types` |
| `geofence-map.tsx` | `../mock-data` | `@/types` |
| `geofence-list.tsx` | `../mock-data` | `@/types` |
| `telemetry-map.tsx` | `../mock-data` | `@/types` |
| `device-info-panel.tsx` | `../mock-data` | `@/types` |
| `global-map.tsx` (admin) | `../mock-data` | `@/types` |
| `users-table.tsx` (admin) | `../mock-data` | `@/types` |
| `media-logs.tsx` (dashboard) | `../mock-data` | `@/types` |
| `map-view.tsx` (dashboard) | `../mock-data` | `@/types` |
| `device-list.tsx` (dashboard) | `../mock-data` | `@/types` |
| `alert-table.tsx` (dashboard) | `../mock-data` | `@/types` |

### 6. Ghép API Admin Statistics ✅ (mới)

Backend đã tạo 4 endpoint statistics tại `GET /api/admin/statistics/*`. Frontend đã ghép hoàn chỉnh:

| File mới tạo | Vai trò |
|---|---|
| [statistics-api.ts](file:///c:/Users/Admin/Desktop/DATN/react-base/src/services/apis/statistics-api.ts) | API client thủ công (dùng `orvalClient`) cho 4 endpoints |
| [use-statistics.ts](file:///c:/Users/Admin/Desktop/DATN/react-base/src/hooks/use-statistics.ts) | 4 TanStack Query hooks + query key factory |

| Backend Endpoint | Frontend Hook | Dùng tại |
|---|---|---|
| `GET /api/admin/statistics/overview` | `useStatisticsOverview()` | Overview cards |
| `GET /api/admin/statistics/telemetry` | `useStatisticsTelemetry()` | Area chart (7 ngày) |
| `GET /api/admin/statistics/alerts` | `useStatisticsAlertTypes()` | Pie chart phân bổ cảnh báo |
| `GET /api/admin/statistics/media` | `useStatisticsMedia()` | Bar chart media (7 ngày) |

File [admin-statistics.tsx](file:///c:/Users/Admin/Desktop/DATN/react-base/src/pages/admin/statistics/admin-statistics.tsx) đã được cập nhật:
- ❌ Xóa toàn bộ mock data (`mockTelemetryStats`, `mockMediaStats`, `mockAlertTypeStats`, `systemOverview` hardcoded)
- ✅ Sử dụng 4 hooks API thực
- ✅ Loading skeleton cho cards và charts
- ✅ Empty state khi không có dữ liệu
- ✅ Nút "Làm mới" invalidate toàn bộ statistics cache
- ✅ Màu sắc alert types map trên frontend (presentation concern)

---

## 🟢 Trạng thái từng Page (sau migration)

### Đã dùng API thực ✅

| Page | File | API Hooks sử dụng |
|------|------|-------------------|
| **Login** | `login-form.tsx` | `authClient.signIn.email()` |
| **Register** | `signup-form.tsx` | `authClient.signUp.email()` |
| **Verify OTP** | `verify-otp.tsx` | `authClient.emailOtp.verifyEmail()` |
| **Forgot Password** | `forgot-password.tsx` | `authClient.forgetPassword()` |
| **Settings** | `settings-dialog.tsx` | `authClient.updateUser()`, `authClient.changePassword()` |
| **My Devices** | `my-devices.tsx` | `useDevicesControllerFindMine`, `useDevicesControllerCreate/Update/Remove` |
| **Device Detail** | `device-detail.tsx` | `useDevicesControllerFindOne`, `useTelemetryControllerGetLatest` |
| **My Alerts** | `my-alerts.tsx` | `useAlertsControllerFindMine`, `useAlertsControllerResolve` |
| **My Geofences** | `my-geofences.tsx` | `useGeofencesControllerFindMine`, `useDevicesControllerFindMine` |
| **Admin Statistics** | `admin-statistics.tsx` | `useStatisticsOverview`, `useStatisticsTelemetry`, `useStatisticsAlertTypes`, `useStatisticsMedia` |
| **Admin Users** | `admin-users.tsx` | `authClient.admin.listUsers`, `authClient.admin.banUser/unbanUser`, `authClient.admin.setRole` |

### Dùng inline placeholder data 🟡 (mock-data file đã xóa, data rỗng/inline trong file)

| Page | File | Lý do | API cần ghép |
|------|------|-------|-------------|
| **Media Logs** | `media-logs.tsx` | Inline `mockMedia[]` | `useMediaLogsControllerFindMine` ✅ (hook có sẵn) |
| **Track History** | `track-history.tsx` | Inline `mockHistory[]` | `useTelemetryControllerGetHistory` ✅ (hook có sẵn) |
| **Storage** | `storage.tsx` | Inline `mockStorageData[]` | ❌ Chưa có API backend |
| **Dashboard** | `dashboard.tsx` | Inline `mockDevices/Alerts/MediaLogs/Geofences = []` | Aggregate nhiều hooks (xem bên dưới) |
| **Admin Monitoring** | `admin-monitoring.tsx` | Inline `mockGlobalDevices = []` | `useDevicesControllerFindAll` ✅ (hook có sẵn) |
| **Admin Resources** | `admin-resources.tsx` | Inline `mockAdminDevices/Geofences/Alerts = []` | Nhiều `findAll` hooks ✅ (có sẵn) |

### Không còn mock-data file nào 🔴 → ✅

> Tất cả `mock-data.ts` files đã bị xóa. Không còn file mock-data riêng nào tồn tại trong project.

---

## ❌ Backend API còn thiếu

| # | Cần cho | API cần tạo | Mô tả |
|---|---------|-------------|-------|
| ~~1~~ | ~~Admin Users~~ | ~~`GET /api/users`~~ | ~~Danh sách users~~ → ✅ Dùng `authClient.admin.listUsers` |
| ~~2~~ | ~~Admin Users~~ | ~~`PATCH /api/users/:id/status`~~ | ~~Ban/Unban~~ → ✅ Dùng `authClient.admin.banUser/unbanUser` |
| ~~3~~ | ~~Admin Users~~ | ~~`PATCH /api/users/:id/role`~~ | ~~Đổi role~~ → ✅ Dùng `authClient.admin.setRole` |
| ~~4~~ | ~~Admin Statistics~~ | ~~`GET /api/statistics/overview`~~ | → ✅ Đã tạo `GET /api/admin/statistics/overview` |
| ~~5~~ | ~~Admin Statistics~~ | ~~`GET /api/statistics/telemetry`~~ | → ✅ Đã tạo `GET /api/admin/statistics/telemetry` |
| ~~6~~ | ~~Admin Statistics~~ | ~~`GET /api/statistics/media`~~ | → ✅ Đã tạo `GET /api/admin/statistics/media` |
| ~~7~~ | ~~Admin Statistics~~ | ~~`GET /api/statistics/alerts`~~ | → ✅ Đã tạo `GET /api/admin/statistics/alerts` |
| 8 | Storage | `GET /api/storage/usage` | Dung lượng lưu trữ per user |
| 9 | Dashboard | `GET /api/dashboard/stats` | Stats tổng hợp (hoặc aggregate từ nhiều endpoints) |

---

## 🔄 Thứ tự ưu tiên tiếp theo

| Ưu tiên | Việc cần làm | Ghi chú |
|---------|-------------|---------|
| 🔴 P0 | Ghép `useMediaLogsControllerFindMine` cho **Media Logs** page | Hook Orval đã có sẵn, chỉ cần thay inline mock |
| 🔴 P0 | Ghép `useTelemetryControllerGetHistory` cho **Track History** page | Hook Orval đã có sẵn, chỉ cần thay inline mock |
| 🟡 P1 | Ghép `useDevicesControllerFindAll` cho **Admin Monitoring** | Hook Orval đã có sẵn |
| 🟡 P1 | Ghép `findAll` hooks cho **Admin Resources** (3 tabs: devices, geofences, alerts) | Hooks Orval đã có sẵn |
| 🟡 P1 | Aggregate multiple hooks cho **Dashboard** (devices, alerts, media, geofences) | Cần compose từ nhiều findMine hooks hoặc tạo API aggregate |
| ⚪ P2 | Tạo API backend: Storage usage | Chưa có endpoint |
| ⚪ P2 | Ghép Storage page sau khi có API | Phụ thuộc vào backend |

---

## 📝 Ghi chú kỹ thuật

1. **TypeScript OK**: `tsc --noEmit` pass 0 errors sau tất cả thay đổi
2. **Cache Invalidation**: Các mutations đều gọi `queryClient.invalidateQueries()` sau thành công
3. **Data Mapping**: Các page đã ghép API dùng mapper functions để chuyển đổi DTO → frontend types vì schema có thể khác
4. **Shared Types**: File `src/types/index.ts` là single source of truth cho frontend types (bao gồm cả Statistics types)
5. **Admin Statistics**: Dùng manual API client (`statistics-api.ts`) + custom hooks (`use-statistics.ts`) thay vì Orval vì endpoints chưa nằm trong OpenAPI spec
6. **Admin Users**: Dùng `authClient` (BetterAuth SDK) trực tiếp — không cần Orval hooks
7. **Không còn mock-data files**: Tất cả đã xóa. Một số pages vẫn có inline `const mock* = []` (mảng rỗng) cần thay bằng API hooks
