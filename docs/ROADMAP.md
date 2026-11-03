# PawPrint — lộ trình code tiếp

Tài liệu SRS 1.0 chia MVP (P0), V1.1 (P1), V2 (P2). Starter hiện ưu tiên luồng backend/mobile kết nối thật, không phải triển khai tất cả.

- [x] Cấu trúc backend Node.js + Express + JavaScript
- [x] Cấu hình SQL Server, schema nền, kiểm tra /api/health
- [x] Auth: đăng ký / đăng nhập / lấy profile bằng JWT
- [x] Pet Profile: REST CRUD, ownership, soft delete
- [x] Together Days: tính theo múi giờ và các mốc 100/365/1000
- [x] App React Native JavaScript: Login, Register, Home, Add Pet, Pet Detail
- [ ] Sprint tiếp theo 1: hoàn thiện Auth (refresh tokens + logout revoke, reset password, xác minh email)
- [ ] Sprint tiếp theo 2: sửa Pet Profile trên mobile, chọn Pet hiện hành, upload avatar
- [ ] Sprint tiếp theo 3: Moments + MomentMedia, object storage, giới hạn file/quota
- [ ] Sprint tiếp theo 4: Timeline / Pet Journey lọc và phân trang
- [ ] Sprint tiếp theo 5: Care Diary CRUD và biểu đồ cân nặng
- [ ] Sprint tiếp theo 6: notification theo lịch, test QA, thử beta
- [ ] V1.1: recap tháng, AI consent-based, Cloud+ và thanh toán
- [ ] V2: recap năm, Pet Shop, affiliate/admin nâng cao

**Hướng phát triển an toàn:** đầu tiên chạy end-to-end trên máy bạn, rồi kiểm tra API ownership và upload ảnh, bổ sung migration và integration test SQL Server trước khi public.

**Cần xác nhận trước khi code module tiếp:** một moment được mấy ảnh, chia sẻ hay private, Cloud+ quota, phân quyền admin, push notification, giá dịch vụ, loại Pet Shop. Những mục này trong SRS vẫn cần xác nhận, không tự mặc định.
