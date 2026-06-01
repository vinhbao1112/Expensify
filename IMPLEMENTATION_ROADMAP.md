# Roadmap triển khai Expensify theo giai đoạn

Tài liệu này chia nội dung trong `FUTURE_FEATURES.md` thành từng giai đoạn để dễ làm, dễ kiểm soát tiến độ và tick khi hoàn thành.

## Cách dùng

- Khi bắt đầu giai đoạn nào, giữ nguyên ô `[ ]`.
- Khi hoàn thành giai đoạn, đổi thành `[x]`.
- Nếu muốn theo dõi chi tiết hơn, tick cả các mục con bên dưới.

## Tổng quan giai đoạn

- [x] Giai đoạn 1: Nền tảng báo cáo và ngân sách
- [x] Giai đoạn 2: Giao dịch thông minh và danh mục nâng cao
- [ ] Giai đoạn 3: Xuất dữ liệu, chia sẻ và thông báo
- [x] Giai đoạn 4: Trải nghiệm người dùng và tự động hóa
- [ ] Giai đoạn 5: Nhóm dùng chung, sao lưu và tối ưu kỹ thuật

## Giai đoạn 1: Nền tảng báo cáo và ngân sách

Mục tiêu: giúp app quản lý tiền rõ hơn trước, tập trung vào phần nhìn thấy giá trị ngay.

- [x] Thêm biểu đồ theo tuần, tháng, quý, năm
- [x] Thêm so sánh thu chi giữa các giai đoạn
- [x] Thêm thống kê danh mục chi tiêu nhiều nhất
- [x] Thêm biểu đồ theo nguồn thu nhập
- [x] Tạo dashboard riêng cho chi tiêu cố định, linh hoạt và tiết kiệm
- [x] Tạo ngân sách cho từng danh mục
- [x] Cảnh báo khi chi tiêu vượt ngân sách
- [x] Đặt mục tiêu tiết kiệm theo tháng hoặc theo năm
- [x] Theo dõi tiến độ đạt mục tiêu
- [x] Gợi ý số tiền còn lại có thể chi trong tháng

Tiêu chí hoàn thành:

- Người dùng xem được báo cáo rõ hơn theo thời gian.
- Người dùng đặt được ngân sách và thấy cảnh báo cơ bản.

## Giai đoạn 2: Giao dịch thông minh và danh mục nâng cao

Mục tiêu: giảm thao tác nhập tay và giúp tổ chức dữ liệu tốt hơn.

- [x] Gợi ý danh mục tự động theo nội dung nhập
- [x] Gợi ý mục đích hoặc ghi chú từ lịch sử cũ
- [x] Nhân bản giao dịch lặp lại
- [x] Lên lịch giao dịch định kỳ
- [x] Thêm đính kèm hóa đơn hoặc ảnh chứng từ
- [x] Tạo nhóm danh mục cha/con
- [x] Sắp xếp danh mục theo thứ tự tùy ý
- [x] Ẩn danh mục ít dùng
- [x] Hợp nhất nhiều danh mục thành một danh mục chung
- [x] Tùy chỉnh màu sắc và icon theo chủ đề cá nhân

Tiêu chí hoàn thành:

- Nhập giao dịch nhanh hơn.
- Danh mục có thể quản lý linh hoạt theo nhu cầu thực tế.

## Giai đoạn 3: Xuất dữ liệu, chia sẻ và thông báo

Mục tiêu: biến app thành công cụ có thể xuất báo cáo và nhắc việc tự động.

  - [x] Xuất PDF báo cáo
  - [x] Xuất dữ liệu theo nhiều mẫu
  - [ ] Tự động gửi báo cáo qua email theo lịch
  - [x] Chia sẻ báo cáo chỉ đọc bằng link
  - [x] Nhắc nhập chi tiêu cuối ngày
  - [ ] Nhắc khi sắp đến hạn thanh toán hóa đơn
  - [x] Nhắc khi ngân sách gần hết
  - [ ] Gửi thông báo push cho PWA
  - [ ] Tùy chỉnh lịch nhắc theo từng loại giao dịch

Tiêu chí hoàn thành:

- Người dùng xuất và chia sẻ báo cáo được.
- Có hệ thống nhắc nhở chủ động hơn.

## Giai đoạn 4: Trải nghiệm người dùng và tự động hóa

Mục tiêu: làm app dễ dùng hơn và giảm thao tác thủ công.

- [x] Thêm onboarding cho người dùng mới
- [x] Có dữ liệu mẫu để xem thử ngay sau khi cài app
- [x] Tìm kiếm nhanh bằng phím tắt
- [x] Hỗ trợ thao tác bằng bàn phím nhiều hơn
- [x] Undo/redo cho xóa hoặc sửa
- [x] Tự phân loại giao dịch theo quy tắc
- [x] Tự nhận diện giao dịch lặp lại
- [x] Tự cảnh báo giao dịch bất thường
- [x] Tự động tính số dư dự kiến cuối tháng
- [x] Tự động tính số tiền tiết kiệm thực tế
- [x] Tự động tính tốc độ tiêu tiền trung bình

Tiêu chí hoàn thành:

- Người dùng mới có thể hiểu app nhanh hơn.
- Hệ thống tự xử lý được nhiều việc lặp lại.

## Giai đoạn 5: Nhóm dùng chung, sao lưu và tối ưu kỹ thuật

Mục tiêu: tăng độ bền hệ thống, hỗ trợ dùng chung và tối ưu khi dữ liệu lớn.

- [x] Nhiều tài khoản cùng dùng chung một sổ thu chi
- [x] Phân quyền xem, nhập dữ liệu, quản trị
- [x] Ghi nhận ai đã tạo hoặc sửa giao dịch
- [x] Bình luận hoặc ghi chú cho từng giao dịch
- [x] Tự động backup dữ liệu định kỳ
- [x] Khôi phục dữ liệu từ bản sao lưu cũ
- [ ] Đồng bộ với thêm nguồn khác ngoài Google Sheets nếu cần
- [x] Xuất dữ liệu một lần để backup cục bộ
- [x] Cache dữ liệu để mở app nhanh hơn
- [x] Đồng bộ nền để giảm thời gian chờ
- [x] Xử lý lỗi thân thiện hơn khi Google API bị giới hạn
- [ ] Tối ưu hiệu năng khi dữ liệu rất lớn
- [x] Thêm test cho các luồng chính

Tiêu chí hoàn thành:

- App có thể dùng chung và khôi phục dữ liệu tốt hơn.
- Hiệu năng ổn định hơn khi số lượng giao dịch tăng.

## Thứ tự triển khai khuyến nghị

1. Giai đoạn 1 trước, vì tạo giá trị trực tiếp nhất cho người dùng.
2. Giai đoạn 2 tiếp theo, để giảm thao tác nhập tay.
3. Giai đoạn 3 sau đó, để có báo cáo và thông báo đầy đủ.
4. Giai đoạn 4 để tăng trải nghiệm và tự động hóa.
5. Giai đoạn 5 cuối cùng, vì liên quan nhiều tới độ phức tạp kỹ thuật và cộng tác.

## Trạng thái đề xuất hiện tại

- [ ] Chưa bắt đầu
- [x] Đang làm
- [ ] Hoàn thành

## Ghi chú tiến độ

- Giai đoạn hiện tại: 5
- Mốc hoàn thành dự kiến:
- Vấn đề cần lưu ý: Email tự động, push PWA và nhắc hóa đơn cần backend/scheduler hoặc dữ liệu hóa đơn thực tế.
