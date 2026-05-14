# 📊 Hướng dẫn & Tài liệu Hệ thống Quản lý Chi tiêu (Expense Management)

Ứng dụng quản lý chi tiêu hiện đại được xây dựng trên nền tảng **Next.js 15**, tích hợp trực tiếp với **Google Sheets API** để lưu trữ dữ liệu an toàn và linh hoạt.

## 🌟 Các chức năng chính (Features)

### 1. Dashboard Tổng quan (Analytics Dashboard)
- **Thống kê số dư**: Hiển thị Tổng thu, Tổng chi và Số dư hiện tại.
- **Chế độ xem linh hoạt**: Chuyển đổi giữa thống kê theo **Tháng hiện tại** và **Toàn thời gian**.
- **Chế độ Riêng tư (Privacy Mode)**: Ẩn/Hiện các con số nhạy cảm bằng một cú click.
- **Biểu đồ trực quan**: Sử dụng Chart.js để theo dõi xu hướng chi tiêu.

### 2. Quản lý Giao dịch (Transaction Management)
- **Thêm giao dịch mới**: Form nhập liệu thông minh với các danh mục (Category) có biểu tượng sinh động.
- **Danh sách giao dịch**: Hiển thị chi tiết ngày, loại (Thu/Chi), danh mục, số tiền, mục đích và ghi chú.
- **Xóa/Sửa giao dịch**: Đồng bộ trực tiếp với Google Sheets.
- **Tự động phân loại**: Phân tách dữ liệu theo từng tháng trong Google Sheets.

### 3. Tích hợp Google Sheets API (Data Storage)
- **Tự động khởi tạo**: Ứng dụng tự tìm hoặc tạo file "Expensify Management Data" trong Google Drive của người dùng.
- **Quản lý theo Sheet (Tháng)**: Mỗi tháng sẽ tự động tạo một tab mới (VD: "05-2026") để dễ dàng quản lý và tránh quá tải dữ liệu.
- **Lưu trữ bảo mật**: Dữ liệu nằm hoàn toàn trên tài khoản Google của người dùng.

### 4. Widget Thời tiết & Thời gian (Weather & Clock)
- **Thời gian thực**: Đồng hồ hiển thị giờ Việt Nam cập nhật liên tục.
- **Thời tiết hiện tại**: Tích hợp Open-Meteo API để lấy thông tin nhiệt độ dựa trên vị trí (Geolocation).

### 5. Giao diện & Trải nghiệm (UI/UX)
- **Dark/Light Mode**: Hỗ trợ chuyển đổi giao diện sáng/tối mượt mà.
- **Responsive Design**: Tối ưu hiển thị hoàn hảo trên cả Mobile, Tablet và Desktop.
- **Hiệu ứng mượt mà**: Sử dụng Framer Motion cho các hiệu ứng chuyển cảnh và modal.

---

## 🛠 Công nghệ sử dụng (Tech Stack)

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **Icons**: Lucide React
- **Animations**: Framer Motion
- **Database**: Google Sheets API v4 & Google Drive API v3
- **Authentication**: NextAuth.js (Google Provider)

---

## 🚀 Hướng dẫn Chạy & Tích hợp (Setup Guide)

### 1. Yêu cầu hệ thống
- Node.js 18.x trở lên.
- Tài khoản Google (để lấy API credentials).

### 2. Cấu hình Google Cloud Console
Để ứng dụng có thể kết nối với Google Sheets, bạn cần:
1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Tạo Project mới.
3. Enable **Google Sheets API** và **Google Drive API**.
4. Tại mục **Credentials**, tạo **OAuth 2.0 Client IDs**.
5. Thêm `http://localhost:3000/api/auth/callback/google` vào mục **Authorized redirect URIs**.

### 3. Cấu hình biến môi trường (.env.local)
Tạo file `.env.local` ở thư mục gốc và điền các thông tin sau:

```env
# Google OAuth
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret_key

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=chuoi_ky_tu_ngau_nhien_bat_ky
```

### 4. Cài đặt và Khởi chạy
```bash
# Cài đặt thư viện
npm install

# Chạy chế độ phát triển
npm run dev
```

---

## 📊 Cấu trúc Dữ liệu trên Google Sheet
File Google Sheet sẽ được cấu trúc như sau:
- **Tên file**: `Expensify Management Data`
- **Các cột**: `ID | Ngày | Loại | Danh mục | Số tiền | Mục đích | Ghi chú | Thời gian tạo`
- **Tên các tab**: `MM-YYYY` (Ví dụ: `05-2026`)

---

## 🔒 Bảo mật
- Ứng dụng sử dụng **Access Token** ngắn hạn từ Google OAuth để thao tác với file.
- Không lưu trữ dữ liệu cá nhân trên bất kỳ server trung gian nào khác ngoài Google.
