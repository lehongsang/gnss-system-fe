# 🎨 GNSS System — UI/UX Design Guidelines

> Tài liệu này quy định các tiêu chuẩn về giao diện và trải nghiệm người dùng cho hệ thống GNSS, đảm bảo tính nhất quán giữa các vai trò **Admin** và **User**.

---

## 1. 🌈 Bảng màu (Color Palette)

Hệ thống sử dụng phong cách **Modern Dark Mode** làm chủ đạo để phù hợp với đặc thù giám sát kỹ thuật.

| Thành phần | Mã màu (Hex / Tailwind) | Mục đích |
|---|---|---|
| **Background** | `#020617` (`slate-950`) | Nền chính của ứng dụng. |
| **Card / Sidebar** | `#0f172a` (`slate-900`) | Nền cho các khối nội dung và thanh điều hướng. |
| **Primary** | `#3b82f6` (`blue-500`) | Các nút hành động chính, link, và trạng thái tích cực. |
| **Success** | `#22c55e` (`green-500`) | Trạng thái `online`, `emailVerified`, `isResolved`. |
| **Warning** | `#f59e0b` (`amber-500`) | Trạng thái `maintenance`, pin trung bình, cảnh báo nhẹ. |
| **Danger** | `#ef4444` (`red-500`) | Trạng thái `offline`, `banned`, cảnh báo nguy hiểm (`dangerous_obstacle`). |

---

## 2. 📐 Quy tắc Layout & Spacing

Sử dụng hệ thống lưới (**Grid**) và **Flexbox** của Tailwind CSS.

| Thành phần | Quy tắc |
|---|---|
| **Sidebar** | Chiều rộng cố định `256px` (`w-64`), có thể thu gọn (collapsed) còn `64px`. |
| **Main Content** | Padding đồng nhất `p-6` (`24px`) trên tất cả các trang Dashboard. |
| **Spacing** | Sử dụng các bước nhảy `4px` (`gap-4`, `gap-6`, `m-4`, `p-4`) để tạo sự cân đối. |
| **Card** | Bo góc `rounded-xl` (`12px`), có border mỏng `border-slate-800`. |

---

## 3. ⌨️ Typography (Phông chữ)

- **Font Family:** `Inter`, `system-ui`, `sans-serif`.

| Vai trò | Class Tailwind | Kích thước |
|---|---|---|
| **H1** (Tiêu đề trang) | `text-2xl font-bold` | `24px` |
| **H2** (Tiêu đề Card) | `text-lg font-semibold` | `18px` |
| **Body** | `text-sm` | `14px` — cho bảng dữ liệu và nội dung chính. |
| **Muted** | `text-xs text-slate-400` | `12px` — cho timestamp và thông tin phụ. |

---

## 4. 🧩 UI Components (Sử dụng Shadcn UI)

### 4.1 Bảng dữ liệu (Tables)

- ✅ Phải hỗ trợ **Skeleton Loaders** khi đang fetch dữ liệu từ API.
- ✅ Phải tích hợp sẵn thanh **tìm kiếm** (search), **bộ lọc** (filter), và **phân trang** (pagination) ở footer.
- ✅ Dữ liệu trả về theo format chuẩn:

```json
{
  "data": [],
  "total": 100,
  "page": 1,
  "limit": 10
}
```

### 4.2 Bản đồ (Map Components)

- Sử dụng **Mapbox** với style `dark-v11`.
- **Marker:**
  - 🟢 Online → Xanh lá
  - 🔴 Offline → Đỏ
  - 🟡 Maintenance → Vàng
- **Geofence:** Sử dụng `Polygon` với:
  - Fill Opacity: `20%`
  - Stroke: `2px`

### 4.3 Trạng thái (Badges & Status)

| Loại | Quy tắc |
|---|---|
| **Role Badge** | `Admin` → Viền xanh dương (`blue-500`), `User` → Viền xám (`slate-500`). |
| **Alert Type Badge** | Mỗi loại cảnh báo đi kèm Icon tương ứng (xem bảng dưới). |
| **Battery** | Sử dụng **Progress Bar**: `>20%` → Xanh (`green-500`), `<20%` → Đỏ (`red-500`). |

**Bảng Icon cảnh báo:**

| Alert Type | Icon | Màu Badge |
|---|---|---|
| `speeding` | 🏎️ | `amber-500` |
| `geofence_exit` | 🗺️ | `red-500` |
| `signal_loss` | 📡 | `slate-400` |
| `dangerous_obstacle` | ⚠️ | `red-500` |
| `low_battery` | 🔋 | `amber-500` |

---

## 5. 🛠️ Quy tắc tương tác (UX)

### 5.1 Authentication

| Hành động | Quy tắc UX |
|---|---|
| **Login** thành công | Hiển thị **Toast** thông báo: _"Chào mừng trở lại"_. |
| **Register** thành công | Chuyển hướng mượt mà sang màn hình nhập **OTP 6 số**. |

### 5.2 Xử lý Form

- ✅ Tất cả các trường `macAddress` phải được **validate** theo định dạng: `AA:BB:CC:DD:EE:FF`.
- ✅ Nút **Delete** phải đi kèm **Confirm Dialog** để tránh xóa nhầm.

### 5.3 Quyền truy cập

| Tình huống | Hành vi |
|---|---|
| User truy cập trang Admin (vd: `/admin/users`) | Hiển thị trang **403 Forbidden**. |
| Admin xem dữ liệu của User | Luôn hiển thị nhãn **"Chủ sở hữu"** (Owner). |

### 5.4 Dữ liệu Media

| Loại Media | Component |
|---|---|
| `video_chunk` | Trình phát video có **thanh tiến trình** (progress bar). |
| `image_frame` | Hỗ trợ **Lightbox** để phóng to khi click. |

---

## 6. 📱 Responsive (Độ tương thích)

| Breakpoint | Kích thước | Hành vi |
|---|---|---|
| **Desktop** | `> 1024px` | Hiện đầy đủ **Sidebar** và **Map**. |
| **Tablet** | `768px – 1024px` | Sidebar tự động thu gọn thành **Icon**. |
| **Mobile** | `< 768px` | Sidebar chuyển thành dạng **Hamburger Menu** (`Sheet` component), bảng dữ liệu chuyển sang dạng **Card Stack**. |

---

> [!NOTE]
> Tài liệu này là nguồn tham chiếu chính (Single Source of Truth) cho mọi quyết định về UI/UX trong dự án GNSS. Mọi component mới phải tuân thủ các quy tắc trên trước khi được merge vào codebase.
