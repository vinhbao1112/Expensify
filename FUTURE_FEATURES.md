# Gợi ý tính năng để hoàn thiện Expensify hơn

- Cập nhật ngày: `01/06/2026` (`0106`)

Tài liệu này liệt kê các chức năng có thể phát triển thêm để app quản lý chi tiêu đầy đủ hơn, tiện hơn khi sử dụng hằng ngày và phù hợp hơn cho nhu cầu cá nhân lẫn nhóm nhỏ.

## 1. Báo cáo và phân tích nâng cao

- Biểu đồ theo tuần, tháng, quý, năm.
- So sánh thu chi giữa các giai đoạn.
- Thống kê danh mục chi tiêu nhiều nhất.
- Biểu đồ theo nguồn thu nhập.
- Dashboard riêng cho:
  - chi tiêu cố định
  - chi tiêu linh hoạt
  - tiết kiệm

## 2. Ngân sách và mục tiêu tài chính

- Tạo ngân sách cho từng danh mục.
- Cảnh báo khi chi tiêu vượt ngân sách.
- Đặt mục tiêu tiết kiệm theo tháng hoặc theo năm.
- Theo dõi tiến độ đạt mục tiêu.
- Gợi ý số tiền còn lại có thể chi trong tháng.

## 3. Giao dịch thông minh hơn

- Gợi ý danh mục tự động dựa trên nội dung nhập.
- Gợi ý mục đích hoặc ghi chú từ lịch sử cũ.
- Nhân bản giao dịch lặp lại.
- Lên lịch giao dịch định kỳ:
  - tiền nhà
  - điện nước
  - lương
  - subscription
- Thêm đính kèm hóa đơn hoặc ảnh chứng từ.

## 4. Quản lý danh mục nâng cao

- Tạo nhóm danh mục cha/con.
- Sắp xếp danh mục theo thứ tự tùy ý.
- Ẩn danh mục ít dùng.
- Hợp nhất nhiều danh mục thành một danh mục chung.
- Tùy chỉnh màu sắc và icon theo từng chủ đề cá nhân.

## 5. Tìm kiếm và lọc mạnh hơn

- Lọc theo:
  - khoảng ngày
  - danh mục
  - loại giao dịch
  - khoảng tiền
  - từ khóa ghi chú
- Lưu bộ lọc thường dùng.
- Tìm kiếm toàn bộ dữ liệu theo nhiều tháng.
- Gắn tag cho giao dịch và lọc theo tag.

## 6. Xuất và chia sẻ dữ liệu

- Xuất PDF báo cáo đẹp hơn để lưu trữ hoặc gửi cho người khác.
- Xuất dữ liệu theo nhiều mẫu:
  - chi tiết giao dịch
  - báo cáo tổng hợp
  - báo cáo theo danh mục
- Tự động gửi báo cáo qua email theo lịch.
- Chia sẻ báo cáo chỉ đọc bằng link.

## 7. Nhắc nhở và thông báo

- Nhắc nhập chi tiêu cuối ngày.
- Nhắc khi sắp đến hạn thanh toán hóa đơn.
- Nhắc khi ngân sách gần hết.
- Gửi thông báo push cho PWA.
- Tùy chỉnh lịch nhắc theo từng loại giao dịch.

## 8. Trải nghiệm người dùng

- Thêm chế độ onboarding cho người dùng mới.
- Có dữ liệu mẫu để xem thử ngay sau khi cài app.
- Tìm kiếm nhanh bằng phím tắt.
- Hỗ trợ thao tác bằng bàn phím nhiều hơn.
- Undo/redo cho các thao tác xóa hoặc sửa.

## 9. Tính năng cho nhóm nhỏ hoặc gia đình

- Nhiều tài khoản cùng dùng chung một sổ thu chi.
- Phân quyền:
  - xem
  - nhập dữ liệu
  - quản trị
- Ghi nhận ai đã tạo/sửa giao dịch.
- Bình luận hoặc ghi chú cho từng giao dịch.

## 10. Đồng bộ và sao lưu

- Tự động backup dữ liệu định kỳ.
- Khôi phục dữ liệu từ bản sao lưu cũ.
- Đồng bộ với thêm nguồn khác ngoài Google Sheets nếu cần.
- Xuất dữ liệu một lần để backup cục bộ.

## 11. Tự động hóa tài chính

- Tự phân loại giao dịch theo quy tắc.
- Tự nhận diện giao dịch lặp lại.
- Tự cảnh báo giao dịch bất thường.
- Tự động tính:
  - số dư dự kiến cuối tháng
  - số tiền tiết kiệm thực tế
  - tốc độ tiêu tiền trung bình

## 12. Tính năng nâng cấp về giao diện

- Mini dashboard trên mobile.
- Widget hiển thị số dư ngay ở màn hình chính.
- Giao diện báo cáo theo kiểu card hoặc timeline.
- Chế độ xem in ấn.
- Tùy biến theme sâu hơn:
  - màu chủ đạo
  - kiểu nền
  - density giao diện

## 13. Tính năng kỹ thuật nên cân nhắc

- Cache dữ liệu để mở app nhanh hơn.
- Đồng bộ nền để giảm thời gian chờ.
- Xử lý lỗi thân thiện hơn khi Google API bị giới hạn.
- Tối ưu hiệu năng khi dữ liệu rất lớn.
- Thêm test cho các luồng:
  - thêm giao dịch
  - sửa giao dịch
  - xóa giao dịch
  - lọc dữ liệu

## 14. Ưu tiên triển khai đề xuất

### Nên làm trước
- Báo cáo nâng cao
- Ngân sách theo danh mục
- Giao dịch định kỳ
- Xuất PDF
- Nhắc nhở và thông báo

### Nên làm sau
- Phân quyền nhiều người dùng
- Backup và khôi phục
- Tự động hóa thông minh
- Tối ưu hiệu năng dữ liệu lớn

## 15. Kết luận

Nếu muốn app hoàn thiện hơn theo hướng thực chiến, nên ưu tiên 3 nhóm chính:

- Quản lý tiền rõ hơn bằng báo cáo và ngân sách.
- Giảm thao tác nhập tay bằng tự động hóa.
- Tăng độ tin cậy bằng backup, nhắc nhở và xuất báo cáo.

Đây là các hướng mở rộng hợp lý để Expensify không chỉ là app ghi chép thu chi, mà trở thành một công cụ quản lý tài chính cá nhân đầy đủ hơn.
