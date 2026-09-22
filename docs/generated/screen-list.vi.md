# Danh sách màn hình

**Dự án**: ecom (NestJS backend)
**Được tạo ra**: 2026-09-12
**Phạm vi phân tích**: toàn bộ repo

**Định dạng mã**: Mọi mã PHẢI theo định dạng `SCR###_NameSlug` — N/A với dự án này, xem bên dưới.

## Không có dữ liệu

**Repo này không có màn hình nào.** Đây là NestJS REST API headless — không có file view/template `.tsx`/`.vue`/`.hbs`/`.ejs`/`.html` nào trong cây thư mục. Đã kiểm chứng với `scout-report.md § File Inventory`: cả 262 file được kiểm kê đều gắn nhãn `config`/`model`/`route`/`other`/`background`/`permission` — không có dòng `screen` hay `screen-embedded` nào, và check `count_screen_files` của scout trả về 0. `route-list.md` (Wave 1) xác nhận toàn bộ 70 endpoint được liệt kê là handler JSON REST nằm dưới `src/routes/**/*.controller.ts`, không cái nào render view.

Việc phát hiện composite-screen (H1–H6) **không áp dụng** — vì không có tập màn hình nào để phân loại theo các heuristic đó.

## Chỉ mục màn hình

| Mã | Tên | Loại | Thành phần | Dữ liệu hiển thị |
|------|------|------|------------|----------------|
| — | — | — | — | — |

## Tóm tắt

- **Tổng số màn hình**: 0

## Kiểm tra chéo tham chiếu

- [x] Mọi mã SCR### đều duy nhất — N/A (0 mã)
- [x] Mọi mã SCR### đều được tham chiếu trong ScreenFlow.md — N/A (0 mã)
- [x] Mọi tham chiếu màn hình liên quan đều hợp lệ — N/A (0 mã)
- [x] Mọi URL route đều đúng định dạng — N/A (không có màn hình; route được ghi trong `route-list.md`)
- [x] Mọi mã SCR### đều được tham chiếu trong FeatureList.md — N/A (0 mã)
- [x] Không có tham chiếu màn hình mồ côi — N/A (0 mã)
