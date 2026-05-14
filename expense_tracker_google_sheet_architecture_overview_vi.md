# Ứng Dụng Quản Lý Chi Tiêu Cá Nhân Bằng Google Sheets

# 1. Tổng Quan Hệ Thống

## Ý tưởng chính

Ứng dụng là một hệ thống quản lý chi tiêu cá nhân.

Người dùng:
- đăng nhập bằng Google
- liên kết tới một Google Sheet
- nhập thu chi
- sửa/xóa dữ liệu cũ
- xem thống kê theo tháng
- xem tổng tiền còn lại

Dữ liệu sẽ được lưu trực tiếp vào Google Sheets.

Google Sheets đóng vai trò:
- Database
- Backend Storage
- Analytics Source
- Backup dữ liệu

---

# 2. Mô Hình Kiến Trúc

```txt
Frontend App
    ↓
Google OAuth
    ↓
Google Sheets API
    ↓
Google Sheets
```

---

# 3. Công Nghệ Đề Xuất

## Frontend

- Next.js
- React
- TailwindCSS
- Shadcn UI
- React Query

---

## Authentication

- Google OAuth
- NextAuth

---

## Storage

- Google Sheets API

---

## Deploy

- Vercel

---

# 4. Chức Năng Chính

## 4.1 Đăng Nhập Google

Người dùng:
- login bằng Google
- cấp quyền truy cập Google Sheets
- chọn hoặc tạo Google Sheet mới

Sau khi login:
- lưu access token
- lưu Google Sheet ID
- lưu session

---

## 4.2 Quản Lý Thu Chi

Người dùng có thể:
- thêm dòng tiền
- sửa dòng tiền
- xóa dòng tiền
- xem lịch sử chi tiêu

Thông tin mỗi giao dịch gồm:

| Field | Ý nghĩa |
|---|---|
| ID | mã giao dịch |
| Date | ngày giao dịch |
| Type | income / expense |
| Category | danh mục |
| Amount | số tiền |
| Purpose | mục đích |
| Note | ghi chú |
| CreatedAt | thời gian tạo |

---

## 4.3 Dashboard

Hiển thị:
- tổng thu tháng
- tổng chi tháng
- tiền còn lại tháng
- tổng tất cả tháng
- biểu đồ chi tiêu
- thống kê category

---

# 5. Cấu Trúc Google Sheets

## File Google Sheet

Ví dụ:

```txt
Chi Tieu Ca Nhan
```

---

## Mỗi tháng là một tab

Ví dụ:

```txt
08-2026
09-2026
10-2026
```

---

# 6. Cấu Trúc Dữ Liệu Mỗi Tab

Ví dụ tab:

```txt
08-2026
```

| ID | Date | Type | Category | Amount | Purpose | Note | CreatedAt |
|---|---|---|---|---|---|---|---|
| 1 | 2026-08-01 | expense | ăn uống | 50000 | ăn trưa | cơm tấm | ... |
| 2 | 2026-08-01 | income | lương | 10000000 | lương tháng | | ... |

---

# 7. Flow Thêm Giao Dịch

## User nhập dữ liệu

Ví dụ:

```txt
Ngày: 10/08/2026
Loại: expense
Danh mục: ăn uống
Số tiền: 50k
Mục đích: ăn tối
```

---

## Hệ thống xử lý

### Bước 1
Xác định tab tháng:

```txt
08-2026
```

### Bước 2
Nếu tab chưa tồn tại:
- tự tạo tab mới

### Bước 3
Append row vào Google Sheet.

---

# 8. Flow Sửa Dữ Liệu

Ví dụ:
- sửa khoản tiền 3 ngày trước
- đổi 50k thành 80k

Hệ thống:

```txt
Load tab tháng
→ tìm ID
→ update row
```

---

# 9. Flow Xóa Dữ Liệu

```txt
User click delete
→ tìm row theo ID
→ delete row
```

Hoặc:
- soft delete
- đánh dấu deleted

---

# 10. Tính Tổng Tiền

## Tổng theo tháng

Ví dụ:

```txt
Thu: 15 triệu
Chi: 8 triệu
Còn: 7 triệu
```

---

## Tổng tất cả tháng

Hệ thống:

```txt
Đọc toàn bộ tabs
→ cộng income
→ trừ expense
```

---

# 11. Danh Mục Chi Tiêu

Ví dụ:

- ăn uống
- cafe
- điện nước
- mua sắm
- giải trí
- lương
- freelance

---

# 12. Service Structure

## Auth Service

```ts
loginWithGoogle()
logout()
getSession()
```

---

## Sheet Service

```ts
createMonthSheet()
appendTransaction()
updateTransaction()
deleteTransaction()
getTransactions()
```

---

## Analytics Service

```ts
calculateMonthlyTotal()
calculateBalance()
groupByCategory()
```

---

# 13. UI Các Màn Hình

## Login Page

```txt
[ Login with Google ]
```

---

## Dashboard

Hiển thị:
- tổng tiền
- chart
- category
- số dư
- thống kê tháng

---

## Transaction Page

Hiển thị:
- danh sách giao dịch
- sửa
- xóa
- filter theo tháng

---

## Add Transaction Modal

Form gồm:
- số tiền
- loại
- category
- ngày
- mục đích
- note

---

# 14. Điểm Mạnh Kiến Trúc

## Ưu điểm

- miễn phí
- dễ triển khai
- không cần database server
- dễ backup
- dễ debug
- dễ xem trực tiếp dữ liệu
- phù hợp MVP cá nhân

---

## Nhược điểm

- scale kém nếu dữ liệu lớn
- query/filter sẽ chậm nếu quá nhiều row
- concurrent update hạn chế
- phụ thuộc Google OAuth

---

# 15. Flow Tổng Thể Hệ Thống

```txt
User nhập giao dịch
    ↓
Frontend validate
    ↓
Google Sheets API
    ↓
Append / Update row
    ↓
Reload analytics
    ↓
Dashboard cập nhật
```

---

# 16. MVP Version 1

## Các chức năng cần có

- Login Google
- Connect Google Sheet
- Tạo tab theo tháng
- CRUD transaction
- Dashboard tổng tiền
- Tổng tất cả tháng
- Filter theo tháng
- Responsive mobile

---

# 17. Hướng Nâng Cấp Sau Này

## Feature nâng cao

- AI phân tích chi tiêu
- OCR hóa đơn
- export PDF / Excel
- shared wallet
- multi-user
- sync ngân hàng
- Telegram bot nhập chi tiêu
- voice input

Ví dụ:

```txt
ăn sáng 35k
```

---

# 18. Hướng Scale Sau Này

Khi hệ thống lớn hơn:

```txt
Google Sheets
    ↓
PostgreSQL
    ↓
Fastify API
    ↓
Redis Cache
```

---

# 19. Đề Xuất Roadmap

## Giai đoạn 1

- UI cơ bản
- login Google
- CRUD transaction
- Google Sheets API

---

## Giai đoạn 2

- dashboard
- chart
- filter
- analytics

---

## Giai đoạn 3

- mobile responsive
- dark mode
- export dữ liệu
- AI insights

---

# 20. Kết Luận

Đây là một kiến trúc rất phù hợp để:

- làm portfolio
- học fullstack
- học Google API
- deploy nhanh
- làm MVP cá nhân
- phát triển lên SaaS sau này

Điểm mạnh lớn nhất:
- đơn giản
- ít chi phí
- tốc độ phát triển nhanh
- dễ maintain
- Google Sheets vừa là DB vừa là admin panel

