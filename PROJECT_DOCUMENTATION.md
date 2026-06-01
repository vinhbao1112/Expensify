# Tài liệu hệ thống Expensify

Expensify là ứng dụng quản lý chi tiêu cá nhân và nhóm nhỏ, xây dựng bằng **Next.js 16**, **React 19**, **TypeScript** và đồng bộ trực tiếp với **Google Sheets** và **Google Drive**. Dữ liệu được lưu trong spreadsheet riêng của từng tài khoản hoặc nhóm dùng chung, không cần backend lưu trữ riêng.

## Tổng quan tính năng

### 1. Xác thực và truy cập
- Đăng nhập bằng **Google OAuth** qua `next-auth`.
- Tài khoản đăng nhập dùng access token riêng để thao tác với Google Sheets/Drive.
- Ứng dụng chỉ mở dashboard sau khi đăng nhập thành công.

### 2. Dashboard tổng quan
- Hiển thị 3 chỉ số chính:
  - Tổng thu
  - Tổng chi
  - Số dư hiện tại
- Có 3 chế độ xem dữ liệu:
  - Theo ngày
  - Theo tháng hiện tại
  - Toàn thời gian
- Có biểu đồ phân bố chi tiêu theo danh mục.
- Có 2 tab chính:
  - `Tổng quan`
  - `Lịch sử giao dịch`
- Có khối phân tích nâng cao:
  - biểu đồ theo tuần, tháng, quý, năm
  - so sánh thu chi giữa các giai đoạn
  - top danh mục chi tiêu
  - biểu đồ nguồn thu nhập
  - phân nhóm chi tiêu cố định, linh hoạt, tiết kiệm
- Có cảnh báo ngân sách, mục tiêu tiết kiệm và thanh tiến độ ngay trên dashboard.

### 3. Quản lý giao dịch
- Thêm giao dịch mới bằng modal.
- Chỉnh sửa giao dịch đã có.
- Xóa từng giao dịch.
- Danh sách giao dịch có:
  - tìm kiếm theo nội dung, danh mục
  - lọc theo ngày
  - chế độ hiển thị rút gọn cho mobile
- Dữ liệu được đồng bộ với Google Sheets ngay sau khi thêm/sửa/xóa.
- Có sao chép giao dịch, mẫu giao dịch lặp lại và đính kèm ảnh hóa đơn.
- Có gợi ý danh mục tự động, gợi ý mục đích/ghi chú từ lịch sử cũ.
- Hỗ trợ undo/redo cho thao tác thêm, sửa, xóa.
- Dữ liệu mẫu được ghi thật vào Google Sheets và vẫn có thể sửa/xóa như giao dịch bình thường.
- Có nút để nạp mẫu vào Excel, ẩn/hiện dữ liệu mẫu và xóa toàn bộ dữ liệu mẫu khỏi spreadsheet.

### 4. Danh mục tùy chỉnh
- Danh mục mặc định có sẵn cho chi tiêu và thu nhập.
- Người dùng có thể:
  - Thêm danh mục mới
  - Sửa danh mục
  - Xóa danh mục
  - Chọn biểu tượng có sẵn
  - Tải ảnh riêng cho danh mục
- Danh mục được lưu trong `localStorage` để giữ lại giữa các lần mở app.
- Hỗ trợ danh mục cha/con, sắp xếp thứ tự, ẩn/hiện, hợp nhất danh mục.

### 5. Xuất dữ liệu
- Xuất báo cáo tháng hiện tại ra:
  - `CSV`
  - `Excel` (`.xls`)
- File xuất có các cột:
  - Ngày
  - Loại
  - Danh mục
  - Số tiền
  - Mục đích
  - Ghi chú
  - Dữ liệu mẫu
- Có màn hình báo cáo riêng với nhiều mẫu:
  - tổng hợp
  - chi tiết
  - ngân sách
  - timeline
- Có thể tạo link báo cáo chỉ đọc, mở bản in hoặc gửi qua email thủ công.

### 6. Xóa dữ liệu hàng loạt
- Xóa toàn bộ giao dịch của **tháng hiện tại**.
- Xóa toàn bộ dữ liệu trong toàn bộ spreadsheet.
- Xóa toàn bộ dữ liệu mẫu trong spreadsheet.
- Các thao tác đều có cảnh báo xác nhận trước khi thực hiện.

### 7. Báo cáo, nhắc nhở và tự động hóa
- Có khu vực `Xuất báo cáo & nhắc nhở` riêng trên dashboard.
- Nhắc nhập chi tiêu cuối ngày bằng Notification API.
- Cảnh báo khi chi tiêu chạm ngưỡng ngân sách.
- Hỗ trợ tạo snapshot báo cáo và mở trang in riêng.
- Có khu vực `Trải nghiệm & tự động hóa` để:
  - onboarding người dùng mới
  - bật dữ liệu mẫu
  - dùng phím tắt
  - thêm quy tắc tự động phân loại
  - phát hiện giao dịch lặp lại và bất thường
  - dự báo số dư cuối tháng
- Có thể ẩn/hiện dữ liệu mẫu từ dashboard để chỉ xem dữ liệu thật.

### 8. Nhóm dùng chung, phân quyền và sao lưu
- Hỗ trợ nhiều tài khoản cùng dùng chung một sổ thu chi.
- Có phân quyền `viewer`, `editor`, `admin`.
- Lưu metadata `người tạo` và `người sửa` cho từng giao dịch.
- Có panel quản trị thành viên trong app.
- Tự động backup cục bộ và cache dữ liệu để mở app nhanh hơn.
- Có thể xuất/nhập file backup JSON và khôi phục lại dữ liệu tháng hiện tại.
- Có cơ chế đồng bộ nền và fallback cache khi Google API lỗi tạm thời.

### 9. Đồng bộ Google Sheets
- Tự động tìm hoặc tạo spreadsheet tên:
  - `Expensify Management Data`
- Mỗi tháng được lưu trong một tab riêng theo định dạng:
  - `MM-YYYY`
- Tab mới sẽ tự tạo khi chưa tồn tại.
- Dòng đầu là header:
  - `ID | Ngày | Loại | Danh mục | Số tiền | Mục đích | Ghi chú | Thời gian tạo | Đính kèm | Người tạo | Người sửa | Dữ liệu mẫu`
- Có sheet riêng `Expensify_ACL` để lưu danh sách email và vai trò truy cập.

### 10. Theo dõi thời tiết và thời gian
- Widget thời gian thực hiển thị giờ hiện tại.
- Widget thời tiết lấy vị trí người dùng bằng `navigator.geolocation`.
- Dữ liệu thời tiết lấy từ **Open-Meteo API**.

### 11. Giao diện và trải nghiệm
- Hỗ trợ **dark/light mode**.
- Có hiệu ứng động bằng **Framer Motion**.
- Có nền parallax, glassmorphism và animation gradient.
- Responsive cho mobile, tablet và desktop.
- Có panel backup, panel phân quyền, panel phân tích và panel tự động hóa riêng.

### 12. PWA
- Ứng dụng hỗ trợ cài đặt như một app trên thiết bị.
- Hiển thị nút cài đặt khi trình duyệt hỗ trợ `beforeinstallprompt`.
- Có hướng dẫn cài đặt riêng cho iOS.

## Công nghệ sử dụng

- **Framework**: Next.js 16.2.6
- **React**: 19
- **Ngôn ngữ**: TypeScript
- **UI**: Tailwind CSS 4
- **Animation**: Framer Motion
- **Chart**: Chart.js, react-chartjs-2
- **Icons**: Lucide React
- **Theme**: next-themes
- **Auth**: next-auth
- **Storage**: Google Sheets API v4, Google Drive API v3
- **Kiểu lưu trữ phụ trợ**: `localStorage` cho cache, backup, onboarding, rules, lịch nhắc và trạng thái hiển thị dữ liệu mẫu

## Kiến trúc chính

### Luồng dữ liệu
1. Người dùng đăng nhập bằng Google.
2. Ứng dụng lấy access token từ session.
3. API server dùng token đó để đọc/ghi Google Sheets và Google Drive.
4. Dashboard gọi các API nội bộ để lấy:
   - giao dịch theo tháng
   - tổng thu/chi toàn thời gian
   - toàn bộ giao dịch cho báo cáo, phân tích và tự động hóa
5. Khi người dùng thêm/sửa/xóa, dữ liệu được cập nhật lại và dashboard refresh.

### API nội bộ

#### `GET /api/transactions`
- Lấy giao dịch theo tháng.
- Query:
  - `monthYear`
  - `spreadsheetId` (tùy chọn)
- Có kiểm tra quyền truy cập trước khi đọc dữ liệu.

#### `POST /api/transactions`
- Thêm giao dịch mới.
- Nếu chưa có spreadsheet, hệ thống tự tìm hoặc tạo spreadsheet.
- Tự ghi `createdBy` và `updatedBy` theo email người dùng hiện tại.

#### `PUT /api/transactions`
- Cập nhật giao dịch hiện có.
- Body gồm:
  - `monthYear`
  - `rowIndex`
  - `transaction`
  - `spreadsheetId`
- Tự ghi nhận người sửa.

#### `DELETE /api/transactions`
- Xóa một giao dịch theo `rowIndex`.
- Query:
  - `monthYear`
  - `rowIndex`
  - `spreadsheetId`
- Chỉ `editor` hoặc `admin` mới có thể xóa.

#### `POST /api/transactions/delete-sample`
- Xóa toàn bộ giao dịch được gắn là dữ liệu mẫu trong toàn bộ spreadsheet.
- Chỉ `admin` mới có thể dùng.

#### `GET /api/totals`
- Tính tổng thu/chi toàn thời gian từ tất cả tab trong spreadsheet.
- Query:
  - `spreadsheetId`

#### `POST /api/transactions/clear-month`
- Xóa toàn bộ dữ liệu của một tháng, giữ lại header.
- Chỉ `admin` mới có thể dùng.

#### `POST /api/transactions/clear-all`
- Xóa toàn bộ dữ liệu của tất cả tháng, giữ lại cấu trúc tab.
- Chỉ `admin` mới có thể dùng.

#### `GET /api/access`
- Lấy danh sách thành viên và vai trò hiện tại của spreadsheet.

#### `POST /api/access`
- Thêm hoặc cập nhật quyền cho một email.

#### `DELETE /api/access`
- Xóa quyền của một email khỏi spreadsheet.

## Cấu trúc lưu trữ trên Google Sheets

- **Tên file**: `Expensify Management Data`
- **Tên tab**: `MM-YYYY`
- **Cột dữ liệu**:
  - `A`: ID
  - `B`: Ngày
  - `C`: Loại
  - `D`: Danh mục
  - `E`: Số tiền
  - `F`: Mục đích
  - `G`: Ghi chú
  - `H`: Thời gian tạo
  - `I`: Đính kèm
  - `J`: Người tạo
  - `K`: Người sửa
  - `L`: Dữ liệu mẫu
- Giao dịch mới được chèn lên đầu danh sách để mục mới nhất luôn ở trên cùng.
- Có sheet riêng `Expensify_ACL` để lưu danh sách email và vai trò truy cập.

## Bộ nhớ cục bộ trên trình duyệt

- `expensify_id_<email>`: lưu spreadsheet ID của người dùng.
- `expensify_all_categories`: lưu toàn bộ danh mục đã tùy chỉnh.
- `expensify_custom_categories`: biến cũ được hỗ trợ để tương thích ngược.
- `expensify_backup_<spreadsheetId>`: lưu snapshot backup cục bộ.
- `expensify_cache_<spreadsheetId>`: lưu cache giao dịch và số liệu tổng hợp.
- `expensify_onboarding_seen`: ghi nhận đã xem onboarding.
- `expensify_demo_mode`: trạng thái đang xem dữ liệu mẫu.
- `expensify_show_sample_data`: trạng thái bật/tắt hiển thị dữ liệu mẫu.
- `expensify_recurring_templates_<spreadsheetId>`: lưu mẫu giao dịch lặp lại.
- `expensify_reminders`: lưu cấu hình nhắc việc.
- `expensify_automation_rules_<spreadsheetId>`: lưu quy tắc tự động phân loại.

## Chạy dự án

### 1. Cài đặt
```bash
npm install
```

### 2. Chạy môi trường phát triển
```bash
npm run dev
```

### 3. Biến môi trường
Tạo file `.env.local` ở thư mục gốc:

```env
GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your_secret_key

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_random_secret
```

## Ghi chú vận hành

- Dữ liệu mẫu là dữ liệu thật trong spreadsheet nhưng có cột riêng để phân biệt.
- Có thể sửa/xóa từng dòng dữ liệu mẫu giống dữ liệu bình thường.
- Có thể ẩn dữ liệu mẫu để xem dashboard chỉ với dữ liệu thật.
- Có thể xóa toàn bộ dữ liệu mẫu khỏi Excel bằng quyền `admin`.

